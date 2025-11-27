import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  LogOut,
  Bell,
  MessageCircle,
  LayoutDashboard,
  Moon,
  Sun,
  Menu,
  Briefcase,
  Users,
  BarChart2,
  CheckCircle2,
  Loader2,
  XCircle,
  User,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";

import SidebarDock from "./SidebarDock";
import EmpresaPainel from "./EmpresaPainel";
import Profissionais from "./Profissionais";
import Relatorios from "./Relatorios";
import ChatComEquipa from "./ChatComEquipa";

// Pedidos
import NovosPedidos from "./CentralDeNavegacaoEmpresa/Pedidos/NovosPedidos";
import EmAvaliacao from "./CentralDeNavegacaoEmpresa/Pedidos/EmAvaliacao";
import Aprovados from "./CentralDeNavegacaoEmpresa/Pedidos/Aprovados";

// Obras
import ObrasAtivas from "./CentralDeNavegacaoEmpresa/Obras/ObrasAtivas";
import Historico from "./CentralDeNavegacaoEmpresa/Obras/Historico";
import AdicionarObra from "./CentralDeNavegacaoEmpresa/Obras/AdicionarObra";

// Relatórios
import CustosMensais from "./CentralDeNavegacaoEmpresa/Relatorios/CustosMensais";
import Desempenho from "./CentralDeNavegacaoEmpresa/Relatorios/Desempenho";
import Financeiro from "./CentralDeNavegacaoEmpresa/Relatorios/Financeiro";

// Documentos & Outros
import Documentos from "./CentralDeNavegacaoEmpresa/Documentos/Documentos";
import Acrobatas from "./CentralDeNavegacaoEmpresa/Documentos/Acrobatas";
import ProfissionaisDocs from "./CentralDeNavegacaoEmpresa/Documentos/Profissionais";
import MeusDocumentos from "./CentralDeNavegacaoEmpresa/Documentos/MeusDocumentos";
import Configuracoes from "./CentralDeNavegacaoEmpresa/Outros/Configuracoes";
import Notificacoes from "./CentralDeNavegacaoEmpresa/Outros/Notificacoes";
import PerfilEmpresa from "./CentralDeNavegacaoEmpresa/Outros/PerfilEmpresa";

// Profissionais (subpáginas)
import EquipesEmCampo from "./CentralDeNavegacaoEmpresa/Profissionais/EquipesEmCampo";
import AdicionarProfissional from "./CentralDeNavegacaoEmpresa/Profissionais/AdicionarProfissionalPage";
import FaltasPresencas from "./CentralDeNavegacaoEmpresa/Profissionais/FaltasPresencas";

type Noti = {
  id: string;
  titulo: string | null;
  conteudo: string | null;
  icone: string | null;
  url_destino: string | null;
  lida: boolean | null;
  criado_em: string | null;
  empresa_id: string | null;
  usuario_id: string | null;
};

