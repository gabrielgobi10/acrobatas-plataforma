import React, { memo, useMemo, useState, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  HardHat,
  Euro,
  Sparkles,
  Building2,
  FileText,
  Users,
  Clock,
  Plus,
  Settings2,
  User as UserIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";

/* =========================
   Tipos & helpers
========================= */
type ParentQuickSection =
  | "novos-pedidos"
  | "obras-ativas"
  | "documentos-profissionais"
  | "equipes-em-campo";

type Atividade = {
  id: string;
  tipo: string;
  descricao?: string | null;
  meta?: any | null;
  created_at: string;
};

type ObraMes = { mes: string; obras: number };

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const idxAtual = new Date().getMonth();
const lastNMonths = (n: number) =>
  Array.from({ length: n }, (_, i) => (idxAtual - (n - 1 - i) + 12) % 12);

const formatEUR = (n: number) =>
  n.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const toMesNome = (m: string) =>
  /^\d{4}-\d{2}$/.test(m)
    ? MESES[parseInt(m.slice(5, 7), 10) - 1] ?? m
    : m;

/* =========================
   Tooltip
========================= */
const CustomTooltip = ({ label, payload }: any) => {
  if (!payload || !payload.length) return null;
  const p = payload[0];
  const isCusto = p.dataKey === "custo";
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 text-xs">
      <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
      <p className="text-gray-600 dark:text-gray-300 mt-0.5">
        {isCusto
          ? formatEUR(p.value ?? 0)
          : (p.value ?? 0).toLocaleString("pt-PT")}
      </p>
    </div>
  );
};

const iconByTipo: Record<string, JSX.Element> = {
  obra_criada: (
    <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
  ),
  obra_atualizada: (
    <Building2 className="w-4 h-4 text-blue-400 dark:text-blue-300" />
  ),
  documento_enviado: (
    <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />
  ),
  equipe_vinculada: (
    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
  ),
  perfil_atualizado: (
    <UserIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
  ),
  login: <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
};

function labelFromTipo(tipo: string, meta: any) {
  switch (tipo) {
    case "obra_criada":
      return `Nova obra criada${meta?.nome ? `: ${meta.nome}` : ""}`;
    case "obra_atualizada":
      return `Obra atualizada${meta?.nome ? `: ${meta.nome}` : ""}`;
    case "documento_enviado":
      return `Documento enviado${meta?.tipo ? ` (${meta.tipo})` : ""}`;
    case "equipe_vinculada":
      return `Equipe vinculada à obra${
        meta?.obra_nome ? ` ${meta.obra_nome}` : ""
      }`;
    case "perfil_atualizado":
      return "Perfil atualizado";
    case "login":
      return "Login realizado";
    default:
      return "Atividade";
  }
}

