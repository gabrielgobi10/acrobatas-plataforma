import { useEffect, useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

import SidebarProfissional from "./SidebarProfissional";
import PainelProfissional from "./PainelProfissional";

// 🏗️ Obras
import ObrasAtivas from "./CentralDeNavegacaoProfissional/Obras/ObrasAtivas";
import RelatoriosDoDia from "./CentralDeNavegacaoProfissional/Obras/RelatoriosDoDia";
import FaltasPresencas from "./CentralDeNavegacaoProfissional/Obras/FaltasPresencas";
import HistoricoObras from "./CentralDeNavegacaoProfissional/Obras/HistoricoObras";

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
import Notificacoes from "./CentralDeNavegacaoProfissional/Comunicacao/Notificacoes";
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

export const ProfessionalDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [activePage, setActivePage] = useState<string>("painel");
  const [showNotifications, setShowNotifications] = useState(false);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [perfilCompleto, setPerfilCompleto] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [stats] = useState({
    total: 0,
    newJobs: 0,
    pending: 0,
    accepted: 0,
  });

  // 🌗 Tema
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 👤 Buscar perfil principal
  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("usuarios")
      .select("nome, email, tipo_usuario")
      .eq("email", user?.email)
      .maybeSingle();

    if (!error && data) setProfile(data);
  };

  // 👷 Buscar profissional + status de perfil
  useEffect(() => {
    const fetchProfissional = async () => {
      if (!user?.email) return;
      const { data: profissional } = await supabase
        .from("profissionais_perfil")
        .select("id, perfil_completo")
        .eq("email", user.email)
        .maybeSingle();

      if (!profissional) {
        setPerfilCompleto(false);
        setLoading(false);
        return;
      }

      setProfissionalId(profissional.id);
      const completo = !!profissional.perfil_completo;
      setPerfilCompleto(completo);
      localStorage.setItem("perfil_completo", completo ? "true" : "false");
      setTimeout(() => setLoading(false), 400);
    };
    fetchProfissional();
  }, [user]);

  // 🔔 Fechar dropdown de notificações
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const dropdown = document.querySelector(".notifications-dropdown");
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const safeSetActivePage = (page: string) => {
    if (!perfilCompleto && !["painel", "perfil"].includes(page)) return;
    setActivePage(page);
    setIsMobileMenuOpen(false);
  };

  // 🔄 Renderização dinâmica
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
      return <ObrasAtivas />;
    case "obras_relatorios":
      return <RelatoriosDoDia />;
    case "obras_presencas":
      return <FaltasPresencas />;
    case "obras_historico":
      return <HistoricoObras />;
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
      return <Notificacoes />;
    case "batepapo":
      return <ChatComEquipa />;
    case "suporte":
      return <Suporte />;

    // 🔁 AQUI É A TROCA
    case "carreira_progresso":
      return <CarreiraPageVisual />;

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
  // 🔄 Loader
  if (loading || perfilCompleto === null) {
    return (
      <motion.div
        className="flex h-screen items-center justify-center text-slate-400 bg-[#0b1221]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Verificando perfil...
      </motion.div>
    );
  }

  // 🔒 Perfil incompleto
  if (!loading && perfilCompleto === false) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0b1221] to-[#101b33]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center bg-slate-800/80 border border-slate-700 rounded-3xl p-10 max-w-lg shadow-2xl backdrop-blur-xl">
          <h1 className="text-2xl font-bold mb-3">
            👋 Bem-vindo à{" "}
            <span className="text-sky-400 font-semibold">Acrobatas</span>!
          </h1>
          <p className="text-slate-400 mb-6 leading-relaxed text-sm">
            Complete o seu <b>perfil</b> para mostrar suas habilidades e receber{" "}
            <b>vagas compatíveis</b>.
          </p>
          <button
            onClick={() => safeSetActivePage("perfil")}
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-all shadow-md"
          >
            🚀 Criar meu perfil agora
          </button>
        </div>
      </motion.div>
    );
  }

  // ✅ Painel normal
  return (
    <div
      className={`min-h-screen transition-all duration-700 ${
        theme === "dark"
          ? "bg-gradient-to-b from-[#0b1221] to-[#101b33] text-gray-100"
          : "bg-gradient-to-b from-[#e9eef6] to-[#f8fafc] text-gray-800"
      }`}
    >
      {/* HEADER */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-md transition-all duration-500 ${
          theme === "dark"
            ? "bg-slate-900/70 border-slate-800/50"
            : "bg-white/70 border-gray-200/70"
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:block bg-gradient-to-br from-blue-600 to-cyan-400 p-2 rounded-xl shadow-md">
              <LayoutDashboard className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Painel Profissional
              </h1>
              <p className="text-sm text-gray-400">
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

          {/* Ações */}
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

            <button
              onClick={() => setShowNotifications((p) => !p)}
              className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>

            <div className="hidden md:flex items-center gap-2 border-l pl-3">
              <User className="w-6 h-6 text-blue-500" />
              <div>
                <span className="font-semibold text-sm">
                  {profile?.nome || "Profissional"}
                </span>
                <span className="text-xs text-green-400 block">On-line</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="hidden md:flex bg-gradient-to-r from-blue-600 to-indigo-500 text-white px-4 py-2 rounded-lg shadow-md items-center gap-2 hover:from-indigo-600 hover:to-blue-700 transition"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* 🔹 NAV MOBILE aprimorada */}
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
                isActive
                  ? "text-sky-400"
                  : "text-gray-400 hover:text-blue-400"
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
      <div className="hidden md:flex">
        <SidebarProfissional
          onSelectSection={safeSetActivePage}
          activeSection={activePage}
        />
        <main className="flex-1 px-6 py-8 flex justify-center ml-64 transition-all">
          <div className="w-full max-w-7xl space-y-8">
            {profissionalId ? (
              renderContent()
            ) : (
              <div className="py-20 text-gray-400">Carregando perfil...</div>
            )}
          </div>
        </main>
      </div>

      {/* MOBILE MENU */}
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
      <div className="md:hidden px-4 py-6">
        {profissionalId ? (
          renderContent()
        ) : (
          <div className="text-gray-400 text-center py-10">
            Carregando perfil...
          </div>
        )}
      </div>
    </div>
  );
};




