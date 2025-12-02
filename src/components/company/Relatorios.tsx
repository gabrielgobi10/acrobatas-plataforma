// src/components/company/CentralDeNavegacaoEmpresa/Relatorios/RelatorioGeral.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Calendar,
  Factory,
  Loader2,
  RefreshCcw,
  ChevronDown,
  Users,
  Activity,
  Clock,
  Euro,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =======================
   Tipos
======================= */

type EmpresaCustosMensaisRow = {
  empresa_id: string;
  obra_id: string;
  mes_referencia: string;
  horas_totais: number | null;
  custo_total: number | null;
  profissionais_distintos: number | null;
};

type ObraOption = {
  id: string;
  nome: string;
};

type ProfissionalDetalheRow = {
  empresa_id: string;
  obra_id: string;
  profissional_id: string;
  profissional_nome: string | null;
  funcao: string | null;
  mes_referencia: string;
  horas_normais: number | null;
  horas_extras: number | null;
  horas_totais: number | null;
  valor_hora: number | null;
  custo_total: number | null;
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
  if (!value || Number.isNaN(value)) return "€ 0,00";
  return currency.format(value);
}

function formatHours(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) return "0h";
  return `${value.toFixed(1).replace(".", ",")}h`;
}

function getMonthStart(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
}

/* =======================
   RPC helper
======================= */

async function getMinhaEmpresaId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("minha_empresa_id");

  if (error) {
    console.error("[RelatorioGeral] minha_empresa_id ->", error.message || error);
    return null;
  }

  return (data as string) ?? null;
}

/* =======================
   SimpleSelect
======================= */

type SimpleSelectOption = { value: string | number; label: string };

type SimpleSelectProps = {
  value: string | number;
  options: SimpleSelectOption[];
  onChange: (value: string | number) => void;
  leftIcon?: ReactNode;
};

