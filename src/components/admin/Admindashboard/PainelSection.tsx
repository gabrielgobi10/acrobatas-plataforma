// src/components/admin/Admindashboard/PainelSection.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  HardHat,
  ClipboardList,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * Ajuste rotas aqui (sem mexer no resto do layout)
 * - Eu não tenho como saber o seu router exato do Admin neste projeto.
 */
const ROUTES = {
  profissionais: "/admin/profissionais",
  empresas: "/admin/empresas",
  obras: "/admin/obras",
  pedidos: "/admin/pedidos",
  documentos: "/admin/documentos",
};

type LoadState = "idle" | "loading" | "ready" | "error";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtNumber(n: number | null) {
  if (n === null) return "—";
  return n.toLocaleString("pt-PT");
}

async function safeCount(builder: any): Promise<number | null> {
  const { count, error } = await builder;
  if (error) return null;
  return typeof count === "number" ? count : null;
}

async function countProfissionaisAtivos(): Promise<number | null> {
  // Primeiro: tenta status='ativo' (coerente com os seus triggers/funções)
  const byStatus = await safeCount(
    supabase
      .from("profissionais")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
  );
  if (byStatus !== null) return byStatus;

  // Fallback: total (caso a coluna/status não exista ou a policy bloqueie)
  return safeCount(
    supabase.from("profissionais").select("id", { count: "exact", head: true })
  );
}

async function countEmpresasAtivas(): Promise<number | null> {
  const byStatus = await safeCount(
    supabase
      .from("empresas")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
  );
  if (byStatus !== null) return byStatus;

  return safeCount(supabase.from("empresas").select("id", { count: "exact", head: true }));
}

async function countObrasEmAndamento(): Promise<number | null> {
  // Eu não sei quais valores você usa em obras.status. Então:
  // 1) tenta um conjunto comum
  // 2) se falhar, cai para total
  const candidates = ["em_andamento", "em andamento", "andamento", "ativa", "ativo"];

  const byStatusIn = await safeCount(
    supabase
      .from("obras")
      .select("id", { count: "exact", head: true })
      // @ts-expect-error: supabase aceita array em "in"
      .in("status", candidates)
  );
  if (byStatusIn !== null) return byStatusIn;

  return safeCount(supabase.from("obras").select("id", { count: "exact", head: true }));
}

async function countPedidosEmAnalise(): Promise<number | null> {
  // Pelas suas funções/normalização, "em_analise" é o principal.
  // Mantive variantes porque você também usa "em_avaliacao" em triggers antigos.
  const candidates = ["em_analise", "em_avaliacao", "em avaliacao", "pendente"];

  const byStatusIn = await safeCount(
    supabase
      .from("pedidos_empresa_v2")
      .select("id", { count: "exact", head: true })
      // @ts-expect-error: supabase aceita array em "in"
      .in("status", candidates)
  );
  if (byStatusIn !== null) return byStatusIn;

  return safeCount(
    supabase.from("pedidos_empresa_v2").select("id", { count: "exact", head: true })
  );
}

async function countDocsPendentes(): Promise<number | null> {
  // Regra objetiva: tudo que NÃO está aprovado conta como pendente.
  const notApproved = await safeCount(
    supabase
      .from("documentos_acrobatas")
      .select("id", { count: "exact", head: true })
      .neq("status", "aprovado")
  );
  if (notApproved !== null) return notApproved;

  return safeCount(
    supabase.from("documentos_acrobatas").select("id", { count: "exact", head: true })
  );
}

/** Carrega uma lista curta para o painel (se a query falhar, retorna vazio) */
async function safeList<T = any>(builder: any): Promise<T[]> {
  const { data, error } = await builder;
  if (error) return [];
  return (data as T[]) || [];
}

type ObraRow = {
  id: string;
  nome?: string | null;
  local?: string | null;
  status?: string | null;
  criado_em?: string | null;
};

type PedidoRow = {
  id: string;
  status?: string | null;
  tipo_profissional?: string | null;
  quantidade?: number | null;
  local?: string | null;
  criado_em?: string | null;
};

type DocRow = {
  id: string;
  status?: string | null;
  tipo?: string | null;
  nome?: string | null;
  criado_em?: string | null;
};

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-2xl p-5 sm:p-6 text-white shadow-md",
        "bg-gradient-to-br relative overflow-hidden hover:shadow-lg transition-all",
        gradient
      )}
    >
      <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-[1px]" />
      <div className="flex justify-between items-start relative z-10 gap-3">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm opacity-90">{label}</p>
          <h2 className="text-xl sm:text-3xl font-bold mt-1 leading-tight tabular-nums">
            {value}
          </h2>
          <p className="text-[11px] sm:text-xs opacity-80 mt-1">{sub}</p>
        </div>
        <Icon className="w-6 h-6 sm:w-8 sm:h-8 opacity-90" />
      </div>
    </motion.div>
  );
}

