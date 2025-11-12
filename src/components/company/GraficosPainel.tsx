// src/components/company/GraficosPainel.tsx
import { useEffect, useMemo, useRef, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";

/* =========================
   Tipos & helpers
========================= */
type QuickSection =
  | "novos-pedidos"
  | "obras-ativas"
  | "documentos-profissionais"
  | "equipes-em-campo";

type Atividade = {
  id: string;
  tipo: string; // 'obra_criada', 'perfil_atualizado', 'login', ...
  descricao?: string | null;
  meta?: any | null; // JSON extra
  created_at: string;
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const idxAtual = new Date().getMonth();
const lastNMonths = (n: number) =>
  Array.from({ length: n }, (_, i) => (idxAtual - (n - 1 - i) + 12) % 12);

const ym = (dt?: string | null) => (dt ? new Date(dt).toISOString().slice(0, 7) : "—");

const formatEUR = (n: number) =>
  n.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const iconByTipo: Record<string, JSX.Element> = {
  obra_criada: <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
  obra_atualizada: <Building2 className="w-4 h-4 text-blue-400 dark:text-blue-300" />,
  documento_enviado: <FileText className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
  equipe_vinculada: <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
  perfil_atualizado: <UserIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
  login: <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
};

// normaliza "2025-11" -> "Nov"
const toMesNome = (m: string) => {
  if (/^\d{4}-\d{2}$/.test(m)) {
    const idx = parseInt(m.slice(5, 7), 10) - 1;
    return MESES[idx] ?? m;
  }
  return m;
};

/* =========================
   Hook: garante container com tamanho > 0 (Recharts)
========================= */
function useReadyBox() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setReady(true);
    });
    ro.observe(el);

    // fallback iOS/Safari
    const t = setTimeout(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setReady(true);
    }, 120);

    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  return { boxRef, ready, forceReady: () => setReady(true) };
}

