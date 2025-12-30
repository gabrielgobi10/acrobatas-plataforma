// src/components/company/DetalhesObraAtiva.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  MapPin,
  Users,
  CalendarDays,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

// 🧩 Seções
import RelatoriosDoDia from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/RelatoriosDoDia";
import Equipas from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Equipas";
import Custos from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Custos";
import Documentacao from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Documentacao";
import Ocorrencias from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Ocorrencias";

type Aba = "relatorios" | "equipas" | "custos" | "documentacao" | "ocorrencias";

type ObraRow = {
  id: string;
  nome: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;

  // 🔹 campos de localização conforme a tabela
  local?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  pais?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordenadas?: { lat: number; lon: number } | null;
};

type ObraView = ObraRow & {
  profissionais: number;
  statusCalculado: "A iniciar" | "Em andamento" | "Concluída" | "Atrasada";
  ultimaAtividade: string | null;
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT");
}

// --------------------------------------------------
// helpers de geocoding
// --------------------------------------------------
function dmsToDecimal(
  graus: number,
  minutos: number,
  segundos: number,
  hemisferio: string
): number {
  let valor = graus + minutos / 60 + segundos / 3600;
  if (/[SW]/i.test(hemisferio)) valor = -valor;
  return valor;
}

type GeoResolvido = {
  lat: number;
  lon: number;
  endereco: string;
};