/* =========================
   Componente
========================= */
function GraficosPainelBase({
  obrasMes = [],
  custosMes = [],
  onQuickAction,
}: {
  obrasMes?: { mes: string; obras: number }[];
  custosMes?: { mes: string; custo: number }[];
  onQuickAction?: (s: ParentQuickSection) => void;
}) {
  const { t } = useTranslation();

  const [selMeses] = useState<number[]>(lastNMonths(3));
  const [tab, setTab] = useState<"acoes" | "obras" | "custos">("acoes");

  // IDs fixos para gradiente
  const gradIdCustos = "grad-custos";
  const gradIdObras = "grad-obras";

  // estado interno para "obras por mês" (caso o pai não mande nada)
  const [obrasMesState, setObrasMesState] = useState<ObraMes[]>([]);
  const [loadingObrasMes, setLoadingObrasMes] = useState(false);

  // refs para controlar "animou uma vez"
  const obrasAnimouRef = useRef(false);
  const custosAnimouRef = useRef(false);

  // ====== FEED DE ATIVIDADES ======
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // garantir sessão antes de buscar atividades
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data?.session) setSessionReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_evt, session) => {
        if (mounted && session) setSessionReady(true);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return;

    (async () => {
      setLoadingAtividades(true);

      // descobrir empresa
      let empresaId: string | null = null;
      const rpc = await supabase.rpc("minha_empresa_id");
      if (!rpc.error) empresaId = (rpc.data as string) ?? null;

      if (!empresaId) {
        const u = await supabase.auth.getUser();
        empresaId = (u.data.user?.user_metadata?.empresa_id as string) || null;
      }

      if (!empresaId) {
        setLoadingAtividades(false);
        return;
      }

      const { data } = await supabase
        .from("atividades")
        .select("id,tipo,descricao,meta,created_at")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (data) setAtividades(data as Atividade[]);
      setLoadingAtividades(false);
    })();
  }, [sessionReady]);

  // ====== BUSCA REAL DAS OBRAS POR MÊS ======
  useEffect(() => {
    let cancelled = false;

    const carregarObrasMes = async () => {
      try {
        // Se o pai já mandou dados prontos, usa-os e não busca nada
        if (obrasMes && obrasMes.length > 0) {
          setObrasMesState(obrasMes);
          return;
        }

        setLoadingObrasMes(true);

        // descobrir empresa (mesma lógica do resto)
        let empresaId: string | null = null;
        const rpc = await supabase.rpc("minha_empresa_id");
        if (!rpc.error) empresaId = (rpc.data as string) ?? null;

        if (!empresaId) {
          const u = await supabase.auth.getUser();
          empresaId =
            (u.data.user?.user_metadata?.empresa_id as string) || null;
        }

        if (!empresaId || cancelled) {
          if (!cancelled) setObrasMesState([]);
          return;
        }

        // traz TODAS as obras da empresa (sem filtrar por data no SQL)
        const { data, error } = await supabase
          .from("obras")
          .select("id,data_inicio,criado_em")
          .eq("empresa_id", empresaId);

        if (error || !data) {
          console.error(
            "[GraficosPainel] erro a carregar obras por mês ->",
            error?.message || error
          );
          if (!cancelled) setObrasMesState([]);
          return;
        }

        const mapa = new Map<string, number>();

        (data as {
          id: string;
          data_inicio: string | null;
          criado_em?: string | null;
        }[]).forEach((obra) => {
          // usamos data_inicio se existir, senão criado_em
          const refDateStr = obra.data_inicio || obra.criado_em;
          if (!refDateStr) return;

          const d = new Date(refDateStr);
          if (Number.isNaN(d.getTime())) return;

          const key = `${d.getFullYear()}-${String(
            d.getMonth() + 1
          ).padStart(2, "0")}`;

          mapa.set(key, (mapa.get(key) || 0) + 1);
        });

        const result: ObraMes[] = Array.from(mapa.entries())
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([mes, obras]) => ({ mes, obras }));

        if (!cancelled) setObrasMesState(result);
      } catch (e: any) {
        console.error(
          "[GraficosPainel] erro inesperado ao carregar obras por mês ->",
          e?.message || e
        );
        if (!cancelled) setObrasMesState([]);
      } finally {
        if (!cancelled) setLoadingObrasMes(false);
      }
    };

    carregarObrasMes();

    return () => {
      cancelled = true;
    };
  }, [obrasMes]);

  // ====== dados gráficos ======
  const obrasData = useMemo(() => {
    const source =
      obrasMes && obrasMes.length > 0 ? obrasMes : obrasMesState;
    return (source || []).map((o) => ({
      mes: toMesNome(o.mes),
      obras: o.obras,
    }));
  }, [obrasMes, obrasMesState]);

  const custosData = useMemo(
    () =>
      (custosMes || []).map((c) => ({
        mes: toMesNome(c.mes),
        custo: c.custo,
      })),
    [custosMes]
  );

  // ---------- ghost data (primeira vez, sem nenhum registo) ----------
  const ghostMeses = useMemo(
    () => selMeses.map((idx) => MESES[idx]),
    [selMeses]
  );

  const ghostObrasData = useMemo(
    () =>
      ghostMeses.map((mes, idx) => ({
        mes,
        obras: idx + 1,
      })),
    [ghostMeses]
  );

  const ghostCustosData = useMemo(
    () =>
      ghostMeses.map((mes, idx) => ({
        mes,
        custo: (idx + 1) * 1000,
      })),
    [ghostMeses]
  );

  const isEmptyObras = !loadingObrasMes && obrasData.length === 0;
  const isEmptyCustos = custosData.length === 0;

  const chartObrasData = isEmptyObras ? ghostObrasData : obrasData;
  const chartCustosData = isEmptyCustos ? ghostCustosData : custosData;

  const nenhumDadoObras =
    obrasData.length > 0 && obrasData.every((x) => x.obras === 0);
  const nenhumDadoCustos =
    custosData.length > 0 && custosData.every((x) => x.custo === 0);

  // Marca que já animou quando chegam dados > 0
  useEffect(() => {
    if (!obrasAnimouRef.current && obrasData.some((x) => x.obras > 0)) {
      obrasAnimouRef.current = true;
    }
  }, [obrasData]);

  useEffect(() => {
    if (!custosAnimouRef.current && custosData.some((x) => x.custo > 0)) {
      custosAnimouRef.current = true;
    }
  }, [custosData]);

  const go = (key: "pedido" | "obra" | "documento" | "equipe") => {
    const map: Record<typeof key, ParentQuickSection> = {
      pedido: "novos-pedidos",
      obra: "obras-ativas",
      documento: "documentos-profissionais",
      equipe: "equipes-em-campo",
    };
    onQuickAction?.(map[key]);
  };

  const Card = (props: {
    title: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }) => {
    const { title, children, className } = props;
    return (
      <div
        className={`relative rounded-2xl p-5 shadow bg-white border border-gray-200 text-gray-800
          dark:bg-[#020617] dark:border-slate-800/80 dark:text-gray-100 ${
            className || ""
          }`}
      >
        <div className="mb-3 text-[15px] font-semibold flex items-center gap-2">
          {title}
        </div>
        {children}
      </div>
    );
  };

  const EmptyState = ({
    icon,
    text,
  }: {
    icon: React.ReactNode;
    text: string;
  }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-medium pointer-events-none">
      <div className="rounded-full p-2 bg-gray-50 border border-gray-200 mb-2 dark:bg_WHITE/5 dark:border-white/10">
        {icon}
      </div>
      <span className="text-gray-500 dark:text-gray-400 text-xs text-center max-w-[180px]">
        {text}
      </span>
    </div>
  );

  const timeLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  /* =========================
     Render
  ========================= */
  return (
    <div className="w-full flex flex-col gap-6 mt-4 sm:mt-6">
      {/* DESKTOP */}
      <div className="hidden md:grid grid-cols-[2fr_1fr] gap-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Obras */}
          <Card
            title={
              <>
                <HardHat className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <span>Obras por mês</span>
              </>
            }
          >
            <div
              className={`h-[220px] w-full overflow-hidden relative ${
                isEmptyObras ? "opacity-60" : ""
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartObrasData} barCategoryGap="20%">
                  <defs>
                    <linearGradient
                      id={gradIdObras}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#60A5FA"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="100%"
                        stopColor="#3B82F6"
                        stopOpacity={0.55}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                    strokeOpacity={0.6}
                    className="dark:stroke-white/10"
                  />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6b7280" }}
                  />
                  {!isEmptyObras && <Tooltip content={<CustomTooltip />} />}
                  <Bar
                    dataKey="obras"
                    fill={`url(#${gradIdObras})`}
                    radius={[12, 12, 10, 10]}
                    isAnimationActive={
                      !obrasAnimouRef.current && !isEmptyObras
                    }
                  />
                </BarChart>
              </ResponsiveContainer>

              {(isEmptyObras || nenhumDadoObras) && (
                <EmptyState
                  icon={
                    <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  }
                  text={
                    isEmptyObras
                      ? "Assim que criar obras, este gráfico será atualizado automaticamente."
                      : "Nenhuma obra registada ainda."
                  }
                />
              )}
            </div>
          </Card>

          {/* Custos */}
          <Card
            title={
              <>
                <Euro className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                <span>Custos mensais (€)</span>
              </>
            }
          >
            <div
              className={`h-[220px] w-full overflow-hidden relative ${
                isEmptyCustos ? "opacity-60" : ""
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartCustosData}>
                  <defs>
                    <linearGradient
                      id={gradIdCustos}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#A78BFA"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="100%"
                        stopColor="#8B5CF6"
                        stopOpacity={0.12}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    strokeOpacity={0.6}
                    className="dark:stroke-white/10"
                  />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6b7280" }}
                  />
                  {!isEmptyCustos && <Tooltip content={<CustomTooltip />} />}
                  <Area
                    type="monotone"
                    dataKey="custo"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 3 }}
                    fill={`url(#${gradIdCustos})`}
                    isAnimationActive={
                      !custosAnimouRef.current && !isEmptyCustos
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>

              {(isEmptyCustos || nenhumDadoCustos) && (
                <EmptyState
                  icon={
                    <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                  }
                  text={
                    isEmptyCustos
                      ? "Quando registrar custos das obras, verá a evolução aqui."
                      : "Nenhum custo registado ainda."
                  }
                />
              )}
            </div>
          </Card>
        </div>

        {/* Ações rápidas + feed */}
        <Card
          title={
            <>
              <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-500" />
              <span>Ações rápidas</span>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              {
                label: "Pedido",
                icon: (
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                ),
                on: () => go("pedido"),
              },
              {
                label: "Obra",
                icon: (
                  <Building2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                ),
                on: () => go("obra"),
              },
              {
                label: "Documento",
                icon: (
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                ),
                on: () => go("documento"),
              },
              {
                label: "Equipe",
                icon: (
                  <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                ),
                on: () => go("equipe"),
              },
            ].map((b, i) => (
              <button
                key={i}
                onClick={b.on}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm
                           bg-gray-100 hover:bg-gray-200 text-gray-800
                           dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-gray-200 transition"
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-2 text-[14px] font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              <span>Atividades recentes</span>
            </div>
            {loadingAtividades ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                A carregar atividades…
              </p>
            ) : atividades.length ? (
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                {atividades.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    {iconByTipo[a.tipo] || (
                      <Clock className="w-4 h-4 text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="leading-snug">
                        {a.descricao || labelFromTipo(a.tipo, a.meta)}
                      </p>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {timeLabel(a.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Sem atividades registadas ainda.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* MOBILE */}
      <div className="md:hidden bg-white border border-gray-200 rounded-2xl shadow p-4 dark:bg-[#020617] dark:border-slate-800/80">
        <div className="flex justify-center gap-2 mb-4">
          {[
            { key: "acoes", label: "Ações", icon: <Settings2 className="w-4 h-4" /> },
            { key: "obras", label: "Obras", icon: <HardHat className="w-4 h-4" /> },
            { key: "custos", label: "Custos", icon: <Euro className="w-4 h-4" /> },
          ].map((tItem) => (
            <button
              key={tItem.key}
              onClick={() => setTab(tItem.key as any)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition
                ${
                  tab === tItem.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
                }`}
            >
              {tItem.icon}
              {tItem.label}
            </button>
          ))}
        </div>

        <div className="w-full">
          {tab === "acoes" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: (
                      <Plus className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                    ),
                    label: "Pedido",
                    on: () => go("pedido"),
                  },
                  {
                    icon: (
                      <Building2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                    ),
                    label: "Obra",
                    on: () => go("obra"),
                  },
                  {
                    icon: (
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                    ),
                    label: "Documento",
                    on: () => go("documento"),
                  },
                  {
                    icon: (
                      <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ),
                    label: "Equipe",
                    on: () => go("equipe"),
                  },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={a.on}
                    className="flex flex-col items-center justify-center gap-1 bg-gray-100 rounded-xl py-3 active:scale-95 transition
                               text-gray-800 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-gray-200"
                  >
                    {a.icon}
                    <span className="text-xs">{a.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <div className="mb-2 text-[14px] font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span>Atividades recentes</span>
                </div>
                {loadingAtividades ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    A carregar atividades…
                  </p>
                ) : atividades.length ? (
                  <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    {atividades.map((a) => (
                      <li key={a.id} className="flex items-start gap-3">
                        {iconByTipo[a.tipo] || (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="leading-snug">
                            {a.descricao || labelFromTipo(a.tipo, a.meta)}
                          </p>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {timeLabel(a.created_at)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>Sem atividades registadas ainda.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "obras" && (
            <div
              className={`h-[200px] w-full overflow-hidden relative ${
                isEmptyObras ? "opacity-60" : ""
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartObrasData} barCategoryGap="22%">
                  <defs>
                    <linearGradient
                      id={`${gradIdObras}-m`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#60A5FA"
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="100%"
                        stopColor="#3B82F6"
                        stopOpacity={0.55}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                    strokeOpacity={0.6}
                    className="dark:stroke-white/10"
                  />
                  <XAxis
                    dataKey="mes"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6b7280" }}
                  />
                  {!isEmptyObras && <Tooltip content={<CustomTooltip />} />}
                  <Bar
                    dataKey="obras"
                    fill={`url(#${gradIdObras}-m)`}
                    radius={[8, 8, 6, 6]}
                    isAnimationActive={
                      !obrasAnimouRef.current && !isEmptyObras
                    }
                  />
                </BarChart>
              </ResponsiveContainer>

              {(isEmptyObras || nenhumDadoObras) && (
                <EmptyState
                  icon={
                    <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  }
                  text={
                    isEmptyObras
                      ? "Crie a primeira obra para ver este gráfico ganhar vida."
                      : "Nenhuma obra registada ainda."
                  }
                />
              )}
            </div>
          )}

          {tab === "custos" && (
            <div
              className={`h-[200px] w-full overflow-hidden relative ${
                isEmptyCustos ? "opacity-60" : ""
              }`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartCustosData}>
                  <defs>
                    <linearGradient
                      id={`${gradIdCustos}-m`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#A78BFA"
                        stopOpacity={0.85}
                      />
                      <stop
                        offset="100%"
                        stopColor="#8B5CF6"
                        stopOpacity={0.12}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    strokeOpacity={0.6}
                    className="dark:stroke-white/10"
                  />
                  <XAxis
                    dataKey="mes"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#6b7280" }}
                  />
                  {!isEmptyCustos && <Tooltip content={<CustomTooltip />} />}
                  <Area
                    type="monotone"
                    dataKey="custo"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 3 }}
                    fill={`url(#${gradIdCustos}-m)`}
                    isAnimationActive={
                      !custosAnimouRef.current && !isEmptyCustos
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>

              {(isEmptyCustos || nenhumDadoCustos) && (
                <EmptyState
                  icon={
                    <Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                  }
                  text={
                    isEmptyCustos
                      ? "Quando começar a lançar custos, este gráfico mostrará a evolução mês a mês."
                      : "Nenhum custo registado ainda."
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(GraficosPainelBase);
