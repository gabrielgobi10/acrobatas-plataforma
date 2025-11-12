import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  MessageSquare,
  Clock,
  Folder,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  BarChart3,
} from "lucide-react";
import { useState } from "react";

export default function SidebarDockAdmin({
  onSelectSection,
  collapsed,
  setCollapsed,
}: {
  onSelectSection: (section: string) => void;
  collapsed: boolean;
  setCollapsed: (state: boolean) => void;
}) {
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    geral: true,
    usuarios: true,
    pedidos: false,
    relatorios: false,
    sistema: false,
  });

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const sections = [
    {
      id: "geral",
      icon: LayoutDashboard,
      title: "Painel Geral",
      items: [
        { label: "Visão Geral", section: "painel" },
        { label: "Estatísticas", section: "estatisticas" },
        { label: "Atividades Recentes", section: "atividades" },
      ],
    },
    {
      id: "usuarios",
      icon: Users,
      title: "Usuários",
      items: [
        { label: "Profissionais", section: "profissionais" },
        { label: "Empresas", section: "empresas" },
        { label: "Administradores", section: "administradores" },
      ],
    },
    {
      id: "pedidos",
      icon: ClipboardList,
      title: "Pedidos",
      items: [
        { label: "Pendentes", section: "pedidos-pendentes" },
        { label: "Em Análise", section: "pedidos-analise" },
        { label: "Concluídos", section: "pedidos-concluidos" },
      ],
    },
    {
      id: "relatorios",
      icon: BarChart3,
      title: "Relatórios",
      items: [
        { label: "Financeiro", section: "relatorio-financeiro" },
        { label: "Usuários Ativos", section: "relatorio-usuarios" },
        { label: "Obras e Pedidos", section: "relatorio-obras" },
      ],
    },
    {
      id: "sistema",
      icon: Settings,
      title: "Sistema",
      items: [
        { label: "Gerar Código Convite", section: "gerar-codigo", icon: KeyRound },
        { label: "Controle de Acesso", section: "controle-acesso", icon: ShieldCheck },
        { label: "Configurações Gerais", section: "configuracoes", icon: Folder },
        { label: "Logs do Sistema", section: "logs", icon: FileText },
      ],
    },
  ];

  return (
    <motion.aside
      initial={{ width: 256 }}
      animate={{ width: collapsed ? 85 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed left-0 top-0 h-full z-[9999] bg-white bg-gray-100/95 dark:bg-slate-900/90 backdrop-blur-xl border-r border-gray-200 border-gray-200 dark:border-slate-800 shadow-2xl overflow-y-auto ${
        collapsed ? "rounded-r-xl" : "rounded-r-2xl"
      }`}
    >
      {/* Botão recolher */}
      <motion.button
        onClick={() => setCollapsed(!collapsed)}
        animate={{ rotate: collapsed ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute right-2 top-6 bg-white bg-white dark:bg-slate-800 border border-gray-200 border-gray-300 dark:border-slate-700 rounded-full shadow-md p-1.5 z-50 hover:bg-gray-50 bg-gray-50 dark:hover:bg-slate-700 transition"
      >
        {collapsed ? (
          <ChevronsRight className="w-4 h-4 text-gray-600 text-gray-600" />
        ) : (
          <ChevronsLeft className="w-4 h-4 text-gray-600 text-gray-700" />
        )}
      </motion.button>

      {/* Header */}
      {!collapsed && (
        <div className="px-5 py-6 border-b border-gray-200 dark:border-zinc-600 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-600 w-6 h-6" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              Central Administrativa
            </h2>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <nav
        className={`mt-4 ${
          collapsed ? "px-2" : "px-4"
        } space-y-2 pb-10 transition-all duration-300`}
      >
        {sections.map((section) => (
          <div key={section.id}>
            {/* Grupo principal */}
            <button
              onClick={() => toggleGroup(section.id)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 ${
                collapsed
                  ? "justify-center"
                  : "text-gray-700 dark:text-gray-200 hover:text-blue-600"
              } hover:bg-gray-50 bg-white dark:hover:bg-slate-800`}
            >
              <div
                className={`flex items-center gap-3 ${
                  collapsed ? "justify-center" : "justify-start"
                }`}
              >
                <section.icon className="w-5 h-5 text-blue-600" />
                {!collapsed && (
                  <span className="font-medium text-[15px]">
                    {section.title}
                  </span>
                )}
              </div>

              {!collapsed &&
                (openGroups[section.id] ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 text-gray-600" />
                ))}
            </button>

            {/* Itens do grupo */}
            <AnimatePresence>
              {!collapsed && openGroups[section.id] && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="pl-10 mt-1 space-y-1 overflow-hidden"
                >
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <button
                        onClick={() => onSelectSection(item.section)}
                        className="w-full text-left py-1.5 text-sm text-gray-600 dark:text-gray-300 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2"
                      >
                        {item.icon && (
                          <item.icon className="w-4 h-4 text-blue-500" />
                        )}
                        {item.label}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-200 dark:border-zinc-600 dark:border-slate-800">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Suporte</span>
            </div>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}
    </motion.aside>
  );
}
