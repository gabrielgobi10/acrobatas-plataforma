// src/components/professional/CentralDeNavegacaoProfissional/Obras/ObrasAtivasDetalhes/VerDetalhesObra.tsx
// ============================================================================
// ✔ Layout otimizado para mobile + modo claro
// ✔ Cards leves, espaçamento ideal e hierarquia visual refinada
// ✔ Mantém lógica Supabase (presenças, relatório, mapa, botões)
// ✔ Equipa agora mostra NOME + FOTO (via profissionais_publico_cards_v3)
// ✔ Removeu "Chat da obra" e "Fotos recentes" (mantém botão do chat no topo)
// ✔ Presença resiliente: compara por profissionais.id E por auth.uid (profissionais.usuario_id)
// ✔ FIX: "Meu resumo" e status de hoje agora usam auth.uid real (supabase.auth.getUser())
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  CalendarCheck2,
  BadgeCheck,
  MessageSquare,
  Waypoints,
  Users,
  Clock4,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { MapContainer, Marker, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Obra = {
  id: string;
  nome?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  empresa_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  descricao?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Vinculo = { profissional_id: string; funcao?: string | null };

type Presenca = {
  id: string;
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
  profissional_id: string | null;
};

type RelatorioObra = {
  id: string;
  data_relatorio?: string | null;
  progresso?: number | null;
  descricao?: string | null;
};

type CardV3 = {
  profissional_id: string | null;
  usuario_id: string | null;
  nome: string | null;
  funcao: string | null;
  cidade: string | null;
  nivel: string | null;
  foto_url: string | null;
};

type EquipeItem = Vinculo & {
  presenteHoje: boolean | null;
  nome?: string | null;
  foto_url?: string | null;
  cidade?: string | null;
  nivel?: string | null;
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-PT");
  } catch {
    return d;
  }
}

function diffSegundos(h1: string, h2: string) {
  const [H1, M1, S1] = h1.split(":").map(Number);
  const [H2, M2, S2] = h2.split(":").map(Number);
  return Math.max(0, H2 * 3600 + M2 * 60 + S2 - (H1 * 3600 + M1 * 60 + S1));
}

const iconObra = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484167.png",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

export default function VerDetalhesObra({
  obra,
  onIrPresenca,
  onIrRelatorio,
  onIrChat,
  onIrMapa,
}: {
  obra: Obra;
  onIrPresenca?: () => void;
  onIrRelatorio?: () => void;
  onIrChat?: () => void;
  onIrMapa?: () => void;
}) {
  const { user } = useAuth();

  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<EquipeItem[]>([]);
  const [presencasHoje, setPresencasHoje] = useState<Presenca[]>([]);
  const [ultimoRelatorio, setUltimoRelatorio] = useState<RelatorioObra | null>(null);

  const [meusTotais, setMeusTotais] = useState<{
    dias: number;
    horas: number;
    presencas: number;
  }>({
    dias: 0,
    horas: 0,
    presencas: 0,
  });

  const [ultimaPresenca, setUltimaPresenca] = useState<string | null>(null);
  const [novasMensagens, setNovasMensagens] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // ✅ fonte única de verdade para presenças
  const [authUid, setAuthUid] = useState<string | null>(null);

  const hojeISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function presencaBateEquipe(
    presProfId: string | null,
    equipeProfId: string,
    card?: CardV3
  ) {
    if (!presProfId) return false;
    // cobre: presenca.profissional_id == profissionais.id (equipeProfId)
    // ou: presenca.profissional_id == profissionais.usuario_id (card.usuario_id / auth.uid)
    return presProfId === equipeProfId || (!!card?.usuario_id && presProfId === card.usuario_id);
  }

  async function getMeuProfissionalIdByAuthUid(uid: string) {
    const { data, error } = await supabase
      .from("profissionais")
      .select("id")
      .eq("usuario_id", uid)
      .maybeSingle();

    if (error) return null;
    return data?.id ?? null;
  }

  // 🔹 Carregar dados
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 0) AUTH UID REAL (fonte de verdade)
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) console.error("[VerDetalhesObra] auth.getUser error:", authErr);

        const uid = authData?.user?.id ?? null;
        setAuthUid(uid);

        // 1) Empresa
        if (obra.empresa_id) {
          const { data } = await supabase
            .from("empresas")
            .select("nome")
            .eq("id", obra.empresa_id)
            .maybeSingle();
          setEmpresaNome(data?.nome ?? null);
        } else {
          setEmpresaNome(null);
        }

        // 2) Presenças de hoje (obra)
        const { data: presHoje } = await supabase
          .from("presencas_profissionais")
          .select("id, data, hora_entrada, hora_saida, profissional_id")
          .eq("obra_id", obra.id)
          .eq("data", hojeISO);

        const presHojeArr = (presHoje || []) as Presenca[];
        setPresencasHoje(presHojeArr);

        // 3) Vínculos da equipa
        const { data: vincs } = await supabase
          .from("profissionais_obras")
          .select("profissional_id, funcao")
          .eq("obra_id", obra.id);

        const equipeIds = (vincs || [])
          .map((v) => v.profissional_id)
          .filter(Boolean) as string[];

        // 4) Enriquecer equipa via view profissionais_publico_cards_v3
        const cardsByProfId = new Map<string, CardV3>();

        if (equipeIds.length > 0) {
          const { data: cards, error: cardsErr } = await supabase
            .from("profissionais_publico_cards_v3")
            .select("profissional_id, usuario_id, nome, funcao, cidade, nivel, foto_url")
            .in("profissional_id", equipeIds);

          if (!cardsErr && cards) {
            for (const c of cards as CardV3[]) {
              if (c?.profissional_id) cardsByProfId.set(c.profissional_id, c);
            }
          }
        }

        const equipeComStatus: EquipeItem[] =
          (vincs || []).map((v) => {
            const card = cardsByProfId.get(v.profissional_id);
            return {
              ...v,
              funcao: v.funcao ?? card?.funcao ?? null,
              presenteHoje: presHojeArr.some((p) =>
                presencaBateEquipe(p.profissional_id, v.profissional_id, card)
              ),
              nome: card?.nome ?? null,
              foto_url: card?.foto_url ?? null,
              cidade: card?.cidade ?? null,
              nivel: card?.nivel ?? null,
            };
          }) || [];

        equipeComStatus.sort((a, b) =>
          a.presenteHoje === b.presenteHoje ? 0 : a.presenteHoje ? -1 : 1
        );
        setEquipe(equipeComStatus);

        // 5) Totais do meu utilizador (usa auth.uid; mantém fallback para legados)
        if (uid) {
          const meuProfId = await getMeuProfissionalIdByAuthUid(uid);

          // prioridade auth.uid (é o que a tua tabela está a usar)
          const ids = [uid, meuProfId].filter(Boolean) as string[];

          const { data: minhas } = await supabase
            .from("presencas_profissionais")
            .select("data, hora_entrada, hora_saida, profissional_id")
            .eq("obra_id", obra.id)
            .in("profissional_id", ids)
            .order("data", { ascending: false });

          if (minhas?.[0]?.data) {
            setUltimaPresenca(
              `${formatDate(minhas[0].data)} ${minhas[0].hora_entrada?.slice(0, 5) || ""}`
            );
          } else {
            setUltimaPresenca(null);
          }

          const diasSet = new Set<string>();
          let horasSomadas = 0;

          (minhas || []).forEach((p) => {
            if (p.data) diasSet.add(p.data);
            if (p.hora_entrada && p.hora_saida) {
              const seg = diffSegundos(p.hora_entrada.slice(0, 8), p.hora_saida.slice(0, 8));
              // mantém tua regra (descontar 1h)
              horasSomadas += Math.max(0, seg - 3600);
            }
          });

          setMeusTotais({
            dias: diasSet.size,
            horas: Number((horasSomadas / 3600).toFixed(1)),
            presencas: minhas?.length || 0,
          });
        } else {
          setMeusTotais({ dias: 0, horas: 0, presencas: 0 });
          setUltimaPresenca(null);
        }

        // 6) Último relatório
        const { data: rel } = await supabase
          .from("relatorios_obras")
          .select("id, data_relatorio, progresso, descricao")
          .eq("obra_id", obra.id)
          .order("data_relatorio", { ascending: false })
          .limit(1);

        setUltimoRelatorio(rel?.[0] ?? null);

        // 7) Badge de novas mensagens (sem card de preview)
        const { data: msgs } = await supabase
          .from("chat_mensagens")
          .select("lido")
          .eq("obra_id", obra.id)
          .eq("lido", false);

        setNovasMensagens(msgs?.length || 0);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obra.id, hojeISO, user?.id]);

  // 🔹 Status presença de hoje (agora correto: auth.uid)
  const statusPresencaHoje = useMemo(() => {
    if (!authUid) return null;

    const linhas = presencasHoje.filter((p) => p.profissional_id === authUid);
    if (linhas.length === 0) return "Sem registro";

    const p = linhas[0];
    if (p.hora_entrada && !p.hora_saida) return "Em serviço";
    if (p.hora_entrada && p.hora_saida) return "Encerrado";
    return "Sem registro";
  }, [presencasHoje, authUid]);

  return (
    <div className="w-full px-3 sm:px-6 py-4">
      {/* ================== CABEÇALHO ================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29]/95 p-5 mb-6 shadow-sm dark:shadow-md backdrop-blur-sm"
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-5">
          <div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-lg sm:text-xl font-bold">
              <Building2 className="text-blue-500" /> {obra.nome || "Obra sem nome"}
            </div>
            <div className="mt-1 text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-blue-400" />
              {obra.endereco || "Sem endereço"} {obra.cidade ? `— ${obra.cidade}` : ""}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Empresa: <span className="text-gray-800 dark:text-gray-200">{empresaNome || "—"}</span> • Início:{" "}
              {formatDate(obra.data_inicio)} {obra.data_fim && `• Fim: ${formatDate(obra.data_fim)}`}
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              <button
                onClick={onIrPresenca}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                <CalendarCheck2 size={16} /> Presença
              </button>
              <button
                onClick={onIrRelatorio}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                <BadgeCheck size={16} /> Relatório
              </button>
              <button
                onClick={onIrChat}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-[#2f3c51] dark:hover:bg-[#3a4961] dark:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm relative"
              >
                <MessageSquare size={16} /> Chat
                {novasMensagens > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-[10px] px-1 rounded-full text-white font-semibold">
                    {novasMensagens}
                  </span>
                )}
              </button>
              <button
                onClick={onIrMapa}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#243144] dark:hover:bg-[#2e3d56] text-gray-800 dark:text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                <Waypoints size={16} /> Mapa
              </button>
            </div>
          </div>

          {/* MINI MAPA */}
          <div className="w-full md:w-[380px]">
            {obra.latitude && obra.longitude ? (
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700">
                <MapContainer
                  center={[obra.latitude, obra.longitude]}
                  zoom={16}
                  style={{ height: 180, width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[obra.latitude, obra.longitude]} icon={iconObra}>
                    <Popup>{obra.nome}</Popup>
                  </Marker>
                  <Circle
                    center={[obra.latitude, obra.longitude]}
                    radius={300}
                    pathOptions={{ color: "blue", fillOpacity: 0.1 }}
                  />
                </MapContainer>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                📍 Localização não registada
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ================== CONTEÚDO PRINCIPAL ================== */}
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Loader2 className="animate-spin" size={18} /> Carregando dados...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Equipa */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md"
          >
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
              <Users className="text-blue-500" /> Equipa na obra
            </div>

            {equipe.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhum profissional registado.
              </div>
            ) : (
              <div className="space-y-3">
                {equipe.slice(0, 6).map((p) => (
                  <div
                    key={p.profissional_id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-[#1a2334] rounded-lg p-3 border border-gray-200 dark:border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white/70 dark:bg-[#0f1626] flex items-center justify-center shrink-0">
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nome || "Profissional"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Users className="text-blue-500" size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-gray-800 dark:text-gray-100 font-medium text-sm truncate">
                          {p.nome || "Profissional"}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs truncate">
                          {(p.funcao || "Profissional")}
                          {p.cidade ? ` • ${p.cidade}` : ""}
                          {p.nivel ? ` • ${p.nivel}` : ""}
                        </div>
                      </div>
                    </div>

                    {p.presenteHoje ? (
                      <span className="text-emerald-500 text-xs flex items-center gap-1 shrink-0">
                        <CheckCircle2 size={14} /> Presente
                      </span>
                    ) : (
                      <span className="text-amber-500 text-xs flex items-center gap-1 shrink-0">
                        <XCircle size={14} /> Não marcou
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Meu resumo */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md"
          >
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
              <Clock4 className="text-blue-500" /> Meu resumo
            </div>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(meusTotais).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-gray-50 dark:bg-[#1a2334] p-3 text-center rounded-lg"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {k}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {v}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              Hoje:{" "}
              {statusPresencaHoje === "Em serviço" ? (
                <span className="text-emerald-500 font-medium">🟢 Em serviço</span>
              ) : statusPresencaHoje === "Encerrado" ? (
                <span className="text-blue-500 font-medium">🔵 Encerrado</span>
              ) : (
                <span className="text-amber-500 font-medium">⚠️ Sem registro</span>
              )}
            </div>

            {ultimaPresenca && (
              <div className="text-xs text-gray-400 mt-1">Última: {ultimaPresenca}</div>
            )}
          </motion.div>

          {/* Último relatório */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-[#141b29] p-5 shadow-sm dark:shadow-md xl:col-span-2"
          >
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold mb-3">
              <BadgeCheck className="text-blue-500" /> Último relatório
            </div>

            {!ultimoRelatorio ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhum relatório enviado.
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  📅 {formatDate(ultimoRelatorio.data_relatorio)}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Progresso:{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {ultimoRelatorio.progresso ?? 0}%
                  </span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 italic">
                  {ultimoRelatorio.descricao || "Sem descrição."}
                </div>
                <button
                  onClick={onIrRelatorio}
                  className="mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-2"
                >
                  <BadgeCheck size={14} /> Ver completo
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
