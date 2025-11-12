import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  Briefcase,
  Trash2,
  Filter,
  X,
  Folder,
  CalendarDays,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MinhasCandidaturas() {
  const [candidaturas, setCandidaturas] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Todas");
  const [detalheAberto, setDetalheAberto] = useState<any | null>(null);

  useEffect(() => {
    setCandidaturas([
      { id: 1, titulo: "Canalizador", local: "Lisboa", valor: 150, data: "2025-10-08", status: "Pendente" },
      { id: 2, titulo: "Eletricista", local: "Porto", valor: 170, data: "2025-10-02", status: "Aceita" },
      { id: 3, titulo: "Servente de Obras", local: "Coimbra", valor: 120, data: "2025-09-29", status: "Recusada" },
    ]);
  }, []);

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
          <h1 className="text-2xl md:text-4xl font-extrabold">Minhas Candidaturas</h1>
          <p className="text-gray-600 dark:text-slate-300 mt-2 text-sm md:text-base">
            Acompanhe o progresso das suas candidaturas com um visual limpo e integrado.
          </p>
        </div>

        {/* Chips estatísticos compactos no mobile */}
        <div className="flex md:hidden items-center justify-center flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300 mt-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full">
            <Folder size={13} className="text-yellow-500" /> Total:{" "}
            <b>{progress.total}</b>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full">
            <Percent size={13} className="text-emerald-400" /> Aceitação:{" "}
            <b>{percent.toFixed(1)}%</b>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 px-3 py-1.5 rounded-full">
            <CalendarDays size={13} className="text-blue-400" /> Última:{" "}
            <b>{new Date(candidaturas[candidaturas.length - 1]?.data).toLocaleDateString("pt-PT")}</b>
          </div>
        </div>

        {/* Estatísticas desktop (mantida igual) */}
        <div className="hidden md:grid grid-cols-3 gap-6 text-center text-sm text-gray-700 dark:text-gray-300">
          <div>📁 Total: <b>{progress.total}</b></div>
          <div>✅ Taxa de aceitação: <b>{((percent) || 0).toFixed(1)}%</b></div>
          <div>📅 Última candidatura: <b>{new Date(candidaturas[candidaturas.length - 1]?.data).toLocaleDateString("pt-PT")}</b></div>
        </div>

        {/* Cards filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
          {[
            { label: "Pendentes", value: progress.pendentes, icon: Clock, cor: "from-yellow-400 to-yellow-500", status: "Pendente" },
            { label: "Aceitas", value: progress.aceitas, icon: CheckCircle, cor: "from-emerald-400 to-green-500", status: "Aceita" },
            { label: "Recusadas", value: progress.recusadas, icon: XCircle, cor: "from-rose-400 to-red-500", status: "Recusada" },
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
                <h3 className="text-xl md:text-3xl font-extrabold mt-1">{card.value}</h3>
                <p className="text-xs md:text-sm opacity-90">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Barra progresso */}
        <div className="px-1">
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-2">
            Progresso Geral
          </p>
          <div className="relative w-full bg-gray-300 dark:bg-slate-700/40 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 1 }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400"
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 text-center md:text-left">
            {progress.aceitas} de {progress.total} candidaturas aceitas
          </p>
        </div>

        {/* Mensagem contextual */}
        <div className="text-center mt-4 text-xs md:text-sm text-gray-500 dark:text-gray-400 italic">
          {mensagemStatus[filtroStatus as keyof typeof mensagemStatus]}
        </div>

        {/* Filtro ativo */}
        {filtroStatus !== "Todas" && (
          <div className="flex items-center justify-between mt-2 mb-2 text-sm px-1">
            <p className="text-gray-400">
              Exibindo apenas: <b>{filtroStatus}</b>
            </p>
            <motion.button
              whileHover={{ scale: 1.05, rotate: 2 }}
              onClick={() => setFiltroStatus("Todas")}
              className="flex items-center gap-1 text-cyan-500 hover:text-cyan-400 font-medium"
            >
              <Filter size={14} /> Mostrar todas
            </motion.button>
          </div>
        )}

        {/* Lista de candidaturas */}
        <AnimatePresence mode="wait">
          {candidaturasFiltradas.length === 0 ? (
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
                    shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]
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
                      Enviada em {new Date(c.data).toLocaleDateString("pt-PT")}
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setDetalheAberto(c)}
                      className="mt-2 inline-flex items-center gap-2 text-xs md:text-sm text-cyan-500 hover:text-cyan-400"
                    >
                      Ver detalhes <ArrowRightCircle size={13} />
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`border px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${getStatusColor(
                        c.status
                      )}`}
                    >
                      {c.status}
                    </span>
                    {c.status === "Pendente" && (
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500 cursor-pointer" />
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Detalhes */}
      <AnimatePresence>
        {detalheAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
            onClick={() => setDetalheAberto(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:w-[90%] md:max-w-md border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setDetalheAberto(null)}
                className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-red-500 transition"
              >
                <X size={22} />
              </button>

              <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
                <Briefcase className="text-cyan-600" /> {detalheAberto.titulo}
              </h2>

              <p className="text-gray-600 dark:text-gray-300 mb-2">
                📍 Local: <b>{detalheAberto.local}</b>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                💰 Valor diário: <b>€{detalheAberto.valor}</b>
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                📅 Data:{" "}
                <b>{new Date(detalheAberto.data).toLocaleDateString("pt-PT")}</b>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                📄 Status:{" "}
                <span className={`font-semibold ${getStatusColor(detalheAberto.status)}`}>
                  {detalheAberto.status}
                </span>
              </p>

              <div className="mt-6 flex flex-col md:flex-row justify-end gap-3">
                {detalheAberto.status === "Pendente" && (
                  <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition">
                    Cancelar candidatura
                  </button>
                )}
                <button
                  onClick={() => setDetalheAberto(null)}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

