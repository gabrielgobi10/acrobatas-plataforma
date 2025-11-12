// src/components/admin/Admindashboard/SidebarDockAdmin.tsx
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  Clock,
  Folder,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  BarChart3,
  FileArchive,
  Trophy,
  SlidersHorizontal,
  History,
} from "lucide-react";
import React, { useMemo, useRef, useState, useEffect } from "react";

/* ---------- Util: Collapsible leve ---------- */
function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [h, setH] = useState<number>(0);
  useEffect(() => {
    if (!ref.current) return;
    setH(open ? ref.current.scrollHeight : 0);
  }, [open, children]);
  return (
    <ul
      ref={ref}
      style={{ maxHeight: h }}
      className="pl-9 mt-1 space-y-1 overflow-hidden transition-[max-height] duration-200 ease-out"
      aria-hidden={!open}
    >
      {children}
    </ul>
  );
}

type SectionItem = { label: string; section: string; icon?: React.ComponentType<{ className?: string }> };
type SectionGroup = { id: string; icon: React.ComponentType<{ className?: string }>; title: string; items: SectionItem[] };

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
    carreira: true,
    pedidos: false,
    relatorios: false,
    documentos: false,
    sistema: false,
  });

  const toggleGroup = (group: string) => setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const handleSelect = (section: string) => {
    onSelectSection(section);
    if (window.innerWidth < 768) setCollapsed(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) return;
    document.body.style.overscrollBehaviorY = collapsed ? "auto" : "contain";
    document.body.style.overflow = collapsed ? "auto" : "hidden";
    return () => {
      document.body.style.overscrollBehaviorY = "auto";
      document.body.style.overflow = "auto";
    };
  }, [collapsed]);

  // ============================
  // 📁 GRUPOS DE SEÇÕES
  // ============================
  const sections: SectionGroup[] = useMemo(
    () => [
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
        id: "carreira",
        icon: Trophy,
        title: "Carreira",
        items: [
          { label: "Regras & Níveis", section: "carreira-regras-niveis", icon: SlidersHorizontal },
          { label: "Profissionais & Progresso", section: "carreira-profissionais-progresso", icon: Users },
          { label: "Configurações Avançadas", section: "carreira-config-avancadas", icon: Settings },
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
        id: "documentos",
        icon: FileArchive,
        title: "Documentos",
        items: [{ label: "Documentos Acrobatas", section: "documentos-acrobatas", icon: FileText }],
      },
      {
        id: "sistema",
        icon: Settings,
        title: "Sistema",
        items: [
          { label: "Gerar Código Convite", section: "gerar-codigo", icon: KeyRound },
          { label: "Controle de Acesso", section: "controle-acesso", icon: ShieldCheck },
          { label: "Configurações Gerais", section: "configuracoes", icon: Folder },
          { label: "Logs do Sistema", section: "logs", icon: History },
        ],
      },
    ],
    []
  );

  // ============================
  // 🎨 RENDERIZAÇÃO
  // ============================
  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-[9998] bg-black/30 md:hidden"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[9999] h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 shadow-lg transition-[width,transform] duration-200 ease-in-out ${
          collapsed ? "w-[84px]" : "w-[256px]"
        }`}
        aria-label="Barra lateral administrativa"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 ${collapsed ? "py-4" : "py-5"} border-b border-gray-200 dark:border-slate-800`}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-600 w-6 h-6" />
            {!collapsed && <h2 className="text-[15px] font-semibold text-gray-700 dark:text-gray-200">Central Administrativa</h2>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-full border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition md:flex hidden"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4 text-gray-600" /> : <ChevronsLeft className="w-4 h-4 text-gray-600" />}
          </button>
        </div>

        {/* Navegação */}
        <nav className="h-[calc(100%-118px)] md:h-[calc(100%-120px)] overflow-y-auto scroll-smooth px-2 md:px-3 py-3 space-y-2">
          {sections.map((group) => {
            const open = !!openGroups[group.id];
            const Icon = group.icon;
            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 ${
                    collapsed ? "justify-center" : "text-gray-700 dark:text-gray-200"
                  } transition`}
                  aria-expanded={open}
                  aria-controls={`group-${group.id}`}
                >
                  <span className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                    <Icon className="w-5 h-5 text-blue-600" />
                    {!collapsed && <span className="font-medium text-[15px]">{group.title}</span>}
                  </span>
                  {!collapsed &&
                    (open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />)}
                </button>

                {!collapsed && (
                  <Collapsible open={open}>
                    {group.items.map((item) => (
                      <li key={item.section} id={`group-${group.id}`}>
                        <button
                          onClick={() => handleSelect(item.section)}
                          className="w-full text-left py-2 pr-3 text-[0.94rem] leading-5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-2 rounded-md"
                        >
                          {item.icon && <item.icon className="w-4 h-4 text-blue-500" />}
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </Collapsible>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="absolute bottom-0 left-0 w-full px-4 py-3 border-t border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
          <div className={`flex ${collapsed ? "justify-center" : "justify-between"} items-center text-sm text-gray-500 dark:text-gray-400`}>
            <button
              onClick={() => handleSelect("suporte")}
              className="flex items-center gap-2 hover:text-blue-600 transition"
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              {!collapsed && <span>Suporte</span>}
            </button>
            {!collapsed && (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{new Date().toLocaleTimeString().slice(0, 5)}</span>
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Botão mobile */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="md:hidden fixed bottom-5 left-5 z-[9997] rounded-full shadow-lg px-4 py-2 text-sm bg-blue-600 text-white active:scale-[0.98]"
          aria-label="Abrir menu"
        >
          Menu
        </button>
      )}
    </>
  );
}

