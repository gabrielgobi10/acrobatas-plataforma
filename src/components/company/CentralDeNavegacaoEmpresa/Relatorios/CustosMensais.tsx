// src/components/company/CentralDeNavegacaoEmpresa/Relatorios/CustosMensais.tsx
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
  Euro,
  Factory,
  Loader2,
  RefreshCcw,
  TrendingUp,
  ChevronDown,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =======================
   Tipos
======================= */

type EmpresaCustosMensaisRow = {
  empresa_id: string;
  obra_id: string;
  mes_referencia: string; // date
  horas_totais: number | null;
  custo_total: number | null;
  profissionais_distintos: number | null;
};

type ObraOption = {
  id: string;
  nome: string;
};

type ObraProfissionalRow = {
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
  // monthIndex 0–11
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
}

/* =======================
   RPC helper — mesma lógica de Obras
======================= */

async function getMinhaEmpresaId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("minha_empresa_id");

  if (error) {
    console.error("[CustosMensais] minha_empresa_id ->", error.message || error);
    return null;
  }

  return (data as string) ?? null;
}

/* =======================
   SimpleSelect (dropdown custom)
======================= */

type SimpleSelectOption = { value: string | number; label: string };

type SimpleSelectProps = {
  value: string | number;
  options: SimpleSelectOption[];
  onChange: (value: string | number) => void;
  leftIcon?: ReactNode;
  label?: string;
};

