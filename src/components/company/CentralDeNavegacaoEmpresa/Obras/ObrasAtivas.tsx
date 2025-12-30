// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObrasAtivas.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Users,
  Search,
  Filter,
  BarChart3,
  UserCheck,
  FolderKanban,
  Eye,
  Loader2,
  Calendar,
  Trash2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =======================
   Tipos
======================= */

type Obra = {
  id: string;
  nome: string | null;
  endereco?: string | null;
  cidade?: string | null;
  local?: string | null; // compat
  empresa_id: string;
  data_inicio: string | null;
  data_fim: string | null;
  status?: string | null; // caso exista na tabela
};

type ObraDetalhada = Obra & {
  localDisplay: string;
  profissionais: number;
  statusCalculado: "A iniciar" | "Em andamento" | "Concluída" | "Atrasada";
};

/* =======================
   Utils
======================= */

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT");
}

export default function ObrasAtivas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [obras, setObras] = useState<ObraDetalhada[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "Todos" | "A iniciar" | "Em andamento" | "Concluída" | "Atrasada"
  >("Todos");
  const [filtroCidade, setFiltroCidade] = useState<string>("Todas");
  const [loading, setLoading] = useState(true);

  // 🔵 destaque da nova obra
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showBadge, setShowBadge] = useState<boolean>(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 🗑️ modo de exclusão em massa
  const [selecionando, setSelecionando] = useState(false);
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletando, setDeletando] = useState(false);

  // Detecta se veio com ?novaObra=... (ou reaproveita sessionStorage)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromParam = params.get("novaObra");
    const stored = sessionStorage.getItem("novaObraHighlight");
    const id = fromParam || stored;

    if (fromParam) {
      // limpa o param na URL para não reaplicar depois
      params.delete("novaObra");
      navigate(
        { search: params.toString() ? `?${params.toString()}` : "" },
        { replace: true }
      );
    }

    if (id) {
      setHighlightId(id);
      sessionStorage.setItem("novaObraHighlight", id);
      setShowBadge(true);
    }
  }, [location.search, navigate]);

  // Função util para empresa_id
  async function getEmpresaId(): Promise<string | null> {
    const { data, error } = await supabase.rpc("minha_empresa_id");
    if (error) {
      console.error("[Obras] minha_empresa_id ->", error.message || error);
      return null;
    }
    return (data as string) ?? null;
  }

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetchObras = async () => {
      try {
        setLoading(true);

        const empresaId = await getEmpresaId();
        if (!empresaId) {
          if (!cancelled) setObras([]);
          return;
        }

        // Ordena por data_inicio (desc)
        const { data: obrasData, error: obrasErr } = await supabase
          .from("obras")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("data_inicio", { ascending: false });

        if (obrasErr) {
          console.error("[Obras] erro obras ->", obrasErr.message || obrasErr);
          if (!cancelled) setObras([]);
          return;
        }

        const hoje = new Date();

        const obrasComDetalhes: ObraDetalhada[] = await Promise.all(
          ((obrasData as Obra[] | null) || []).map(async (obra) => {
            // Contagem de profissionais vinculados
            const { count: tot } = await supabase
              .from("profissionais_obras")
              .select("*", { count: "exact", head: true })
              .eq("obra_id", obra.id);

            const inicio = obra.data_inicio ? new Date(obra.data_inicio) : null;
            const fim = obra.data_fim ? new Date(obra.data_fim) : null;

            // Status calculado com base nas datas + status da obra (se existir)
            let statusCalculado:
              | "A iniciar"
              | "Em andamento"
              | "Concluída"
              | "Atrasada" = "A iniciar";

            if (fim && hoje > fim) {
              // Se já passou da data fim:
              if (obra.status && obra.status.toLowerCase() === "concluida") {
                statusCalculado = "Concluída";
              } else {
                statusCalculado = "Atrasada";
              }
            } else if (inicio && hoje >= inicio) {
              statusCalculado = "Em andamento";
            } else {
              statusCalculado = "A iniciar";
            }

            // local para exibir (compat: cidade/endereco/local)
            const localDisplay =
              (obra.cidade && obra.cidade.trim()) ||
              (obra.endereco && obra.endereco.trim()) ||
              (obra.local && obra.local.trim()) ||
              "";

            return {
              ...obra,
              localDisplay,
              profissionais: tot || 0,
              statusCalculado,
            };
          })
        );

        // Se há highlight, garantir que ele vem primeiro na listagem
        if (highlightId) {
          obrasComDetalhes.sort((a, b) => {
            if (a.id === highlightId) return -1;
            if (b.id === highlightId) return 1;
            return (
              new Date(b.data_inicio || 0).getTime() -
              new Date(a.data_inicio || 0).getTime()
            );
          });
          obrasComDetalhes.reverse();
        }

        if (!cancelled) setObras(obrasComDetalhes);
      } catch (e: any) {
        console.error("[Obras] Erro ao carregar obras:", e?.message || e);
        if (!cancelled) setObras([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchObras();

    // Realtime para obras
    const chObras = supabase
      .channel("obras_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "obras" },
        () => {
          fetchObras();
        }
      )
      .subscribe();

    // 🔴 NOVO: realtime também em profissionais_obras
    const chProfissionaisObras = supabase
      .channel("profissionais_obras_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profissionais_obras" },
        () => {
          // sempre que alguém entra/sai da obra, recarrega contagens
          fetchObras();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(chObras);
      supabase.removeChannel(chProfissionaisObras);
    };
  }, [user?.id, highlightId]);

  // 🔵 scroll até o card destacado + expiração do destaque
  useEffect(() => {
    if (!highlightId) return;

    const el = cardRefs.current[highlightId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });

    setShowBadge(true);
    const t = setTimeout(() => {
      setShowBadge(false);
      setHighlightId(null);
      sessionStorage.removeItem("novaObraHighlight");
    }, 12000);

    return () => clearTimeout(t);
  }, [highlightId]);

  /* =======================
     Filtros / métricas
  ======================= */

  const cidades = useMemo(() => {
    return [
      "Todas",
      ...new Set(
        obras.map((o) =>
          (o.localDisplay ? String(o.localDisplay) : "")
            .split(",")[0]
            .trim()
        )
      ),
    ];
  }, [obras]);

  const obrasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return obras.filter((obra) => {
      const matchNome = (obra.nome || "").toLowerCase().includes(q);
      const matchStatus =
        filtroStatus === "Todos" || obra.statusCalculado === filtroStatus;
      const cidade = obra.localDisplay
        ? obra.localDisplay.split(",")[0].trim()
        : "";
      const matchCidade = filtroCidade === "Todas" || cidade === filtroCidade;
      return matchNome && matchStatus && matchCidade;
    });
  }, [obras, busca, filtroStatus, filtroCidade]);

  const totalObras = obrasFiltradas.length;
  const totalProfissionais = obrasFiltradas.reduce(
    (acc, o) => acc + (o.profissionais || 0),
    0
  );
  const obrasEmAndamento = obrasFiltradas.filter(
    (o) =>
      o.statusCalculado === "Em andamento" || o.statusCalculado === "Atrasada"
  ).length;

  const statusCores: Record<string, string> = {
    "A iniciar":
      "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    "Em andamento":
      "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    "Concluída":
      "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    Atrasada:
      "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  };

  // ✅ Agora passando a origem da navegação
  const onOpenObra = (id: string) => {
    // Ao abrir, removemos o destaque
    setShowBadge(false);
    setHighlightId(null);
    sessionStorage.removeItem("novaObraHighlight");

    // Envia a página atual (com filtros e busca) como origem
    navigate(`/empresa/obras/ativas/${id}`, {
      state: { from: location.pathname + location.search },
    });
  };

  /* =======================
     Exclusão em massa
  ======================= */

  const toggleSelecionando = () => {
    if (selecionando) {
      // cancelar modo seleção
      setSelecionando(false);
      setObrasSelecionadas([]);
    } else {
      setSelecionando(true);
    }
  };

  const toggleObraSelecionada = (id: string) => {
    if (!selecionando) return;
    setObrasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExcluirClick = () => {
    if (!selecionando) {
      // primeiro clique: entra no modo seleção
      setSelecionando(true);
      return;
    }

    if (obrasSelecionadas.length === 0) {
      window.alert("Selecione pelo menos uma obra para excluir.");
      return;
    }

    setShowConfirmDelete(true);
  };

  const confirmarExclusao = async () => {
    if (obrasSelecionadas.length === 0) return;

    try {
      setDeletando(true);
      const { error } = await supabase
        .from("obras")
        .delete()
        .in("id", obrasSelecionadas);

      if (error) {
        console.error("[Obras] erro ao excluir ->", error.message || error);
        window.alert("Erro ao excluir as obras. Tente novamente.");
        return;
      }

      // Atualiza lista local
      setObras((prev) =>
        prev.filter((obra) => !obrasSelecionadas.includes(obra.id))
      );
      setObrasSelecionadas([]);
      setSelecionando(false);
      setShowConfirmDelete(false);
    } catch (e: any) {
      console.error("[Obras] erro inesperado ao excluir ->", e?.message || e);
      window.alert("Erro inesperado ao excluir as obras.");
    } finally {
      setDeletando(false);
    }
  };

  const cancelarConfirmacao = () => {
    setShowConfirmDelete(false);
  };

  return (
    <div className="md:p-8 p-4 relative">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Obras
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Visualize e filtre todas as suas obras: a iniciar, em andamento,
              concluídas e atrasadas.
            </p>
          </div>
        </div>

        {/* Ações topo: exclusão em massa */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {selecionando && (
            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
              {obrasSelecionadas.length > 0
                ? `${obrasSelecionadas.length} obra(s) selecionada(s)`
                : "Selecione as obras que deseja excluir"}
            </span>
          )}

          {selecionando && (
            <button
              type="button"
              onClick={toggleSelecionando}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] md:text-xs
              border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-3 h-3" />
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={handleExcluirClick}
            disabled={deletando}
            className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[11px] md:text-xs font-medium transition
              ${
                selecionando
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
              } ${
              deletando
                ? "opacity-70 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            {selecionando
              ? deletando
                ? "Excluindo..."
                : "Excluir selecionadas"
              : "Excluir obras"}
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          {
            icon: (
              <FolderKanban className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
            ),
            label: "Total de obras",
            valor: totalObras,
            subtitulo: "Em qualquer estado",
          },
          {
            icon: (
              <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
            ),
            label: "Profissionais",
            valor: totalProfissionais,
            subtitulo: "Somando todas as obras",
          },
          {
            icon: (
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
            ),
            label: "Obras em andamento",
            valor: obrasEmAndamento,
            subtitulo: "Inclui atrasadas ainda ativas",
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`bg-white dark:bg-[#1e2a3a] border border-gray-100 dark:border-zinc-700 rounded-xl md:rounded-2xl shadow-sm p-3 md:p-5 flex items-center gap-2 md:gap-3 ${
              i === 2 ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            {card.icon}
            <div className="min-w-0">
              <p className="text-[11px] md:text-sm text-gray-500 dark:text-gray-400">
                {card.label}
              </p>
              <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100">
                {card.valor}
              </h2>
              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 truncate">
                {card.subtitulo}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-[#1e2a3a] border border-gray-100 dark:border-zinc-700 rounded-xl md:rounded-2xl shadow-md p-3 md:4 md:mb-8 mb-6">
        {/* Busca */}
        <div className="relative w-full mb-3 md:mb-4">
          <Search className="absolute left-3 top-2.5 md:top-3.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar obra..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 md:py-2.5 rounded-lg border border-gray-200 dark:border-zinc-700 
                       bg-white dark:bg-[#1b2332] text-xs md:text-sm text-gray-700 dark:text-gray-100 
                       focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {/* Status + cidade */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
              Status:
            </span>
          </div>

          {/* botões de status */}
          <div className="flex flex-wrap gap-2">
            {["Todos", "A iniciar", "Em andamento", "Concluída", "Atrasada"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s as any)}
                  className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs border transition
                  ${
                    filtroStatus === s
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      : "bg-gray-50 dark:bg-[#16202e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-700"
                  }`}
                >
                  {s}
                </button>
              )
            )}
          </div>

          {/* cidade */}
          <div className="md:ml-auto w-full md:w-64">
            <select
              className="w-full border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 md:py-2 text-xs md:text-sm
                         bg-white dark:bg-[#1b2332] text-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
            >
              {cidades.map((cidade, i) => (
                <option key={i}>{cidade}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      <AnimatePresence>
        {loading ? (
          <div className="flex justify-center py-16 md:py-24 text-gray-400 dark:text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 text-blue-500 mr-2" />
            Carregando obras...
          </div>
        ) : obrasFiltradas.length > 0 ? (
          <div className="grid gap-3 md:gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {obrasFiltradas.map((obra) => {
              const isNew = obra.id === highlightId;
              const isSelected = obrasSelecionadas.includes(obra.id);

              const inicioFormatado = formatDate(obra.data_inicio);
              const fimFormatado = formatDate(obra.data_fim);

              return (
                <motion.div
                  key={obra.id}
                  ref={(el) => (cardRefs.current[obra.id] = el)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={[
                    "relative bg-white dark:bg-[#1b2332] border rounded-xl md:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-3 md:p-6",
                    isNew
                      ? "border-blue-400 ring-2 ring-blue-400 shadow-[0_0_18px_rgba(37,99,235,0.35)] dark:shadow-[0_0_18px_#2563EB99] animate-pulse"
                      : "",
                    isSelected
                      ? "border-red-400 ring-2 ring-red-400/70"
                      : "border-gray-100 dark:border-zinc-700",
                  ].join(" ")}
                >
                  {/* badge nova obra */}
                  {isNew && showBadge && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: -18 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-lg text-[11px] md:text-sm"
                    >
                      ✨ Nova obra
                    </motion.div>
                  )}

                  {/* checkbox seleção */}
                  {selecionando && (
                    <button
                      type="button"
                      onClick={() => toggleObraSelecionada(obra.id)}
                      className="absolute top-3 left-3 inline-flex items-center justify-center rounded-md p-1 
                        bg-white/90 dark:bg-[#101827]/90 border border-gray-200 dark:border-zinc-700
                        hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  )}

                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="min-w-0">
                      <h2 className="text-sm md:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {obra.nome}
                      </h2>
                      <p
                        className="text-[11px] md:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-0.5 md:mt-1 truncate"
                        title={obra.localDisplay || ""}
                      >
                        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500 flex-shrink-0" />
                        {obra.localDisplay || "Local não informado"}
                      </p>
                    </div>

                    {!selecionando && (
                      <button
                        onClick={() => onOpenObra(obra.id)}
                        className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs md:text-sm font-medium hover:underline"
                      >
                        <Eye size={14} className="md:size-[15px]" /> Ver
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">
                    <span
                      className={`text-[10px] md:text-xs font-medium px-2.5 md:px-3 py-0.5 md:py-1 rounded-full ${
                        statusCores[obra.statusCalculado] ||
                        "bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {obra.statusCalculado}
                    </span>
                    <div className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                      <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                      {obra.profissionais || 0} profs.
                    </div>
                  </div>

                  {/* Datas da obra */}
                  <div className="mt-2 md:mt-3 border-t border-gray-100 dark:border-zinc-700 pt-2 md:pt-3 flex flex-col gap-1.5 md:gap-2 text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          Início:
                        </span>
                      </div>
                      <span>{inicioFormatado}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                        <span className="font-medium text-gray-600 dark:text-gray-300">
                          Fim previsto:
                        </span>
                      </div>
                      <span>{fimFormatado}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-16 md:py-20 text-sm md:text-base">
            Nenhuma obra encontrada com os filtros aplicados.
          </div>
        )}
      </AnimatePresence>

      {/* Modal de confirmação de exclusão */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white dark:bg-[#1b2332] rounded-2xl shadow-2xl p-5 md:p-6 w-[90%] max-w-md border border-gray-100 dark:border-zinc-700"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Tem certeza que deseja excluir?
                </h2>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Você está prestes a excluir{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-100">
                    {obrasSelecionadas.length} obra(s)
                  </span>
                  . Esta ação{" "}
                  <span className="font-semibold text-red-500">
                    não pode ser desfeita
                  </span>
                  .
                </p>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={cancelarConfirmacao}
                    disabled={deletando}
                    className="px-3 md:px-4 py-1.5 rounded-full border border-gray-300 dark:border-zinc-600 
                      text-xs md:text-sm text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarExclusao}
                    disabled={deletando}
                    className="px-3 md:px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-xs md:text-sm font-semibold text-white transition disabled:opacity-70"
                  >
                    {deletando ? "Excluindo..." : "Excluir definitivamente"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
