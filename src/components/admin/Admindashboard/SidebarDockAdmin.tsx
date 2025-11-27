// src/components/admin/Admindashboard/SidebarDockAdmin.tsx
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  HardHat,
  FileText,
  FileArchive,
  BarChart3,
  Wallet,
  CreditCard,
  Settings,
  ShieldCheck,
  MessageSquare,
  Trophy,
  SlidersHorizontal,
  ChartLine,
  History,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  LogOut,
} from "lucide-react";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";

/* ---------------------------------------------------------
   🔽 COLLAPSIBLE
--------------------------------------------------------- */
function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const total = ref.current.scrollHeight;
    setHeight(open ? total : 0);
  }, [open, children]);

  return (
    <ul
      ref={ref}
      style={{ height }}
      className="pl-9 mt-1 space-y-1 overflow-hidden transition-[height] duration-300 ease-in-out"
    >
      {children}
    </ul>
  );
}

/* ---------------------------------------------------------
   🔽 SIDEBAR DO ADMIN
--------------------------------------------------------- */
export default function SidebarDockAdmin({
  onSelectSection,
  collapsed,
  setCollapsed,
}: {
  onSelectSection: (section: string) => void;
  collapsed: boolean;
  setCollapsed: (state: boolean) => void;
}) {
  const { logout } = useAuth();

  // 🔒 Agora TODOS os grupos começam FECHADOS
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    geral: false,
    operacoes: false,
    pedidos: false,
    documentos: false,
    financeiro: false,
    carreira: false,
    configuracoes: false,
    suporte: false,
  });

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSelect = (section: string) => {
    onSelectSection(section);
    if (window.innerWidth < 768) setCollapsed(true);
  };

  /* ---------------------------------------------------------
     🔒 Bloqueia scroll quando o sidebar está aberto no mobile
  --------------------------------------------------------- */
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    document.body.style.overflow = collapsed ? "auto" : "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [collapsed]);

  /* ---------------------------------------------------------
     📌 Estrutura completa do menu
  --------------------------------------------------------- */
  const sections = useMemo(
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
        id: "operacoes",
        icon: HardHat,
        title: "Operações",
        items: [
          {
            label: "Profissionais",
            section: "operacoes-profissionais",
            icon: Users,
          },
          {
            label: "Empresas",
            section: "operacoes-empresas",
            icon: Building2,
          },
          {
            label: "Obras & Equipas",
            section: "operacoes-obras",
            icon: HardHat,
          },
          {
            label: "Presenças & Relatórios",
            section: "operacoes-presencas",
            icon: ClipboardList,
          },
          { label: "Vagas", section: "operacoes-vagas", icon: ClipboardList },
        ],
      },
      {
        id: "pedidos",
        icon: ClipboardList,
        title: "Pedidos & Candidaturas",
        items: [
          { label: "Pedidos de Empresas", section: "pedidos-empresas" },
          { label: "Candidaturas", section: "pedidos-candidaturas" },
          { label: "Aprovações", section: "pedidos-aprovacoes" },
        ],
      },
      {
        id: "documentos",
        icon: FileArchive,
        title: "Documentação",
        items: [
          {
            label: "Profissionais",
            section: "docs-profissionais",
            icon: FileText,
          },
          { label: "Empresas", section: "docs-empresas", icon: FileText },
          {
            label: "Documentos Acrobatas",
            section: "documentos-acrobatas",
            icon: FileArchive,
          },
          {
            label: "Vencimentos & Alertas",
            section: "docs-vencimentos",
            icon: Bell,
          },
        ],
      },
      {
        id: "financeiro",
        icon: Wallet,
        title: "Financeiro",
        items: [
          {
            label: "Pagamentos Profissionais",
            section: "fin-pagamentos",
            icon: CreditCard,
          },
          {
            label: "Faturação Empresas",
            section: "fin-faturacao",
            icon: BarChart3,
          },
          { label: "Extratos", section: "fin-extratos", icon: ChartLine },
          {
            label: "Histórico Financeiro",
            section: "fin-historico",
            icon: History,
          },
          // 🔽 NOVO ITEM: política de preços & margens
          {
            label: "Política de Preços & Margens",
            section: "fin-politica-margens",
            icon: SlidersHorizontal,
          },
        ],
      },
      {
        id: "carreira",
        icon: Trophy,
        title: "Carreira & Níveis",
        items: [
          {
            label: "Regras dos Níveis",
            section: "carreira-regras",
            icon: SlidersHorizontal,
          },
          {
            label: "Pontuação & Critérios",
            section: "carreira-pontos",
            icon: BarChart3,
          },
          {
            label: "Evolução dos Profissionais",
            section: "carreira-profissionais",
            icon: Users,
          },
        ],
      },
      {
        id: "configuracoes",
        icon: Settings,
        title: "Configurações",
        items: [
          { label: "Notificações", section: "conf-notificacoes", icon: Bell },
          {
            label: "Controle de Acesso",
            section: "conf-acesso",
            icon: ShieldCheck,
          },
          { label: "Permissões", section: "conf-permissoes" },
          { label: "Configurações Gerais", section: "conf-geral" },
          { label: "Logs do Sistema", section: "conf-logs", icon: History },
        ],
      },
      {
        id: "suporte",
        icon: MessageSquare,
        title: "Suporte",
        items: [
          { label: "Tickets", section: "suporte-tickets" },
          { label: "Chat", section: "suporte-chat" },
        ],
      },
    ],
    []
  );

  /* ---------------------------------------------------------
     🔽 Renderização final
  --------------------------------------------------------- */
  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-[9999] h-full
          flex flex-col
          bg-white/95 dark:bg-slate-900/95
          backdrop-blur-xl shadow-xl
          border-r border-slate-200 dark:border-slate-800
          transition-all duration-300
          ${
            collapsed
              ? "-translate-x-full md:translate-x-0 md:w-[84px]"
              : "translate-x-0 w-[260px] md:w-[260px]"
          }
        `}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            {!collapsed && (
              <h2 className="text-sm font-semibold">Central Administrativa</h2>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {collapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* MENU */}
        <nav className="px-3 py-4 overflow-y-auto flex-1 min-h-0 space-y-2">
          {sections.map((group) => {
            const open = openGroups[group.id];
            const Icon = group.icon;

            return (
              <div key={group.id}>
                {/* Grupo */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                    hover:bg-slate-100 dark:hover:bg-slate-800
                    ${collapsed ? "justify-center" : ""}
                  `}
                >
                  <span
                    className={`flex items-center gap-3 ${
                      collapsed ? "justify-center" : ""
                    }`}
                  >
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    {!collapsed && (
                      <span className="text-[14px]">{group.title}</span>
                    )}
                  </span>

                  {!collapsed && (
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Itens do grupo */}
                {!collapsed && (
                  <Collapsible open={open}>
                    {group.items.map((item) => (
                      <li key={item.section}>
                        <button
                          onClick={() => handleSelect(item.section)}
                          className="
                            flex w-full items-center gap-2 py-2 pr-3 rounded-md
                            text-left text-sm
                            text-slate-600 dark:text-slate-300
                            hover:text-blue-600 dark:hover:text-sky-400
                            hover:bg-slate-100 dark:hover:bg-slate-800/60
                            transition
                          "
                        >
                          {item.icon && (
                            <item.icon className="w-4 h-4 text-blue-500 dark:text-sky-400" />
                          )}
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

        {/* RODAPÉ */}
        <div className="px-4 py-3 border-t bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
          <button
            onClick={() => handleSelect("suporte-tickets")}
            className="flex items-center gap-2 text-sm hover:text-blue-600 dark:hover:text-sky-400 transition"
          >
            <MessageSquare className="w-4 h-4" />
            {!collapsed && <span>Suporte</span>}
          </button>

          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition md:hidden"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
