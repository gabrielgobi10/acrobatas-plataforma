// src/components/professional/ProfessionalDashboard.tsx

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  User,
  Bell,
  Menu,
  X,
  Briefcase,
  FileText,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";

import SidebarProfissional from "./SidebarProfissional";
import PainelProfissional from "./PainelProfissional";

// 🏗️ Obras
import ObrasAtivas from "./CentralDeNavegacaoProfissional/Obras/ObrasAtivas";
import RelatoriosDoDia from "./CentralDeNavegacaoProfissional/Obras/RelatoriosDoDia";
import FaltasPresencas from "./CentralDeNavegacaoProfissional/Obras/FaltasPresencas";
import HistoricoObras from "./CentralDeNavegacaoProfissional/Obras/HistoricoObras";
// ✅ novo: Convites de Obra
import ConvitesDeObra from "./CentralDeNavegacaoProfissional/Obras/ConvitesDeObra";

// 💰 Financeiro
import MeusGanhos from "./CentralDeNavegacaoProfissional/Financeiro/MeusGanhos";
import RecibosFaturas from "./CentralDeNavegacaoProfissional/Financeiro/RecibosFaturas";
import CustosDespesas from "./CentralDeNavegacaoProfissional/Financeiro/CustosDespesas";

// 📊 Relatórios
import DesempenhoGeral from "./CentralDeNavegacaoProfissional/Relatorios/DesempenhoGeral";
import HorasTrabalhadas from "./CentralDeNavegacaoProfissional/Relatorios/HorasTrabalhadas";
import Avaliacoes from "./CentralDeNavegacaoProfissional/Relatorios/Avaliacoes";

// 📂 Documentos
import MeusDocumentos from "./CentralDeNavegacaoProfissional/Documentos/MeusDocumentos";
import AlertasValidade from "./CentralDeNavegacaoProfissional/Documentos/AlertasValidade";

// 💬 Comunicação
import ChatComEquipa from "./ChatComEquipa";
import Notificacoes from "./CentralDeNavegacaoProfissional/Outros/Notificacoes";
import Suporte from "./CentralDeNavegacaoProfissional/Comunicacao/Suporte";

// 🏆 Minha Carreira
import CarreiraPageVisual from "./carreira";
import Certificacoes from "./CentralDeNavegacaoProfissional/MinhaCarreira/Certificacoes";
import Ranking from "./CentralDeNavegacaoProfissional/MinhaCarreira/Ranking";
import Conquistas from "./CentralDeNavegacaoProfissional/MinhaCarreira/Conquistas";

// 👤 Perfil e Conta
import PerfilProfissional from "./PerfilProfissional";
import Configuracoes from "./CentralDeNavegacaoProfissional/PerfilConta/Configuracoes";
import Feedbacks from "./CentralDeNavegacaoProfissional/PerfilConta/Feedbacks";

// 💼 Vagas
import VagasDisponiveis from "./VagasDisponiveis";
import MinhasCandidaturas from "./MinhasCandidaturas";

// 🧩 Onboarding
import OnboardingProfissional from "./OnboardingProfissional";

