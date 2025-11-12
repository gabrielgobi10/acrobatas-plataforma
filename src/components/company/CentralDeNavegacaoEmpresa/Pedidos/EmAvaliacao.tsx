
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../context/AuthContext";
import { useTranslation } from "react-i18next";

type Pedido = {
  id: string;
  id_empresa: string;
  status: "em_avaliacao" | "pendente" | "aprovado" | "cancelado";
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
};

export default function EmAvaliacao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState("");
  const [statusAtivo, setStatusAtivo] =
    useState<"todos" | "em_avaliacao" | "pendente" | "aprovado" | "cancelado">("todos");
  const [loading, setLoading] = useState(true);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // força pt caso caia em outra lang sem chaves
  useEffect(() => {
    if (i18n.language !== "pt" && i18n.hasResourceBundle("pt", "translation")) {
      i18n.changeLanguage("pt");
    }
  }, [i18n]);

  const statusConfig = {
    em_avaliacao: {
      cor: "border-yellow-500",
      icone: <Clock className="w-4 h-4 text-yellow-400" />,
      label: t("empresaPedidos.status.emAvaliacao"),
      bg: "bg-yellow-100/80 text-yellow-800 border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    pendente: {
      cor: "border-orange-500",
      icone: <Clock className="w-4 h-4 text-orange-400" />,
      label: t("empresaPedidos.status.pendente"),
      bg: "bg-orange-100/80 text-orange-800 border-orange-400 dark:bg-orange-900/30 dark:text-orange-300",
    },
    aprovado: {
      cor: "border-green-500",
      icone: <CheckCircle2 className="w-4 h-4 text-green-400" />,
      label: t("empresaPedidos.status.aprovado"),
      bg: "bg-green-100/80 text-green-800 border-green-400 dark:bg-green-900/30 dark:text-green-300",
    },
    cancelado: {
      cor: "border-gray-500",
      icone: <XCircle className="w-4 h-4 text-gray-400" />,
      label: t("empresaPedidos.status.cancelado"),
      bg: "bg-gray-200/80 text-gray-700 border-gray-400 dark:bg-zinc-800 dark:text-gray-300",
    },
  };

  /**
   * 1) Obtém empresa_id via RPC (ignora possíveis bloqueios de RLS em `usuarios`)
   *    SQL esperado no banco:
   *    create or replace function public.minha_empresa_id() returns uuid security definer ...
   */
  useEffect(() => {
    let cancelado = false;

    async function loadEmpresaId() {
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
    }

    loadEmpresaId();
    return () => {
      cancelado = true;
    };
  }, [user?.id]);

  /**
   * 2) Carrega pedidos da empresa.
   *    Com a policy "empresa lê seus pedidos", o RLS já filtra por id_empresa do usuário.
   */
  useEffect(() => {
    let cancelado = false;
    const canal = supabase.channel("pedidos_empresa_v2_changes");

    async function loadPedidos() {
      // Se não tem empresa vinculada, mostra msg e para
      if (!empresaId) {
        setPedidos([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("pedidos_empresa_v2")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("[EmAvaliacao] erro pedidos:", error);
        if (!cancelado) setPedidos([]);
      } else if (!cancelado) {
        setPedidos((data ?? []) as Pedido[]);
      }

      if (!cancelado) setLoading(false);
    }

    loadPedidos();

    // realtime (respeita RLS)
    canal
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_empresa_v2" },
        (payload) => {
          const novo = payload.new as Pedido;
          if (!novo) return;
          // por segurança, evita misturar empresas diferentes
          if (empresaId && novo.id_empresa !== empresaId) return;

          setPedidos((prev) => {
            const i = prev.findIndex((p) => p.id === novo.id);
            if (i >= 0) {
              const cp = [...prev];
              cp[i] = novo;
              return cp;
            }
            return [novo, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(canal);
    };
  }, [empresaId]);

  const filtrados = useMemo(() => {
    const f = filtro.toLowerCase();
    return pedidos.filter(
      (p) =>
        (statusAtivo === "todos" || p.status === statusAtivo) &&
        ((p.tipo_profissional ?? "").toLowerCase().includes(f) ||
          (p.local ?? "").toLowerCase().includes(f) ||
          (p.id ?? "").toString().includes(f))
    );
  }, [pedidos, filtro, statusAtivo]);

  const contagem = useMemo(
    () => ({
      em_avaliacao: pedidos.filter((p) => p.status === "em_avaliacao").length,
      pendente: pedidos.filter((p) => p.status === "pendente").length,
      aprovado: pedidos.filter((p) => p.status === "aprovado").length,
    }),
    [pedidos]
  );

  async function atualizarStatus(id: string, novoStatus: Pedido["status"]) {
    const { error } = await supabase
      .from("pedidos_empresa_v2")
      .update({ status: novoStatus })
      .eq("id", id);
    if (error) {
      console.error("[EmAvaliacao] atualizarStatus:", error);
      return;
    }
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p)));
  }

  function formatarData(data?: string | null) {
    if (!data) return "—";
    const d = new Date(data);
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div className="px-4 py-5 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-500 w-5 h-5 md:w-6 md:h-6" />
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {t("empresaPedidos.titulo")}
          </h1>
        </div>

        {statusAtivo !== "todos" && (
          <button
            onClick={() => setStatusAtivo("todos")}
            className="self-start md:self-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-lg shadow transition"
          >
            <Layers className="w-4 h-4" /> {t("empresaPedidos.mostrarTodos")}
          </button>
        )}
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base mb-4 md:mb-8">
        {t("empresaPedidos.descricao")}
      </p>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-5 mb-4 md:mb-8">
        {[
          { key: "em_avaliacao", cor: "text-yellow-500" },
          { key: "pendente", cor: "text-orange-500" },
          { key: "aprovado", cor: "text-green-500" },
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
              {statusConfig[s.key as keyof typeof statusConfig].label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="flex items-center mb-4 md:mb-6 border rounded-lg md:rounded-xl px-3 md:px-4 py-2 w-full md:w-1/3 bg-white dark:bg-[#1e2a3a] shadow-sm">
        <Search className="w-4 h-4 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder={t("empresaPedidos.buscarPlaceholder")}
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full outline-none text-sm md:text-base text-gray-700 dark:text-gray-100 bg-transparent"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12 md:py-16">
          <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
        </div>
      ) : !empresaId ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8 md:py-10 bg-white dark:bg-[#1e2a3a] border border-gray-100 dark:border-zinc-700 rounded-xl shadow-sm">
          {t("empresaPedidos.semEmpresaVinculada")}
        </div>
      ) : filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:gap-5">
          {filtrados.map((p, i) => {
            const s = statusConfig[p.status as keyof typeof statusConfig] || statusConfig.em_avaliacao;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`relative bg-white dark:bg-[#1b2332] border-l-4 ${s.cor} rounded-xl shadow-md hover:shadow-lg transition-all p-4 md:p-6`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                      <span className="text-gray-800 dark:text-gray-100">#{p.id}</span>
                      <span
                        className={`flex items-center gap-1 text-[10px] md:text-xs font-medium ml-1 ${s.bg} rounded-full px-2 py-0.5`}
                      >
                        {s.icone}
                        {s.label}
                      </span>
                    </p>
                    <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mt-1 truncate">
                      {p.tipo_profissional}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                      {p.quantidade ?? 0}{" "}
                      {(p.quantidade ?? 0) > 1
                        ? t("empresaPedidos.profissionais")
                        : t("empresaPedidos.profissional")}{" "}
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
                      <Eye className="w-4 h-4" /> {t("empresaPedidos.verDetalhes")}
                    </button>

                    {p.status === "aprovado" && (
                      <button
                        onClick={() => {
                          navigate("/empresa/obras/adicionar", {
                            state: {
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
                        <Layers className="w-4 h-4" /> {t("empresaPedidos.criarObra")}
                      </button>
                    )}

                    {p.status !== "aprovado" && p.status !== "cancelado" && (
                      <button
                        onClick={() => atualizarStatus(p.id, "cancelado")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs md:text-sm px-3 py-1.5 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/40 transition"
                      >
                        <X className="w-4 h-4" /> {t("empresaPedidos.cancelar")}
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
          {t("empresaPedidos.nenhumPedido")}
        </div>
      )}

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
                <div
                  className={`text-[11px] md:text-xs font-semibold px-3 py-1 rounded-full border ${
                    statusConfig[pedidoSelecionado.status || "em_avaliacao"].bg
                  }`}
                >
                  {statusConfig[pedidoSelecionado.status || "em_avaliacao"].label}
                </div>
              </div>

              <div className="space-y-1.5 md:space-y-2 text-gray-700 dark:text-gray-200 text-sm">
                <p>
                  <strong>📍 {t("empresaPedidos.local")}:</strong> {pedidoSelecionado.local}
                </p>
                <p>
                  <strong>💼 {t("empresaPedidos.experiencia")}:</strong>{" "}
                  {pedidoSelecionado.experiencia}
                </p>
                <p>
                  <strong>👥 {t("empresaPedidos.quantidade")}:</strong>{" "}
                  {pedidoSelecionado.quantidade}
                </p>
                <p>
                  <strong>📆 {t("empresaPedidos.periodo")}:</strong>{" "}
                  {formatarData(pedidoSelecionado.data_inicio)} →{" "}
                  {formatarData(pedidoSelecionado.data_fim)}
                </p>
                <p>
                  <strong>💶 {t("empresaPedidos.custoTotal")}:</strong>{" "}
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
                  {t("empresaPedidos.fechar")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
