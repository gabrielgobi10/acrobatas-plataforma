import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  X,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type CandidaturaRow = {
  id: string;
  status: string | null;
  criada_em: string;
  observacao: string | null;
  profissional_id: string;
  vaga_id: string;
};

type VagaRow = {
  id: string;
  titulo: string | null;
  localizacao: string | null;
  valor_dia: number | null;
  duracao?: string | null;
  inicio?: string | null;
  experiencia?: string | null;
  descricao?: string | null;
};

type CandidaturaUI = {
  id: string;
  titulo: string;
  local: string;
  valor: number;
  data: string;
  status: "Pendente" | "Aceita" | "Recusada" | string;
  observacao: string | null;
  vaga?: VagaRow;
};

export default function MinhasCandidaturas() {
  const { user } = useAuth();
  const [candidaturas, setCandidaturas] = useState<CandidaturaUI[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Todas");
  const [loading, setLoading] = useState(true);

  const [selecionada, setSelecionada] = useState<CandidaturaUI | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [confirmandoCancelamento, setConfirmandoCancelamento] =
    useState(false);

  useEffect(() => {
    async function fetchCandidaturas() {
      if (!user?.id) {
        console.warn("Nenhum usuário logado no contexto Auth.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 🔹 Busca DIRETA em vagas_candidaturas (RLS filtra pelo auth.uid())
        const { data: candRows, error: candError } = await supabase
          .from("vagas_candidaturas")
          .select("id, status, criada_em, observacao, profissional_id, vaga_id")
          .order("criada_em", { ascending: false });

        if (candError) {
          console.error("Erro ao buscar candidaturas:", candError);
          setCandidaturas([]);
          return;
        }

        const candidaturasBrutas = (candRows || []) as CandidaturaRow[];

        if (candidaturasBrutas.length === 0) {
          setCandidaturas([]);
          return;
        }

        // 🔹 Buscar vagas ligadas a essas candidaturas
        const vagaIds = Array.from(
          new Set(
            candidaturasBrutas
              .map((c) => c.vaga_id)
              .filter((id): id is string => !!id)
          )
        );

        const { data: vagasRows, error: vagasError } = await supabase
          .from("vagas")
          .select(
            "id, titulo, localizacao, valor_dia, duracao, inicio, experiencia, descricao"
          )
          .in("id", vagaIds);

        if (vagasError) {
          console.error("Erro ao buscar vagas das candidaturas:", vagasError);
        }

        const mapaVagas: Record<string, VagaRow> = {};
        (vagasRows || []).forEach((v) => {
          mapaVagas[(v as VagaRow).id] = v as VagaRow;
        });

        // 🔹 Montar objetos de UI
        const formatadas: CandidaturaUI[] = candidaturasBrutas.map((item) => {
          const vaga = mapaVagas[item.vaga_id];

          return {
            id: item.id,
            titulo: vaga?.titulo || "—",
            local: vaga?.localizacao || "—",
            valor: vaga?.valor_dia ?? 0,
            data: item.criada_em,
            status: (item.status as string) || "Pendente",
            observacao: item.observacao,
            vaga,
          };
        });

        setCandidaturas(formatadas);
      } catch (err) {
        console.error("Erro inesperado ao carregar candidaturas:", err);
        setCandidaturas([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidaturas();
  }, [user?.id]);

  const handleFiltro = (status: string) => {
    setFiltroStatus((prev) => (prev === status ? "Todas" : status));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Aceita":
        return "bg-green-500/20 text-green-600 dark:text-green-400 border-green-400/30";
      case "Pendente":
        return "bg-yellow-400/20 text-yellow-600 dark:text-yellow-300 border-yellow-400/30";
      case "Recusada":
        return "bg-red-400/20 text-red-600 dark:text-red-400 border-red-400/30";
      default:
        return "bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-400/30";
    }
  };

  const progress = {
    total: candidaturas.length,
    aceitas: candidaturas.filter((c) => c.status === "Aceita").length,
    pendentes: candidaturas.filter((c) => c.status === "Pendente").length,
    recusadas: candidaturas.filter((c) => c.status === "Recusada").length,
  };

  const percent = (progress.aceitas / (progress.total || 1)) * 100;

  const candidaturasFiltradas =
    filtroStatus === "Todas"
      ? candidaturas
      : candidaturas.filter((c) => c.status === filtroStatus);

  const mensagemStatus = {
    Todas: "📋 Acompanhe todas as suas candidaturas recentes.",
    Pendente: "⏳ Aguardando resposta das empresas.",
    Aceita: "🎉 Parabéns! Algumas candidaturas foram aceitas.",
    Recusada: "❌ Algumas candidaturas não foram aceitas. Continue tentando!",
  };

  async function cancelarCandidatura(id: string) {
    try {
      setCancelandoId(id);

      const { error } = await supabase
        .from("vagas_candidaturas")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao cancelar candidatura:", error.message);
        alert("Não foi possível cancelar a candidatura. Tente novamente.");
        return;
      }

      setCandidaturas((prev) => prev.filter((c) => c.id !== id));
      setSelecionada(null);
      setConfirmandoCancelamento(false);
    } finally {
      setCancelandoId(null);
    }
  }

  function abrirModal(c: CandidaturaUI) {
    setSelecionada(c);
    setConfirmandoCancelamento(false);
  }

  function fecharModal() {
    setSelecionada(null);
    setConfirmandoCancelamento(false);
  }

  return (
    <div className="w-full min-h-screen px-4 md:px-6 py-8 flex justify-center transition-colors duration-500">
      <div className="w-full max-w-6xl text-gray-800 dark:text-white space-y-8 md:space-y-12">
        {/* Cabeçalho */}
        <div className="text-center px-2">
          <h1 className="text-2xl md:text-4xl font-extrabold">
            Minhas Candidaturas
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2 text-sm md:text-base">
            Acompanhe o progresso das suas candidaturas com um visual limpo e
            integrado.
          </p>
        </div>

        {/* Estatísticas */}
        <div className="hidden md:grid grid-cols-3 gap-6 text-center text-sm text-gray-700 dark:text-gray-300">
          <div>
            📁 Total: <b>{progress.total}</b>
          </div>
          <div>
            ✅ Taxa de aceitação: <b>{percent.toFixed(1)}%</b>
          </div>
          <div>
            📅 Última candidatura:{" "}
            <b>
              {candidaturas[0]
                ? new Date(candidaturas[0].data).toLocaleDateString("pt-PT")
                : "—"}
            </b>
          </div>
        </div>

        {/* Cards filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {[
            {
              label: "Pendentes",
              value: progress.pendentes,
              icon: Clock,
              cor: "from-yellow-400 to-yellow-500",
              status: "Pendente",
            },
            {
              label: "Aceitas",
              value: progress.aceitas,
              icon: CheckCircle,
              cor: "from-emerald-400 to-green-500",
              status: "Aceita",
            },
            {
              label: "Recusadas",
              value: progress.recusadas,
              icon: XCircle,
              cor: "from-rose-400 to-red-500",
              status: "Recusada",
            },
          ].map((card, i) => {
            const ativo = filtroStatus === card.status;
            return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleFiltro(card.status)}
                className={`cursor-pointer rounded-xl p-4 md:p-6 text-white flex flex-col items-center justify-center 
                  bg-gradient-to-b ${card.cor} shadow-[0_6px_12px_rgba(0,0,0,0.25)]
                  transition-all duration-300 ${
                    ativo ? "ring-4 ring-cyan-400/70 shadow-cyan-400/40" : ""
                  }`}
              >
                <card.icon className="w-6 h-6 opacity-90" />
                <h3 className="text-xl md:text-3xl font-extrabold mt-1">
                  {card.value}
                </h3>
                <p className="text-xs md:text-sm opacity-90">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {filtroStatus !== "Todas" && (
          <div className="flex justify-center">
            <button
              onClick={() => setFiltroStatus("Todas")}
              className="text-xs md:text-sm text-cyan-500 hover:text-cyan-300 underline mt-1"
            >
              Limpar filtro e ver todas
            </button>
          </div>
        )}

        <p className="text-center text-xs md:text-sm text-gray-500 dark:text-gray-400">
          {mensagemStatus[filtroStatus as keyof typeof mensagemStatus]}
        </p>

        {/* Lista de candidaturas */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.p
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-500 dark:text-gray-400 mt-6"
            >
              Carregando candidaturas...
            </motion.p>
          ) : candidaturasFiltradas.length === 0 ? (
            <motion.p
              key="vazio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-500 dark:text-gray-400 mt-6"
            >
              Nenhuma candidatura encontrada.
            </motion.p>
          ) : (
            <motion.div
              key="lista"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="space-y-3 md:space-y-6"
            >
              {candidaturasFiltradas.map((c) => (
                <motion.div
                  key={c.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => abrirModal(c)}
                  className="flex justify-between items-start p-4 md:p-6 rounded-xl
                    bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700
                    hover:shadow-[0_4px_16px_rgba(59,130,246,0.25)]
                    transition-all duration-500 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      <h3 className="text-base md:text-lg font-semibold">
                        {c.titulo}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      📍 {c.local} • €{c.valor}/dia
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enviada em{" "}
                      {new Date(c.data).toLocaleDateString("pt-PT")}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`border px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${getStatusColor(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModal(c);
                      }}
                      className="text-[11px] px-2 py-1 rounded-md border border-cyan-500/60 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal via portal */}
        {selecionada &&
          createPortal(
            <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center">
              <div className="relative bg-white dark:bg-slate-800 w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-height-[90vh] max-h-[90vh] overflow-y-auto p-6 md:p-8">
                <button
                  onClick={fecharModal}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-5 h-5 text-cyan-500" />
                    <h2 className="text-lg md:text-2xl font-semibold">
                      {selecionada.titulo}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    📍 {selecionada.local} • €{selecionada.valor}/dia
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enviada em{" "}
                    {new Date(selecionada.data).toLocaleDateString("pt-PT")}
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Status:
                  </span>
                  <span
                    className={`border px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${getStatusColor(
                      selecionada.status
                    )}`}
                  >
                    {selecionada.status}
                  </span>
                </div>

                {selecionada.status === "Pendente" && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                    Sua candidatura está em análise. Caso seja aceita, você
                    poderá se juntar à obra e nossa equipa entrará em contato
                    com mais detalhes.
                  </p>
                )}

                {selecionada.vaga && (
                  <div className="mb-4 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                    {selecionada.vaga.duracao && (
                      <p>
                        ⏳ <strong>Duração:</strong>{" "}
                        {selecionada.vaga.duracao}
                      </p>
                    )}
                    {selecionada.vaga.inicio && (
                      <p>
                        🚀 <strong>Início:</strong>{" "}
                        {selecionada.vaga.inicio}
                      </p>
                    )}
                    {selecionada.vaga.experiencia && (
                      <p>
                        🧰 <strong>Experiência:</strong>{" "}
                        {selecionada.vaga.experiencia}
                      </p>
                    )}
                    {selecionada.vaga.descricao && (
                      <p className="mt-2 text-sm leading-relaxed">
                        {selecionada.vaga.descricao}
                      </p>
                    )}
                  </div>
                )}

                {selecionada.observacao && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-1">
                      Sua observação:
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-200 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      {selecionada.observacao}
                    </p>
                  </div>
                )}

                {/* Rodapé do modal */}
                {selecionada.status === "Pendente" ? (
                  <>
                    {confirmandoCancelamento ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs text-red-500 dark:text-red-300">
                          Tem certeza que deseja cancelar esta candidatura? Essa
                          ação não poderá ser desfeita.
                        </p>
                        <div className="flex flex-col md:flex-row gap-3">
                          <button
                            onClick={() => setConfirmandoCancelamento(false)}
                            className="flex-1 h-11 md:h-10 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition-colors"
                          >
                            Manter candidatura
                          </button>
                          <button
                            onClick={() =>
                              cancelarCandidatura(selecionada.id)
                            }
                            disabled={cancelandoId === selecionada.id}
                            className="flex-1 h-11 md:h-10 rounded-lg bg-red-600 hover:bg-red-700 text-[13px] md:text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-70"
                          >
                            {cancelandoId === selecionada.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Cancelando...
                              </>
                            ) : (
                              "Confirmar cancelamento"
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-3 mt-4">
                        <button
                          onClick={fecharModal}
                          className="flex-1 h-11 md:h-10 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition-colors"
                        >
                          Fechar
                        </button>

                        <button
                          onClick={() => setConfirmandoCancelamento(true)}
                          className="flex-1 h-11 md:h-10 rounded-lg bg-red-600 hover:bg-red-700 text-[13px] md:text-sm font-medium text-white flex items-center justify-center gap-2"
                        >
                          Cancelar candidatura
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={fecharModal}
                      className="h-11 md:h-10 px-5 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] md:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition-colors w-full md:w-auto"
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