function SimpleSelect({ value, options, onChange, leftIcon }: SimpleSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? options[0],
    [options, value]
  );

  function handleSelect(v: string | number) {
    onChange(v);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 w-full border rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        {leftIcon && (
          <span className="text-slate-400 dark:text-slate-300">{leftIcon}</span>
        )}
        <span className="flex-1 text-left truncate">{selected?.label}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-3 py-2 text-sm truncate transition ${
                opt.value === value
                  ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200"
                  : "text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =======================
   Componente principal
======================= */

export default function RelatorioGeral() {
  const { user } = useAuth();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedObraId, setSelectedObraId] = useState<string>("all");

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [custosData, setCustosData] = useState<EmpresaCustosMensaisRow[]>([]);
  const [profissionaisDetalhe, setProfissionaisDetalhe] = useState<
    ProfissionalDetalheRow[]
  >([]);

  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    setChartReady(true);
  }, []);

  /* ========= empresa via RPC ========= */

  useEffect(() => {
    if (!user?.id) {
      setEmpresaId(null);
      return;
    }

    let cancelled = false;

    async function fetchEmpresa() {
      setLoadingEmpresa(true);
      setError(null);

      const id = await getMinhaEmpresaId();

      if (cancelled) return;

      // Se não vier empresa_id, só deixa null silencioso (sem banner vermelho)
      if (!id) {
        setEmpresaId(null);
      } else {
        setEmpresaId(id);
      }

      setLoadingEmpresa(false);
    }

    fetchEmpresa();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* ========= obras ========= */

  useEffect(() => {
    if (!empresaId) {
      setObras([]);
      return;
    }

    let cancelled = false;

    async function fetchObras() {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("[RelatorioGeral] Erro ao buscar obras:", error);
      } else if (data) {
        setObras(
          data.map((o: any) => ({
            id: o.id,
            nome: o.nome ?? "Obra sem nome",
          }))
        );
      }
    }

    fetchObras();

    return () => {
      cancelled = true;
    };
  }, [empresaId]);

  /* ========= dados do mês ========= */

  const mesReferencia = useMemo(
    () => getMonthStart(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  async function loadData() {
    if (!empresaId) return;

    setLoadingData(true);
    setError(null);

    try {
      // custos por obra
      let custosQuery = supabase
        .from("empresa_custos_mensais")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("mes_referencia", mesReferencia);

      if (selectedObraId !== "all") {
        custosQuery = custosQuery.eq("obra_id", selectedObraId);
      }

      const { data: custos, error: custosError } = await custosQuery;

      if (custosError) {
        console.error("[RelatorioGeral] Erro custos:", custosError);
        throw new Error("Não foi possível carregar os custos deste período.");
      }

      const normalisedCustos: EmpresaCustosMensaisRow[] =
        custos?.map((row: any) => ({
          empresa_id: row.empresa_id,
          obra_id: row.obra_id,
          mes_referencia: row.mes_referencia,
          horas_totais:
            row.horas_totais !== null ? Number(row.horas_totais) : 0,
          custo_total: row.custo_total !== null ? Number(row.custo_total) : 0,
          profissionais_distintos:
            row.profissionais_distintos !== null
              ? Number(row.profissionais_distintos)
              : 0,
        })) ?? [];

      setCustosData(normalisedCustos);

      // detalhe profissionais
      let profQuery = supabase
        .from("empresa_custos_mensais_profissionais_detalhe")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("mes_referencia", mesReferencia);

      if (selectedObraId !== "all") {
        profQuery = profQuery.eq("obra_id", selectedObraId);
      }

      const { data: detalhe, error: profError } = await profQuery;

      if (profError) {
        console.error("[RelatorioGeral] Erro detalhe profissionais:", profError);
        throw new Error("Não foi possível carregar o detalhe de profissionais.");
      }

      const normalisedDetalhe: ProfissionalDetalheRow[] =
        detalhe?.map((row: any) => ({
          empresa_id: row.empresa_id,
          obra_id: row.obra_id,
          profissional_id: row.profissional_id,
          profissional_nome: row.profissional_nome ?? null,
          funcao: row.funcao ?? null,
          mes_referencia: row.mes_referencia,
          horas_normais:
            row.horas_normais !== null ? Number(row.horas_normais) : 0,
          horas_extras:
            row.horas_extras !== null ? Number(row.horas_extras) : 0,
          horas_totais:
            row.horas_totais !== null ? Number(row.horas_totais) : null,
          valor_hora:
            row.valor_hora !== null ? Number(row.valor_hora) : null,
          custo_total:
            row.custo_total !== null ? Number(row.custo_total) : 0,
        })) ?? [];

      setProfissionaisDetalhe(normalisedDetalhe);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar dados.");
      setCustosData([]);
      setProfissionaisDetalhe([]);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!empresaId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, mesReferencia, selectedObraId]);

  /* ========= métricas gerais ========= */

  const metrics = useMemo(() => {
    if (!custosData.length) {
      return {
        totalCusto: 0,
        totalHoras: 0,
        obrasComEquipe: 0,
        custoMedioHora: 0,
        horasExtrasTotais: 0,
        profissionaisDistintos: 0,
      };
    }

    const totalCusto = custosData.reduce(
      (acc, row) => acc + (row.custo_total ?? 0),
      0
    );
    const totalHoras = custosData.reduce(
      (acc, row) => acc + (row.horas_totais ?? 0),
      0
    );
    const obrasComEquipe = custosData.length;
    const custoMedioHora = totalHoras > 0 ? totalCusto / totalHoras : 0;

    const horasExtrasTotais = profissionaisDetalhe.reduce(
      (acc, row) => acc + (row.horas_extras ?? 0),
      0
    );

    const profIds = new Set(
      profissionaisDetalhe.map((row) => row.profissional_id)
    );

    return {
      totalCusto,
      totalHoras,
      obrasComEquipe,
      custoMedioHora,
      horasExtrasTotais,
      profissionaisDistintos: profIds.size,
    };
  }, [custosData, profissionaisDetalhe]);

  /* ========= dados por obra (tabela + gráfico) ========= */

  const obrasResumo = useMemo(
    () =>
      custosData.map((row) => {
        const obraName =
          obras.find((o) => o.id === row.obra_id)?.nome ?? "Obra";

        const horas = row.horas_totais ?? 0;
        const custo = row.custo_total ?? 0;
        const custoMedio = horas > 0 ? custo / horas : 0;
        const profissionais = row.profissionais_distintos ?? 0;

        const horasExtraObra = profissionaisDetalhe
          .filter((p) => p.obra_id === row.obra_id)
          .reduce((acc, p) => acc + (p.horas_extras ?? 0), 0);

        return {
          obraId: row.obra_id,
          obra: obraName,
          horas,
          custo,
          custoMedio,
          profissionais,
          horasExtra: horasExtraObra,
        };
      }),
    [custosData, obras, profissionaisDetalhe]
  );

  const chartObras = useMemo(
    () =>
      obrasResumo.map((o) => ({
        name: o.obra,
        custo: o.custo,
        horas: o.horas,
      })),
    [obrasResumo]
  );

  /* ========= top profissionais ========= */

  const topProfissionais = useMemo(() => {
    if (!profissionaisDetalhe.length) return [];

    const mapa = new Map<
      string,
      {
        profissional_id: string;
        nome: string;
        funcao: string | null;
        horasTotais: number;
        horasExtras: number;
        custoTotal: number;
      }
    >();

    for (const row of profissionaisDetalhe) {
      const id = row.profissional_id;
      if (!id) continue;

      const atual = mapa.get(id) ?? {
        profissional_id: id,
        nome: row.profissional_nome ?? "Profissional",
        funcao: row.funcao ?? null,
        horasTotais: 0,
        horasExtras: 0,
        custoTotal: 0,
      };

      const hNormais = row.horas_normais ?? 0;
      const hExtras = row.horas_extras ?? 0;
      const totalHoras = row.horas_totais ?? hNormais + hExtras;

      atual.horasTotais += totalHoras;
      atual.horasExtras += hExtras;
      atual.custoTotal += row.custo_total ?? 0;

      mapa.set(id, atual);
    }

    return Array.from(mapa.values())
      .sort((a, b) => b.horasTotais - a.horasTotais)
      .slice(0, 5);
  }, [profissionaisDetalhe]);

  const chartProfissionais = useMemo(
    () =>
      topProfissionais.map((p) => ({
        name: p.nome,
        horas: p.horasTotais,
      })),
    [topProfissionais]
  );

  /* ========= label mês ========= */

  const monthLabel = useMemo(
    () =>
      MESES[selectedMonth].charAt(0).toUpperCase() +
      MESES[selectedMonth].slice(1),
    [selectedMonth]
  );

  const monthOptions: SimpleSelectOption[] = MESES.map((m, idx) => ({
    value: idx,
    label: m.charAt(0).toUpperCase() + m.slice(1) + ".",
  }));

  const obraOptions: SimpleSelectOption[] = [
    { value: "all", label: "Todas as obras" },
    ...obras.map((o) => ({ value: o.id, label: o.nome })),
  ];

  const isLoading = loadingEmpresa || loadingData;

  /* =======================
     Render
  ======================== */

  return (
    <div className="flex flex-col gap-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Relatórios ▸ Geral
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Visão consolidada de custos e desempenho das obras no período
              selecionado.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-300">
            Mês
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SimpleSelect
                value={selectedMonth}
                options={monthOptions}
                onChange={(v) => setSelectedMonth(Number(v))}
                leftIcon={<Calendar className="w-4 h-4" />}
              />
            </div>
            <input
              type="number"
              className="w-20 sm:w-24 border rounded-lg px-2 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 text-right"
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(Number(e.target.value || today.getFullYear()))
              }
              min={2020}
              max={2100}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-300">
            Obra
          </label>
          <SimpleSelect
            value={selectedObraId}
            options={obraOptions}
            onChange={(v) => setSelectedObraId(String(v))}
          />
        </div>

        <div className="flex gap-2 md:self-auto">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60 w-full md:w-auto"
            onClick={loadData}
            disabled={isLoading || !empresaId}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Atualizando…
              </>
            ) : (
              <>
                <RefreshCcw className="w-4 h-4" />
                Aplicar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Erro (apenas para erros reais de carregamento) */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Sem dados */}
      {!isLoading && !custosData.length && (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 sm:py-12 dark:bg-slate-900/40 dark:border-slate-700">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-xs sm:text-sm text-center max-w-md dark:text-slate-300">
            <span className="font-medium">
              Ainda não há registos para este período.
            </span>
            <span>
              Assim que a equipa começar a marcar presenças e custos nas obras,
              o resumo geral vai aparecer aqui.
            </span>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {custosData.length > 0 && (
        <>
          {/* KPIs principais */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Custo total do mês
                </span>
                <Euro className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrency(metrics.totalCusto)}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Horas totais
                </span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                {formatHours(metrics.totalHoras)}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Horas extra (total)
                </span>
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                {formatHours(metrics.horasExtrasTotais)}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Custo médio por hora
                </span>
                <Euro className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                {formatCurrency(metrics.custoMedioHora)}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Obras com equipa
                </span>
                <Factory className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                {metrics.obrasComEquipe}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 flex flex-col gap-1.5 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wide">
                  Nº de profissionais
                </span>
                <Users className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-50">
                {metrics.profissionaisDistintos}
              </div>
            </div>
          </div>

          {/* Gráficos principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 dark:bg-slate-900 dark:border-slate-700">
              <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">
                Custo por obra — {monthLabel} {selectedYear}
              </h2>
              <div className="w-full h-56 sm:h-72">
                {chartReady && (
                  <ResponsiveContainer>
                    <BarChart
                      data={chartObras}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="custoGeralGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        height={50}
                        tick={{ fontSize: 10, angle: 0 }}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          currency.format(v).replace("€", "").trim()
                        }
                        width={60}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => {
                          if (name === "custo")
                            return [formatCurrency(value), "Custo"];
                          if (name === "horas")
                            return [formatHours(value), "Horas"];
                          return [value, name];
                        }}
                      />
                      <Bar
                        dataKey="custo"
                        radius={[8, 8, 0, 0]}
                        fill="url(#custoGeralGradient)"
                        maxBarSize={80}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 dark:bg-slate-900 dark:border-slate-700">
              <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">
                Horas por profissional (Top 5)
              </h2>
              <div className="w-full h-56 sm:h-72">
                {chartReady && (
                  <ResponsiveContainer>
                    <BarChart
                      data={chartProfissionais}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        height={50}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          `${Number(v).toFixed(1).replace(".", ",")}h`
                        }
                        width={60}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatHours(value), "Horas"]}
                      />
                      <Bar
                        dataKey="horas"
                        radius={[8, 8, 0, 0]}
                        fill="#22c55e"
                        maxBarSize={80}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tabela por obra */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 dark:bg-slate-900 dark:border-slate-700">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">
              Resumo por obra
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-left text-[10px] sm:text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:text-slate-300 dark:border-slate-700">
                    <th className="py-2 pr-3 sm:pr-4">Obra</th>
                    <th className="py-2 px-3 sm:px-4">Horas</th>
                    <th className="py-2 px-3 sm:px-4 hidden sm:table-cell">
                      Horas extra
                    </th>
                    <th className="py-2 px-3 sm:px-4">Custo total</th>
                    <th className="py-2 px-3 sm:px-4 hidden sm:table-cell">
                      Custo médio/hora
                    </th>
                    <th className="py-2 px-3 sm:px-4 text-right">
                      Profissionais
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {obrasResumo.map((row) => (
                    <tr
                      key={row.obraId}
                      className="border-b border-slate-50 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-3 sm:pr-4 whitespace-nowrap dark:text-slate-100">
                        {row.obra}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100">
                        {formatHours(row.horas)}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100 hidden sm:table-cell">
                        {formatHours(row.horasExtra)}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100">
                        {formatCurrency(row.custo)}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100 hidden sm:table-cell">
                        {formatCurrency(row.custoMedio)}
                      </td>
                      <td className="py-2 px-3 sm:px-4 text-right dark:text-slate-100">
                        {row.profissionais}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela Top profissionais */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 sm:p-4 dark:bg-slate-900 dark:border-slate-700">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">
              Detalhe — Top profissionais no período
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-left text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:text-slate-300 dark:border-slate-700">
                    <th className="py-2 pr-3 sm:pr-4">Profissional</th>
                    <th className="py-2 px-3 sm:px-4">Função</th>
                    <th className="py-2 px-3 sm:px-4">Horas totais</th>
                    <th className="py-2 px-3 sm:px-4 hidden sm:table-cell">
                      Horas extra
                    </th>
                    <th className="py-2 px-3 sm:px-4">Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProfissionais.map((row) => (
                    <tr
                      key={row.profissional_id}
                      className="border-b border-slate-50 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-3 sm:pr-4 whitespace-nowrap dark:text-slate-100">
                        {row.nome}
                      </td>
                      <td className="py-2 px-3 sm:px-4 whitespace-nowrap dark:text-slate-100">
                        {row.funcao ?? "—"}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100">
                        {formatHours(row.horasTotais)}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100 hidden sm:table-cell">
                        {formatHours(row.horasExtras)}
                      </td>
                      <td className="py-2 px-3 sm:px-4 dark:text-slate-100">
                        {formatCurrency(row.custoTotal)}
                      </td>
                    </tr>
                  ))}
                  {!topProfissionais.length && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-slate-500 dark:text-slate-300 text-xs sm:text-sm"
                      >
                        Ainda não há registos suficientes para calcular o
                        ranking de profissionais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
