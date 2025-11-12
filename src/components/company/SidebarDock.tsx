// src/components/company/SidebarDock.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Folder,
  ChevronsLeft,
  ChevronsRight,
  UserCircle,
  X,
  LogOut,
  LifeBuoy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

type Props = {
  onSelectSection: (section: string) => void;
  onCloseMobile?: () => void; // fecha overlay no mobile
};

export default function SidebarDock({ onSelectSection, onCloseMobile }: Props) {
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

  // grupos abertos
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    pedidos: true,
    obras: true,
    profissionais: false,
    relatorios: false,
    documentos: false,
    outros: false,
  });

  // no mobile, tudo fechado (mais compacto)
  useEffect(() => {
    if (isMobile) {
      setOpenGroups({
        pedidos: false,
        obras: false,
        profissionais: false,
        relatorios: false,
        documentos: false,
        outros: false,
      });
    }
  }, [isMobile]);

  const [collapsed, setCollapsed] = useState(false);
  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const tt = (keys: string[] | string, fallback: string) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      const val = t(k);
      if (typeof val === "string" && val !== k) return val;
    }
    return fallback;
  };

  const titlePedidos = tt(
    ["empresa.pedidos.titulo", "graficosPainel.pedido", "empresaPainel.pedido"],
    "Pedidos"
  );
  const titleObras = tt(["empresa.navObras", "empresaObras.titulo"], "Obras");
  const titleProfissionais = tt(
    ["empresa.navProfissionais", "empresaProfissionais.titulo"],
    "Profissionais"
  );
  const titleRelatorios = tt(
    ["empresa.navRelatorios", "empresaRelatorios.titulo"],
    "Relatórios"
  );
  const titleDocumentos = tt(
    ["empresa.navDocumentos", "empresa.documentos.titulo", "obra.tabs.documentos"],
    "Documentos"
  );
  const titleOutros = tt(
    ["empresa.navOutros", "empresa.navChat", "empresa.outros.titulo"],
    "Outros"
  );

  const sections = [
    {
      id: "pedidos",
      icon: ClipboardList,
      title: titlePedidos,
      items: [
        { label: tt("empresa.pedidos.novos", "Novos Pedidos"), section: "novos-pedidos" },
        { label: tt("empresa.pedidos.avaliacao", "Em Avaliação"), section: "em-avaliacao" },
        { label: tt("empresa.pedidos.aprovados", "Aprovados"), section: "aprovados" },
      ],
    },
    {
      id: "obras",
      icon: Building2,
      title: titleObras,
      items: [
        { label: tt(["empresaObras.titulo", "empresaPainel.obrasAtivas"], "Obras Ativas"), section: "obras-ativas" },
        { label: tt("empresaObras.status.concluida", "Histórico"), section: "historico" },
        { label: tt("empresaObras.adicionar", "Adicionar Obra"), section: "adicionar-obra" },
      ],
    },
    {
      id: "profissionais",
      icon: Users,
      title: titleProfissionais,
      items: [
        { label: tt("empresa.profissionais.campo", "Equipes em Campo"), section: "equipes-em-campo" },
        { label: tt("empresa.profissionais.adicionar", "Adicionar Profissional"), section: "adicionar-profissional" },
        { label: tt("empresa.profissionais.presencas", "Faltas / Presenças"), section: "faltas-presencas" },
      ],
    },
    {
      id: "relatorios",
      icon: FileText,
      title: titleRelatorios,
      items: [
        { label: tt(["empresaRelatorios.graficos.financeiro", "graficosPainel.custosMensais"], "Custos Mensais"), section: "custos-mensais" },
        { label: tt(["empresaRelatorios.titulo", "graficosPainel.atividadesRecentes"], "Desempenho"), section: "desempenho" },
        { label: tt("empresaRelatorios.indicadores.lucro", "Financeiro"), section: "financeiro" },
      ],
    },
    {
      id: "documentos",
      icon: Folder,
      title: titleDocumentos,
      items: [
        { label: tt("empresa.documentos.acrobatas", "Acrobatas"), section: "documentos-acrobatas" },
        { label: tt("empresa.documentos.profissionais", "Profissionais"), section: "documentos-profissionais" },
        { label: tt("empresa.documentos.meus", "Meus Documentos"), section: "documentos-meus" },
      ],
    },
    {
      id: "outros",
      icon: Settings,
      title: titleOutros,
      items: [
        { label: tt("empresa.outros.config", "Configurações"), section: "configuracoes" },
        { label: tt("empresa.notificacoes.titulo", "Notificações"), section: "notificacoes" },
        { label: tt("empresa.outros.perfil", "Perfil da Empresa"), section: "perfil-empresa", icon: UserCircle },
      ],
    },
  ];

  const dirClass = isRTL ? "rtl" : "ltr";
  const flipX = isRTL ? -1 : 1;

  return (
    <motion.aside
      initial={{ width: 256 }}
      animate={{ width: isMobile ? 300 : collapsed ? 88 : 256 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className={`fixed ${isRTL ? "right-0" : "left-0"} top-0 z-[9999]
        h-[100dvh] md:h-screen flex flex-col ${dirClass}
        bg-white text-slate-800 border-${isRTL ? "l" : "r"} border-zinc-200
        dark:bg-[#0B1220] dark:text-slate-200 dark:border-slate-800`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        touchAction: "pan-y",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
      }}
    >
      {/* Cabeçalho */}
      <div className="px-4 py-4 shrink-0 flex items-center justify-between border-b border-zinc-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {/* Badge circular discreto que combina com ambos temas */}
          <div className="relative grid h-9 w-9 place-items-center rounded-full
                          bg-slate-100 ring-1 ring-zinc-200 text-sky-600
                          dark:bg-[#0C1529] dark:ring-slate-700 dark:text-sky-400 shadow-sm">
            {/* halo bem suave só para dar profundidade */}
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-sky-500/10 to-cyan-400/10" />
            <LayoutDashboard className="relative z-10 w-5 h-5" />
          </div>

          {isMobile ? (
            <h2 className="text-[15px] font-semibold">Painel</h2>
          ) : !collapsed ? (
            <h2 className="text-[16px] font-semibold">Central de Navegação</h2>
          ) : null}
        </div>

        {/* Desktop: colapsar | Mobile: fechar */}
        {!isMobile ? (
          <motion.button
            onClick={() => setCollapsed(!collapsed)}
            animate={{ rotate: collapsed ? 180 * flipX : 0 }}
            transition={{ duration: 0.25 }}
            className="p-1.5 rounded-lg border border-zinc-300 bg-white text-slate-600 hover:bg-zinc-50
                       dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-300 dark:hover:bg-[#0F172A]/80"
            aria-label="Alternar sidebar"
          >
            {collapsed
              ? (isRTL ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />)
              : (isRTL ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />)}
          </motion.button>
        ) : (
          <button
            onClick={() => onCloseMobile?.()}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-[#0F172A] transition"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Lista (rolável) */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1
                   scrollbar-thin scrollbar-thumb-slate-400/20 scrollbar-track-transparent md:pb-3 pb-24"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {sections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => toggleGroup(section.id)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl
                ${!isMobile && collapsed ? "justify-center" : "hover:bg-zinc-100 dark:hover:bg-[#0F172A]"}
                text-slate-700 dark:text-slate-200 transition`}
            >
              <div className={`flex items-center gap-2 ${!isMobile && collapsed ? "justify-center" : ""}`}>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700
                                 dark:bg-[#0C1529] dark:text-slate-200">
                  <section.icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </span>
                {((!isMobile && !collapsed) || isMobile) && (
                  <span className="font-medium text-[14px]">{section.title}</span>
                )}
              </div>
              {((!isMobile && !collapsed) || isMobile) &&
                (openGroups[section.id] ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                ))}
            </button>

            <AnimatePresence>
              {((!isMobile && !collapsed) || isMobile) && openGroups[section.id] && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`${isRTL ? "pr-7" : "pl-7"} mt-1 space-y-0.5`}
                >
                  {section.items.map((item) => (
                    <li key={item.section}>
                      <button
                        onClick={() => {
                          onSelectSection(item.section);
                          if (isMobile) onCloseMobile?.();
                        }}
                        className="w-full text-start py-1.5 text-[13px]
                                   text-slate-600 hover:text-sky-600 hover:bg-zinc-100
                                   dark:text-slate-400 dark:hover:text-sky-300 dark:hover:bg-[#0F172A]
                                   transition flex items-center gap-2 rounded-lg px-2"
                      >
                        {item.icon && (
                          <span className="grid h-6 w-6 place-items-center rounded-md bg-slate-100 dark:bg-[#0C1529]">
                            <item.icon className="w-3.5 h-3.5" />
                          </span>
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
      </div>

      {/* Rodapé fixo (mobile) com safe-area */}
      <div
        className="md:hidden sticky bottom-0 left-0 right-0 border-t border-zinc-200 bg-white
                   px-4 pt-2 pb-3 backdrop-blur-md
                   dark:border-slate-800 dark:bg-[#0B1220]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              onSelectSection("suporte");
              onCloseMobile?.();
            }}
            className="mt-0.5 flex items-center gap-2 text-[14px]
                       text-slate-700 hover:text-sky-600
                       dark:text-slate-200 dark:hover:text-sky-300 transition"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>{tt("empresa.suporte", "Suporte")}</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-[14px]
                       text-rose-600 hover:text-rose-700
                       dark:text-rose-400 dark:hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>{tt("auth.sair", "Sair")}</span>
          </button>
        </div>

        <div className="mt-2 text-[11px] select-none text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} Acrobatas
        </div>
      </div>
    </motion.aside>
  );
}
