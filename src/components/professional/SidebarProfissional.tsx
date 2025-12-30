// src/components/professional/SidebarProfissional.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Award,
  User,
  Bell,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  BarChart3,
  ClipboardCheck,
  Clock,
  Folder,
  LogOut, // ✅ novo ícone
  Settings, // ✅ ícone para Configurações
} from "lucide-react";
import { useAuth } from "../../context/AuthContext"; // ✅ garante logout

interface SidebarProfissionalProps {
  onSelectSection: (section: string) => void;
  activeSection: string;
  onCloseMobile?: () => void; // ✅ Nova prop opcional para fechar no mobile
}

export default function SidebarProfissional({
  onSelectSection,
  activeSection,
  onCloseMobile,
}: SidebarProfissionalProps) {
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    painel: true,
    obras: false,
    financeiro: false,
    relatorios: false,
    documentos: false,
    carreira: false,
    comunicacao: false, // não usado mais, mas não atrapalha
  });

  const [collapsed, setCollapsed] = useState(false);

  const { logout } = useAuth();

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  // 🔹 Fecha no mobile, colapsa no desktop
  const handleToggleCollapse = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    } else {
      setCollapsed((p) => !p);
    }
  };

  const NavItem = ({
    label,
    section,
  }: {
    label: string;
    section: string;
  }) => (
    <button
      onClick={() => onSelectSection(section)}
      className={`block text-left w-full py-1.5 text-sm transition ${
        activeSection === section
          ? "text-blue-600 font-semibold"
          : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <motion.aside
      initial={{ width: 260 }}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.4, type: "spring" }}
      className="fixed top-0 left-0 h-full z-[9999] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800 shadow-xl flex flex-col justify-between"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="text-blue-600 w-6 h-6" />
          {!collapsed && (
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              Central Profissional
            </h2>
          )}
        </div>
        <button
          onClick={handleToggleCollapse}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Conteúdo */}
      <nav className="mt-4 px-3 space-y-3 pb-10 flex-1 overflow-y-auto">
        {/* Painel */}
        <div>
          <button
            onClick={() => onSelectSection("painel")}
            className={`flex items-center gap-2 px-2 py-2 text-sm font-medium ${
              activeSection === "painel"
                ? "text-blue-600"
                : "text-gray-700 dark:text-gray-200 hover:text-blue-600"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            {!collapsed && <span>Painel</span>}
          </button>
        </div>

        {/* Obras */}
        <div>
          <button
            onClick={() => toggleGroup("obras")}
            className={`flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              {!collapsed && <span>Obras</span>}
            </div>
            {!collapsed &&
              (openGroups.obras ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </button>
          <AnimatePresence>
            {!collapsed && openGroups.obras && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pl-7 mt-1 space-y-1"
              >
                <NavItem label="Obras Ativas" section="obras_ativas" />
                <NavItem label="Relatórios do Dia" section="obras_relatorios" />
                <NavItem label="Faltas e Presenças" section="obras_presencas" />
                <NavItem label="Histórico de Obras" section="obras_historico" />
                {/* 🔹 Novo item: Convites de Obra */}
                <NavItem label="Convites de Obra" section="obras_convites" />
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Financeiro */}
        <div>
          <button
            onClick={() => toggleGroup("financeiro")}
            className={`flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              {!collapsed && <span>Financeiro</span>}
            </div>
            {!collapsed &&
              (openGroups.financeiro ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </button>
          <AnimatePresence>
            {!collapsed && openGroups.financeiro && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pl-7 mt-1 space-y-1"
              >
                <NavItem label="Meus Ganhos" section="financeiro_ganhos" />
                <NavItem label="Recibos e Faturas" section="financeiro_recibos" />
                <NavItem label="Custos e Despesas" section="financeiro_custos" />
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Relatórios */}
        <div>
          <button
            onClick={() => toggleGroup("relatorios")}
            className={`flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {!collapsed && <span>Relatórios</span>}
            </div>
            {!collapsed &&
              (openGroups.relatorios ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </button>
          <AnimatePresence>
            {!collapsed && openGroups.relatorios && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pl-7 mt-1 space-y-1"
              >
                <NavItem label="Desempenho Geral" section="relatorios_desempenho" />
                <NavItem label="Horas Trabalhadas" section="relatorios_horas" />
                <NavItem label="Avaliações" section="relatorios_avaliacoes" />
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Documentos */}
        <div>
          <button
            onClick={() => toggleGroup("documentos")}
            className={`flex items-center justify-between w-full px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              {!collapsed && <span>Documentos</span>}
            </div>
            {!collapsed &&
              (openGroups.documentos ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              ))}
          </button>
          <AnimatePresence>
            {!collapsed && openGroups.documentos && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pl-7 mt-1 space-y-1"
              >
                <NavItem label="Meus Documentos" section="documentos_meus" />
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Rodapé */}
      <div className="border-t border-gray-200 dark:border-slate-800 p-4">
        {/* Configurações */}
        <button
          onClick={() => onSelectSection("configuracoes")}
          className={`w-full flex items-center justify-between ${
            collapsed ? "flex-col gap-2" : ""
          }`}
        >
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
            <Settings className="w-4 h-4 text-blue-600" />
            {!collapsed && <span>Configurações</span>}
          </div>
          {!collapsed && (
            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 hidden md:block" />
          )}
        </button>

        {/* 🔹 Botão SAIR - só no mobile */}
        <button
          onClick={logout}
          className="mt-4 flex md:hidden items-center gap-2 text-red-500 text-sm hover:text-red-600 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </motion.aside>
  );
}
