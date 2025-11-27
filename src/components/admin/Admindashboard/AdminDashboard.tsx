// src/components/admin/Admindashboard/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Bell,
  Users,
  ClipboardList,
  BarChart3,
  LifeBuoy,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";

import SidebarDockAdmin from "./SidebarDockAdmin";

// Seções padrão
import PainelSection from "./PainelSection";
import UsuariosSection from "./UsuariosSection";
import PedidosSection from "./PedidosSection";
import RelatoriosSection from "./RelatoriosSection";
import SuporteSection from "./SuporteSection";

// ⭐ PERFIL DO USUÁRIO (ADICIONADO)
import PerfilUsuarioAdmin from "./PerfilUsuarioAdmin";

// ==========================
// Operações — Novas Seções
// ==========================
import ProfissionaisLista from "./CentralDeNavegacaoAdmin/operacoes/profissionais/ProfissionaisLista";
import ProfissionalPerfil from "./CentralDeNavegacaoAdmin/operacoes/profissionais/ProfissionalPerfil";

import EmpresasLista from "./CentralDeNavegacaoAdmin/operacoes/empresas/EmpresasLista";
import EmpresaPerfil from "./CentralDeNavegacaoAdmin/operacoes/empresas/EmpresaPerfil";

import ObrasLista from "./CentralDeNavegacaoAdmin/operacoes/obras/ObrasLista";
import ObraDetalhe from "./CentralDeNavegacaoAdmin/operacoes/obras/ObraDetalhe";
import EquipeGestao from "./CentralDeNavegacaoAdmin/operacoes/obras/EquipeGestao";

import PresencasTabela from "./CentralDeNavegacaoAdmin/operacoes/presencas-relatorios/PresencasTabela";
import RelatoriosDiarios from "./CentralDeNavegacaoAdmin/operacoes/presencas-relatorios/RelatoriosDiarios";
import VagasLista from "./CentralDeNavegacaoAdmin/operacoes/vagas/VagasLista";

// ==========================
// Painel Geral — Novas Páginas
// ==========================
import EstatisticasPage from "./CentralDeNavegacaoAdmin/painel-geral/Estatisticas/Page";
import AtividadesRecentesPage from "./CentralDeNavegacaoAdmin/painel-geral/AtividadesRecentes/Page";

// ==========================
// Documentação — Novas Páginas
// ==========================
import DocsProfissionaisPage from "./CentralDeNavegacaoAdmin/Documentos/Profissionais/Page";
import DocsEmpresasPage from "./CentralDeNavegacaoAdmin/Documentos/Empresas/Page";
import VencimentosAlertasPage from "./CentralDeNavegacaoAdmin/Documentos/VencimentosAlertas/Page";

// ==========================
// Financeiro — Novas Páginas
// ==========================
import PagamentosProfissionaisPage from "./CentralDeNavegacaoAdmin/financeiro/PagamentosProfissionais/Page";
import FaturacaoEmpresasPage from "./CentralDeNavegacaoAdmin/financeiro/FaturacaoEmpresas/Page";
import ExtratosPage from "./CentralDeNavegacaoAdmin/financeiro/Extratos/Page";
import HistoricoFinanceiroPage from "./CentralDeNavegacaoAdmin/financeiro/HistoricoFinanceiro/Page";
import PoliticaPrecosMargensPage from "./CentralDeNavegacaoAdmin/financeiro/PoliticaPrecosMargens";


// ==========================
// Configurações — Novas Páginas
// ==========================
import NotificacoesPage from "./CentralDeNavegacaoAdmin/configuracoes/Notificacoes/Page";
import ControleAcessoPage from "./CentralDeNavegacaoAdmin/configuracoes/ControleAcesso/Page";
import PermissoesPage from "./CentralDeNavegacaoAdmin/configuracoes/Permissoes/Page";
import ConfiguracoesGeraisPage from "./CentralDeNavegacaoAdmin/configuracoes/ConfiguracoesGerais/Page";
import LogsDoSistemaPage from "./CentralDeNavegacaoAdmin/configuracoes/LogsDoSistema/Page";

// ==========================
// Pedidos & Candidaturas — Novas Páginas
// ==========================
import PedidosEmpresasPage from "./CentralDeNavegacaoAdmin/pedidos/PedidosEmpresas/Page";
import CandidaturasPage from "./CentralDeNavegacaoAdmin/pedidos/Candidaturas/Page";
import AprovacoesPage from "./CentralDeNavegacaoAdmin/pedidos/Aprovacoes/Page";

