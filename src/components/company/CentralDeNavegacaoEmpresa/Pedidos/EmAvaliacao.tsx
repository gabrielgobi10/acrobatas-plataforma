// src/components/company/CentralDeNavegacaoEmpresa/Pedidos/EmAvaliacao.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Layers,
  Loader2,
  HardHat,
  MapPin,
  Info,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../context/AuthContext";
import { useTranslation } from "react-i18next";

// ==========================
// Tipagens
// ==========================
type PedidoStatus = "em_analise" | "aprovado" | "recusado" | "cancelado";

type Pedido = {
  id: string;
  id_empresa: string | null;
  status: string;
  tipo_profissional?: string | null;
  quantidade?: number | null;
  experiencia?: string | null;
  local?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  custo_total?: number | null;
  nome_obra?: string | null;
  nome_empresa?: string | null;
  observacoes?: string | null;
  criado_em?: string | null;
  convertido?: boolean | null;
};

// ==========================
// Canonizador de status
// ==========================
function canonStatus(s?: string | null): PedidoStatus {
  if (!s) return "em_analise";
  const v = String(s).toLowerCase();
  if (["em_analise", "em avaliacao", "em_avaliacao", "pendente"].includes(v)) return "em_analise";
  if (["aprovado", "concluido", "concluído"].includes(v)) return "aprovado";
  if (["reprovado", "recusado"].includes(v)) return "recusado";
  if (v === "cancelado") return "cancelado";
  return "em_analise";
}

type BannerState =
  | { kind: "none" }
  | { kind: "info"; title: string; text?: string }
  | { kind: "success"; title: string; text?: string }
  | { kind: "error"; title: string; text?: string };

