import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Package,
  Users,
} from "lucide-react";

/* ======================================
   🔹 Helper: cor do status
====================================== */
const statusChip = (s?: string) => {
  const map: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-600",
    em_avaliacao: "bg-blue-100 text-blue-600",
    aprovado: "bg-green-100 text-green-600",
    concluido: "bg-purple-100 text-purple-600",
    reprovado: "bg-red-100 text-red-600",
  };
  return map[s ?? ""] ?? "bg-gray-100 text-gray-600";
};

/* ======================================
   🔹 Atualizar status no Supabase
====================================== */
async function updatePedidoStatus(
  id: string,
  novoStatus:
    | "pendente"
    | "em_avaliacao"
    | "aprovado"
    | "concluido"
    | "reprovado",
  setPedidos: React.Dispatch<React.SetStateAction<any[]>>
) {
  try {
    // Atualiza visualmente antes de salvar (otimista)
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p))
    );

    const { error } = await supabase
      .from("pedidos_empresa_v2")
      .update({ status: novoStatus })
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    alert("Erro ao atualizar status no Supabase.");
  }
}

/* ======================================
   🔹 Componente principal
====================================== */
export default function PedidosSection() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [busca, setBusca] = useState("");

  // Buscar pedidos reais
  useEffect(() => {
    async function fetchPedidos() {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos_empresa_v2")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao buscar pedidos:", error);
        setPedidos([]);
      } else {
        setPedidos(data || []);
      }
      setLoading(false);
    }
    fetchPedidos();
  }, []);

  // Filtro de busca
  const pedidosFiltrados = useMemo(() => {
    const q = busca.toLowerCase();
    return pedidos.filter(
      (p) =>
        p.nome_empresa?.toLowerCase().includes(q) ||
        p.local?.toLowerCase().includes(q) ||
        p.tipo_profissional?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q)
    );
  }, [busca, pedidos]);

  // Contadores por status
  const countByStatus = (status: string) =>
    pedidos.filter((p) => p.status === status).length;

  const statusCards = [
    {
      title: "Pendentes",
      value: countByStatus("pendente"),
      color: "from-orange-500 to-yellow-500",
      icon: <Clock className="w-6 h-6 text-yellow-200" />,
    },
    {
      title: "Em Análise",
      value: countByStatus("em_avaliacao"),
      color: "from-blue-500 to-cyan-500",
      icon: <ClipboardList className="w-6 h-6 text-blue-200" />,
    },
    {
      title: "Aprovados",
      value: countByStatus("aprovado"),
      color: "from-green-500 to-emerald-500",
      icon: <CheckCircle2 className="w-6 h-6 text-green-200" />,
    },
    {
      title: "Concluídos",
      value: countByStatus("concluido"),
      color: "from-purple-500 to-indigo-500",
      icon: <Package className="w-6 h-6 text-purple-200" />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-b from-[#f7f9fc] to-[#f0f4fa] p-8 rounded-3xl"
    >
      {/* Cabeçalho */}
      <div className="rounded-2xl p-6 bg-white border border-gray-100 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <ClipboardList className="w-6 h-6" /> Gestão de Pedidos
        </h2>
        <p className="text-gray-500 mt-1">
          Acompanhe pedidos, progresso de obras e previsões da IA administrativa.
        </p>
      </div>

      {/* Cards principais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statusCards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className={`p-5 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg cursor-pointer`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">{card.title}</p>
                <h2 className="text-3xl font-bold mt-1">{card.value}</h2>
              </div>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Filtros e busca */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Pesquisar por cliente, obra ou status..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 w-full"
            />
          </div>

          <button
            onClick={() => setFiltroAberto(!filtroAberto)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            <Filter className="w-4 h-4" /> Filtros Avançados
          </button>
        </div>
      </div>

      {/* Tabela principal */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-700 text-lg mb-4">Pedidos Recentes</h3>
        {loading ? (
          <p className="text-gray-500 text-sm">Carregando pedidos...</p>
        ) : pedidosFiltrados.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum pedido encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="p-3 text-sm font-semibold">ID</th>
                  <th className="p-3 text-sm font-semibold">Cliente</th>
                  <th className="p-3 text-sm font-semibold">Profissional</th>
                  <th className="p-3 text-sm font-semibold">Data Início</th>
                  <th className="p-3 text-sm font-semibold">Data Fim</th>
                  <th className="p-3 text-sm font-semibold">Valor (€)</th>
                  <th className="p-3 text-sm font-semibold">Status</th>
                  <th className="p-3 text-sm font-semibold text-center">Ações</th>
                </tr>
              </thead>

              <tbody>
                {pedidosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="p-3 text-sm font-medium text-gray-800">
                      #{p.id.slice(0, 8)}
                    </td>
                    <td className="p-3 text-sm text-gray-700">{p.nome_empresa}</td>
                    <td className="p-3 text-sm text-gray-700 flex items-center gap-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      {p.tipo_profissional} ({p.experiencia})
                    </td>
                    <td className="p-3 text-sm text-gray-600">{p.data_inicio}</td>
                    <td className="p-3 text-sm text-gray-600">{p.data_fim}</td>
                    <td className="p-3 text-sm font-semibold text-gray-800">
                      €{Number(p.custo_total ?? 0).toLocaleString("pt-PT", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusChip(
                          p.status
                        )}`}
                      >
                        {p.status || "—"}
                      </span>
                    </td>

                    {/* Botões de ação */}
                    <td className="p-3 text-sm text-center">
                      <div className="flex gap-2 justify-center">
                        {(p.status === "pendente" ||
                          p.status === "em_avaliacao") && (
                          <button
                            onClick={() =>
                              updatePedidoStatus(p.id, "aprovado", setPedidos)
                            }
                            className="px-3 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            Aprovar
                          </button>
                        )}

                        {p.status === "aprovado" && (
                          <button
                            onClick={() =>
                              updatePedidoStatus(p.id, "concluido", setPedidos)
                            }
                            className="px-3 py-1 text-xs rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                          >
                            Concluir
                          </button>
                        )}

                        {p.status !== "reprovado" && (
                          <button
                            onClick={() =>
                              updatePedidoStatus(p.id, "reprovado", setPedidos)
                            }
                            className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                          >
                            Reprovar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-gray-400 text-xs mt-6 text-center">
        Dados sincronizados com Supabase — atualizados em tempo real.
      </p>
    </motion.div>
  );
}
