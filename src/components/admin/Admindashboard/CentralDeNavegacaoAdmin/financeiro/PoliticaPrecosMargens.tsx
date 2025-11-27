// src/components/admin/Financeiro/PoliticaPrecosMargens.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Edit2,
  Euro,
  Loader2,
  Percent,
  Save,
  Settings2,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =========================
   Tipos
========================= */

type PoliticaValorRow = {
  id: string;
  tipo_profissional: string;
  nivel: string;
  valor_profissional_min: number;
  valor_profissional_max: number;
  valor_empresa_min: number;
  valor_empresa_max: number;
  margem: number;
};

type EditState = {
  id: string | null;
  tipo_profissional: string;
  nivel: string;
  valor_profissional_min: string;
  valor_profissional_max: string;
  valor_empresa_min: string;
  valor_empresa_max: string;
  margem: string;
};

/* =========================
   Helpers
========================= */

const currency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "€ 0,00";
  return currency.format(value);
}

function toNumberSafe(v: any, fallback = 0): number {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return n;
}

/** valor base profissional (meio da faixa) */
function calcularValorProfissionalBase(row: PoliticaValorRow): number {
  const min = row.valor_profissional_min ?? 0;
  const max = row.valor_profissional_max ?? min;
  return (min + max) / 2;
}

/** valor base empresa (meio da faixa) */
function calcularValorEmpresaBase(row: PoliticaValorRow): number {
  const min = row.valor_empresa_min ?? 0;
  const max = row.valor_empresa_max ?? min;
  return (min + max) / 2;
}

/* =========================
   Componente principal
========================= */