function norm(s?: string | null) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
type Canon = "em_analise" | "aprovado" | "recusado" | "cancelado";
function canonStatus(s?: string | null): Canon {
  const v = norm(s);
  if (
    ["em_analise", "em avaliacao", "em_avaliacao", "pendente", "pending"].includes(
      v
    )
  )
    return "em_analise";
  if (
    ["aprovado", "concluido", "concluído", "approved", "approved ✅"].includes(v)
  )
    return "aprovado";
  if (["recusado", "reprovado", "rejected", "denied"].includes(v))
    return "recusado";
  if (["cancelado", "canceled", "cancelled"].includes(v)) return "cancelado";
  return "em_analise";
}
function getNotiKey(n: Noti): string {
  try {
    if (!n.url_destino) return `${n.titulo}|${n.conteudo}`;
    const u = new URL(n.url_destino, window.location.origin);
    const focus = u.searchParams.get("focus") || u.searchParams.get("novo") || "";
    const status = u.searchParams.get("status") || "";
    return `${focus}|${status}` || `${n.titulo}|${n.conteudo}`;
  } catch {
    return `${n.titulo}|${n.conteudo}`;
  }
}
function dedupeSort(list: Noti[]): Noti[] {
  const byKey = new Map<string, Noti>();
  for (const n of list) {
    const k = getNotiKey(n);
    const prev = byKey.get(k);
    if (!prev) byKey.set(k, n);
    else {
      const t1 = prev.criado_em ? +new Date(prev.criado_em) : 0;
      const t2 = n.criado_em ? +new Date(n.criado_em) : 0;
      const choose = t2 >= t1 ? n : prev;
      byKey.set(k, !prev.lida && n.lida ? prev : choose);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => +new Date(b.criado_em || 0) - +new Date(a.criado_em || 0)
  );
}

// ===== avatar helpers =====
function initialsFrom(name?: string | null, emailFallback?: string | null) {
  const base =
    (name && name.trim()) ||
    (emailFallback || "").split("@")[0] ||
    "User";
  const parts = base
    .replace(/[_\-\.]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const last = parts[1]?.[0] || parts[0]?.[1] || "";
  return (first + last).toUpperCase();
}
function hueFrom(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++)
    h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export default function CompanyDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useDarkMode();

  const [profile, setProfile] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [section, setSection] = useState<string>("painel");

  const seenNotiIdsRef = useRef<Set<string>>(new Set());
  const pedidosChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const notisChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const recentNotiKeysRef = useRef<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // avatar dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!avatarRef.current) return;
      if (!avatarRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const [notis, setNotis] = useState<Noti[]>([]);
  const [loadingNotis, setLoadingNotis] = useState<boolean>(false);
  const unreadCount = useMemo(
    () => notis.filter((n) => !n.lida).length,
    [notis]
  );

  const [toast, setToast] = useState<{
    titulo: string;
    conteudo?: string;
    url?: string;
    icon?: "ok" | "x";
  } | null>(null);
  const showToast = (data: {
    titulo: string;
    conteudo?: string;
    url?: string;
    icon?: "ok" | "x";
  }) => {
    setToast(data);
    window.setTimeout(() => setToast(null), 6000);
  };

  const isInside = (base: string) =>
    location.pathname.startsWith(base + "/") &&
    location.pathname !== base;
  const isProfissionaisChild = isInside("/empresa/profissionais");
  const isProfissionalDetalhe = isInside("/empresa/profissional");
  const isObrasChild = isInside("/empresa/obras");

  // === Mapeamento de rota → seção
  useEffect(() => {
    const p = location.pathname;

    // PEDIDOS
    if (p.includes("/empresa/pedidos/aprovados"))
      return setSection("aprovados");
    if (p.includes("/empresa/pedidos/em-avaliacao"))
      return setSection("em-avaliacao");
    if (p.includes("/empresa/pedidos/novos"))
      return setSection("novos-pedidos");

    // OBRAS
    if (p.includes("/empresa/obras/ativas"))
      return setSection("obras-ativas");
    if (p.includes("/empresa/obras/historico"))
      return setSection("historico");
    if (p.includes("/empresa/obras/adicionar"))
      return setSection("adicionar-obra");
    if (p.includes("/empresa/obras")) return setSection("obras");

    // PROFISSIONAIS
    if (p.includes("/empresa/profissionais/equipes"))
      return setSection("equipes-em-campo");
    if (p.includes("/empresa/profissionais/adicionar"))
      return setSection("adicionar-profissional");
    if (p.includes("/empresa/profissionais/faltas"))
      return setSection("faltas-presencas");
    if (p.includes("/empresa/profissionais"))
      return setSection("profissionais");

    // RELATÓRIOS
    if (p.includes("/empresa/relatorios/custos"))
      return setSection("custos-mensais");
    if (p.includes("/empresa/relatorios/desempenho"))
      return setSection("desempenho");
    if (p.includes("/empresa/relatorios/financeiro"))
      return setSection("financeiro");
    if (p.includes("/empresa/relatorios"))
      return setSection("relatorios");

    // DOCUMENTOS
    if (p.includes("/empresa/documentos/acrobatas"))
      return setSection("documentos-acrobatas");
    if (p.includes("/empresa/documentos/profissionais"))
      return setSection("documentos-profissionais");
    if (p.includes("/empresa/documentos/meus"))
      return setSection("documentos-meus");
    if (p.includes("/empresa/documentos"))
      return setSection("documentos");

    // CHAT / PERFIL / NOTIFICAÇÕES
    if (p.includes("/empresa/chat")) return setSection("chat");
    if (p.includes("/empresa/perfil")) return setSection("perfil-empresa");
    if (p.includes("/empresa/notificacoes"))
      return setSection("notificacoes");

    // GENÉRICO PEDIDOS
    if (p.includes("/empresa/pedidos"))
      return setSection("novos-pedidos");

    // DEFAULT
    return setSection("painel");
  }, [location.pathname]);

  // Navegação por chave
  const gotoSection = useCallback(
    (key: string) => {
      setSection(key);
      switch (key) {
        // raiz
        case "painel":
          navigate("/empresa");
          break;

        // obras
        case "obras":
          navigate("/empresa/obras");
          break;
        case "obras-ativas":
          navigate("/empresa/obras/ativas");
          break;
        case "historico":
          navigate("/empresa/obras/historico");
          break;
        case "adicionar-obra":
          navigate("/empresa/obras/adicionar");
          break;

        // profissionais
        case "profissionais":
          navigate("/empresa/profissionais");
          break;
        case "equipes-em-campo":
          navigate("/empresa/profissionais/equipes");
          break;
        case "adicionar-profissional":
          navigate("/empresa/profissionais/adicionar");
          break;
        case "faltas-presencas":
          navigate("/empresa/profissionais/faltas");
          break;

        // relatórios
        case "relatorios":
          navigate("/empresa/relatorios");
          break;
        case "custos-mensais":
          navigate("/empresa/relatorios/custos");
          break;
        case "desempenho":
          navigate("/empresa/relatorios/desempenho");
          break;
        case "financeiro":
          navigate("/empresa/relatorios/financeiro");
          break;

        // pedidos
        case "novos-pedidos":
          navigate("/empresa/pedidos/novos");
          break;
        case "em-avaliacao":
          navigate("/empresa/pedidos/em-avaliacao");
          break;
        case "aprovados":
          navigate("/empresa/pedidos/aprovados");
          break;

        // documentos
        case "documentos":
          navigate("/empresa/documentos");
          break;
        case "documentos-acrobatas":
          navigate("/empresa/documentos/acrobatas");
          break;
        case "documentos-profissionais":
          navigate("/empresa/documentos/profissionais");
          break;
        case "documentos-meus":
          navigate("/empresa/documentos/meus");
          break;

        // outros
        case "chat":
          navigate("/empresa/chat");
          break;
        case "perfil-empresa":
          navigate("/empresa/perfil");
          break;
        case "notificacoes":
          navigate("/empresa/notificacoes");
          break;

        default:
          navigate("/empresa");
          break;
      }
      setSidebarOpen(false);
    },
    [navigate]
  );

  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from("usuarios")
        .select("id, nome, email, empresa_id")
        .eq("email", user?.email)
        .maybeSingle();
      setProfile(data);
    }
    fetchProfile();
  }, [user?.email]);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.empresa_id && !profile?.id) return;
    setLoadingNotis(true);
    const { data } = await supabase
      .from("notificacoes_realtime")
      .select(
        "id, titulo, conteudo, icone, url_destino, lida, criado_em, empresa_id, usuario_id"
      )
      .or(
        `empresa_id.eq.${profile?.empresa_id},usuario_id.eq.${profile?.id}`
      )
      .order("criado_em", { ascending: false })
      .limit(80);
    if (data) {
      const arr = dedupeSort(data as Noti[]);
      setNotis(arr);
      seenNotiIdsRef.current = new Set(arr.map((n) => n.id));
    }
    setLoadingNotis(false);
  }, [profile?.empresa_id, profile?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!profile?.empresa_id && !profile?.id) return;
    if (notisChannelRef.current) {
      supabase.removeChannel(notisChannelRef.current);
      notisChannelRef.current = null;
    }
    const channelName = `notis_empresa_realtime_company_${
      profile?.empresa_id || profile?.id
    }`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes_realtime" },
        (payload: any) => {
          const novo: Noti | undefined = payload?.new;
          const antigo: Noti | undefined = payload?.old;
          const pertence =
            (novo &&
              profile?.empresa_id &&
              novo.empresa_id === profile.empresa_id) ||
            (novo && profile?.id && novo.usuario_id === profile.id) ||
            (antigo &&
              profile?.empresa_id &&
              antigo.empresa_id === profile.empresa_id) ||
            (antigo && profile?.id && antigo.usuario_id === profile.id);
          if (!pertence) return;

          setNotis((prev) => {
            if (payload.eventType === "DELETE" && antigo) {
              seenNotiIdsRef.current.delete(antigo.id);
              return dedupeSort(prev.filter((n) => n.id !== antigo.id));
            }
            if (payload.eventType === "UPDATE" && novo) {
              if (!seenNotiIdsRef.current.has(novo.id))
                seenNotiIdsRef.current.add(novo.id);
              return dedupeSort(
                prev.map((n) => (n.id === novo.id ? (novo as Noti) : n))
              );
            }
            if (payload.eventType === "INSERT" && novo) {
              if (seenNotiIdsRef.current.has(novo.id)) return prev;
              const kNew = getNotiKey(novo as Noti);
              const already = prev.find(
                (x) => getNotiKey(x) === kNew
              );
              if (already) {
                const replaced = prev.map((x) =>
                  getNotiKey(x) === kNew ? (novo as Noti) : x
                );
                seenNotiIdsRef.current.add(novo.id);
                if (novo.titulo)
                  showToast({
                    titulo: novo.titulo,
                    conteudo: novo.conteudo || undefined,
                    url: novo.url_destino || undefined,
                    icon:
                      (novo.icone || "").toLowerCase() === "xcircle"
                        ? "x"
                        : "ok",
                  });
                return dedupeSort(replaced).slice(0, 80);
              }
              seenNotiIdsRef.current.add(novo.id);
              if (novo.titulo)
                showToast({
                  titulo: novo.titulo,
                  conteudo: novo.conteudo || undefined,
                  url: novo.url_destino || undefined,
                  icon:
                    (novo.icone || "").toLowerCase() === "xcircle"
                      ? "x"
                      : "ok",
                });
              return dedupeSort([novo as Noti, ...prev]).slice(0, 80);
            }
            return prev;
          });
        }
      )
      .subscribe();
    notisChannelRef.current = channel;
    return () => {
      if (notisChannelRef.current) {
        supabase.removeChannel(notisChannelRef.current);
        notisChannelRef.current = null;
      }
    };
  }, [profile?.empresa_id, profile?.id]);

  useEffect(() => {
    if (!profile?.empresa_id) return;
    if (pedidosChannelRef.current) {
      supabase.removeChannel(pedidosChannelRef.current);
      pedidosChannelRef.current = null;
    }
    const chName = `pedidos_status_watch_${profile.empresa_id}`;
    const ch = supabase
      .channel(chName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pedidos_empresa_v2",
          filter: `id_empresa=eq.${profile.empresa_id}`,
        },
        async (payload: any) => {
          const novo = payload.new as any;
          const antigo = payload.old as any;
          const was = canonStatus(antigo?.status);
          const now = canonStatus(novo?.status);
          const saiuDeAnalise = was === "em_analise";
          const virouAprovado = now === "aprovado";
          const virouRecusado = now === "recusado";
          if (!(saiuDeAnalise && (virouAprovado || virouRecusado))) return;

          const titulo = virouAprovado
            ? "Pedido aprovado"
            : "Pedido recusado";
          const icone = virouAprovado ? "CheckCircle2" : "XCircle";
          const conteudo = `${novo?.tipo_profissional || "Pedido"} (${
            novo?.quantidade || 1
          }) — ${novo?.local || ""}`;
          const url = `/empresa/pedidos/em-avaliacao?focus=${novo?.id}&status=${now}`;

          const memKey = `${profile.empresa_id}|${url}|${titulo}`;
          if (recentNotiKeysRef.current.has(memKey)) return;
          recentNotiKeysRef.current.add(memKey);
          setTimeout(
            () => recentNotiKeysRef.current.delete(memKey),
            60_000
          );

          try {
            const sinceIso = new Date(
              Date.now() - 10 * 60 * 1000
            ).toISOString();
            const { data: already } = await supabase
              .from("notificacoes_realtime")
              .select("id")
              .eq("empresa_id", profile.empresa_id)
              .eq("url_destino", url)
              .eq("titulo", titulo)
              .gte("criado_em", sinceIso)
              .limit(1);
            if (!already || already.length === 0) {
              const { data } = await supabase
                .from("notificacoes_realtime")
                .insert([
                  {
                    empresa_id: profile.empresa_id,
                    usuario_id: null,
                    tipo: "empresa_admin",
                    titulo,
                    conteudo,
                    icone,
                    url_destino: url,
                    lida: false,
                  },
                ])
                .select("id")
                .single();
              if (data?.id) seenNotiIdsRef.current.add(data.id);
            }
          } catch {}

          showToast({
            titulo,
            conteudo,
            url,
            icon: virouAprovado ? "ok" : "x",
          });
        }
      )
      .subscribe();
    pedidosChannelRef.current = ch;
    return () => {
      if (pedidosChannelRef.current) {
        supabase.removeChannel(pedidosChannelRef.current);
        pedidosChannelRef.current = null;
      }
    };
  }, [profile?.empresa_id]);

  useEffect(() => {
    const handler = () => fetchNotifications();
    window.addEventListener("refresh-notifications", handler);
    return () => window.removeEventListener("refresh-notifications", handler);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotis((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
    await supabase
      .from("notificacoes_realtime")
      .update({ lida: true })
      .eq("id", id);
  }, []);
  const markAllAsRead = useCallback(async () => {
    setNotis((prev) => prev.map((n) => ({ ...n, lida: true })));
    const ids = notis.filter((n) => !n.lida).map((n) => n.id);
    if (ids.length)
      await supabase
        .from("notificacoes_realtime")
        .update({ lida: true })
        .in("id", ids);
  }, [notis]);

  const openNotification = useCallback(
    async (n: Noti) => {
      if (!n.lida) await markAsRead(n.id);
      if (n.url_destino) {
        if (n.url_destino.startsWith("/empresa/chat")) setSection("chat");
        const u = new URL(n.url_destino, window.location.origin);
        const focus =
          u.searchParams.get("focus") ||
          u.searchParams.get("novo") ||
          undefined;
        const status = (u.searchParams.get("status") as any) || undefined;
        navigate(u.pathname + u.search, {
          state: { highlightId: focus, status },
        });
      } else {
        setSection("notificacoes");
        navigate("/empresa/notificacoes");
      }
      setShowNotifications(false);
    },
    [markAsRead, navigate]
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const backgroundClass =
    theme === "light"
      ? "bg-gradient-to-b from-[#f5f7fb] via-[#eef2f7] to-[#e3e7f0] text-slate-800"
      : "bg-[#050816] text-slate-100";

  const RenderIcon = ({ name }: { name?: string | null }) => {
    switch ((name || "").toLowerCase()) {
      case "checkcircle2":
      case "aprovado":
      case "check":
        return (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        );
      case "xcircle":
      case "recusado":
      case "x":
        return <XCircle className="h-4 w-4 text-rose-400 shrink-0" />;
      default:
        return <Bell className="h-4 w-4 text-sky-400 shrink-0" />;
    }
  };

  const NotificationsOverlay = () => {
    if (!showNotifications) return null;
    const latest = notis.slice(0, 6);
    const timeAgo = (iso?: string | null) => {
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
    };
    return (
      <div
        id="notifications-overlay"
        className="absolute z-[1000] mt-2 right-3 top-12 w-[92vw] max-w-[420px]"
      >
        <div
          className={`rounded-2xl border shadow-xl ${
            theme === "dark"
              ? "bg-[#050819]/95 border-slate-800/70"
              : "bg-white/95 border-zinc-200/80"
          } backdrop-blur-xl`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800/60 border-zinc-200/60">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                Marcar todas como lidas
              </button>
              <button
                onClick={() => {
                  setSection("notificacoes");
                  navigate("/empresa/notificacoes");
                  setShowNotifications(false);
                }}
                className="text-xs rounded-lg px-2 py-1 text-sky-600 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/40"
              >
                Ver todas
              </button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y dark:divide-slate-800/60 divide-zinc-200/60">
            {loadingNotis ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm opacity-80">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </div>
            ) : latest.length === 0 ? (
              <div className="px-4 py-6 text-sm opacity-80">
                Sem notificações no momento.
              </div>
            ) : (
              latest.map((n) => {
                const isUnread = !n.lida;
                return (
                  <button
                    key={n.id}
                    onClick={() => openNotification(n)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      isUnread
                        ? "bg-sky-500/3 hover:bg-sky-500/10"
                        : "hover:bg-slate-100/70 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <RenderIcon name={n.icone || undefined} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {n.titulo || "Nova notificação"}
                          </p>
                          <span className="text-[10px] opacity-60">
                            {timeAgo(n.criado_em)}
                          </span>
                        </div>
                        {n.conteudo ? (
                          <p className="mt-1 line-clamp-2 text-xs opacity-80">
                            {n.conteudo}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between">
                          {isUnread ? (
                            <span className="rounded-full bg-sky-500/15 px-2 py-[2px] text-[11px] text-sky-600 dark:text-sky-300">
                              Novo
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-[11px]">Lida</span>
                            </div>
                          )}
                          <span className="text-[11px] text-sky-600 dark:text-sky-300 underline underline-offset-2">
                            Ver detalhes
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const initials = initialsFrom(
    profile?.nome,
    profile?.email || user?.email || ""
  );
  const hue = hueFrom(
    profile?.nome || profile?.email || user?.email || "A"
  );
  const avatarBg = { backgroundColor: `hsl(${hue} 70% 45%)` };

  return (
    <div
      className={`flex min-h-screen ${backgroundClass}`}
    >
      <div className="hidden md:flex">
        <SidebarDock onSelectSection={gotoSection} />
      </div>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed left-0 top-0 z-[999] h-full w-[304px]"
            role="dialog"
            aria-modal="true"
          >
            <SidebarDock
              onSelectSection={gotoSection}
              onCloseMobile={() => setSidebarOpen(false)}
            />
          </div>
        </>
      ) : null}

      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* HEADER */}
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
            theme === "dark"
              ? "bg-[#050816]/85 border-slate-800/70"
              : "bg-white/80 border-zinc-200/80"
          }`}
        >
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-5 py-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 md:hidden hover:bg-slate-200/70 dark:hover:bg-slate-800/80"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              {/* sem título aqui */}
            </div>

            <nav className="hidden gap-6 text-sm font-medium md:flex">
              {[
                ["painel", "Painel"],
                ["obras", "Obras"],
                ["profissionais", "Profissionais"],
                ["relatorios", "Relatórios"],
                ["chat", "Chat"],
              ].map(([key, label]) => {
                const isActive = section === key;
                return (
                  <button
                    key={key}
                    onClick={() => gotoSection(key)}
                    className={`relative pb-1 ${
                      isActive
                        ? "font-semibold text-sky-500"
                        : "text-slate-600 hover:text-sky-500 dark:text-slate-300"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span className="absolute -bottom-[2px] left-0 right-0 h-[2px] rounded-full bg-sky-500" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="relative flex items-center">
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-amber-300" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-700" />
                )}
              </button>

              <span className="mx-2 hidden h-6 w-px md:block bg-slate-200/70 dark:bg-slate-700/70" />

              <button
                onClick={() => {
                  if (isMobile) {
                    setSection("notificacoes");
                    navigate("/empresa/notificacoes");
                  } else {
                    setShowNotifications((s) => !s);
                  }
                }}
                className="relative rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0 -top-0 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              <div className="relative ml-2">
                <button
                  ref={avatarRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen((v) => !v);
                  }}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div
                    className="h-9 w-9 rounded-full ring-1 ring-black/5 dark:ring-white/10 shadow-sm grid place-items-center text-white select-none"
                    style={avatarBg}
                  >
                    <span className="text-[12px] font-semibold">
                      {initials}
                    </span>
                  </div>
                  <div className="hidden flex-col leading-tight text-left min-w-0 sm:flex">
                    <span className="text-sm font-medium truncate">
                      {profile?.nome ||
                        user?.email?.split("@")[0] ||
                        "Utilizador"}
                    </span>
                    <span className="text-xs opacity-70 truncate">
                      {profile?.email || user?.email}
                    </span>
                  </div>
                </button>

                {userMenuOpen && (
                  <div
                    className={`absolute z-[1001] right-0 top-11 w-64 rounded-2xl border shadow-xl overflow-hidden ${
                      theme === "dark"
                        ? "bg-[#050819]/95 border-slate-800/70"
                        : "bg-white/95 border-zinc-200/80"
                    } backdrop-blur-xl`}
                  >
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <div
                        className="h-10 w-10 rounded-full grid place-items-center text-white"
                        style={avatarBg}
                      >
                        <span className="text-[12px] font-semibold">
                          {initials}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {profile?.nome ||
                            user?.email?.split("@")[0] ||
                            "Utilizador"}
                        </div>
                        <div className="text-xs opacity-70 truncate">
                          {profile?.email || user?.email}
                        </div>
                      </div>
                    </div>
                    <div
                      className={
                        theme === "dark"
                          ? "border-t border-slate-800/60"
                          : "border-t border-zinc-200/60"
                      }
                    >
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          gotoSection("perfil-empresa");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/80"
                      >
                        <User className="h-4 w-4" /> Meu Perfil
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          gotoSection("financeiro");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800/80"
                      >
                        <Wallet className="h-4 w-4" /> Financeiro
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-100/70 dark:hover:bg-slate-800 text-rose-500"
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isMobile && <NotificationsOverlay />}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400/20 max-w-[1400px] w-full mx-auto px-4 sm:px-6 md:px-8 py-5 sm:py-6 min-h-[calc(100vh-5rem)] flex flex-col gap-6 md:pb-0 pb-24">
          {(isObrasChild || isProfissionaisChild || isProfissionalDetalhe) ? (
            <Outlet />
          ) : (
            (() => {
              const map: Record<string, JSX.Element> = {
                painel: (
                  <EmpresaPainel onQuickAction={(s) => gotoSection(s)} />
                ),
                obras: <Outlet />,
                profissionais: <Profissionais />,
                relatorios: <Relatorios />,
                chat: <ChatComEquipa />,

                // pedidos
                "novos-pedidos": (
                  <NovosPedidos setSection={setSection} />
                ),
                "em-avaliacao": <EmAvaliacao />,
                aprovados: <Aprovados />,

                // obras
                "obras-ativas": <ObrasAtivas />,
                historico: <Historico />,
                "adicionar-obra": <AdicionarObra />,

                // relatórios
                "custos-mensais": <CustosMensais />,
                desempenho: <Desempenho />,
                financeiro: <Financeiro />,

                // documentos
                documentos: <Documentos />,
                "documentos-acrobatas": <Acrobatas />,
                "documentos-profissionais": <ProfissionaisDocs />,
                "documentos-meus": <MeusDocumentos />,

                // outros
                configuracoes: <Configuracoes />,
                notificacoes: <Notificacoes />,
                "perfil-empresa": <PerfilEmpresa />,

                // profissionais (sub)
                "equipes-em-campo": <EquipesEmCampo />,
                "adicionar-profissional": <AdicionarProfissional />,
                "faltas-presencas": <FaltasPresencas />,
              };
              return (
                map[section] || (
                  <EmpresaPainel onQuickAction={(s) => gotoSection(s)} />
                )
              );
            })()
          )}
          <div className="h-10 sm:h-0" />
        </main>

        {/* Bottom nav mobile */}
        <nav
          className={`md:hidden fixed bottom-0 inset-x-0 z-10 border-t ${
            theme === "dark"
              ? "bg-[#050816]/95 border-slate-800/70"
              : "bg-white/95 border-zinc-200/70"
          } pb-[env(safe-area-inset-bottom)]`}
        >
          <div className="mx-auto max-w-[720px] px-4 py-2 flex justify-between">
            {[
              { key: "painel", label: "Painel", icon: LayoutDashboard },
              { key: "obras", label: "Obras", icon: Briefcase },
              { key: "profissionais", label: "Profissionais", icon: Users },
              { key: "relatorios", label: "Relatórios", icon: BarChart2 },
              { key: "chat", label: "Chat", icon: MessageCircle },
            ].map(({ key, label, icon: Icon }) => {
              const isActive = section === key;
              return (
                <button
                  key={key}
                  onClick={() => gotoSection(key)}
                  className={`relative flex flex-col items-center gap-0.5 text-[11px] font-medium px-2 py-1 rounded-xl ${
                    isActive
                      ? "text-sky-400"
                      : "text-slate-400 hover:text-sky-400"
                  }`}
                >
                  <Icon className="relative h-5 w-5" />
                  <span>{label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-sky-400" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[1100] max-w-xs rounded-2xl border border-slate-200/70 bg-white/95 dark:border-slate-800/70 dark:bg-[#050819]/95 shadow-lg px-4 py-3 text-sm backdrop-blur-xl">
          <div className="flex items-start gap-2">
            {toast.icon === "x" ? (
              <XCircle className="h-4 w-4 text-rose-500 mt-[2px]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-[2px]" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{toast.titulo}</p>
              {toast.conteudo && (
                <p className="mt-1 text-xs opacity-80">
                  {toast.conteudo}
                </p>
              )}
              {toast.url && (
                <button
                  onClick={() => {
                    setToast(null);
                    navigate(toast.url!);
                  }}
                  className="mt-2 text-xs text-sky-600 underline underline-offset-2 dark:text-sky-300"
                >
                  Ver detalhes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
