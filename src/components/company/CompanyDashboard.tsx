// src/components/company/CompanyDashboard.tsx
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";

// Componentes principais
import SidebarDock from "./SidebarDock";
import EmpresaPainel from "./EmpresaPainel";
import Profissionais from "./Profissionais";
import Relatorios from "./Relatorios";
import ChatComEquipa from "./ChatComEquipa";

// Central de Navegação
import NovosPedidos from "./CentralDeNavegacaoEmpresa/Pedidos/NovosPedidos";
import EmAvaliacao from "./CentralDeNavegacaoEmpresa/Pedidos/EmAvaliacao";
import Aprovados from "./CentralDeNavegacaoEmpresa/Pedidos/Aprovados";
import ObrasAtivas from "./CentralDeNavegacaoEmpresa/Obras/ObrasAtivas";
import Historico from "./CentralDeNavegacaoEmpresa/Obras/Historico";
import AdicionarObra from "./CentralDeNavegacaoEmpresa/Obras/AdicionarObra";
import CustosMensais from "./CentralDeNavegacaoEmpresa/Relatorios/CustosMensais";
import Desempenho from "./CentralDeNavegacaoEmpresa/Relatorios/Desempenho";
import Financeiro from "./CentralDeNavegacaoEmpresa/Relatorios/Financeiro";
import Documentos from "./CentralDeNavegacaoEmpresa/Documentos/Documentos";
import Configuracoes from "./CentralDeNavegacaoEmpresa/Outros/Configuracoes";
import Notificacoes from "./CentralDeNavegacaoEmpresa/Outros/Notificacoes";
import PerfilEmpresa from "./CentralDeNavegacaoEmpresa/Outros/PerfilEmpresa";

// Profissionais
import EquipesEmCampo from "./CentralDeNavegacaoEmpresa/Profissionais/EquipesEmCampo";
import AdicionarProfissional from "./CentralDeNavegacaoEmpresa/Profissionais/AdicionarProfissionalPage";
import FaltasPresencas from "./CentralDeNavegacaoEmpresa/Profissionais/FaltasPresencas";