export default function PoliticaPrecosMargens() {
  const { user } = useAuth();

  const [rows, setRows] = useState<PoliticaValorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // edição
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);

  // simulador
  const [simTipo, setSimTipo] = useState<string>("");
  const [simNivel, setSimNivel] = useState<string>("");
  const [simCarreiraNivel, setSimCarreiraNivel] = useState<number>(0); // 0–5
  const [simAvaliacao, setSimAvaliacao] = useState<number>(3); // 1–5
  const [simDescontoMax, setSimDescontoMax] = useState<number>(1.5); // € máx. negociável

  // filtro da tabela
  const [filtroTipo, setFiltroTipo] = useState<string>("__todos");

  /* =========================
     Carregar dados
  ========================= */

  async function loadPoliticaValores() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("politica_valores")
      .select(
        "id, tipo_profissional, nivel, valor_profissional_min, valor_profissional_max, valor_empresa_min, valor_empresa_max, margem"
      )
      .order("tipo_profissional", { ascending: true })
      .order("nivel", { ascending: true });

    if (error) {
      console.error("[PoliticaPrecos] erro ao carregar:", error);
      setError("Não foi possível carregar a política de valores.");
      setRows([]);
    } else {
      const normalized: PoliticaValorRow[] =
        data?.map((row: any) => ({
          id: row.id,
          tipo_profissional: row.tipo_profissional,
          nivel: row.nivel,
          valor_profissional_min: toNumberSafe(row.valor_profissional_min),
          valor_profissional_max: toNumberSafe(row.valor_profissional_max),
          valor_empresa_min: toNumberSafe(row.valor_empresa_min),
          valor_empresa_max: toNumberSafe(row.valor_empresa_max),
          margem: toNumberSafe(row.margem),
        })) ?? [];

      setRows(normalized);

      // preencher valores iniciais do simulador
      if (normalized.length) {
        if (!simTipo) setSimTipo(normalized[0].tipo_profissional);
        if (!simNivel) setSimNivel(normalized[0].nivel);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!user?.id) return;
    loadPoliticaValores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* =========================
     Editar / criar
  ========================= */

  function openEdit(row?: PoliticaValorRow) {
    if (row) {
      // editar registo existente
      setEditState({
        id: row.id,
        tipo_profissional: row.tipo_profissional,
        nivel: row.nivel,
        valor_profissional_min: String(row.valor_profissional_min ?? ""),
        valor_profissional_max: String(row.valor_profissional_max ?? ""),
        valor_empresa_min: String(row.valor_empresa_min ?? ""),
        valor_empresa_max: String(row.valor_empresa_max ?? ""),
        margem: String(row.margem ?? ""),
      });
    } else {
      // novo registo – pré-preenche com contexto atual (filtro/simulador)
      const tipoInicial =
        filtroTipo !== "__todos"
          ? filtroTipo
          : simTipo
          ? simTipo
          : tiposProfissionais[0] || "";
      const nivelInicial =
        simNivel ||
        (tipoInicial && niveisPorTipo.get(tipoInicial)?.[0]) ||
        "";

      setEditState({
        id: null,
        tipo_profissional: tipoInicial,
        nivel: nivelInicial,
        valor_profissional_min: "",
        valor_profissional_max: "",
        valor_empresa_min: "",
        valor_empresa_max: "",
        margem: "",
      });
    }
    setIsEditOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeEdit() {
    setIsEditOpen(false);
    setEditState(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      tipo_profissional: editState.tipo_profissional.trim(),
      nivel: editState.nivel.trim(),
      valor_profissional_min: toNumberSafe(editState.valor_profissional_min, 0),
      valor_profissional_max: toNumberSafe(editState.valor_profissional_max, 0),
      valor_empresa_min: toNumberSafe(editState.valor_empresa_min, 0),
      valor_empresa_max: toNumberSafe(editState.valor_empresa_max, 0),
      margem: toNumberSafe(editState.margem, 0),
    };

    try {
      if (editState.id) {
        const { error } = await supabase
          .from("politica_valores")
          .update(payload)
          .eq("id", editState.id);

        if (error) throw error;
        setSuccess("Registo atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("politica_valores")
          .insert(payload);

        if (error) throw error;
        setSuccess("Registo criado com sucesso.");
      }

      await loadPoliticaValores();
      setIsEditOpen(false);
      setEditState(null);
    } catch (err: any) {
      console.error("[PoliticaPrecos] erro ao salvar:", err);
      setError("Ocorreu um erro ao guardar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     Dados derivados
  ========================= */

  const tiposProfissionais = useMemo(
    () => Array.from(new Set(rows.map((r) => r.tipo_profissional))),
    [rows]
  );

  const niveisPorTipo = useMemo(() => {
    const map = new Map<string, string[]>();
    rows.forEach((r) => {
      if (!map.has(r.tipo_profissional)) map.set(r.tipo_profissional, []);
      const arr = map.get(r.tipo_profissional)!;
      if (!arr.includes(r.nivel)) arr.push(r.nivel);
    });
    return map;
  }, [rows]);

  const rowsFiltradas = useMemo(() => {
    if (filtroTipo === "__todos") return rows;
    return rows.filter((r) => r.tipo_profissional === filtroTipo);
  }, [rows, filtroTipo]);

  const simuladorRow: PoliticaValorRow | undefined = useMemo(
    () =>
      rows.find(
        (r) => r.tipo_profissional === simTipo && r.nivel === simNivel
      ),
    [rows, simTipo, simNivel]
  );

  const simuladorValores = useMemo(() => {
    if (!simuladorRow) {
      return {
        valorProfissionalBase: 0,
        valorProfissionalFinal: 0,
        valorEmpresaBase: 0,
        valorEmpresaLista: 0,
        valorEmpresaMinimoNegociado: 0,
        margemEfetiva: 0,
      };
    }

    const basePro = calcularValorProfissionalBase(simuladorRow);
    const baseEmp = calcularValorEmpresaBase(simuladorRow);

    // +0.25€/h por nível de carreira
    const ajusteCarreira = simCarreiraNivel * 0.25;

    // cada estrela acima de 3 = +0.15€/h, abaixo = -0.15€/h
    const deltaAvaliacao = simAvaliacao - 3;
    const ajusteAvaliacao = deltaAvaliacao * 0.15;

    const valorProfissionalFinal = Math.max(
      0,
      basePro + ajusteCarreira + ajusteAvaliacao
    );

    // Empresa = profissional + margem base da tabela
    const margemBase = simuladorRow.margem ?? baseEmp - basePro;
    const valorEmpresaLista = Math.max(0, valorProfissionalFinal + margemBase);

    // desconto máximo permitido
    const descontoMaxAbs = Math.min(simDescontoMax, margemBase);
    const valorEmpresaMinimoNegociado = Math.max(
      0,
      valorEmpresaLista - descontoMaxAbs
    );

    const margemEfetiva = valorEmpresaLista - valorProfissionalFinal;

    return {
      valorProfissionalBase: basePro,
      valorProfissionalFinal,
      valorEmpresaBase: baseEmp,
      valorEmpresaLista,
      valorEmpresaMinimoNegociado,
      margemEfetiva,
    };
  }, [simuladorRow, simCarreiraNivel, simAvaliacao, simDescontoMax]);

  /* =========================
     Render
  ========================== */

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Financeiro ▸ Política de Preços & Margens
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Define quanto o profissional recebe, quanto a empresa paga e qual a
          margem da Acrobatas por tipo de profissional e nível de experiência.
        </p>
      </div>

      {/* Alertas */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Cards resumo topo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/95 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tipos de profissional
            </span>
            <Users className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {tiposProfissionais.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            Cada tipo pode ter regras diferentes de valor e margem.
          </p>
        </div>

        <div className="bg-white/95 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registos de política
            </span>
            <Settings2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {rows.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            Combinações de tipo + nível configuradas.
          </p>
        </div>

        <div className="bg-white/95 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Margem média referência
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatCurrency(
              rows.length
                ? rows.reduce((acc, r) => acc + (r.margem ?? 0), 0) /
                    rows.length
                : 0
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            Média simples da margem declarada na tabela.
          </p>
        </div>

        <div className="bg-white/95 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Política protegida
            </span>
            <Shield className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Acesso restrito
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            Recomenda-se acesso apenas à equipa financeira / direção.
          </p>
        </div>
      </div>

      {/* Conteúdo principal: tabela + simulador */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tabela principal */}
        <div className="xl:col-span-2 bg-white/95 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Euro className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                Tabela de política de preços
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                Valores mínimos e máximos por tipo de profissional e nível de
                experiência.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-3">
                {/* Filtro por tipo */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Filtrar por tipo:
                  </span>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="__todos">Todos</option>
                    {tiposProfissionais.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit()}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-500/60 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-100 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition"
                >
                  <PlusIcon />
                  Novo registo
                </button>
              </div>

              {/* Info de registos do filtro */}
              <span className="text-[11px] text-slate-500 dark:text-slate-500">
                {filtroTipo === "__todos"
                  ? `${rows.length} registos no total`
                  : `${rowsFiltradas.length} registos · ${filtroTipo}`}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A carregar política de preços…
            </div>
          ) : !rows.length ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-slate-500 dark:text-slate-400 gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>
                Ainda não existem regras na tabela{" "}
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  politica_valores
                </span>
                .
              </span>
              <button
                type="button"
                onClick={() => openEdit()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 transition"
              >
                <PlusIcon />
                Criar primeiro registo
              </button>
            </div>
          ) : rowsFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-slate-500 dark:text-slate-400 gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>
                Nenhum registo configurado para o tipo{" "}
                <span className="font-semibold">
                  {filtroTipo === "__todos" ? "—" : filtroTipo}
                </span>
                .
              </span>
              <button
                type="button"
                onClick={() => openEdit()}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 transition"
              >
                <PlusIcon />
                Criar registo para este tipo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-2 text-left">Tipo</th>
                    <th className="py-2 px-2 text-left">Nível</th>
                    <th className="py-2 px-2 text-right">
                      Profissional (min–max)
                    </th>
                    <th className="py-2 px-2 text-right">
                      Empresa (min–max)
                    </th>
                    <th className="py-2 px-2 text-right">Margem ref.</th>
                    <th className="py-2 px-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsFiltradas.map((row) => {
                    const proRange = `${formatCurrency(
                      row.valor_profissional_min
                    )} – ${formatCurrency(row.valor_profissional_max)}`;
                    const empRange = `${formatCurrency(
                      row.valor_empresa_min
                    )} – ${formatCurrency(row.valor_empresa_max)}`;

                    const isHighlighted =
                      row.tipo_profissional === simTipo &&
                      row.nivel === simNivel;

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition ${
                          isHighlighted
                            ? "bg-sky-50/80 dark:bg-sky-900/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                        }`}
                      >
                        <td className="py-2 px-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                          {row.tipo_profissional}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-slate-900 dark:text-slate-100">
                          {row.nivel}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-right text-slate-900 dark:text-slate-100">
                          {proRange}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-right text-slate-900 dark:text-slate-100">
                          {empRange}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-right text-sky-700 dark:text-sky-200">
                          {formatCurrency(row.margem)}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Simulador de preços */}
        <div className="bg-white/95 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                Simulador de valor hora
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                Usa a política atual e ajusta por carreira, avaliação e
                desconto máximo.
              </p>
            </div>
          </div>

          {/* Seleções */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Tipo de profissional
              </label>
              <select
                value={simTipo}
                onChange={(e) => {
                  const novoTipo = e.target.value;
                  setSimTipo(novoTipo);
                  const niveis = niveisPorTipo.get(novoTipo) ?? [];
                  if (niveis.length && !niveis.includes(simNivel)) {
                    setSimNivel(niveis[0]);
                  }
                  // sincroniza filtro da tabela com o tipo simulado
                  setFiltroTipo(novoTipo || "__todos");
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              >
                {tiposProfissionais.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Nível de experiência
              </label>
              <select
                value={simNivel}
                onChange={(e) => setSimNivel(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              >
                {(niveisPorTipo.get(simTipo) ?? []).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Carreira & avaliação */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Nível de carreira
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={simCarreiraNivel}
                  onChange={(e) => setSimCarreiraNivel(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {simCarreiraNivel} / 5{" "}
                  <span className="text-slate-400 dark:text-slate-500">
                    (cada nível ≈ +0,25€/h)
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Avaliação média
                  <StarIcon />
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={simAvaliacao}
                  onChange={(e) => setSimAvaliacao(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {simAvaliacao}/5{" "}
                  <span className="text-slate-400 dark:text-slate-500">
                    (cada estrela acima de 3 ≈ +0,15€/h)
                  </span>
                </span>
              </div>
            </div>

            {/* Desconto máximo */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                Desconto máximo negociável para empresa
                <Percent className="w-3 h-3 text-slate-500" />
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.25}
                value={simDescontoMax}
                onChange={(e) => setSimDescontoMax(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Até {formatCurrency(simDescontoMax)} por hora de desconto
                autorizado.
              </span>
            </div>
          </div>

          {/* Resultado simulador */}
          <div className="mt-2 grid grid-cols-1 gap-3">
            <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700/80 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Profissional
                </span>
                <Euro className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-300">
                Base:{" "}
                <span className="font-medium">
                  {formatCurrency(simuladorValores.valorProfissionalBase)}
                </span>
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-300">
                Com carreira + avaliação:{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                  {formatCurrency(simuladorValores.valorProfissionalFinal)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-500 ml-1">
                  (valor sugerido a pagar ao profissional)
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700/80 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Empresa
                </span>
                <Euro className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-300">
                Lista:{" "}
                <span className="font-semibold text-sky-700 dark:text-sky-300">
                  {formatCurrency(simuladorValores.valorEmpresaLista)}
                </span>
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-300">
                Mínimo após desconto:{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-300">
                  {formatCurrency(
                    simuladorValores.valorEmpresaMinimoNegociado
                  )}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
                Margem efetiva:{" "}
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {formatCurrency(simuladorValores.margemEfetiva)}
                </span>{" "}
                por hora.
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800/80 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                O simulador não altera nada na base de dados. Ele apenas ajuda a
                validar se a política atual faz sentido antes de negociar com a
                empresa ou ajustar os valores na tabela.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de edição (overlay simples) */}
      {isEditOpen && editState && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  {editState.id ? "Editar política de valor" : "Novo registo"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                  Define as faixas de valor/hora e a margem de referência para
                  esta combinação de tipo + nível.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Tipo de profissional
                  </label>
                  <input
                    type="text"
                    value={editState.tipo_profissional}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, tipo_profissional: e.target.value }
                          : prev
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Ex.: Pedreiro, Eletricista…"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Nível / experiência
                  </label>
                  <input
                    type="text"
                    value={editState.nivel}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, nivel: e.target.value } : prev
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Ex.: 1–3 anos, 8+ anos…"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Profissional min. (€/h)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editState.valor_profissional_min}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, valor_profissional_min: e.target.value }
                          : prev
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Profissional máx. (€/h)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editState.valor_profissional_max}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, valor_profissional_max: e.target.value }
                          : prev
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Empresa min. (€/h)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editState.valor_empresa_min}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, valor_empresa_min: e.target.value }
                          : prev
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Empresa máx. (€/h)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editState.valor_empresa_max}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, valor_empresa_max: e.target.value }
                          : prev
                      )
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Margem de referência (€/h)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editState.margem}
                  onChange={(e) =>
                    setEditState((prev) =>
                      prev ? { ...prev, margem: e.target.value } : prev
                    )
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Ex.: 3 €"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-500">
                  Esta margem é usada como base no simulador e como referência
                  para negociação.
                </p>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      A guardar…
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Ícones auxiliares pequenos
========================= */

function PlusIcon() {
  return (
    <svg
      className="w-3 h-3"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 3.333v9.334M3.333 8h9.334"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="w-3 h-3 text-yellow-400"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7.999 1.333 6.12 5.353l-4.454.324 3.39 2.854-1.036 4.37L8 10.99l3.98 1.911-1.036-4.37 3.39-2.854-4.454-.324L7.999 1.333Z" />
    </svg>
  );
}
