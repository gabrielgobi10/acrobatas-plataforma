// src/components/company/perfil/tabs/HistoricoTab.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  History,
  Building2,
  MapPin,
  Clock4,
  Star,
  Loader2,
  Briefcase,
  Calendar,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Historico = {
  id: string;
  funcao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  horas_totais?: number | null;
  avaliacao_media?: number | null;
  obra?: {
    nome?: string | null;
    endereco?: string | null;
    empresa_nome?: string | null;
  } | null;
};

type HistoricoTabProps = {
  profissionalId: string | null;
  usuarioId: string; // se quiser usar depois para filtros extras
};

const HistoricoTab: React.FC<HistoricoTabProps> = ({ profissionalId }) => {
  const [obras, setObras] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!profissionalId) {
        setObras([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(
          `
          id, funcao, data_inicio, data_fim, horas_totais, avaliacao_media,
          obras ( nome, endereco, empresa_nome )
        `
        )
        .eq("profissional_id", profissionalId)
        .eq("status", "concluido")
        .order("data_fim", { ascending: false });

      if (!error && data) setObras(data as Historico[]);
      setLoading(false);
    }

    carregar();
  }, [profissionalId]);

  // Estatísticas resumidas
  const totalObras = obras.length;
  const totalHoras = obras.reduce((acc, o) => acc + (o.horas_totais || 0), 0);

  const totalDiasTrabalhados = obras.reduce((acc, o) => {
    if (!o.data_inicio || !o.data_fim) return acc;

    const inicio = new Date(o.data_inicio);
    const fim = new Date(o.data_fim);
    const diffMs = fim.getTime() - inicio.getTime();
    if (isNaN(diffMs) || diffMs < 0) return acc;

    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return acc + dias;
  }, 0);

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-50">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <History className="text-blue-500 w-5 h-5" />
          <h2 className="text-lg md:text-xl font-semibold">Histórico de Obras</h2>
        </div>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
          Obras já concluídas por este profissional através da plataforma.
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 md:p-4 text-center shadow-sm">
          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
            Obras concluídas
          </p>
          <p className="text-base md:text-xl font-semibold text-blue-500">
            {totalObras}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 md:p-4 text-center shadow-sm">
          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
            Horas totais
          </p>
          <p className="text-base md:text-xl font-semibold text-emerald-500">
            {totalHoras.toFixed(1)}h
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 md:p-4 text-center shadow-sm">
          <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">
            Dias trabalhados
          </p>
          <p className="text-base md:text-xl font-semibold text-purple-400">
            {totalDiasTrabalhados}d
          </p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
        </div>
      ) : obras.length === 0 ? (
        <p className="text-center text-slate-500 dark:text-slate-400 py-12 text-sm md:text-base">
          Este profissional ainda não possui obras concluídas registadas.
        </p>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
        >
          <AnimatePresence>
            {obras.map((o) => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 md:p-5 rounded-2xl shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 gap-2">
                  <h3 className="text-sm md:text-base font-semibold">
                    {o.obra?.nome || "Obra sem nome"}
                  </h3>
                  <span className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[11px] md:text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 self-start sm:self-auto">
                    <Briefcase className="w-3 h-3" />{" "}
                    {o.funcao || "Função não definida"}
                  </span>
                </div>

                <div className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mb-3">
                  <p className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />{" "}
                    {o.obra?.empresa_nome || "Empresa não informada"}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />{" "}
                    {o.obra?.endereco || "Sem endereço"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />{" "}
                    {o.data_inicio
                      ? new Date(o.data_inicio).toLocaleDateString("pt-PT")
                      : "—"}{" "}
                    até{" "}
                    {o.data_fim
                      ? new Date(o.data_fim).toLocaleDateString("pt-PT")
                      : "—"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock4 className="w-3.5 h-3.5" />{" "}
                    {o.horas_totais?.toFixed(1) || "0"}h trabalhadas
                  </p>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3.5 h-3.5" />
                    <span className="text-xs md:text-sm font-medium">
                      {o.avaliacao_media ? o.avaliacao_media.toFixed(1) : "—"}
                    </span>
                  </div>

                  {/* Botão de detalhes (futuro: abrir modal / ir para obra) */}
                  <button className="flex items-center gap-1 text-blue-500 hover:text-blue-400 text-[11px] md:text-xs">
                    <Eye className="w-3.5 h-3.5" />
                    Ver detalhes
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default HistoricoTab;
