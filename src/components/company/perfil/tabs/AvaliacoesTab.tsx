"use client";

import type React from "react";
import { Star, MessageCircle, Clock4, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type AvaliacoesTabProps = {
  usuarioId: string; // já vem do ProfissionalDetalhes — por enquanto não usamos
  media: number;     // média geral das avaliações (0–5)
};

const AvaliacoesTab: React.FC<AvaliacoesTabProps> = ({ media }) => {
  const mediaFormatada =
    Number.isFinite(media) && media > 0 ? media.toFixed(1) : "—";

  return (
    <div className="p-4 sm:p-6 text-slate-900 dark:text-slate-50 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
          <Star className="w-5 h-5 fill-blue-500/90 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">
            Avaliações do profissional
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Em breve, a empresa poderá ver o histórico completo de avaliações
            feitas pelas obras e pela equipa Acrobatas.
          </p>
        </div>
      </div>

      {/* Resumo rápido da média atual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-1 sm:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-sm"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Média geral atual
          </p>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-2xl font-semibold">{mediaFormatada}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              / 5
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            A média é calculada com base nas avaliações já registadas na
            plataforma.
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-1 sm:col-span-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4 flex flex-col justify-center"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">
                Módulo de avaliações em desenvolvimento
              </p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Em breve, a empresa poderá consultar avaliações por obra,
                comentários detalhados, datas, funções desempenhadas e evolução
                da performance do profissional ao longo do tempo.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bloco "Em breve" principal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Clock4 className="w-5 h-5 text-slate-500 dark:text-slate-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1 flex items-center gap-1">
            Funcionalidade em breve
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            O sistema de avaliações vai permitir que a empresa veja como o
            profissional foi avaliado em obras anteriores, pontos fortes
            destacados e feedbacks relevantes para decisões de contratação.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-300 px-3 py-1.5 cursor-not-allowed"
        >
          <MessageCircle className="w-4 h-4" />
          Em breve
        </button>
      </motion.div>
    </div>
  );
};

export default AvaliacoesTab;