/* =========================================================
   Anti-Flash: aplicar tema ANTES do primeiro render
========================================================= */
try {
  if (typeof window !== "undefined") {
    const themeSaved = localStorage.getItem("theme");
    if (themeSaved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
} catch {
  /* ignore */
}

type Noti = {
  id: string;
  tipo: string | null;
  titulo: string | null;
  conteudo: string | null;
  icone: string | null;
  url_destino: string | null;
  lida: boolean | null;
  criado_em: string | null;
  usuario_id: string | null;
};

export const ProfessionalDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<{
    id: string;
    nome?: string | null;
    email?: string | null;
    tipo_usuario?: string | null;
  } | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">(
    (typeof window !== "undefined" &&
      (localStorage.getItem("theme") as "light" | "dark")) ||
      "dark"
  );

  const [activePage, setActivePage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("prof_active_page");
      return stored || "painel";
    }
    return "painel";
  });

  // 👇 começa como null (desconhecido)
  const [perfilCompleto, setPerfilCompleto] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 🔔 notificações (header)
  const [notis, setNotis] = useState<Noti[]>([]);
  const [loadingNotis, setLoadingNotis] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastPageBeforeNotis, setLastPageBeforeNotis] = useState<string | null>(
    null
  );

  const unreadCount = useMemo(
    () => notis.filter((n) => !n.lida).length,
    [notis]
  );

  const [stats] = useState({
    total: 0,
    newJobs: 0,
    pending: 0,
    accepted: 0,
  });

  // 🌗 Tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  // detectar mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // 👤 Buscar perfil principal
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, tipo_usuario")
        .eq("email", user.email)
        .maybeSingle();

      if (!error && data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  // 👷 Buscar profissional + status de perfil (ONBOARDING)
  useEffect(() => {
    const fetchProfissional = async () => {
      // 1) pega SEMPRE o auth uid real
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const authUid = authData?.user?.id;

      if (authErr || !authUid) {
        console.error("AUTH getUser ERROR:", authErr);
        setPerfilCompleto(false);
        return;
      }

      // 2) consulta profissionais_perfil pelo usuario_id = authUid
      const { data: profissional, error } = await supabase
        .from("profissionais_perfil")
        .select("perfil_completo")
        .eq("usuario_id", authUid)
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.error("Erro ao buscar profissionais_perfil:", error);
      }

      if (!profissional) {
        setPerfilCompleto(false);
        try {
          localStorage.setItem("perfil_completo", "false");
        } catch {}
        return;
      }

      const completo = !!profissional.perfil_completo;
      setPerfilCompleto(completo);
      try {
        localStorage.setItem("perfil_completo", completo ? "true" : "false");
      } catch {}
    };

    fetchProfissional();
  }, []);

  // ✅ Sincronizar activePage com URL para rotas conhecidas (inclui Obras)
  useEffect(() => {
    const path = location.pathname || "";
    let pageFromPath: string | null = null;

    // topo (tabs)
    if (path.includes("/profissional/vagas-disponiveis")) pageFromPath = "vagas";
    else if (
      path.includes("/profissional/minhas-candidaturas") ||
      path.includes("candidaturas")
    )
      pageFromPath = "candidaturas";
    else if (path.includes("/profissional/perfil")) pageFromPath = "perfil";
    else if (path.includes("/profissional/bate-papo")) pageFromPath = "batepapo";

    // obras
    else if (path.includes("/profissional/obras/obras-ativas"))
      pageFromPath = "obras_ativas";
    else if (path.includes("/profissional/obras/relatorios"))
      pageFromPath = "obras_relatorios";
    else if (path.includes("/profissional/obras/faltas-presencas"))
      pageFromPath = "obras_presencas";
    else if (path.includes("/profissional/obras/historico"))
      pageFromPath = "obras_historico";
    else if (path.includes("/profissional/obras/convites"))
      pageFromPath = "obras_convites";

    if (!pageFromPath) return;

    setActivePage(pageFromPath);
    try {
      localStorage.setItem("prof_active_page", pageFromPath);
    } catch {}
  }, [location.pathname]);

  // 🔔 carregar notificações para o header
  const fetchNotifications = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingNotis(true);

    const { data, error } = await supabase
      .from("notificacoes_realtime")
      .select(
        "id, tipo, titulo, conteudo, icone, url_destino, lida, criado_em, usuario_id"
      )
      .eq("usuario_id", profile.id)
      .order("criado_em", { ascending: false })
      .limit(30);

    if (!error && data) {
      setNotis(data as Noti[]);
    }
    setLoadingNotis(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 🔔 realtime das notificações do header
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`notis_prof_header_${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes_realtime",
          filter: `usuario_id=eq.${profile.id}`,
        },
        (payload: any) => {
          setNotis((prev) => {
            if (payload.eventType === "INSERT") {
              const n = payload.new as Noti;
              return [n, ...prev].slice(0, 30);
            }
            if (payload.eventType === "UPDATE") {
              const n = payload.new as Noti;
              return prev.map((x) => (x.id === n.id ? n : x));
            }
            if (payload.eventType === "DELETE") {
              const old = payload.old as Noti;
              return prev.filter((x) => x.id !== old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // fechar popover clicando fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.querySelector(
        ".notifications-dropdown-prof"
      ) as HTMLElement | null;
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("prof_active_page");
      }
    } catch {}
    logout();
    navigate("/");
  };

  const safeSetActivePage = (page: string) => {
    setActivePage((prev) => {
      if (page === "notificacoes" && prev !== "notificacoes") {
        setLastPageBeforeNotis(prev);
      }
      return page;
    });
    setIsMobileMenuOpen(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("prof_active_page", page);
      }
    } catch {}
  };

  const openOverlayNotification = async (n: Noti) => {
    if (!n.lida) {
      setNotis((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, lida: true } : x))
      );
      await supabase
        .from("notificacoes_realtime")
        .update({ lida: true })
        .eq("id", n.id);
    }

    if (n.url_destino) {
      navigate(n.url_destino);
    } else {
      safeSetActivePage("notificacoes");
    }
    setShowNotifications(false);
  };

  const NotificationsOverlay = () => {
    if (!showNotifications) return null;

    // no dropdown do header: mostrar SOMENTE não-lidas
    const latest = notis.filter((n) => !n.lida).slice(0, 6);

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
      <div className="notifications-dropdown-prof absolute z-[1000] mt-2 right-4 top-12 w-[92vw] max-w-[380px]">
        <div className="rounded-2xl border shadow-xl bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-800/70">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}
              </span>
            </div>
            <button
              onClick={() => {
                safeSetActivePage("notificacoes");
                setShowNotifications(false);
              }}
              className="text-xs rounded-lg px-2 py-1 text-sky-600 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/40"
            >
              Ver todas
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60">
            {loadingNotis ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm opacity-80">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </div>
            ) : latest.length === 0 ? (
              <div className="px-4 py-6 text-sm opacity-80">
                Sem novas notificações.
              </div>
            ) : (
              latest.map((n) => {
                return (
                  <button
                    key={n.id}
                    onClick={() => openOverlayNotification(n)}
                    className="w-full px-4 py-3 text-left transition-colors bg-sky-500/3 hover:bg-sky-500/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Bell className="h-4 w-4 text-sky-400 shrink-0" />
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
                          <span className="rounded-full bg-sky-500/15 px-2 py-[2px] text-[11px] text-sky-600 dark:text-sky-300">
                            Novo
                          </span>

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

  const renderContent = () => {
    switch (activePage) {
      case "painel":
        return (
          <PainelProfissional
            profile={profile}
            theme={theme}
            stats={stats}
            setActivePage={safeSetActivePage}
          />
        );
      case "obras_ativas":
        return <ObrasAtivas onIrParaVagas={() => safeSetActivePage("vagas")} />;
      case "obras_relatorios":
        return <RelatoriosDoDia />;
      case "obras_presencas":
        return (
          <FaltasPresencas
            onIrParaObrasAtivas={() => safeSetActivePage("obras_ativas")}
          />
        );
      case "obras_historico":
        return <HistoricoObras />;
      case "obras_convites":
        return <ConvitesDeObra />;
      case "financeiro_ganhos":
        return <MeusGanhos />;
      case "financeiro_recibos":
        return <RecibosFaturas />;
      case "financeiro_custos":
        return <CustosDespesas />;
      case "relatorios_desempenho":
        return <DesempenhoGeral />;
      case "relatorios_horas":
        return <HorasTrabalhadas />;
      case "relatorios_avaliacoes":
        return <Avaliacoes />;
      case "documentos_meus":
        return <MeusDocumentos />;
      case "documentos_alertas":
        return <AlertasValidade />;
      case "notificacoes":
        return (
          <Notificacoes
            onVoltar={() => safeSetActivePage(lastPageBeforeNotis || "painel")}
          />
        );
      case "batepapo":
        return <ChatComEquipa />;
      case "suporte":
        return <Suporte />;

      // ✅ AQUI: agora o "Voltar" funciona porque volta via activePage
      case "carreira_progresso":
        return <CarreiraPageVisual onVoltar={() => safeSetActivePage("painel")} />;

      case "carreira_certificacoes":
        return <Certificacoes />;
      case "carreira_ranking":
        return <Ranking />;
      case "carreira_conquistas":
        return <Conquistas />;
      case "perfil":
        return <PerfilProfissional />;
      case "configuracoes":
        return <Configuracoes />;
      case "feedbacks":
        return <Feedbacks />;
      case "vagas":
        return <VagasDisponiveis />;
      case "candidaturas":
        return <MinhasCandidaturas />;
      default:
        return (
          <PainelProfissional
            profile={profile}
            theme={theme}
            stats={stats}
            setActivePage={safeSetActivePage}
          />
        );
    }
  };

  // 🔒 1) Enquanto ainda não sabemos se o perfil está completo (null), mostra loading
  if (perfilCompleto === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  // 🔒 2) Se o perfil NÃO estiver completo, força o onboarding
  if (!perfilCompleto) {
    return (
      <OnboardingProfissional
        onFinish={() => {
          setPerfilCompleto(true);
          setActivePage("painel");
          try {
            localStorage.setItem("perfil_completo", "true");
            localStorage.setItem("prof_active_page", "painel");
          } catch {}
        }}
      />
    );
  }

  // 🔓 3) Perfil completo -> renderiza painel normalmente
  return (
    <div
      className={`min-h-screen transition-all duration-700 ${
        theme === "dark"
          ? "bg-gradient-to-b from-[#0b1221] to-[#101b33] text-gray-100"
          : "bg-gradient-to-b from-[#e9eef6] to-[#f8fafc] text-gray-800"
      }`}
      // ✅ base de cálculo do layout (sidebar)
      style={{ ["--sb" as any]: "16rem" }}
    >
      {/* HEADER */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-md transition-all duration-500 ${
          theme === "dark"
            ? "bg-slate-900/70 border-slate-800/50"
            : "bg-white/70 border-gray-200/70"
        }`}
      >
        {/* ✅ “faixa” do header não passa por cima do sidebar no desktop */}
        <div className="w-full md:pl-[var(--sb)]">
          <div className="mx-auto w-full max-w-[1600px] flex justify-between items-center p-4 relative">
            {/* Esquerda: menu + título/email */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                aria-label="Abrir menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight truncate">
                  Painel Profissional
                </h1>
                <p className="text-sm text-gray-400 truncate">
                  {profile?.email || user?.email}
                </p>
              </div>
            </div>

            {/* Navegação desktop */}
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              {[
                ["painel", "Painel"],
                ["vagas", "Vagas Disponíveis"],
                ["candidaturas", "Minhas Candidaturas"],
                ["perfil", "Perfil"],
                ["batepapo", "Bate-papo"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => safeSetActivePage(key)}
                  className={`relative transition-all ${
                    activePage === key
                      ? "text-blue-600 font-semibold"
                      : "hover:text-blue-500"
                  }`}
                >
                  {label}
                  {activePage === key && (
                    <motion.span
                      layoutId="activeLine"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-blue-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </nav>

            {/* Ações direita */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full hover:bg-slate-700/20 transition"
                title="Alternar tema"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700" />
                )}
              </button>

              {/* 🔔 Sino */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMobile) {
                    safeSetActivePage("notificacoes");
                  } else {
                    setShowNotifications((p) => !p);
                  }
                }}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={
                  unreadCount > 0
                    ? `${unreadCount} notificação(ões) não lida(s)`
                    : "Notificações"
                }
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Botão sair (desktop) */}
              <button
                onClick={handleLogout}
                className="hidden md:flex bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2 rounded-lg shadow-md items-center gap-2 hover:from-indigo-600 hover:to-blue-700 transition"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>

              {!isMobile && <NotificationsOverlay />}
            </div>
          </div>
        </div>
      </header>

      {/* NAV MOBILE (tabs inferiores ao header) */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`md:hidden flex justify-between px-3 py-2 border-b backdrop-blur-md ${
          theme === "dark"
            ? "bg-slate-900/70 border-slate-800/50"
            : "bg-white/70 border-gray-200/70"
        }`}
      >
        {[
          { key: "painel", label: "Painel", icon: LayoutDashboard },
          { key: "vagas", label: "Vagas", icon: Briefcase },
          { key: "candidaturas", label: "Candidaturas", icon: FileText },
          { key: "perfil", label: "Perfil", icon: User },
          { key: "batepapo", label: "Chat", icon: MessageSquare },
        ].map(({ key, label, icon: Icon }) => {
          const isActive = activePage === key;
          return (
            <button
              key={key}
              onClick={() => safeSetActivePage(key)}
              className={`relative flex flex-col items-center text-[11px] font-medium transition ${
                isActive ? "text-sky-400" : "text-gray-400 hover:text-blue-400"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeNavPill"
                  className="absolute inset-0 bg-sky-400/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="w-5 h-5 mb-0.5 relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* DESKTOP */}
      <div
        className="hidden md:flex"
        // ✅ largura base do sidebar (mesma do SidebarProfissional)
        style={{ ["--sb" as any]: "16rem" }}
      >
        <SidebarProfissional
          onSelectSection={safeSetActivePage}
          activeSection={activePage}
        />

        <main
          className="flex-1 px-6 py-8 ml-[var(--sb)] transition-all min-w-0"
          aria-label="Conteúdo principal"
        >
          <div
            // ✅ mais “folga” sem estourar: cresce até 1536/1600 e nunca ultrapassa o viewport útil
            className="mx-auto w-full min-w-0
                       max-w-[min(1536px,calc(100vw-var(--sb)-3rem))]
                       2xl:max-w-[min(1600px,calc(100vw-var(--sb)-4rem))]
                       space-y-8"
          >
            {renderContent()}
          </div>
        </main>
      </div>

      {/* MOBILE MENU (drawer lateral) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              key="mobile-sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="fixed top-0 left-0 z-[999] h-full w-[260px] bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">
                  Central Profissional
                </h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              <SidebarProfissional
                onSelectSection={(s) => {
                  safeSetActivePage(s);
                  setIsMobileMenuOpen(false);
                }}
                activeSection={activePage}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CONTEÚDO MOBILE */}
      <div className="md:hidden px-4 py-6">{renderContent()}</div>
    </div>
  );
};