function KPICompact({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 text-white shadow-md cursor-pointer",
        "bg-gradient-to-br flex flex-col justify-between h-[110px]",
        gradient
      )}
    >
      <div className="flex justify-between items-start">
        <p className="text-xs opacity-80 font-medium">{label}</p>
        <Icon className="w-5 h-5 opacity-90" />
      </div>
      <div>
        <h2 className="text-xl font-bold leading-none tabular-nums">{value}</h2>
        <p className="text-[11px] opacity-80 mt-1">{sub}</p>
      </div>
    </motion.div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  right,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#020617] rounded-2xl p-4 sm:p-6 shadow border border-gray-100 dark:border-slate-800/80">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-base sm:text-lg">
          <Icon className="w-5 h-5 text-blue-500" /> {title}
        </h3>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function PainelSection() {
  const navigate = useNavigate();

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [counts, setCounts] = useState({
    profissionaisAtivos: null as number | null,
    empresasAtivas: null as number | null,
    obrasEmAndamento: null as number | null,
    pedidosEmAnalise: null as number | null,
    docsPendentes: null as number | null,
  });

  const [lists, setLists] = useState<{
    obras: ObraRow[];
    pedidos: PedidoRow[];
    docs: DocRow[];
  }>({ obras: [], pedidos: [], docs: [] });

  const loading = loadState === "loading";

  const pendenciasTotal = useMemo(() => {
    const a = counts.pedidosEmAnalise ?? 0;
    const b = counts.docsPendentes ?? 0;
    return a + b;
  }, [counts.docsPendentes, counts.pedidosEmAnalise]);

  const refresh = useCallback(async () => {
    setLoadState("loading");

    const [
      profissionaisAtivos,
      empresasAtivas,
      obrasEmAndamento,
      pedidosEmAnalise,
      docsPendentes,
    ] = await Promise.all([
      countProfissionaisAtivos(),
      countEmpresasAtivos(),
      countObrasEmAndamento(),
      countPedidosEmAnalise(),
      countDocsPendentes(),
    ]).catch(() => [null, null, null, null, null] as any);

    setCounts({
      profissionaisAtivos,
      empresasAtivas,
      obrasEmAndamento,
      pedidosEmAnalise,
      docsPendentes,
    });

    // Listas curtas (se der erro, volta vazio sem quebrar o painel)
    const [obras, pedidos, docs] = await Promise.all([
      safeList<ObraRow>(
        supabase
          .from("obras")
          .select("id,nome,local,status,criado_em")
          .order("criado_em", { ascending: false })
          .limit(5)
      ),
      safeList<PedidoRow>(
        supabase
          .from("pedidos_empresa_v2")
          .select("id,status,tipo_profissional,quantidade,local,criado_em")
          .order("criado_em", { ascending: false })
          .limit(5)
      ),
      safeList<DocRow>(
        supabase
          .from("documentos_acrobatas")
          .select("id,status,tipo,nome,criado_em")
          .order("criado_em", { ascending: false })
          .limit(5)
      ),
    ]).catch(() => [[], [], []] as any);

    setLists({ obras, pedidos, docs });

    setLastUpdated(new Date());
    setLoadState("ready");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const KPIs = useMemo(
    () => [
      {
        label: "Profissionais Ativos",
        value: fmtNumber(counts.profissionaisAtivos),
        icon: Users,
        gradient: "from-blue-500 to-cyan-500",
        sub: "Em operação",
        link: ROUTES.profissionais,
      },
      {
        label: "Empresas Ativas",
        value: fmtNumber(counts.empresasAtivas),
        icon: Building2,
        gradient: "from-emerald-500 to-green-400",
        sub: "Clientes ativos",
        link: ROUTES.empresas,
      },
      {
        label: "Obras em Andamento",
        value: fmtNumber(counts.obrasEmAndamento),
        icon: HardHat,
        gradient: "from-indigo-500 to-purple-500",
        sub: "Execução",
        link: ROUTES.obras,
      },
      {
        label: "Pendências",
        value: fmtNumber(pendenciasTotal),
        icon: AlertTriangle,
        gradient: pendenciasTotal > 0 ? "from-amber-400 to-orange-500" : "from-emerald-500 to-green-400",
        sub: pendenciasTotal > 0 ? "Exige ação" : "Tudo em dia",
        link: ROUTES.pedidos,
      },
    ],
    [
      counts.empresasAtivas,
      counts.obrasEmAndamento,
      counts.profissionaisAtivos,
      pendenciasTotal,
    ]
  );

  return (
    <div className="w-full mx-auto px-6 flex flex-col gap-6 max-w-[1180px] 2xl:max-w-[1200px]">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#020617] rounded-2xl p-4 sm:p-6 shadow border border-gray-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Painel do Admin
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Indicadores essenciais e itens que exigem atenção imediata.
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-500 mt-2">
              {lastUpdated ? `Atualizado: ${lastUpdated.toLocaleString("pt-PT")}` : "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-800/80",
              "bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-800 dark:text-gray-100",
              "hover:bg-gray-100 dark:hover:bg-white/10 transition",
              loading && "opacity-60 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </button>
        </div>

        {loadState === "error" && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm">
            Não foi possível carregar todas as métricas. Verifique RLS/policies ou colunas esperadas.
          </div>
        )}
      </div>

      {/* KPIs MOBILE */}
      <div className="sm:hidden grid grid-cols-2 gap-3">
        {KPIs.map((kpi) => (
          <KPICompact
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            icon={kpi.icon}
            gradient={kpi.gradient}
            onClick={() => navigate(kpi.link)}
          />
        ))}
      </div>

      {/* KPIs DESKTOP */}
      <section className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {KPIs.map((kpi) => (
          <KPI
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            icon={kpi.icon}
            gradient={kpi.gradient}
            onClick={() => navigate(kpi.link)}
          />
        ))}
      </section>

      {/* PRIORIDADES / AÇÕES RÁPIDAS */}
      <SectionCard
        title="Prioridades"
        icon={ClipboardList}
        right={
          <button
            onClick={() => navigate(ROUTES.pedidos)}
            className="hidden sm:inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ver fila completa <ArrowRight className="w-4 h-4" />
          </button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div
            className={cn(
              "rounded-xl border p-4",
              "border-gray-200 dark:border-slate-800/80 bg-gray-50 dark:bg-[#0f1520]"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Pedidos em análise
              </p>
              <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">
                {fmtNumber(counts.pedidosEmAnalise)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Aprovar/recusar para destravar vagas e operação.
            </p>
            <button
              onClick={() => navigate(ROUTES.pedidos)}
              className="mt-3 w-full text-xs py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
            >
              Abrir pedidos
            </button>
          </div>

          <div
            className={cn(
              "rounded-xl border p-4",
              "border-gray-200 dark:border-slate-800/80 bg-gray-50 dark:bg-[#0f1520]"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Documentos pendentes
              </p>
              <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">
                {fmtNumber(counts.docsPendentes)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Validar para evitar bloqueios em obra e pagamentos.
            </p>
            <button
              onClick={() => navigate(ROUTES.documentos)}
              className="mt-3 w-full text-xs py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
            >
              Abrir documentos
            </button>
          </div>

          <div
            className={cn(
              "rounded-xl border p-4",
              "border-gray-200 dark:border-slate-800/80 bg-gray-50 dark:bg-[#0f1520]"
            )}
          >
            <div className="flex items-center gap-2">
              {pendenciasTotal > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Estado geral
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {pendenciasTotal > 0
                ? "Existem pendências abertas. Priorize a fila de análise."
                : "Sem pendências críticas no momento."}
            </p>
            <button
              onClick={() => navigate(ROUTES.obras)}
              className="mt-3 w-full text-xs py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
            >
              Ver obras
            </button>
          </div>
        </div>
      </SectionCard>

      {/* LISTAS RÁPIDAS (TOP 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard
          title="Últimas Obras"
          icon={HardHat}
          right={
            <button
              onClick={() => navigate(ROUTES.obras)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todas
            </button>
          }
        >
          <div className="space-y-3">
            {lists.obras.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">Sem dados para mostrar.</p>
            ) : (
              lists.obras.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-gray-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0f1520] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {o.nome || "—"}
                    </p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      {o.status || "—"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {o.local || "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Últimos Pedidos"
          icon={ClipboardList}
          right={
            <button
              onClick={() => navigate(ROUTES.pedidos)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos
            </button>
          }
        >
          <div className="space-y-3">
            {lists.pedidos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">Sem dados para mostrar.</p>
            ) : (
              lists.pedidos.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0f1520] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {p.tipo_profissional || "Pedido"}
                      {p.quantidade ? ` (${p.quantidade})` : ""}
                    </p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      {p.status || "—"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {p.local || "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Últimos Documentos"
          icon={FileText}
          right={
            <button
              onClick={() => navigate(ROUTES.documentos)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos
            </button>
          }
        >
          <div className="space-y-3">
            {lists.docs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-500">Sem dados para mostrar.</p>
            ) : (
              lists.docs.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-gray-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0f1520] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {d.nome || d.tipo || "Documento"}
                    </p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      {d.status || "—"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    ID: {d.id}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/**
 * Pequeno typo guard: mantido separado para não “quebrar” o refresh()
 * se você renomear algo depois.
 */
async function countEmpresasAtivos() {
  return countEmpresasAtivas();
}
