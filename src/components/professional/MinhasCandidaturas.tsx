import React, { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function MinhasCandidaturas() {
  const { user } = useAuth();
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Todas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCandidaturas() {
      if (!user) return;

      try {
        setLoading(true);

        console.log("Usuário logado:", user);

        // 1) Buscar o profissional ligado a este auth.user (via profissionais.user_id)
        const { data: profissional, error: profError } = await supabase
          .from("profissionais")
          .select("id")
          .eq("user_id", user.id) // 👈 AQUI É user_id, não usuario_id
          .maybeSingle(); // não dá erro se vier 0 linhas

        if (profError) {
          console.error(
            "Erro ao buscar profissional vinculado ao usuário:",
            profError
          );
          setCandidaturas([]);
          setLoading(false);
          return;
        }

        if (!profissional) {
          console.warn("Nenhum profissional encontrado para esse usuário.");
          setCandidaturas([]);
          setLoading(false);
          return;
        }

        const profissionalId = profissional.id;
        console.log("profissional.id =>", profissionalId);

        // 2) Buscar candidaturas desse profissional
        const { data, error } = await supabase
          .from("vagas_candidaturas")
          .select(
            `
            id,
            status,
            criada_em,
            observacao,
            profissional_id,
            vagas (
              titulo,
              localizacao,
              valor_dia
            )
          `
          )
          .eq("profissional_id", profissionalId)
          .order("criada_em", { ascending: false });

        if (error) {
          console.error("Erro ao buscar candidaturas:", error);
          setCandidaturas([]);
          setLoading(false);
          return;
        }

        const formatadas =
          data?.map((item: any) => ({
            id: item.id,
            titulo: item.vagas?.titulo || "—",
            local: item.vagas?.localizacao || "—",
            valor: item.vagas?.valor_dia || 0,
            data: item.criada_em,
            status: item.status || "Pendente",
          })) || [];

        setCandidaturas(formatadas);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidaturas();
  }, [user]);

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
        return "";
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

  return (
    <div className="w-full min-h-screen px-4 md:px-6 py-8 flex justify-center transition-colors duration-500">
      <div className="w-full max-w-6xl text-gray-800 dark:text-white space-y-8 md:space-y-12">
        {/* Cabeçalho */}
        <div className="text-center px-2">
          <h1 className="text-2xl md:text-4xl font-extrabold">
            Minhas Candidaturas
          </h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2 text-sm md:text-base">
            Acompanhe o progresso das suas candidaturas com um visual limpo e integrado.
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
                  className="flex justify-between items-start p-4 md:p-6 rounded-xl
                    bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700
                    hover:shadow-[0_4px_16px_rgba(59,130,246,0.25)]
                    transition-all duration-500"
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

                  <div className="flex items-center gap-2">
                    <span
                      className={`border px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${getStatusColor(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

