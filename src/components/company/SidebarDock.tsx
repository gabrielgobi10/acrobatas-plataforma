// src/components/company/SidebarDock.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Users,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Folder,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

type Props = {
  onSelectSection: (section: string) => void;
  onCloseMobile?: () => void;
  logoSrc?: string;
};

const LOGO_SRC = "/Design sem nome (44).png";

export default function SidebarDock({
  onSelectSection,
  onCloseMobile,
  logoSrc,
}: Props) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();

  const isRTL = useMemo(
    () => i18n.language?.toLowerCase().startsWith("ar"),
    [i18n.language]
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 768);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Nenhum grupo abre automaticamente
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    pedidos: false,
    obras: false,
    profissionais: false,
    relatorios: false,
    documentos: false,
  });

  const toggleGroup = useCallback(
    (group: string) =>
      setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] })),
    []
  );

  // helper i18n com fallback
  const tt = useCallback(
    (keys: any, fallback: string) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) {
        const val = t(k);
        if (typeof val === "string" && val !== k) return val;
      }
      return fallback;
    },
    [t]
  );

  const sections = useMemo(
    () => [
      {
        id: "pedidos",
        icon: ClipboardList,
        title: tt("empresa.pedidos.titulo", "Pedidos"),
        items: [
          { label: "Novos Pedidos", section: "novos-pedidos" },
          { label: "Em Avaliação", section: "em-avaliacao" },
          { label: "Aprovados", section: "aprovados" },
        ],
      },
      {
        id: "obras",
        icon: Building2,
        title: tt("empresa.navObras", "Obras"),
        items: [
          { label: "Obras Ativas", section: "obras-ativas" },
          { label: "Histórico", section: "historico" },
          { label: "Adicionar Obra", section: "adicionar-obra" },
        ],
      },
      {
        id: "profissionais",
        icon: Users,
        title: "Profissionais",
        items: [
          { label: "Equipes em Campo", section: "equipes-em-campo" },
          { label: "Adicionar Profissional", section: "adicionar-profissional" },
          { label: "Faltas / Presenças", section: "faltas-presencas" },
        ],
      },
      {
        id: "relatorios",
        icon: FileText,
        title: "Relatórios",
        items: [
          { label: "Custos Mensais", section: "custos-mensais" },
          { label: "Desempenho", section: "desempenho" },
          { label: "Financeiro", section: "financeiro" },
        ],
      },
      {
        id: "documentos",
        icon: Folder,
        title: "Documentos",
        items: [
          { label: "Acrobatas", section: "documentos-acrobatas" },
          { label: "Profissionais", section: "documentos-profissionais" },
          { label: "Meus Documentos", section: "documentos-meus" },
        ],
      },
    ],
    [tt]
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: isMobile ? 280 : 248 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`fixed top-0 z-[9999] ${
        isRTL ? "right-0" : "left-0"
      } h-[100dvh] flex flex-col
        bg-white dark:bg-[#020617]
        border-r border-slate-200/80 dark:border-slate-800/80`}
    >
      {/* TOPO: LOGO CENTRALIZADA, BEM CLEAN */}
      <div className="shrink-0 border-b border-slate-200/70 dark:border-slate-800/80">
        <div className="h-16 flex items-center justify-center px-4">
          <img
            src={logoSrc || LOGO_SRC}
            alt="Acrobatas"
            className="h-9 w-auto object-contain select-none"
          />
        </div>
      </div>

      {/* LISTA DE GRUPOS */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {sections.map((s) => {
          const isOpen = !!openGroups[s.id];

          return (
            <div key={s.id} className="rounded-xl">
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => toggleGroup(s.id)}
                aria-expanded={isOpen}
                aria-controls={`group-${s.id}`}
                className={`flex items-center justify-between w-full px-2.5 py-2.5 rounded-xl
                  text-left
                  transition-colors duration-150
                  ${
                    isOpen
                      ? "bg-slate-100/90 dark:bg-slate-900"
                      : "bg-transparent"
                  }
                  hover:bg-slate-100/80 dark:hover:bg-slate-900`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full
                    bg-slate-100 dark:bg-slate-900
                    border border-slate-200/80 dark:border-slate-700"
                  >
                    <s.icon className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                  </span>
                  <span className="font-medium text-[14px] text-slate-800 dark:text-slate-100">
                    {s.title}
                  </span>
                </div>

                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Subitens */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.ul
                    id={`group-${s.id}`}
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="mt-1 space-y-0.5 overflow-hidden pl-11"
                  >
                    {s.items.map((item) => (
                      <li key={item.section}>
                        <button
                          onClick={() => {
                            onSelectSection(item.section);
                            if (isMobile) onCloseMobile?.();
                          }}
                          className="w-full text-left text-[13px] py-1.5 rounded-md px-2
                            text-slate-600 hover:text-sky-600 hover:bg-slate-100
                            dark:text-slate-400 dark:hover:text-sky-300 dark:hover:bg-slate-900
                            transition-colors duration-120"
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* RODAPÉ */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 px-3 py-3 mt-auto">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => {
              onSelectSection("configuracoes");
              if (isMobile) onCloseMobile?.();
            }}
            className="flex items-center gap-2 text-[13px]
              rounded-lg px-3 py-2
              text-slate-700 dark:text-slate-200
              hover:bg-slate-100 dark:hover:bg-slate-900
              transition-colors duration-120"
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>

          <button
            onClick={logout}
            className="md:hidden flex items-center gap-2 text-[13px]
              text-rose-500 hover:text-rose-400 transition-colors duration-120
              px-3 py-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