// Aceita:
//  - endereço em texto
//  - decimal "lat, lon"
//  - DMS: 38°42'07.3"N 9°24'57.4"W
async function resolverEnderecoParaCoords(
  entrada: string
): Promise<GeoResolvido | null> {
  const base = entrada.trim();
  if (!base) return null;

  // 1) DMS: 38°42'07.3"N 9°24'57.4"W
  const dmsRegex =
    /(\d{1,3})[°:\s]\s*(\d{1,2})[':\s]\s*(\d{1,2}(?:\.\d+)?)["]?\s*([NS])[, ]+\s*(\d{1,3})[°:\s]\s*(\d{1,2})[':\s]\s*(\d{1,2}(?:\.\d+)?)["]?\s*([EW])/i;

  const dmsMatch = base.match(dmsRegex);
  if (dmsMatch) {
    const lat = dmsToDecimal(
      Number(dmsMatch[1]),
      Number(dmsMatch[2]),
      Number(dmsMatch[3]),
      dmsMatch[4]
    );
    const lon = dmsToDecimal(
      Number(dmsMatch[5]),
      Number(dmsMatch[6]),
      Number(dmsMatch[7]),
      dmsMatch[8]
    );

    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: { "Accept-Language": "pt-PT,pt;q=0.9" },
        }
      );
      const data: any = await resp.json();
      const endereco =
        data?.display_name ?? `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

      return { lat, lon, endereco };
    } catch (e) {
      console.error("[Obra] erro no reverse geocoding DMS:", e);
      return { lat, lon, endereco: `${lat}, ${lon}` };
    }
  }

  // 2) Decimal: "lat, lon"
  const decimalMatch =
    base.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lon = parseFloat(decimalMatch[3]);

    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          {
            headers: { "Accept-Language": "pt-PT,pt;q=0.9" },
          }
        );
        const data: any = await resp.json();
        const endereco =
          data?.display_name ?? `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

        return { lat, lon, endereco };
      } catch (e) {
        console.error("[Obra] erro no reverse geocoding decimal:", e);
        return { lat, lon, endereco: `${lat}, ${lon}` };
      }
    }
  }

  // 3) Endereço em texto (geocoding normal)
  let query = base;
  if (!/portugal/i.test(base)) {
    query = `${base}, Portugal`;
  }

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&addressdetails=1`,
      {
        headers: { "Accept-Language": "pt-PT,pt;q=0.9" },
      }
    );

    const data: Array<any> = await resp.json();
    if (!data || !data.length) return null;

    const item = data[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const endereco: string = item.display_name || base;

    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    return { lat, lon, endereco };
  } catch (e) {
    console.error("[Obra] erro ao geocodificar endereço:", e);
    return null;
  }
}

export default function DetalhesObraAtiva() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [abaAtiva, setAbaAtiva] = useState<Aba>("relatorios");
  const [obra, setObra] = useState<ObraView | null>(null);
  const [loading, setLoading] = useState(true);

  const [enderecoEdicao, setEnderecoEdicao] = useState("");
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [coordsMapa, setCoordsMapa] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [carregandoMapa, setCarregandoMapa] = useState(false);

  const from = (location.state as any)?.from as string | undefined;
  const backTarget =
    from && from.startsWith("/empresa/obras") ? from : "/empresa/obras";

  async function geocodeAndSetMap(endereco: string) {
    const trimmed = endereco.trim();
    if (!trimmed) {
      setCoordsMapa(null);
      return;
    }
    try {
      setCarregandoMapa(true);
      const geo = await resolverEnderecoParaCoords(trimmed);

      if (!geo) {
        toast.error("Não consegui localizar esse endereço.");
        setCoordsMapa(null);
        return;
      }

      setCoordsMapa({ lat: geo.lat, lon: geo.lon });
      setEnderecoEdicao(geo.endereco);
    } finally {
      setCarregandoMapa(false);
    }
  }

  // 🔹 Busca dados da obra + métricas
  useEffect(() => {
    if (!id) return;

    async function fetchObra() {
      try {
        setLoading(true);

        const { data: obraData, error: obraErr } = await supabase
          .from("obras")
          .select("*")
          .eq("id", id)
          .single();

        if (obraErr || !obraData) {
          console.error("[Obra] erro ao carregar obra:", obraErr);
          setObra(null);
          return;
        }

        const base: ObraRow = {
          id: obraData.id,
          nome: obraData.nome,
          status: obraData.status,
          data_inicio: obraData.data_inicio,
          data_fim: obraData.data_fim,
          local: obraData.local,
          endereco: obraData.endereco,
          cidade: obraData.cidade,
          pais: obraData.pais,
          latitude: obraData.latitude,
          longitude: obraData.longitude,
          coordenadas: obraData.coordenadas,
        };

        const { count: profCount, error: profErr } = await supabase
          .from("profissionais_obras")
          .select("*", { count: "exact", head: true })
          .eq("obra_id", id);

        if (profErr) {
          console.error("[Obra] erro ao contar profissionais:", profErr);
        }

        const { data: relatorioData, error: relErr } = await supabase
          .from("relatorios_obras")
          .select("id, data")
          .eq("obra_id", id)
          .order("data", { ascending: false })
          .limit(1);

        if (relErr) {
          console.error("[Obra] erro ao buscar última atividade:", relErr);
        }

        const ultimaAtividade =
          relatorioData && relatorioData.length
            ? relatorioData[0].data
            : null;

        const hoje = new Date();
        const inicio = base.data_inicio ? new Date(base.data_inicio) : null;
        const fim = base.data_fim ? new Date(base.data_fim) : null;

        let statusCalculado: ObraView["statusCalculado"] = "A iniciar";

        if (fim && hoje > fim) {
          if (base.status && base.status.toLowerCase() === "concluida") {
            statusCalculado = "Concluída";
          } else {
            statusCalculado = "Atrasada";
          }
        } else if (inicio && hoje >= inicio) {
          statusCalculado = "Em andamento";
        }

        const obraView: ObraView = {
          ...base,
          profissionais: profCount ?? 0,
          statusCalculado,
          ultimaAtividade,
        };

        setObra(obraView);
        setEnderecoEdicao(obraView.endereco || obraView.local || "");

        if (obraView.latitude != null && obraView.longitude != null) {
          setCoordsMapa({
            lat: obraView.latitude,
            lon: obraView.longitude,
          });
        } else if (obraView.coordenadas?.lat && obraView.coordenadas?.lon) {
          setCoordsMapa({
            lat: obraView.coordenadas.lat,
            lon: obraView.coordenadas.lon,
          });
        } else if (obraView.endereco) {
          geocodeAndSetMap(obraView.endereco);
        } else if (obraView.local) {
          geocodeAndSetMap(obraView.local);
        } else {
          setCoordsMapa(null);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchObra();
  }, [id]);

  async function handleSalvarEndereco() {
    if (!id) return;
    const texto = enderecoEdicao.trim();

    if (!texto) {
      toast.error("Informe um endereço ou coordenadas antes de salvar.");
      return;
    }

    try {
      setSalvandoEndereco(true);

      const geo = await resolverEnderecoParaCoords(texto);
      if (!geo) {
        toast.error("Não consegui localizar esse endereço.");
        return;
      }

      const { lat, lon, endereco } = geo;

      const updatePayload: any = {
        endereco,
        latitude: lat,
        longitude: lon,
        coordenadas: { lat, lon },
      };

      if (obra?.cidade) {
        updatePayload.local = obra.cidade;
      } else if (obra?.local) {
        updatePayload.local = obra.local;
      }

      // ⚠️ IMPORTANTE: usar select() para ver se alguma linha foi atualizada
      const { data, error } = await supabase
        .from("obras")
        .update(updatePayload)
        .eq("id", id)
        .select("id");

      if (error) {
        console.error("[Obra] erro ao salvar endereço:", error);
        toast.error("Erro ao salvar o endereço da obra.");
        return;
      }

      if (!data || data.length === 0) {
        // RLS / sem permissão
        console.error("[Obra] update não afetou nenhuma linha (RLS?)");
        toast.error(
          "Não foi possível atualizar o endereço (verificar permissões/RLS da tabela obras)."
        );
        return;
      }

      setObra((prev) =>
        prev
          ? {
              ...prev,
              endereco,
              local:
                updatePayload.local !== undefined
                  ? updatePayload.local
                  : prev.local,
              latitude: lat,
              longitude: lon,
              coordenadas: { lat, lon },
            }
          : prev
      );

      setCoordsMapa({ lat, lon });
      setEnderecoEdicao(endereco);

      toast.success("Endereço da obra atualizado com sucesso.");
    } finally {
      setSalvandoEndereco(false);
    }
  }

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500 dark:text-gray-400">
        {t("obra.carregando")}
      </div>
    );

  if (!obra)
    return (
      <div className="p-10 text-center text-red-500 dark:text-red-400">
        {t("obra.naoEncontrada")}
      </div>
    );

  const cards = [
    {
      icon: <Users className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />,
      label: t("obra.profissionais"),
      value: obra.profissionais ?? 0,
    },
    {
      icon: (
        <CheckCircle2 className="text-green-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />
      ),
      label: t("obra.status"),
      value: obra.statusCalculado,
    },
    {
      icon: (
        <CalendarDays className="text-yellow-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />
      ),
      label: t("obra.prazo"),
      value: obra.data_fim ? formatDate(obra.data_fim) : "—",
    },
    {
      icon: (
        <Activity className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />
      ),
      label: "Última atividade",
      value: obra.ultimaAtividade ? formatDate(obra.ultimaAtividade) : "—",
    },
  ] as const;

  const labelLocal = obra.local || obra.cidade || t("obra.localNaoDefinido");

  let mapaSrc: string | null = null;
  if (coordsMapa) {
    const { lat, lon } = coordsMapa;
    const delta = 0.01;
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    mapaSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  }

  return (
    <div className="w-full min-h-screen bg-transparent md:p-8 p-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
              {obra.nome}
            </h1>
            <p
              className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate"
              title={obra.endereco || obra.local || undefined}
            >
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              {labelLocal}
            </p>
          </div>

          <button
            onClick={() => navigate(backTarget)}
            className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm hover:underline whitespace-nowrap"
          >
            ← {t("obra.voltar")}
          </button>
        </div>

        {/* Cards principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((item, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1b2332] p-3 sm:p-4 rounded-lg sm:rounded-xl shadow-sm text-center border border-gray-100 dark:border-zinc-700 hover:shadow-md"
            >
              <div className="mb-1 sm:mb-2">{item.icon}</div>
              <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">
                {item.label}
              </p>
              <p className="text-sm sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Resumo + Endereço + Mapa */}
        <div className="bg-white dark:bg-[#1b2332] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">
          <div className="grid gap-4 md:grid-cols-2 md:items-start mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-blue-500" />
                Endereço da obra
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={enderecoEdicao}
                  onChange={(e) => setEnderecoEdicao(e.target.value)}
                  placeholder="Rua, número, cidade… ou cole coordenadas (decimal ou 38°42'07.3N 9°24'57.4W)"

                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#151b28] text-sm text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSalvarEndereco}
                    disabled={salvandoEndereco}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm font-medium transition"
                  >
                    {salvandoEndereco ? "Salvando..." : "Salvar endereço"}
                  </button>
                  <button
                    type="button"
                    onClick={() => geocodeAndSetMap(enderecoEdicao)}
                    disabled={!enderecoEdicao.trim() || carregandoMapa}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-[#151b28] text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1f2735] disabled:opacity-60"
                  >
                    {carregandoMapa ? "Atualizando mapa..." : "Atualizar mapa"}
                  </button>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                Esse endereço é usado para localização da obra no mapa e para a
                equipa saber onde deve comparecer.
              </p>
            </div>

            <div className="h-40 sm:h-48 md:h-full rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-[#111827]">
              {coordsMapa && mapaSrc ? (
                <iframe
                  title="Mapa da obra"
                  src={mapaSrc}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center px-4 text-center">
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                    O mapa será mostrado após informar e salvar um endereço
                    válido para esta obra.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3">
            Resumo da obra
          </p>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                Início previsto
              </span>
              <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-100">
                {obra.data_inicio ? formatDate(obra.data_inicio) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                Fim previsto
              </span>
              <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-100">
                {obra.data_fim ? formatDate(obra.data_fim) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                Última atividade
              </span>
              <span className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-100">
                {obra.ultimaAtividade ? formatDate(obra.ultimaAtividade) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex gap-2 sm:gap-3 border-b border-gray-200 dark:border-zinc-700 pb-3 w-max sm:w-full">
            {(
              [
                { id: "relatorios", label: t("obra.tabs.relatorios") },
                { id: "equipas", label: t("obra.tabs.equipas") },
                { id: "custos", label: t("obra.tabs.custos") },
                { id: "documentacao", label: t("obra.tabs.documentos") },
                { id: "ocorrencias", label: t("obra.tabs.ocorrencias") },
              ] as { id: Aba; label: string }[]
            ).map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`px-4 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                  abaAtiva === aba.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-[#1b2332] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-[#222d3b]"
                }`}
              >
                {aba.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da aba */}
        <div className="bg-white dark:bg-[#1b2332] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">
          {abaAtiva === "relatorios" && <RelatoriosDoDia obraId={id!} />}
          {abaAtiva === "equipas" && <Equipas obraId={id!} />}
          {abaAtiva === "custos" && <Custos obraId={id!} />}
          {abaAtiva === "documentacao" && <Documentacao obraId={id!} />}
          {abaAtiva === "ocorrencias" && <Ocorrencias obraId={id!} />}
        </div>
      </div>
    </div>
  );
}