export default function EmAvaliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // ==========================
  // Destaque do item focado
  // ==========================
  const [searchParams, setSearchParams] = useSearchParams();

  // from state (preferencial), depois query (?focus= / ?novo=), depois sessionStorage
  const highlightFromState = (location.state as any)?.highlightId ?? null;
  const forcedStatusFromState = (location.state as any)?.status ?? null;

  const highlightId: string | null = useMemo(() => {
    return (
      highlightFromState ||
      searchParams.get("focus") ||
      searchParams.get("novo") || // compat com fluxo antigo
      sessionStorage.getItem("pedido_novo") ||
      null
    );
  }, [highlightFromState, searchParams]);

  const forcedStatus: PedidoStatus | null = useMemo(() => {
    const fromState = (forcedStatusFromState as PedidoStatus | null) || null;
    const fromQuery = (searchParams.get("status") as PedidoStatus | null) || null;
    return (fromState || fromQuery) as PedidoStatus | null;
  }, [forcedStatusFromState, searchParams]);

  // estados de UI
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [banner, setBanner] = useState<BannerState>({ kind: "none" });
  const [pulseOn, setPulseOn] = useState<boolean>(false);

  // refs para scroll até o card
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Mapa de último status conhecido para cada pedido (somente lógica local)
  const lastStatusMapRef = useRef<Record<string, PedidoStatus>>({});

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState("");
  const [statusAtivo, setStatusAtivo] =
    useState<"todos" | "em_analise" | "aprovado" | "recusado">("em_analise");
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // força pt
  useEffect(() => {
    if (i18n.language !== "pt" && i18n.hasResourceBundle("pt", "translation")) {
      i18n.changeLanguage("pt");
    }
  }, [i18n]);

  // respeita redirect/CustomEvent — NÃO sobrepor quando vier forcedStatus
  useEffect(() => {
    const sec = (location.state as any)?.section;
    if (sec === "em-avaliacao" && !forcedStatus) setStatusAtivo("em_analise");
    const onSetSection = (e: any) => {
      if (e?.detail === "em-avaliacao" && !forcedStatus) setStatusAtivo("em_analise");
    };
    window.addEventListener("setSection", onSetSection);
    return () => window.removeEventListener("setSection", onSetSection);
  }, [location.state, forcedStatus]);

  // 1) empresa_id
  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data: emp, error } = await supabase.rpc("minha_empresa_id");
      if (error) {
        console.error("[EmAvaliacao] minha_empresa_id ->", error);
        if (!cancelado) {
          setEmpresaId(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelado) {
        setEmpresaId(emp ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [user?.id]);

  // 2) pedidos + realtime (sem criar notificações aqui)
  useEffect(() => {
    let cancelado = false;
    const channelName = `pedidos_empresa_v2_${empresaId ?? "global"}`;
    const canal = supabase.channel(channelName);

    async function loadPedidos() {
      if (!empresaId) {
        setPedidos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos_empresa_v2")
        .select("*")
        .eq("id_empresa", empresaId)
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("[EmAvaliacao] erro pedidos:", error);
        if (!cancelado) setPedidos([]);
      } else if (!cancelado) {
        const normalizados = (data ?? []).map((p: any) => ({
          ...p,
          status: canonStatus(p.status),
          convertido: p.convertido ?? false,
        }));
        setPedidos(normalizados as Pedido[]);

        // seed do mapa de status
        const seed: Record<string, PedidoStatus> = {};
        normalizados.forEach((p: any) => {
          seed[p.id] = canonStatus(p.status);
        });
        lastStatusMapRef.current = seed;
      }
      if (!cancelado) setLoading(false);
    }

    loadPedidos();

    canal
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_empresa_v2" },
        (payload) => {
          const novo = payload.new as Pedido | null;
          if (!novo) return;
          if (empresaId && (novo as any).id_empresa !== empresaId) return;

          const novoCanon: Pedido = {
            ...novo,
            status: canonStatus(novo.status),
            convertido: (novo as any).convertido ?? false,
          };

          // Atualiza somente estado local (NÃO insere notificação)
          lastStatusMapRef.current[novoCanon.id] = canonStatus(novoCanon.status);

          setPedidos((prevList) => {
            const i = prevList.findIndex((p) => p.id === novoCanon.id);
            if (i >= 0) {
              const cp = [...prevList];
              cp[i] = novoCanon;
              return cp;
            }
            return [novoCanon, ...prevList];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
      cancelado = true;
    };
  }, [empresaId]);

  // Forçar aba correta quando vier da notificação / query
  useEffect(() => {
    if (forcedStatus) setStatusAtivo(forcedStatus);
  }, [forcedStatus]);

  // Banner e destaque
  useEffect(() => {
    if (!highlightId && !forcedStatus) {
      setShowBanner(false);
      setBanner({ kind: "none" });
      return;
    }

    // vindo de aprovado/recusado pela notificação → ignorar qualquer 'pedido_novo'
    if (forcedStatus && (forcedStatus === "aprovado" || forcedStatus === "recusado")) {
      sessionStorage.removeItem("pedido_novo");
    }

    // se o destaque veio do fluxo antigo (?novo / session)
    if (highlightId && sessionStorage.getItem("pedido_novo") === highlightId) {
      sessionStorage.removeItem("pedido_novo");
    }

    const st = forcedStatus || "em_analise";
    if (st === "aprovado") {
      setBanner({
        kind: "success",
        title: "Seu pedido foi aprovado!",
        text: "Agora você pode criar a obra correspondente.",
      });
    } else if (st === "recusado") {
      setBanner({
        kind: "error",
        title: "Seu pedido foi recusado.",
        text: "Abra os detalhes para ver mais informações.",
      });
    } else {
      setBanner({
        kind: "info",
        title: "Seu pedido foi criado e está em avaliação.",
        text:
          "Em poucas horas você verá se foi aprovado ou recusado. Se aprovado, poderá criar a obra.",
      });
    }

    setShowBanner(true);
    setPulseOn(true);
  }, [highlightId, forcedStatus]);

  // scroll até o card
  useEffect(() => {
    if (!highlightId) return;
    const el = itemRefs.current[highlightId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, pedidos.length]);

  // para o “pulse” após ~4.5s
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setPulseOn(false), 4500);
    return () => clearTimeout(t);
  }, [highlightId]);

  const dismissBanner = () => {
    setShowBanner(false);
    const sp = new URLSearchParams(searchParams);
    sp.delete("novo");
    sp.delete("focus");
    sp.delete("status");
    setSearchParams(sp, { replace: true });
    sessionStorage.removeItem("pedido_novo");
    // limpa state utilizado na navegação
    if ((location.state as any)?.highlightId || (location.state as any)?.status) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  };

  // filtro + contadores
  const filtrados = useMemo(() => {
    const f = filtro.toLowerCase();
    return pedidos.filter((p) => {
      const st = canonStatus(p.status);
      const okStatus = statusAtivo === "todos" ? true : st === statusAtivo;
      const textoOk =
        (p.tipo_profissional ?? "").toLowerCase().includes(f) ||
        (p.local ?? "").toLowerCase().includes(f) ||
        (p.id ?? "").toLowerCase().includes(f);
      return okStatus && textoOk;
    });
  }, [pedidos, filtro, statusAtivo]);

  const contagem = useMemo(() => {
    const sts = pedidos.map((p) => canonStatus(p.status));
    return {
      em_analise: sts.filter((x) => x === "em_analise").length,
      aprovado: sts.filter((x) => x === "aprovado").length,
      recusado: sts.filter((x) => x === "recusado").length,
    };
  }, [pedidos]);

  // cancelar / alterar status
  async function atualizarStatus(id: string, novoStatus: PedidoStatus) {
    const { error } = await supabase
      .from("pedidos_empresa_v2")
      .update({ status: novoStatus })
      .eq("id", id)
      .eq("id_empresa", empresaId ?? "");
    if (error) {
      console.error("[EmAvaliacao] atualizarStatus:", error);
      return;
    }
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, status: canonStatus(novoStatus) } as Pedido) : p))
    );
    lastStatusMapRef.current[id] = canonStatus(novoStatus);
  }

  function formatarData(data?: string | null) {
    if (!data) return "—";
    const d = new Date(data);
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  }

  // ==========================
  // UI
  // ==========================
  return (
    <div className="px-4 py-5 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-500 w-5 h-5 md:w-6 md:h-6" />
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {t("empresaPedidos.titulo", { defaultValue: "Pedidos" })}
          </h1>
        </div>

        {statusAtivo !== "todos" && (
          <button
            onClick={() => setStatusAtivo("todos")}
            className="self-start md:self-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-lg shadow transition"
          >
            <Layers className="w-4 h-4" />
            {t("empresaPedidos.mostrarTodos", { defaultValue: "Mostrar todos" })}
          </button>
        )}
      </div>

      {/* Banner dinâmico */}
      {showBanner && banner.kind !== "none" && (
        <div
          className={[
            "mb-4 rounded-xl border p-3 md:p-4",
            banner.kind === "info" &&
              "bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-500/10 dark:border-sky-600/40 dark:text-sky-200",
            banner.kind === "success" &&
              "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-600/40 dark:text-emerald-200",
            banner.kind === "error" &&
              "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-500/10 dark:border-rose-600/40 dark:text-rose-200",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{banner.title}</p>
              {banner.text && <p className="mt-0.5 text-xs opacity-90">{banner.text}</p>}
            </div>
            <button
              onClick={dismissBanner}
              className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base mb-4 md:mb-8">
        {t("empresaPedidos.descricao", { defaultValue: "Acompanhe todos os pedidos e seus status." })}
      </p>

      {/* Cards do topo */}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-5 mb-4 md:mb-8">
        {[
          { key: "em_analise", cor: "text-yellow-500" },
          { key: "aprovado", cor: "text-green-500" },
          { key: "recusado", cor: "text-red-500" },
        ].map((s) => (
          <motion.button
            key={s.key}
            onClick={() => setStatusAtivo(s.key as any)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`border rounded-lg md:rounded-xl py-3 md:py-5 bg-white dark:bg-[#1e2a3a] shadow-sm hover:shadow-md transition flex flex-col items-center ${
              statusAtivo === (s.key as any) ? "ring-2 ring-blue-400" : ""
            }`}
          >
            <span className={`text-xl md:text-3xl font-bold ${s.cor}`}>
              {contagem[s.key as keyof typeof contagem]}
            </span>
            <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 mt-0.5 md:mt-1 text-center leading-tight">
              {{
                em_analise: t("empresaPedidos.status.emAnalise", { defaultValue: "Em análise" }),
                aprovado: t("empresaPedidos.status.aprovado", { defaultValue: "Aprovado" }),
                recusado: t("empresaPedidos.status.recusado", { defaultValue: "Recusado" }),
              }[s.key as "em_analise" | "aprovado" | "recusado"]}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Busca */}
      <div className="flex items-center mb-4 md:mb-6 border rounded-lg md:rounded-xl px-3 md:px-4 py-2 w-full md:w-1/3 bg-white dark:bg-[#1e2a3a] shadow-sm">
        <Search className="w-4 h-4 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder={t("empresaPedidos.buscarPlaceholder", {
            defaultValue: "Buscar por local, tipo ou ID...",
          })}
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full outline-none text-sm md:text-base text-gray-700 dark:text-gray-100 bg-transparent"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12 md:py-16">
          <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
        </div>
      ) : !empresaId ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8 md:py-10 bg-white dark:bg-[#1e2a3a] border border-gray-100 dark:border-zinc-700 rounded-xl shadow-sm">
          {t("empresaPedidos.semEmpresaVinculada", { defaultValue: "Nenhuma empresa vinculada." })}
        </div>
      ) : filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:gap-5">
          {filtrados.map((p, i) => {
            const key = canonStatus(p.status);
            const s = {
              em_analise: {
                cor: "border-yellow-500",
                icone: <Clock className="w-4 h-4 text-yellow-400" />,
                label: t("empresaPedidos.status.emAnalise", { defaultValue: "Em análise" }),
                bg: "bg-yellow-100/80 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300",
              },
              aprovado: {
                cor: "border-green-500",
                icone: <CheckCircle2 className="w-4 h-4 text-green-400" />,
                label: t("empresaPedidos.status.aprovado", { defaultValue: "Aprovado" }),
                bg: "bg-green-100/80 text-green-800 border-green-400 dark:bg-green-900/30 dark:text-green-300",
              },
              recusado: {
                cor: "border-red-500",
                icone: <XCircle className="w-4 h-4 text-red-400" />,
                label: t("empresaPedidos.status.recusado", { defaultValue: "Recusado" }),
                bg: "bg-red-100/80 text-red-800 border-red-400 dark:bg-red-900/30 dark:text-red-300",
              },
              cancelado: {
                cor: "border-gray-500",
                icone: <XCircle className="w-4 h-4 text-gray-400" />,
                label: t("empresaPedidos.status.cancelado", { defaultValue: "Cancelado" }),
                bg: "bg-gray-200/80 text-gray-700 border-gray-400 dark:bg-zinc-800 dark:text-gray-300",
              },
            }[key];

            const isHighlighted = highlightId === p.id;

            return (
              <motion.div
                key={p.id}
                ref={(el) => (itemRefs.current[p.id] = el)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={[
                  "relative bg-white dark:bg-[#1b2332] border-l-4",
                  s.cor,
                  "rounded-xl shadow-md hover:shadow-lg transition-all p-4 md:p-6",
                  isHighlighted
                    ? ["ring-2 ring-sky-500/40", "shadow-sky-500/20", pulseOn ? "animate-pulse" : ""].join(" ")
                    : "",
                ].join(" ")}
              >
                {isHighlighted && (
                  <span className="pointer-events-none absolute left-0 top-0 h-full w-[6px] rounded-l-xl bg-gradient-to-b from-sky-400 to-cyan-400" />
                )}

                <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                      <span className="text-gray-800 dark:text-gray-100">#{p.id}</span>
                      <span className={`flex items-center gap-1 text-[10px] md:text-xs font-medium ml-1 ${s.bg} rounded-full px-2 py-0.5`}>
                        {s.icone}
                        {s.label}
                      </span>
                      {isHighlighted && (
                        <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-[2px] text-[10px] md:text-xs text-sky-700 dark:text-sky-300">
                          Destaque
                        </span>
                      )}
                    </p>
                    <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mt-1 truncate">
                      {p.tipo_profissional}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                      {p.quantidade ?? 0}{" "}
                      {(p.quantidade ?? 0) > 1
                        ? t("empresaPedidos.profissionais", { defaultValue: "profissionais" })
                        : t("empresaPedidos.profissional", { defaultValue: "profissional" })}{" "}
                      — {p.experiencia}
                    </p>
                    {p.local && (
                      <p className="flex items-center text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 gap-1 truncate">
                        <MapPin className="w-3 h-3 text-gray-400" /> {p.local}
                      </p>
                    )}
                    <p className="text-[11px] md:text-xs text-gray-400 mt-1">
                      {formatarData(p.data_inicio)} → {formatarData(p.data_fim)}
                    </p>
                  </div>

                  <div className="flex gap-2 md:flex-col md:gap-2">
                    <button
                      onClick={() => setPedidoSelecionado(p)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-blue-600 text-white text-xs md:text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                      <Eye className="w-4 h-4" />
                      {t("empresaPedidos.verDetalhes", { defaultValue: "Ver detalhes" })}
                    </button>

                    {/* Criar obra só quando APROVADO e ainda NÃO convertido */}
                    {key === "aprovado" && !p.convertido && (
                      <button
                        onClick={() => {
                          navigate("/empresa/obras/adicionar", {
                            state: {
                              pedidoId: p.id,
                              nomeObra:
                                p.nome_obra || `${p.tipo_profissional || "Obra"} — ${p.local || ""}`,
                              empresa: p.nome_empresa || user?.email || "",
                              local: p.local || "",
                              dataInicio: p.data_inicio || "",
                              previsaoTermino: p.data_fim || "",
                              profissionais: p.quantidade || "",
                              descricao: p.observacoes || "",
                            },
                          });
                          window.dispatchEvent(
                            new CustomEvent("setSection", { detail: "adicionar-obra" })
                          );
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm px-3 py-1.5 rounded-lg shadow-sm transition"
                      >
                        <Layers className="w-4 h-4" />
                        {t("empresaPedidos.criarObra", { defaultValue: "Criar obra" })}
                      </button>
                    )}

                    {/* Se já convertido */}
                    {key === "aprovado" && p.convertido && (
                      <span className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-1.5 text-xs md:text-sm rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300/50">
                        ✅ Obra criada
                      </span>
                    )}

                    {key !== "aprovado" && key !== "cancelado" && (
                      <button
                        onClick={() => atualizarStatus(p.id, "cancelado")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs md:text-sm px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/40 transition"
                      >
                        <X className="w-4 h-4" />
                        {t("empresaPedidos.cancelar", { defaultValue: "Cancelar" })}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8 md:py-10 bg-white dark:bg-[#1e2a3a] border border-gray-100 dark:border-zinc-700 rounded-xl shadow-sm">
          {t("empresaPedidos.nenhumPedido", { defaultValue: "Nenhum pedido encontrado." })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {pedidoSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center z-50"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="w-full md:max-w-lg bg-white dark:bg-[#1b2332] rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-xl"
            >
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <HardHat className="text-yellow-500" />
                  {pedidoSelecionado.tipo_profissional}
                </h2>
                {(() => {
                  const key = canonStatus(pedidoSelecionado.status);
                  const badge = {
                    em_analise:
                      "bg-yellow-100/80 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300",
                    aprovado:
                      "bg-green-100/80 text-green-800 border-green-400 dark:bg-green-900/30 dark:text-green-300",
                    recusado:
                      "bg-red-100/80 text-red-800 border-red-400 dark:bg-red-900/30 dark:text-red-300",
                    cancelado:
                      "bg-gray-200/80 text-gray-700 border-gray-400 dark:bg-zinc-800 dark:text-gray-300",
                  }[key];
                  const label =
                    {
                      em_analise: t("empresaPedidos.status.emAnalise", { defaultValue: "Em análise" }),
                      aprovado: t("empresaPedidos.status.aprovado", { defaultValue: "Aprovado" }),
                      recusado: t("empresaPedidos.status.recusado", { defaultValue: "Recusado" }),
                      cancelado: t("empresaPedidos.status.cancelado", { defaultValue: "Cancelado" }),
                    }[key];
                  return (
                    <div className={`text-[11px] md:text-xs font-semibold px-3 py-1 rounded-full border ${badge}`}>
                      {label}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1.5 md:space-y-2 text-gray-700 dark:text-gray-200 text-sm">
                <p>
                  <strong>📍 {t("empresaPedidos.local", { defaultValue: "Local" })}:</strong>{" "}
                  {pedidoSelecionado.local}
                </p>
                <p>
                  <strong>💼 {t("empresaPedidos.experiencia", { defaultValue: "Experiência" })}:</strong>{" "}
                  {pedidoSelecionado.experiencia}
                </p>
                <p>
                  <strong>👥 {t("empresaPedidos.quantidade", { defaultValue: "Quantidade" })}:</strong>{" "}
                  {pedidoSelecionado.quantidade}
                </p>
                <p>
                  <strong>📆 {t("empresaPedidos.periodo", { defaultValue: "Período" })}:</strong>{" "}
                  {formatarData(pedidoSelecionado.data_inicio)} → {formatarData(pedidoSelecionado.data_fim)}
                </p>
                <p>
                  <strong>💶 {t("empresaPedidos.custoTotal", { defaultValue: "Custo total" })}:</strong>{" "}
                  {pedidoSelecionado.custo_total?.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  }) || "—"}
                </p>
              </div>

              <div className="mt-5 md:mt-6 flex justify-end">
                <button
                  onClick={() => setPedidoSelecionado(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-800 dark:text-gray-200 text-sm"
                >
                  {t("empresaPedidos.fechar", { defaultValue: "Fechar" })}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