function SimpleSelect({
  value,
  options,
  onChange,
  leftIcon,
}: SimpleSelectProps) {
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

export default function CustosMensais() {
  const { user } = useAuth();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedObraId, setSelectedObraId] = useState<string>("all");

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [data, setData] = useState<EmpresaCustosMensaisRow[]>([]);
  const [loadingEmpresa, setLoadingEmpresa] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // detalhe por profissionais na obra
  const [obraDetalheId, setObraDetalheId] = useState<string | null>(null);
  const [obraDetalheNome, setObraDetalheNome] = useState<string | null>(null);
  const [profissionaisObra, setProfissionaisObra] = useState<
    ObraProfissionalRow[]
  >([]);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);

  // evita warnings do Recharts (width/height -1)
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    setChartReady(true);
  }, []);

  /* =======================
     Buscar empresa (RPC)
  ======================== */

  useEffect(() => {
    if (!user?.id) {
      setEmpresaId(null);
      return;
    }

    let cancelled = false;

    async function fetchEmpresaViaRpc() {
      setLoadingEmpresa(true);
      setError(null);

      const id = await getMinhaEmpresaId();

      if (cancelled) return;

      if (!id) {
        setEmpresaId(null);
        setError("Nenhuma empresa associada ao utilizador.");
      } else {
        setEmpresaId(id);
      }

      setLoadingEmpresa(false);
    }

    fetchEmpresaViaRpc();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /* =======================
     Buscar obras da empresa
  ======================== */

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
        console.error("[CustosMensais] Erro ao buscar obras:", error);
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

  /* =======================
     Buscar dados da view empresa_custos_mensais
  ======================== */

  const mesReferencia = useMemo(
    () => getMonthStart(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  async function loadData() {
    if (!empresaId) return;

    setLoadingData(true);
    setError(null);

    let query = supabase
      .from("empresa_custos_mensais")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("mes_referencia", mesReferencia);

    if (selectedObraId !== "all") {
      query = query.eq("obra_id", selectedObraId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[CustosMensais] Erro ao buscar custos mensais:", error);
      setError("Não foi possível carregar os custos deste período.");
      setData([]);
    } else {
      const normalised: EmpresaCustosMensaisRow[] =
        data?.map((row: any) => ({
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

      setData(normalised);
    }

    // ao mudar filtro/mês, limpamos detalhe de profissionais
    setObraDetalheId(null);
    setProfissionaisObra([]);

    setLoadingData(false);
  }

  useEffect(() => {
    if (!empresaId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, mesReferencia, selectedObraId]);

  /* =======================
     Buscar profissionais por obra (view *detalhe*)
  ======================== */

  async function loadProfissionaisObra(obraId: string) {
    if (!empresaId) return;

    setLoadingProfissionais(true);

    const { data, error } = await supabase
      .from("empresa_custos_mensais_profissionais_detalhe")
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("obra_id", obraId)
      .eq("mes_referencia", mesReferencia);

    if (error) {
      console.error(
        "[CustosMensais] Erro ao buscar profissionais da obra:",
        error
      );
      setProfissionaisObra([]);
    } else {
      const normalised: ObraProfissionalRow[] =
        data?.map((row: any) => ({
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

      setProfissionaisObra(normalised);
    }

    setLoadingProfissionais(false);
  }

  function handleVerProfissionais(obraId: string) {
    const obra = obras.find((o) => o.id === obraId);
    setObraDetalheId(obraId);
    setObraDetalheNome(obra?.nome ?? "Obra");
    loadProfissionaisObra(obraId);
  }

  function handleFecharDetalhe() {
    setObraDetalheId(null);
    setProfissionaisObra([]);
  }

  /* =======================
     Métricas derivadas
  ======================== */

  const metrics = useMemo(() => {
    if (!data.length) {
      return {
        totalCusto: 0,
        totalHoras: 0,
        obrasComEquipe: 0,
        custoMedioHora: 0,
      };
    }

    const totalCusto = data.reduce(
      (acc, row) => acc + (row.custo_total ?? 0),
      0
    );
    const totalHoras = data.reduce(
      (acc, row) => acc + (row.horas_totais ?? 0),
      0
    );
    const obrasComEquipe = data.length;
    const custoMedioHora = totalHoras > 0 ? totalCusto / totalHoras : 0;

    return {
      totalCusto,
      totalHoras,
      obrasComEquipe,
      custoMedioHora,
    };
  }, [data]);

  const chartData = useMemo(
    () =>
      data.map((row) => {
        const obraName =
          obras.find((o) => o.id === row.obra_id)?.nome ?? "Obra";
        return {
          name: obraName,
          custo: row.custo_total ?? 0,
          horas: row.horas_totais ?? 0,
        };
      }),
    [data, obras]
  );

  const isLoading = loadingEmpresa || loadingData;

  const monthOptions: SimpleSelectOption[] = MESES.map((m, idx) => ({
    value: idx,
    label: m.charAt(0).toUpperCase() + m.slice(1) + ".",
  }));

  const obraOptions: SimpleSelectOption[] = [
    { value: "all", label: "Todas as obras" },
    ...obras.map((o) => ({ value: o.id, label: o.nome })),
  ];

  /* ===== métricas do detalhe de profissionais da obra ===== */

  const obraDetalheMetrics = useMemo(() => {
    if (!profissionaisObra.length) {
      return {
        totalCusto: 0,
        totalHoras: 0,
        totalProfissionais: 0,
      };
    }

    const totalCusto = profissionaisObra.reduce(
      (acc, row) => acc + (row.custo_total ?? 0),
      0
    );

    const totalHoras = profissionaisObra.reduce((acc, row) => {
      if (row.horas_totais != null) return acc + row.horas_totais;
      const hNormais = row.horas_normais ?? 0;
      const hExtra = row.horas_extras ?? 0;
      return acc + hNormais + hExtra;
    }, 0);

    return {
      totalCusto,
      totalHoras,
      totalProfissionais: profissionaisObra.length,
    };
  }, [profissionaisObra]);

  /* =======================
     Render
  ======================== */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Relatórios ▸ Custos Mensais
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Visão dos custos de mão de obra da equipa Acrobatas por obra, no
          período selecionado.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 bg-white rounded-xl shadow-sm border border-slate-100 p-4 dark:bg-slate-900 dark:border-slate-700">
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
              className="w-24 border rounded-lg px-2 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 text-right"
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
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

      {/* Erro */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
              Custo total do mês
            </span>
            <Euro className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatCurrency(metrics.totalCusto)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
              Horas totais trabalhadas
            </span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatHours(metrics.totalHoras)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
              Obras com equipa no mês
            </span>
            <Factory className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {metrics.obrasComEquipe}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
              Custo médio por hora
            </span>
            <Euro className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatCurrency(metrics.custoMedioHora)}
          </div>
        </div>
      </div>

      {/* Gráfico + tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-white py-12 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex flex-col items-center gap-3 text-slate-500 text-sm dark:text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>A carregar dados…</span>
          </div>
        </div>
      ) : !data.length ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 dark:bg-slate-900/40 dark:border-slate-700">
          <div className="flex flex-col items-center gap-2 text-slate-500 text-sm text-center max-w-md dark:text-slate-300">
            <span className="font-medium">
              Ainda não há horas registadas para este período.
            </span>
            <span>
              Assim que a equipa começar a marcar presenças nas obras, os custos
              vão aparecer automaticamente aqui.
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Gráfico */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 dark:bg-slate-900 dark:border-slate-700">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
              Custo total por obra (mês)
            </h2>
            <div className="w-full h-72">
              {chartReady && (
                <ResponsiveContainer>
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="custoGradient"
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
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        currency.format(v).replace("€", "").trim()
                      }
                      width={70}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
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
                      fill="url(#custoGradient)"
                      maxBarSize={80}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabela por obra */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 dark:bg-slate-900 dark:border-slate-700">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">
              Detalhe por obra
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:text-slate-300 dark:border-slate-700">
                    <th className="py-2 pr-4">Obra</th>
                    <th className="py-2 px-4">Horas</th>
                    <th className="py-2 px-4">Custo total</th>
                    <th className="py-2 px-4">Custo médio/hora</th>
                    <th className="py-2 px-4 text-right">Profissionais</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const horas = row.horas_totais ?? 0;
                    const custo = row.custo_total ?? 0;
                    const custoMedio = horas > 0 ? custo / horas : 0;
                    const obraName =
                      obras.find((o) => o.id === row.obra_id)?.nome ?? "Obra";

                    const isSelected = obraDetalheId === row.obra_id;

                    return (
                      <tr
                        key={row.obra_id}
                        className="border-b border-slate-50 last:border-0 dark:border-slate-800"
                      >
                        <td className="py-2 pr-4 whitespace-nowrap dark:text-slate-100">
                          {obraName}
                        </td>
                        <td className="py-2 px-4 dark:text-slate-100">
                          {formatHours(horas)}
                        </td>
                        <td className="py-2 px-4 dark:text-slate-100">
                          {formatCurrency(custo)}
                        </td>
                        <td className="py-2 px-4 dark:text-slate-100">
                          {formatCurrency(custoMedio)}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleVerProfissionais(row.obra_id)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            {isSelected
                              ? "Atualizar profissionais"
                              : "Ver profissionais"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalhe de profissionais na obra */}
          {obraDetalheId && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 dark:bg-slate-900 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Profissionais na obra — {obraDetalheNome}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {MESES[selectedMonth].charAt(0).toUpperCase() +
                      MESES[selectedMonth].slice(1)}{" "}
                    de {selectedYear}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFecharDetalhe}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Fechar detalhe
                </button>
              </div>

              {/* cards resumo do detalhe */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total a pagar na obra
                  </span>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {formatCurrency(obraDetalheMetrics.totalCusto)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Horas totais
                  </span>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {formatHours(obraDetalheMetrics.totalHoras)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Nº de profissionais
                  </span>
                  <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                    {obraDetalheMetrics.totalProfissionais}
                  </div>
                </div>
              </div>

              {loadingProfissionais ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-300">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A carregar profissionais desta obra…
                </div>
              ) : !profissionaisObra.length ? (
                <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-300">
                  Ainda não há registos de profissionais para esta obra neste
                  período.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:text-slate-300 dark:border-slate-700">
                        <th className="py-2 pr-4">Profissional</th>
                        <th className="py-2 px-4">Função</th>
                        <th className="py-2 px-4">Horas normais</th>
                        <th className="py-2 px-4">Horas extra</th>
                        <th className="py-2 px-4">Total horas</th>
                        <th className="py-2 px-4">Valor/hora</th>
                        <th className="py-2 px-4">Custo mês</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profissionaisObra.map((row) => {
                        const hNormais = row.horas_normais ?? 0;
                        const hExtra = row.horas_extras ?? 0;
                        const totalHoras =
                          row.horas_totais ?? hNormais + hExtra;

                        return (
                          <tr
                            key={row.profissional_id}
                            className="border-b border-slate-50 last:border-0 dark:border-slate-800"
                          >
                            <td className="py-2 pr-4 whitespace-nowrap dark:text-slate-100">
                              {row.profissional_nome ?? "Profissional"}
                            </td>
                            <td className="py-2 px-4 whitespace-nowrap dark:text-slate-100">
                              {row.funcao ?? "—"}
                            </td>
                            <td className="py-2 px-4 dark:text-slate-100">
                              {formatHours(hNormais)}
                            </td>
                            <td className="py-2 px-4 dark:text-slate-100">
                              {formatHours(hExtra)}
                            </td>
                            <td className="py-2 px-4 dark:text-slate-100">
                              {formatHours(totalHoras)}
                            </td>
                            <td className="py-2 px-4 dark:text-slate-100">
                              {row.valor_hora !== null
                                ? formatCurrency(row.valor_hora)
                                : "—"}
                            </td>
                            <td className="py-2 px-4 dark:text-slate-100">
                              {formatCurrency(row.custo_total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
