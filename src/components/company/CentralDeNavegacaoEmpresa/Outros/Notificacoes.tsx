// src/components/company/CentralDeNavegacaoEmpresa/Outros/Notificacoes.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  Dot,
  Loader2,
  ExternalLink,
} from "lucide-react";

/* =========================
   Tipos
========================= */
type Noti = {
  id: string;
  tipo: string | null;
  titulo: string | null;
  conteudo: string | null;
  icone: string | null;
  url_destino: string | null;
  lida: boolean | null;
  criado_em: string | null;
  empresa_id: string | null;
  usuario_id: string | null;
};

type TabKey = "todos" | "nao_lidas" | "lidas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "nao_lidas", label: "Não lidas" },
  { key: "lidas", label: "Lidas" },
];

/* =========================
   Helpers
========================= */
function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  return `${days} d`;
}

function IconBubble({ kind }: { kind?: string | null }) {
  const base =
    "inline-grid place-items-center shrink-0 h-10 w-10 rounded-full";
  const map: Record<string, string> = {
    aprovado: "bg-emerald-500/15 text-emerald-400",
    checkcircle2: "bg-emerald-500/15 text-emerald-400",
    xcircle: "bg-rose-500/15 text-rose-400",
    recusado: "bg-rose-500/15 text-rose-400",
    documento: "bg-amber-500/15 text-amber-400",
    financeiro: "bg-indigo-500/15 text-indigo-400",
    sistema: "bg-sky-500/15 text-sky-400",
    pedido: "bg-cyan-500/15 text-cyan-400",
    profissional: "bg-fuchsia-500/15 text-fuchsia-400",
  };
  const tone = map[(kind || "").toLowerCase()] || "bg-sky-500/15 text-sky-400";
  return (
    <div className={`${base} ${tone}`} aria-hidden>
      <Bell className="h-5 w-5" />
    </div>
  );
}