// Documentação
import Acrobatas from "./CentralDeNavegacaoEmpresa/Documentos/Acrobatas";
import ProfissionaisDocs from "./CentralDeNavegacaoEmpresa/Documentos/Profissionais";
import MeusDocumentos from "./CentralDeNavegacaoEmpresa/Documentos/MeusDocumentos";

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

  // --- helpers de rota (para decidir quando usar <Outlet />) ---
  const isInside = (base: string) =>
    location.pathname.startsWith(base + "/") && location.pathname !== base;

  const isProfissionaisChild = isInside("/empresa/profissionais");
  const isObrasChild = isInside("/empresa/obras");

  // === Sincroniza seção com rota atual ===
  useEffect(() => {
    if (location.pathname.includes("/empresa/obras")) setSection("obras");
    else if (location.pathname.includes("/empresa/profissionais")) setSection("profissionais");
    else if (location.pathname.includes("/empresa/relatorios")) setSection("relatorios");
    else if (location.pathname.includes("/empresa/chat")) setSection("chat");
    else setSection("painel");
  }, [location.pathname]);

  // === Navegação principal + atalhos rápidos ===
  const gotoSection = (key: string) => {
    setSection(key);
    switch (key) {
      case "painel":
        navigate("/empresa");
        break;
      case "obras":
        navigate("/empresa/obras");
        break;
      case "profissionais":
        navigate("/empresa/profissionais");
        break;
      case "relatorios":
        navigate("/empresa/relatorios");
        break;
      case "chat":
        navigate("/empresa/chat");
        break;

      // atalhos internos do painel
      case "novos-pedidos":
      case "obras-ativas":
      case "documentos-profissionais":
      case "equipes-em-campo":
        navigate("/empresa");
        break;

      default:
        navigate("/empresa");
        break;
    }
    setSidebarOpen(false);
  };

  // === Carrega perfil ===
  useEffect(() => {
    async function fetchProfile() {
      const { data } = await supabase
        .from("usuarios")
        .select("nome, email")
        .eq("email", user?.email)
        .maybeSingle();
      setProfile(data);
    }
    fetchProfile();
  }, [user?.email]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // 🔹 Paleta base alinhada ao painel profissional
  const backgroundClass =
    theme === "light"
      ? "bg-gradient-to-b from-[#f8fafc] via-[#eef2f6] to-[#e5e9f0] text-slate-800"
      : "bg-[#0B1220] text-slate-100";

  // === Conteúdo principal ===
  const renderContent = () => {
    if (isObrasChild || isProfissionaisChild) return <Outlet />;

    const map: Record<string, JSX.Element> = {
      painel: <EmpresaPainel onQuickAction={(s) => gotoSection(s)} />,
      obras: <Outlet />,
      profissionais: <Profissionais />,
      relatorios: <Relatorios />,
      chat: <ChatComEquipa />,

      "novos-pedidos": <NovosPedidos setSection={setSection} />,
      "em-avaliacao": <EmAvaliacao />,
      aprovados: <Aprovados />,

      "obras-ativas": <ObrasAtivas />,
      historico: <Historico />,
      "adicionar-obra": <AdicionarObra />,

      "custos-mensais": <CustosMensais />,
      desempenho: <Desempenho />,
      financeiro: <Financeiro />,

      documentos: <Documentos />,
      configuracoes: <Configuracoes />,
      notificacoes: <Notificacoes />,
      "perfil-empresa": <PerfilEmpresa />,

      "equipes-em-campo": <EquipesEmCampo />,
      "adicionar-profissional": <AdicionarProfissional />,
      "faltas-presencas": <FaltasPresencas />,

      "documentos-acrobatas": <Acrobatas />,
      "documentos-profissionais": <ProfissionaisDocs />,
      "documentos-meus": <MeusDocumentos />,
    };

    return map[section] || <EmpresaPainel onQuickAction={(s) => gotoSection(s)} />;
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ${backgroundClass}`}>
      {/* === SIDEBAR DESKTOP === */}
      <div className="hidden md:flex">
        <SidebarDock onSelectSection={gotoSection} />
      </div>

      {/* === SIDEBAR MOBILE (overlay) === */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="fixed left-0 top-0 z-[999] h-full w-[320px]"
            >
              <SidebarDock onSelectSection={gotoSection} onCloseMobile={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* === CONTEÚDO PRINCIPAL === */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* HEADER */}
        <header
          className={`sticky top-0 z-40 border-b shadow-md backdrop-blur-xl transition-all duration-500 ${
            theme === "dark"
              ? // 🔹 topo mais escuro/coeso com o Profissional
                "bg-[#0B1220]/80 border-slate-800/60"
              : "bg-white/70 border-zinc-200/70"
          }`}
        >
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              {/* Menu Mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 transition md:hidden hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden rounded-xl bg-gradient-to-br from-sky-600 to-cyan-400 p-2 shadow-md md:block">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Painel da Empresa</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {profile?.email || user?.email}
                </p>
              </div>
            </div>

            {/* Navegação Desktop */}
            <nav className="hidden gap-6 text-sm font-medium md:flex">
              {[
                ["painel", "Painel"],
                ["obras", "Obras"],
                ["profissionais", "Profissionais"],
                ["relatorios", "Relatórios"],
                ["chat", "Chat"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => gotoSection(key)}
                  className={`relative transition ${
                    section === key
                      ? "font-semibold text-sky-400"
                      : "text-slate-600 hover:text-sky-500 dark:text-slate-300"
                  }`}
                >
                  {label}
                  {section === key && (
                    <motion.span
                      layoutId="activeLine"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-sky-400"
                    />
                  )}
                </button>
              ))}
            </nav>

            {/* Ações topo */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="rounded-full p-2 transition hover:bg-slate-700/10 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-amber-300" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-700" />
                )}
              </button>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
              </button>
              <div className="hidden items-center gap-2 border-l pl-3 md:flex">
                <span className="text-sm font-semibold">{profile?.nome || "Empresa"}</span>
                <span className="block text-xs text-emerald-400">Ativo</span>
              </div>
              <button
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-500 px-4 py-2 text-white shadow-md transition hover:from-indigo-600 hover:to-sky-700 md:flex"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>
        </header>

        {/* NAV MOBILE */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className={`md:hidden flex justify-between px-3 py-2 border-b backdrop-blur-md ${
            theme === "dark" ? "bg-[#0B1220]/80 border-slate-800/60" : "bg-white/70 border-zinc-200/70"
          }`}
        >
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
                className={`relative flex flex-col items-center text-[11px] font-medium transition ${
                  isActive ? "text-sky-400" : "text-slate-400 hover:text-sky-400"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeNavPill"
                    className="absolute inset-0 rounded-xl bg-sky-400/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative mb-0.5 h-5 w-5 z-10" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* CONTEÚDO PRINCIPAL */}
        <main
          className="
            flex-1 overflow-y-auto
            scrollbar-thin scrollbar-thumb-slate-400/20
            bg-transparent max-w-[1400px] w-full mx-auto px-4 sm:px-6 md:px-8
            py-5 sm:py-6 min-h-[calc(100vh-5rem)] flex flex-col gap-6
          "
        >
          {renderContent()}
          <div className="h-10 sm:h-0" />
        </main>
      </div>
    </div>
  );
}
