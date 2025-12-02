// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Custos.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Wallet, Clock, Users, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/* =======================
   Tipos
======================= */

type ObraResumoRow = {
  empresa_id: string;
  obra_id: string;
  mes_referencia: string; // date
  horas_totais: number | null;
  custo_total: number | null;
  profissionais_distintos: number | null;
};

type ProfissionalObraRow = {
  empresa_id: string;
  obra_id: string;
  profissional_id: string;
  profissional_nome: string | null;
  funcao: string | null;
  mes_referencia: string;
  horas_normais: number;
  horas_extras: number;
  horas_totais: number;
  valor_hora: number | null;
  custo_total: number;
};

/* =======================
   Helpers
======================= */

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const currency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return "0,00 €";
  return currency.format(value);
}

function formatHours(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return "0,0 h";
  return `${value.toFixed(1).replace(".", ",")} h`;
}

function getMonthStart(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
}

/* =======================
   Componente
======================= */

export default function Custos({ obraId }: { obraId: string }) {
  const { empresa } = useAuth();
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const [resumo, setResumo] = useState<ObraResumoRow | null>(null);
  const [profissionais, setProfissionais] = useState<ProfissionalObraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingButton, setLoadingButton] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const mesReferencia = useMemo(
    () => getMonthStart(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const metrics = useMemo(() => {
    const totalCusto = resumo?.custo_total ?? 0;
    const totalHoras = resumo?.horas_totais ?? 0;
    const custoMedioHora = totalHoras > 0 ? totalCusto / totalHoras : 0;
    const totalProfissionais = resumo?.profissionais_distintos ?? 0;

    return { totalCusto, totalHoras, custoMedioHora, totalProfissionais };
  }, [resumo]);

  const monthLabel = useMemo(
    () =>
      MESES[selectedMonth].charAt(0).toUpperCase() +
      MESES[selectedMonth].slice(1),
    [selectedMonth]
  );

  async function carregarDados() {
    if (!obraId) return;
    if (!empresa?.id) return;

    setLoading(true);
    setLoadingButton(true);
    setError(null);

    try {
      // ================= RESUMO DA OBRA (view agregada) =================
      let resumoQuery = supabase
        .from("empresa_custos_mensais")
        .select(
          "empresa_id, obra_id, mes_referencia, horas_totais, custo_total, profissionais_distintos"
        )
        .eq("empresa_id", empresa.id)
        .eq("obra_id", obraId)
        .eq("mes_referencia", mesReferencia)
        .limit(1);

      const { data: resumoData, error: resumoError } = await resumoQuery;

      if (resumoError) {
        console.error("❌ [Custos Obra] Erro resumo:", resumoError);
        throw resumoError;
      }

      if (resumoData && resumoData.length > 0) {
        const r = resumoData[0] as any;
        setResumo({
          empresa_id: r.empresa_id,
          obra_id: r.obra_id,
          mes_referencia: r.mes_referencia,
          horas_totais: r.horas_totais !== null ? Number(r.horas_totais) : 0,
          custo_total: r.custo_total !== null ? Number(r.custo_total) : 0,
          profissionais_distintos:
            r.profissionais_distintos !== null
              ? Number(r.profissionais_distintos)
              : 0,
        });
      } else {
        // sem dados, mas mantemos 0 pra não quebrar o layout
        setResumo({
          empresa_id: empresa.id,
          obra_id: obraId,
          mes_referencia: mesReferencia,
          horas_totais: 0,
          custo_total: 0,
          profissionais_distintos: 0,
        });
      }

      // ================= DETALHE POR PROFISSIONAL =================
      let profQuery = supabase
        .from("empresa_custos_mensais_profissionais_detalhe")
        .select(
          "empresa_id, obra_id, profissional_id, profissional_nome, funcao, mes_referencia, horas_normais, horas_extras, horas_totais, valor_hora, custo_total"
        )
        .eq("empresa_id", empresa.id)
        .eq("obra_id", obraId)
        .eq("mes_referencia", mesReferencia);

      const { data: profData, error: profError } = await profQuery;

      if (profError) {
        console.error("❌ [Custos Obra] Erro profissionais:", profError);
        throw profError;
      }

      const lista: ProfissionalObraRow[] =
        profData?.map((row: any) => {
          const hNormais =
            row.horas_normais !== null ? Number(row.horas_normais) : 0;
          const hExtra =
            row.horas_extras !== null ? Number(row.horas_extras) : 0;
          const totalHoras =
            row.horas_totais !== null ? Number(row.horas_totais) : hNormais + hExtra;

          return {
            empresa_id: row.empresa_id,
            obra_id: row.obra_id,
            profissional_id: row.profissional_id,
            profissional_nome: row.profissional_nome ?? null,
            funcao: row.funcao ?? null,
            mes_referencia: row.mes_referencia,
            horas_normais: hNormais,
            horas_extras: hExtra,
            horas_totais: totalHoras,
            valor_hora: row.valor_hora !== null ? Number(row.valor_hora) : null,
            custo_total: row.custo_total !== null ? Number(row.custo_total) : 0,
          };
        }) ?? [];

      setProfissionais(lista);
    } catch (err: any) {
      console.error("❌ Erro ao carregar custos:", err);
      setError("Não foi possível carregar os custos desta obra para o período selecionado.");
      setResumo(null);
      setProfissionais([]);
    } finally {
      setLoading(false);
      setLoadingButton(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId, empresa?.id, mesReferencia]);

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-8 p-3 sm:p-6">
      {/* ==================== LINHA DE FILTROS (mês/ano) ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-300">
          <Calendar className="w-4 h-4" />
          <span>Período da análise</span>
          {resumo && (
            <span className="hidden sm:inline text-zinc-400 dark:text-zinc-500">
              — Custos apenas desta obra
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-100"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MESES.map((m, idx) => (
              <option key={m} value={idx}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="w-20 rounded-lg bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-100 text-right"
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(Number(e.target.value || today.getFullYear()))
            }
            min={2020}
            max={2100}
          />

          <button
            type="button"
            onClick={carregarDados}
            disabled={loadingButton}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loadingButton && <Loader2 className="w-4 h-4 animate-spin" />}
            Atualizar
          </button>
        </div>
      </div>

      {/* ==================== RESUMO ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <ResumoCard
          icon={<Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />}
          titulo={`Custo desta obra (${monthLabel} ${selectedYear})`}
          valor={formatCurrency(metrics.totalCusto)}
        />
        <ResumoCard
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />}
          titulo="Total de horas (todos os profissionais)"
          valor={formatHours(metrics.totalHoras)}
        />
        <ResumoCard
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />}
          titulo="Custo médio por hora"
          valor={formatCurrency(metrics.custoMedioHora)}
        />
      </div>

      {/* ==================== TABELA ==================== */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="text-sm sm:text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            Custos de Mão de Obra desta obra
          </h2>
          <span className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400">
            Detalhe por profissional — {monthLabel} {selectedYear}
          </span>
        </div>

        {error && (
          <div className="p-4 text-center text-xs sm:text-sm text-red-600 dark:text-red-300 border-b border-zinc-200 dark:border-zinc-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-5 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            A carregar dados...
          </div>
        ) : profissionais.length === 0 ? (
          <div className="p-5 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            Ainda não há registos de horas/custos para esta obra neste período.
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs sm:text-sm min-w-[720px]">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <tr>
                  <th className="text-left p-3 font-medium">Profissional</th>
                  <th className="text-left p-3 font-medium">Função</th>
                  <th className="text-center p-3 font-medium">Horas normais</th>
                  <th className="text-center p-3 font-medium">Horas extra</th>
                  <th className="text-center p-3 font-medium">Total horas</th>
                  <th className="text-center p-3 font-medium">€/hora</th>
                  <th className="text-right p-3 font-medium">Custo no mês</th>
                </tr>
              </thead>
              <tbody>
                {profissionais.map((p) => (
                  <motion.tr
                    key={p.profissional_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="p-3 text-zinc-800 dark:text-zinc-200 font-medium">
                      {p.profissional_nome ?? "Profissional"}
                    </td>
                    <td className="p-3 text-zinc-600 dark:text-zinc-400">
                      {p.funcao ?? "-"}
                    </td>
                    <td className="p-3 text-center text-zinc-700 dark:text-zinc-300">
                      {formatHours(p.horas_normais)}
                    </td>
                    <td className="p-3 text-center text-zinc-700 dark:text-zinc-300">
                      {formatHours(p.horas_extras)}
                    </td>
                    <td className="p-3 text-center text-zinc-700 dark:text-zinc-300">
                      {formatHours(p.horas_totais)}
                    </td>
                    <td className="p-3 text-center text-zinc-700 dark:text-zinc-300">
                      {p.valor_hora !== null
                        ? formatCurrency(p.valor_hora)
                        : "—"}
                    </td>
                    <td className="p-3 text-right text-zinc-800 dark:text-zinc-200 font-semibold">
                      {formatCurrency(p.custo_total)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== RODAPÉ ==================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-xs sm:text-sm mt-4 text-zinc-700 dark:text-zinc-300"
      >
        Total de horas:{" "}
        <span className="font-semibold text-emerald-500">
          {formatHours(metrics.totalHoras)}
        </span>{" "}
        | Custo médio por hora:{" "}
        <span className="font-semibold text-blue-500">
          {formatCurrency(metrics.custoMedioHora)}
        </span>{" "}
        | Custo total no período:{" "}
        <span className="font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(metrics.totalCusto)}
        </span>
        {metrics.totalProfissionais > 0 && (
          <>
            {" "}
            | Profissionais com registo:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {metrics.totalProfissionais}
            </span>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* =======================
   Card de resumo
======================= */

function ResumoCard({
  icon,
  titulo,
  valor,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl sm:rounded-2xl bg-white/70 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 sm:p-4 shadow-sm flex flex-col gap-1"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {icon}
        </div>
        <div>
          <div className="text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {titulo}
          </div>
          <div className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white">
            {valor}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