/* =========================
   Página
========================= */
export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<{ id: string; empresa_id: string | null } | null>(null);
  const [notis, setNotis] = useState<Noti[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<TabKey>("todos");

  /* Perfil mínimo */
  useEffect(() => {
    let ok = true;
    (async () => {
      const { data } = await supabase
        .from("usuarios")
        .select("id, empresa_id")
        .eq("email", user?.email)
        .maybeSingle();
      if (ok) setProfile(data);
    })();
    return () => { ok = false; };
  }, [user?.email]);

  /* Carregar notificações */
  const fetchNotis = useCallback(async () => {
    if (!profile?.empresa_id && !profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notificacoes_realtime")
      .select("id, tipo, titulo, conteudo, icone, url_destino, lida, criado_em, empresa_id, usuario_id")
      .or(`empresa_id.eq.${profile?.empresa_id},usuario_id.eq.${profile?.id}`)
      .order("criado_em", { ascending: false })
      .limit(200);
    if (!error && data) setNotis(data as Noti[]);
    setLoading(false);
  }, [profile?.empresa_id, profile?.id]);

  useEffect(() => { fetchNotis(); }, [fetchNotis]);

  /* Realtime */
  useEffect(() => {
    if (!profile?.empresa_id && !profile?.id) return;
    const channel = supabase
      .channel("notis_listen_page_mobile")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes_realtime",
          filter: profile?.empresa_id ? `empresa_id=eq.${profile.empresa_id}` : `usuario_id=eq.${profile?.id}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") setNotis((prev) => [payload.new as Noti, ...prev]);
          else if (payload.eventType === "UPDATE")
            setNotis((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as Noti) : n)));
          else if (payload.eventType === "DELETE")
            setNotis((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.empresa_id, profile?.id]);

  /* Ações */
  const unreadCount = useMemo(() => notis.filter((n) => !n.lida).length, [notis]);

  const markAllAsRead = useCallback(async () => {
    const ids = notis.filter((n) => !n.lida).map((n) => n.id);
    if (!ids.length) return;
    setNotis((prev) => prev.map((n) => ({ ...n, lida: true })));
    await supabase.from("notificacoes_realtime").update({ lida: true }).in("id", ids);
  }, [notis]);

  const markOneAsRead = useCallback(async (id: string) => {
    setNotis((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await supabase.from("notificacoes_realtime").update({ lida: true }).eq("id", id);
  }, []);

  const openNoti = useCallback(async (n: Noti) => {
    if (!n.lida) await markOneAsRead(n.id);
    if (n.url_destino) navigate(n.url_destino);
  }, [markOneAsRead, navigate]);

  /* Filtro */
  const filtered = useMemo(() => {
    let arr = [...notis];
    if (tab === "nao_lidas") arr = arr.filter((n) => !n.lida);
    if (tab === "lidas") arr = arr.filter((n) => !!n.lida);
    return arr;
  }, [notis, tab]);

  /* UI */
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="notif-page"
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "tween", duration: 0.25 }}
        className="relative mx-auto w-full max-w-[1000px]"
      >
        {/** STICKY SÓ NO MOBILE; NO DESKTOP É STATIC (não sobrepõe a lista) */}
        <div className="sticky top-12 sm:top-14 md:static z-20 bg-transparent">
          {/* BLOCO 1 — TÍTULO */}
          <div className="px-4 sm:px-6 pt-2 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="rounded-full p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="inline-grid h-8 w-8 place-items-center rounded-full bg-sky-500/15 text-sky-500 dark:text-sky-400">
                <Bell className="h-4 w-4" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-base font-bold truncate">Notificações</div>
                <div className="text-[11px] opacity-70">
                  {unreadCount} não lida{unreadCount === 1 ? "" : "s"} • {notis.length} no total
                </div>
              </div>
            </div>

            <button
              onClick={markAllAsRead}
              disabled={!unreadCount}
              className={`rounded-full px-3 py-1.5 text-xs font-medium text-white transition
                ${unreadCount ? "bg-sky-600 hover:bg-sky-700" : "bg-slate-400 cursor-not-allowed"}`}
              aria-disabled={!unreadCount}
            >
              Marcar lidas
            </button>
          </div>

          {/* BLOCO 2 — FILTROS */}
          {/* Mobile: segmentado 3 colunas com larguras iguais */}
          <div className="px-4 sm:px-6 pb-2 md:hidden">
            <div className="rounded-full p-1 bg-slate-500/10 dark:bg-slate-800/60 flex gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 appearance-none text-center text-sm py-2 rounded-full transition
                    ${tab === t.key ? "bg-sky-600 text-white shadow-sm"
                                     : "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-500/10"}`}
                  aria-pressed={tab === t.key}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop: pills clássicos */}
          <div className="hidden md:flex gap-2 px-6 pb-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3 py-1.5 text-sm border transition
                  ${tab === t.key
                    ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "border-transparent bg-slate-500/10 hover:bg-slate-500/20"}`}
                aria-pressed={tab === t.key}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Espaço mínimo pós-header (garante folga no mobile quando sticky) */}
        <div className="mt-2 md:mt-0" />

        {/* Lista */}
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm opacity-80">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-sm opacity-70">Nenhuma notificação encontrada.</div>
        ) : (
          <ul className="divide-y dark:divide-slate-800/60 divide-zinc-200/60">
            {filtered.map((n) => {
              const unread = !n.lida;
              return (
                <li key={n.id} className="px-2 sm:px-4">
                  <button
                    onClick={() => openNoti(n)}
                    className={`w-full text-left py-3 flex items-start gap-3 active:opacity-80 transition
                      ${unread ? "bg-sky-500/5" : ""}`}
                  >
                    <IconBubble kind={n.tipo || n.icone || undefined} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            {unread && (
                              <span className="inline-flex items-center text-sky-500 dark:text-sky-400">
                                <Dot className="h-5 w-5 -ml-2" />
                              </span>
                            )}
                            <p className={`truncate text-[15px] font-semibold ${unread ? "" : "opacity-90"}`}>
                              {n.titulo || "Nova notificação"}
                            </p>
                          </div>

                          {n.conteudo && (
                            <p className="mt-0.5 line-clamp-2 text-[13px] opacity-75">
                              {n.conteudo}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full border px-2 py-0.5 text-[11px] opacity-70">
                              {(n.tipo || "Geral").replace(/^\w/, (c) => c.toUpperCase())}
                            </span>

                            {n.url_destino && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] text-sky-700 dark:text-sky-300">
                                <ExternalLink className="h-3 w-3" />
                                Abrir
                              </span>
                            )}

                            {!n.lida && (
                              <span
                                onClick={(e) => { e.stopPropagation(); markOneAsRead(n.id); }}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Marcar lida
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="whitespace-nowrap text-[11px] opacity-60">
                          {timeAgo(n.criado_em)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="h-6" />
      </motion.div>
    </AnimatePresence>
  );
}