// ==========================
// Suporte — Novas Páginas
// ==========================
import TicketsPage from "./CentralDeNavegacaoAdmin/suporte/Tickets/Page";
import ChatSuportePage from "./CentralDeNavegacaoAdmin/suporte/Chat/Page";

// Lazy para módulos pesados
const DocumentosAcrobatasAdmin = React.lazy(async () => {
  const module = await import(
    "./CentralDeNavegacaoAdmin/Documentos/DocumentosAcrobatasAdmin"
  );
  return { default: module.default || module.DocumentosAcrobatasAdmin };
});

// 🔹 Roteador da aba Carreira
const AdminCarreiraRouter = React.lazy(async () => {
  const module = await import(
    "./CentralDeNavegacaoAdmin/carreira/AdminCarreiraRouter"
  );
  return { default: module.default || module.AdminCarreiraRouter };
});

type TopKey = "painel" | "usuarios" | "pedidos" | "relatorios" | "suporte";

const TOP_TABS: Array<{ key: TopKey; label: string; Icon: any }> = [
  { key: "painel", label: "Painel", Icon: LayoutDashboard },
  { key: "usuarios", label: "Usuários", Icon: Users },
  { key: "pedidos", label: "Pedidos", Icon: ClipboardList },
  { key: "relatorios", label: "Relatórios", Icon: BarChart3 },
  { key: "suporte", label: "Suporte", Icon: LifeBuoy },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [section, setSection] = useState<TopKey | string>("painel");
  const [showNotifications, setShowNotifications] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // estado do sidebar
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // 🌗 Tema
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // ⭐ PERFIL DO USUÁRIO (ADICIONADO)
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ⭐ HANDLER unificado
  const handleSelectSection = (value: TopKey | string, data?: any) => {
    if (value === "perfil-usuario") {
      setSelectedUser(data);
    } else if (
      value === "operacoes-profissional-perfil" ||
      value === "operacoes-empresa-perfil" ||
      value === "operacoes-obra-detalhe" ||
      value === "operacoes-equipe"
    ) {
      setSelectedUser(data);
    }

    setSection(value);
  };

  // Sidebar começa fechado no mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return;
      const { data } = await supabase
        .from("administradores")
        .select("nome, email")
        .eq("email", user.email)
        .maybeSingle();
      setProfile(data);
    };
    fetchProfile();
  }, [user?.email]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isCarreira = useMemo(
    () => String(section).startsWith("carreira-"),
    [section]
  );

  // 🔎 Estamos numa rota filha (ex.: /admin/profissionais/:usuarioId)?
  const isNestedRoute = location.pathname.startsWith("/admin/profissionais/");

  return (
    <div
      className={`min-h-screen flex transition-colors duration-700 ${
        theme === "dark"
          ? "bg-gradient-to-b from-[#0b1221] to-[#101b33] text-slate-100"
          : "bg-gradient-to-b from-[#e9eef6] to-[#f8fafc] text-slate-800"
      }`}
    >
      {/* Sidebar */}
      <SidebarDockAdmin
        onSelectSection={handleSelectSection}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* CONTEÚDO PRINCIPAL */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? "md:ml-[84px]" : "md:ml-[256px]"
        }`}
      >
        {/* ===== HEADER ===== */}
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-xl shadow-sm transition-colors duration-500 ${
            theme === "dark"
              ? "bg-slate-900/80 border-slate-800"
              : "bg-white/80 border-slate-200"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburguer (mobile) */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setCollapsed((v) => !v)}
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden md:block bg-gradient-to-br from-blue-600 to-cyan-400 p-2 rounded-xl shadow-md">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>

              <div className="truncate">
                <h1 className="font-semibold text-base sm:text-lg truncate">
                  Painel Administrativo
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {profile?.email || user?.email}
                </p>
              </div>
            </div>

            {/* Navegação topo (desktop) */}
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              {TOP_TABS.map(({ key, label }) => {
                const active = section === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectSection(key)}
                    className={`relative transition-all ${
                      active
                        ? "text-blue-500 font-semibold"
                        : "text-slate-500 dark:text-slate-300 hover:text-blue-400"
                    }`}
                  >
                    {label}
                    {active && (
                      <motion.span
                        layoutId="adminTopLine"
                        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-blue-500 rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Ações topo */}
            <div className="flex items-center gap-3 relative">
              {/* Tema */}
              <button
                onClick={() =>
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                }
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-700" />
                )}
              </button>

              {/* Notificações */}
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              </button>

              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl w-80 overflow-hidden z-50"
                >
                  <div className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                    Notificações
                  </div>
                  <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    <li className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                      🟢 Novo profissional registrado.
                    </li>
                    <li className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                      🧾 Novo relatório disponível.
                    </li>
                    <li className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                      ⚠️ Pedido aguardando aprovação.
                    </li>
                  </ul>
                </motion.div>
              )}

              {/* Info admin + sair */}
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="font-semibold text-sm">
                  {profile?.nome || "Administrador"}
                </span>
                <span className="text-xs text-green-500">Ativo</span>
              </div>

              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-sm"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sair
              </button>
            </div>
          </div>

          {/* NAV MOBILE */}
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
            {TOP_TABS.map(({ key, label, Icon }) => {
              const isActive = section === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectSection(key)}
                  className={`relative flex flex-col items-center text-[11px] font-medium transition ${
                    isActive
                      ? "text-sky-400"
                      : "text-gray-400 hover:text-blue-400"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="adminActiveNavPill"
                      className="absolute inset-0 bg-sky-400/10 rounded-xl"
                    />
                  )}
                  <Icon className="w-5 h-5 mb-0.5 relative z-10" />
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </motion.div>
        </header>

        {/* ===== CONTEÚDO DINÂMICO ===== */}
        <main className="flex-1 flex justify-center px-4 sm:px-6 lg:px-8 py-8">
          <div className="w-full max-w-7xl space-y-8">
            {isNestedRoute ? (
              // 🔥 Rotas filhas (ex.: /admin/profissionais/:usuarioId)
              <Outlet />
            ) : (
              <>
                {/* ⭐ PERFIL DO USUÁRIO ADICIONADO */}
                {section === "perfil-usuario" && (
                  <PerfilUsuarioAdmin
                    usuario={selectedUser}
                    onVoltar={() => handleSelectSection("usuarios")}
                  />
                )}

                {/* Seção: Painel */}
                {!isCarreira && section === "painel" && <PainelSection />}

                {/* Painel Geral — Estatísticas / Atividades */}
                {!isCarreira && section === "estatisticas" && (
                  <EstatisticasPage />
                )}
                {!isCarreira && section === "atividades" && (
                  <AtividadesRecentesPage />
                )}

                {/* Seção: Usuários */}
                {!isCarreira && section === "usuarios" && (
                  <UsuariosSection onSelectSection={handleSelectSection} />
                )}

                {/* Seção: Pedidos (tab do topo) */}
                {!isCarreira && section === "pedidos" && <PedidosSection />}

                {/* Pedidos & Candidaturas — Sidebar */}
                {!isCarreira && section === "pedidos-empresas" && (
                  <PedidosEmpresasPage />
                )}
                {!isCarreira && section === "pedidos-candidaturas" && (
                  <CandidaturasPage />
                )}
                {!isCarreira && section === "pedidos-aprovacoes" && (
                  <AprovacoesPage />
                )}

                {/* Seção: Relatórios */}
                {!isCarreira && section === "relatorios" && (
                  <RelatoriosSection />
                )}

                {/* Seção: Suporte (tab do topo) */}
                {!isCarreira && section === "suporte" && <SuporteSection />}

                {/* 🔥🔥🔥 NOVAS SEÇÕES — OPERACOES 🔥🔥🔥 */}

                {/* ============================
                    🔹 OPERACOES — PROFISSIONAIS
                  ============================ */}
                {section === "operacoes-profissionais" && (
                  <ProfissionaisLista onSelectSection={handleSelectSection} />
                )}

                {section === "operacoes-profissional-perfil" && (
                  <ProfissionalPerfil
                    profissional={selectedUser}
                    onVoltar={() => setSection("operacoes-profissionais")}
                  />
                )}

                {/* ============================
                    🔹 OPERACOES — EMPRESAS
                  ============================ */}
                {section === "operacoes-empresas" && (
                  <EmpresasLista onSelectSection={handleSelectSection} />
                )}

                {section === "operacoes-empresa-perfil" && (
                  <EmpresaPerfil
                    empresa={selectedUser}
                    onVoltar={() => setSection("operacoes-empresas")}
                  />
                )}

                {/* ============================
                    🔹 OPERACOES — OBRAS & EQUIPAS
                  ============================ */}
                {section === "operacoes-obras" && (
                  <ObrasLista onSelectSection={handleSelectSection} />
                )}

                {section === "operacoes-obra-detalhe" && (
                  <ObraDetalhe
                    obra={selectedUser}
                    onVoltar={() => setSection("operacoes-obras")}
                  />
                )}

                {section === "operacoes-equipe" && (
                  <EquipeGestao
                    obra={selectedUser}
                    onVoltar={() => setSection("operacoes-obras")}
                  />
                )}

                {/* ============================
                    🔹 OPERACOES — PRESENÇAS / RELATÓRIOS
                  ============================ */}
                {section === "operacoes-presencas" && (
                  <PresencasTabela onSelectSection={handleSelectSection} />
                )}

                {section === "operacoes-relatorios" && (
                  <RelatoriosDiarios
                    onVoltar={() => setSection("operacoes-presencas")}
                  />
                )}

                {/* ============================
                    🔹 OPERACOES — VAGAS
                  ============================ */}
                {section === "operacoes-vagas" && (
                  <VagasLista onSelectSection={handleSelectSection} />
                )}

                {section === "operacoes-vaga-detalhe" && (
                  <div className="animate-fadeIn bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-slate-300">
                    Página de detalhe da vaga (em construção)
                  </div>
                )}

                {/* ============================
                    🔹 DOCUMENTAÇÃO
                  ============================ */}
                {!isCarreira && section === "docs-profissionais" && (
                  <DocsProfissionaisPage />
                )}
                {!isCarreira && section === "docs-empresas" && (
                  <DocsEmpresasPage />
                )}
                {!isCarreira && section === "docs-vencimentos" && (
                  <VencimentosAlertasPage />
                )}

                {/* Documentos da Acrobatas */}
                {!isCarreira && section === "documentos-acrobatas" && (
                  <div className="animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-4">
                      <React.Suspense
                        fallback={
                          <div className="text-center text-slate-500 dark:text-slate-400 p-8">
                            Carregando documentos...
                          </div>
                        }
                      >
                        <DocumentosAcrobatasAdmin />
                      </React.Suspense>
                    </div>
                  </div>
                )}

                {/* ============================
                    🔹 FINANCEIRO
                  ============================ */}
                {!isCarreira && section === "fin-pagamentos" && (
                  <PagamentosProfissionaisPage />
                )}
                {!isCarreira && section === "fin-faturacao" && (
                  <FaturacaoEmpresasPage />
                )}
                {!isCarreira && section === "fin-extratos" && <ExtratosPage />}
                {!isCarreira && section === "fin-historico" && (
                  <HistoricoFinanceiroPage />
                )}
                {!isCarreira && section === "fin-politica-margens" && (
                  <PoliticaPrecosMargensPage />
                )}

                {/* ============================
                    🔹 CONFIGURAÇÕES
                  ============================ */}
                {!isCarreira && section === "conf-notificacoes" && (
                  <NotificacoesPage />
                )}
                {!isCarreira && section === "conf-acesso" && (
                  <ControleAcessoPage />
                )}
                {!isCarreira && section === "conf-permissoes" && (
                  <PermissoesPage />
                )}
                {!isCarreira && section === "conf-geral" && (
                  <ConfiguracoesGeraisPage />
                )}
                {!isCarreira && section === "conf-logs" && <LogsDoSistemaPage />}

                {/* ============================
                    🔹 CARREIRA
                  ============================ */}
                {isCarreira && (
                  <React.Suspense
                    fallback={
                      <div className="text-center text-slate-500 dark:text-slate-400 p-8">
                        Carregando Carreira...
                      </div>
                    }
                  >
                    <AdminCarreiraRouter active={section as any} />
                  </React.Suspense>
                )}

                {/* ============================
                    🔹 SUPORTE (SIDEBAR)
                  ============================ */}
                {!isCarreira && section === "suporte-tickets" && <TicketsPage />}
                {!isCarreira && section === "suporte-chat" && <ChatSuportePage />}
              </>
            )}
          </div>
        </main>

        <footer className="h-6" />
      </div>
    </div>
  );
}
