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
  local?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
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

export default function DetalhesObraAtiva() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [abaAtiva, setAbaAtiva] = useState<Aba>("relatorios");
  const [obra, setObra] = useState<ObraView | null>(null);
  const [loading, setLoading] = useState(true);

  // origem de navegação enviada pela lista/cards
  const from = (location.state as any)?.from as string | undefined;

  // Smart back
  const backTarget =
    from && from.startsWith("/empresa/obras") ? from : "/empresa/obras";

  // 🔹 Busca dados da obra + métricas
  useEffect(() => {
    if (!id) return;

    async function fetchObra() {
      try {
        setLoading(true);

        // obra básica
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

        const base: ObraRow = obraData as ObraRow;

        // contagem de profissionais vinculados
        const { count: profCount, error: profErr } = await supabase
          .from("profissionais_obras")
          .select("*", { count: "exact", head: true })
          .eq("obra_id", id);

        if (profErr) {
          console.error("[Obra] erro ao contar profissionais:", profErr);
        }

        // última atividade via relatórios da obra
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

        // status calculado
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
        } else {
          statusCalculado = "A iniciar";
        }

        setObra({
          ...base,
          profissionais: profCount ?? 0,
          statusCalculado,
          ultimaAtividade,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchObra();
  }, [id]);

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
      label: "Última atividade", // texto direto pra não dar erro de tradução
      value: obra.ultimaAtividade ? formatDate(obra.ultimaAtividade) : "—",
    },
  ] as const;

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
              title={obra.local || undefined}
            >
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              {obra.local
                ? String(obra.local).split(",")[0].trim()
                : t("obra.localNaoDefinido")}
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

        {/* Resumo da obra */}
        <div className="bg-white dark:bg-[#1b2332] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3">
            {/* texto direto pra não bater no i18n */}
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
            {([
              { id: "relatorios", label: t("obra.tabs.relatorios") },
              { id: "equipas", label: t("obra.tabs.equipas") },
              { id: "custos", label: t("obra.tabs.custos") },
              { id: "documentacao", label: t("obra.tabs.documentos") },
              { id: "ocorrencias", label: t("obra.tabs.ocorrencias") },
            ] as { id: Aba; label: string }[]).map((aba) => (
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
