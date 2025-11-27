// src/components/company/DetalhesObraAtiva.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { MapPin, Users, CalendarDays, TrendingUp, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

// 🧩 Seções
import RelatoriosDoDia from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/RelatoriosDoDia";
import Equipas from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Equipas";
import Custos from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Custos";
import Documentacao from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Documentacao";
import Ocorrencias from "./CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Ocorrencias";

type Aba = "relatorios" | "equipas" | "custos" | "documentacao" | "ocorrencias";

export default function DetalhesObraAtiva() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [abaAtiva, setAbaAtiva] = useState<Aba>("relatorios");
  const [obra, setObra] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // origem de navegação enviada pela lista/cards
  const from = (location.state as any)?.from as string | undefined;

  // 🔹 Busca dados da obra
  useEffect(() => {
    async function fetchObra() {
      setLoading(true);
      const { data } = await supabase.from("obras").select("*").eq("id", id).single();
      if (data) setObra(data);
      setLoading(false);
    }
    if (id) fetchObra();
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

  // 🧠 SmartBack: só usa `from` se for uma rota de obras; senão força lista de obras
  const backTarget = from && from.startsWith("/empresa/obras") ? from : "/empresa/obras";

  const cards = [
    {
      icon: <Users className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />,
      label: t("obra.profissionais"),
      value: obra.profissionais_total ?? 0,
    },
    {
      icon: <CheckCircle2 className="text-green-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />,
      label: t("obra.status"),
      value: obra.status ?? "—",
    },
    {
      icon: <CalendarDays className="text-yellow-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />,
      label: t("obra.prazo"),
      value: obra.previsao_termino
        ? new Date(obra.previsao_termino).toLocaleDateString()
        : "—",
    },
    {
      icon: <TrendingUp className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6 mx-auto" />,
      label: t("obra.progresso"),
      value: obra.progresso ? `${obra.progresso}%` : "0%",
    },
  ] as const;

  const progresso = Number(obra.progresso || 0);
  const barColor =
    progresso > 90
      ? "bg-green-500"
      : progresso > 70
      ? "bg-blue-600"
      : progresso > 40
      ? "bg-yellow-400"
      : "bg-red-500";

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
              title={obra.local}
            >
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              {obra.local ? String(obra.local).split(",")[0].trim() : t("obra.localNaoDefinido")}
            </p>
          </div>

          <button
            onClick={() => navigate(backTarget)}
            className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm hover:underline whitespace-nowrap"
          >
            ← {t("obra.voltar")}
          </button>
        </div>

        {/* Cards principais (sem animação) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((item, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1b2332] p-3 sm:p-4 rounded-lg sm:rounded-xl shadow-sm text-center border border-gray-100 dark:border-zinc-700 hover:shadow-md"
            >
              <div className="mb-1 sm:mb-2">{item.icon}</div>
              <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="text-sm sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progresso (width direto, sem transition) */}
        <div className="bg-white dark:bg-[#1b2332] p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
            {t("obra.progressoTitulo")}
          </p>
          <div className="w-full bg-gray-200 dark:bg-zinc-700 h-2 sm:h-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${progresso}%` }} // sem animação
            />
          </div>
          <p className="text-right text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {progresso}% {t("obra.concluido")}
          </p>
        </div>

        {/* Abas (sem transition) */}
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

        {/* Conteúdo da aba (sem motion/transition) */}
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