/* =========================
   Componente
========================= */
export default function GraficosPainel({
  obrasMes = [],
  custosMes = [],
  onQuickAction,
}: {
  obrasMes?: { mes: string; obras: number }[];
  custosMes?: { mes: string; custo: number }[];
  onQuickAction?: (section: QuickSection) => void;
}) {
  const { t } = useTranslation();
  const [selMeses] = useState<number[]>(lastNMonths(3));
  const [loading, setLoading] = useState(false);
  const [obrasData, setObrasData] = useState<{ mes: string; obras: number }[]>([]);
  const [custosData, setCustosData] = useState<{ mes: string; custo: number }[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [tab, setTab] = useState<"acoes" | "obras" | "custos">("acoes");

  // ids únicos p/ gradiente (evita colisão quando houver mais de um gráfico)
  const gradIdCustos = useId();

  // render seguro pros gráficos (desktop + mobile)
  const obrasBox = useReadyBox();
  const custosBox = useReadyBox();

  // força o Recharts a recalcular no primeiro paint (logo após login)
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      obrasBox.forceReady();
      custosBox.forceReady();
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // quando trocar de aba no mobile, ping de resize e fallback
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
    const t = setTimeout(() => {
      if (tab === "obras") obrasBox.forceReady();
      if (tab === "custos") custosBox.forceReady();
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // aguardamos sessão autenticada (evita tela vazia na 1ª entrada)
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data?.session) setSessionReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted && session) setSessionReady(true);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // ========= Carregar dados (depois da sessão) =========
  useEffect(() => {
    if (!sessionReady) return;

    const run = async () => {
      // normaliza dados recebidos por props
      if (obrasMes.length || custosMes.length) {
        setObrasData(obrasMes.map(o => ({ mes: toMesNome(o.mes), obras: o.obras })));
        setCustosData(custosMes.map(c => ({ mes: toMesNome(c.mes), custo: c.custo })));
      }

      setLoading(true);

      // 1) empresa_id
      let empresaId: string | null = null;
      const rpc = await supabase.rpc("minha_empresa_id");
      if (!rpc.error) empresaId = (rpc.data as string) ?? null;
      if (!empresaId) {
        const u = await supabase.auth.getUser();
        empresaId = (u.data.user?.user_metadata?.empresa_id as string) || null;
      }
      if (!empresaId) {
        setLoading(false);
        return;
      }

      // 2) obras da empresa (somente id/data_inicio)
      const { data: obrasRaw, error: eObras } = await supabase
        .from("obras")
        .select("id, data_inicio")
        .eq("empresa_id", empresaId);
      if (eObras) console.error("[GraficosPainel] obras ->", eObras);

      const obras = obrasRaw || [];
      const obraIds = obras.map((o: any) => o.id);

      // 3) obras por mês (12 meses)
      if (!obrasMes.length) {
        const mapa = new Map<string, number>();
        obras.forEach((o: any) => {
          const key = ym(o.data_inicio);
          if (key !== "—") mapa.set(key, (mapa.get(key) || 0) + 1);
        });
        const base: { mes: string; obras: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i, 1);
          const key = d.toISOString().slice(0, 7);
          base.push({ mes: MESES[d.getMonth()], obras: mapa.get(key) || 0 });
        }
        setObrasData(base);
      }

      // 4) custos por mês (12 meses)
      if (!custosMes.length) {
        let base: { mes: string; custo: number }[] = [];
        if (obraIds.length) {
          const { data: custosRaw, error: eC } = await supabase
            .from("custos_obra")
            .select("obra_id, valor_total, data_custo, mes")
            .in("obra_id", obraIds);
          if (eC) console.error("[GraficosPainel] custos_obra ->", eC);

          const mapa = new Map<string, number>();
          (custosRaw || []).forEach((c: any) => {
            const v = Number(c.valor_total || 0);
            const key = c.mes && /^\d{4}-\d{2}$/.test(c.mes) ? c.mes : ym(c.data_custo);
            if (key !== "—") mapa.set(key, (mapa.get(key) || 0) + v);
          });

          for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            base.push({ mes: MESES[d.getMonth()], custo: mapa.get(key) || 0 });
          }
        }
        setCustosData(base);
      }

      // 5) atividades recentes
      const { data: acts, error: eActs } = await supabase
        .from("atividades")
        .select("id,tipo,descricao,meta,created_at")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!eActs && acts) setAtividades(acts as Atividade[]);

      setLoading(false);

      // garante que o Recharts redesenhe após dados chegarem no 1º load
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
        obrasBox.forceReady();
        custosBox.forceReady();
      }, 0);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, obrasMes, custosMes]);

  // ========= filtros (3 meses) =========
  const filtroMes = useMemo(() => {
    return (item: { mes: string }) => {
      // suporta "Jan" e "2025-11"
      const nome = toMesNome(item.mes);
      const idx = MESES.indexOf(nome);
      return selMeses.includes(idx);
    };
  }, [selMeses]);

  const obrasFiltradas = obrasData.filter(filtroMes);
  const custosFiltrados = custosData.filter(filtroMes);

  // ========= Tooltip =========
  const CustomTooltip = ({ label, payload }: any) => {
    if (!payload || !payload.length) return null;
    const p = payload[0];
    const isCusto = p.dataKey === "custo";
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 text-xs">
        <p className="font-semibold text-gray-800 dark:text-gray-100">{label}</p>
        <p className="text-gray-600 dark:text-gray-300 mt-0.5">
          {isCusto ? formatEUR(p.value ?? 0) : (p.value ?? 0).toLocaleString("pt-PT")}
        </p>
      </div>
    );
  };

  const nenhumDadoObras = !loading && obrasFiltradas.every((x) => x.obras === 0);
  const nenhumDadoCustos = !loading && custosFiltrados.every((x) => x.custo === 0);

  const go = (key: "pedido" | "obra" | "documento" | "equipe") => {
    const map: Record<typeof key, QuickSection> = {
      pedido: "novos-pedidos",
      obra: "obras-ativas",
      documento: "documentos-profissionais",
      equipe: "equipes-em-campo",
    };
    onQuickAction?.(map[key]);
  };

  // ===== UI helpers
  const Card: React.FC<{ title: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <motion.div
      whileHover={{ scale: 1.003 }}
      className={`relative rounded-2xl p-5 shadow-sm
        bg-white border border-gray-200 text-gray-800
        dark:bg-zinc-900/70 dark:border-zinc-700 dark:text-gray-100
        ${className || ""}`}
    >
      <div className="mb-3 text-[15px] font-semibold">{title}</div>
      {children}
    </motion.div>
  );

  const EmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-medium">
      <div className="rounded-full p-2 bg-gray-50 border border-gray-200 mb-2 dark:bg-white/5 dark:border-white/10">
        {icon}
      </div>
      <span className="text-gray-500 dark:text-gray-400">{text}</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 mt-4 sm:mt-6">
      {/* DESKTOP */}
      <div className="hidden md:grid grid-cols-[2fr_1fr] gap-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Obras */}
          <Card title={<><HardHat className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Obras por mês</>}>
            <div ref={obrasBox.boxRef} className="h-[220px] w-full overflow-hidden">
              {obrasBox.ready && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={obrasFiltradas}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.6} className="dark:stroke-white/10" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="obras" fill="#3B82F6" radius={[10, 10, 8, 8]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {nenhumDadoObras && (
              <EmptyState icon={<Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />} text="Nenhuma obra registrada ainda." />
            )}
          </Card>

          {/* Custos */}
          <Card title={<><Euro className="w-5 h-5 text-purple-600 dark:text-purple-500" /> Custos mensais (€)</>}>
            <div ref={custosBox.boxRef} className="h-[220px] w-full overflow-hidden">
              {custosBox.ready && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={custosFiltrados}>
                    <defs>
                      <linearGradient id={gradIdCustos} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.12} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.6} className="dark:stroke-white/10" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="custo" stroke="#8B5CF6" strokeWidth={2} fill={`url(#${gradIdCustos})`} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            {nenhumDadoCustos && (
              <EmptyState icon={<Sparkles className="w-5 h-5 text-purple-500 dark:text-purple-400" />} text="Nenhum custo registrado ainda." />
            )}
          </Card>
        </div>

        {/* Lateral: Ações + Atividades */}
        <Card title={<><Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-500" /> Ações rápidas</>}>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { label: "Pedido", icon: <Plus className="w-4 h-4 text-blue-600 dark:text-blue-500" />, on: () => go("pedido") },
              { label: "Obra", icon: <Building2 className="w-4 h-4 text-green-600 dark:text-green-500" />, on: () => go("obra") },
              { label: "Documento", icon: <FileText className="w-4 h-4 text-purple-600 dark:text-purple-500" />, on: () => go("documento") },
              { label: "Equipe", icon: <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />, on: () => go("equipe") },
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
            <div className="mb-3 text-[15px] font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500 dark:text-orange-400" /> Atividades recentes
            </div>
            {atividades.length ? (
              <ul className="space-y-3">
                {atividades.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    {iconByTipo[a.tipo] || <Clock className="w-4 h-4 text-gray-400" />}
                    <div className="flex-1">
                      <p className="leading-snug">
                        {a.descricao || labelFromTipo(a.tipo, a.meta)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(a.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}{" "}
                        {new Date(a.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Sparkles className="w-4 h-4" /> Sem atividades ainda.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* MOBILE (abas) */}
      <div className="md:hidden bg-white border border-gray-200 rounded-2xl shadow p-4 dark:bg-zinc-900/70 dark:border-zinc-700">
        {/* Abas */}
        <div className="flex justify-center gap-2 mb-4">
          {[
            { key: "acoes", label: "Ações", icon: <Settings2 className="w-4 h-4" /> },
            { key: "obras", label: "Obras", icon: <HardHat className="w-4 h-4" /> },
            { key: "custos", label: "Custos", icon: <Euro className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition
                ${tab === t.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {tab === "acoes" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Plus className="w-5 h-5 text-blue-600 dark:text-blue-500" />, label: "Pedido", on: () => go("pedido") },
                    { icon: <Building2 className="w-5 h-5 text-green-600 dark:text-green-500" />, label: "Obra", on: () => go("obra") },
                    { icon: <FileText className="w-5 h-5 text-purple-600 dark:text-purple-500" />, label: "Documento", on: () => go("documento") },
                    { icon: <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />, label: "Equipe", on: () => go("equipe") },
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

                {/* Atividades recentes no mobile */}
                <div>
                  <div className="mb-2 text-[15px] font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                    Atividades recentes
                  </div>
                  {atividades.length ? (
                    <ul className="space-y-3">
                      {atividades.map((a) => (
                        <li key={a.id} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                          {iconByTipo[a.tipo] || <Clock className="w-4 h-4 text-gray-400" />}
                          <div className="flex-1">
                            <p className="leading-snug">
                              {a.descricao || labelFromTipo(a.tipo, a.meta)}
                            </p>
                            <span className="text-xs text-gray-500">
                              {new Date(a.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}{" "}
                              {new Date(a.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Sparkles className="w-4 h-4" /> Sem atividades ainda.
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "obras" && (
              <div ref={obrasBox.boxRef} className="h-[200px] w-full overflow-hidden">
                {obrasBox.ready && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={obrasFiltradas}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.6} className="dark:stroke-white/10" />
                      <XAxis dataKey="mes" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="obras" fill="#3B82F6" radius={[8, 8, 6, 6]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {tab === "custos" && (
              <div ref={custosBox.boxRef} className="h-[200px] w-full overflow-hidden">
                {custosBox.ready && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={custosFiltrados}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.6} className="dark:stroke-white/10" />
                      <XAxis dataKey="mes" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="custo" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Texto padrão para cada tipo quando 'descricao' não vier preenchida */
function labelFromTipo(tipo: string, meta: any) {
  switch (tipo) {
    case "obra_criada": return `Nova obra criada${meta?.nome ? `: ${meta.nome}` : ""}`;
    case "obra_atualizada": return `Obra atualizada${meta?.nome ? `: ${meta.nome}` : ""}`;
    case "documento_enviado": return `Documento enviado${meta?.tipo ? ` (${meta.tipo})` : ""}`;
    case "equipe_vinculada": return `Equipe vinculada à obra${meta?.obra_nome ? ` ${meta.obra_nome}` : ""}`;
    case "perfil_atualizado": return "Perfil atualizado";
    case "login": return "Login realizado";
    default: return "Atividade";
  }
}
