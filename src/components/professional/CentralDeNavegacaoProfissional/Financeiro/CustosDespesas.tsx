import { useEffect, useState } from "react";
import {
  WalletMinimal,
  Loader2,
  Euro,
  Calendar,
  FileText,
  Trash2,
  PieChart,
  Car,
  Utensils,
  Wrench,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Despesa = {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  comprovativo_url?: string | null;
  obra?: { nome?: string | null } | null;
};

export default function CustosEDespesas() {
  const { user } = useAuth();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

  // 🔹 Cores por categoria
  const cores = {
    transporte: "#3B82F6",
    alimentacao: "#22C55E",
    ferramentas: "#EAB308",
    outros: "#A855F7",
  };

  // 🔹 Carregar dados
  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);

      let query = supabase
        .from("despesas_profissionais")
        .select(
          `id, categoria, descricao, valor, data, comprovativo_url, obras (nome)`
        )
        .eq("profissional_id", user.id)
        .order("data", { ascending: false });

      if (filtroCategoria !== "todas") query = query.eq("categoria", filtroCategoria);

      if (filtroMes !== "todos") {
        const [ano, mes] = filtroMes.split("-");
        const inicio = `${ano}-${mes}-01`;
        const fim = new Date(parseInt(ano), parseInt(mes), 0)
          .toISOString()
          .slice(0, 10);
        query = query.gte("data", inicio).lte("data", fim);
      }

      const { data, error } = await query;
      if (!error && data) setDespesas(data as Despesa[]);
      setLoading(false);
    }
    carregar();
  }, [user, filtroMes, filtroCategoria]);

  // 🔹 Estatísticas
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const categorias = ["transporte", "alimentacao", "ferramentas", "outros"] as const;
  const somaPorCategoria = categorias.map((cat) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: despesas
      .filter((d) => d.categoria === cat)
      .reduce((acc, d) => acc + d.valor, 0),
    color: (cores as any)[cat],
  }));

  // ========================================================================
  // 🔹 UI Responsiva + Light/Dark Mode
  // ========================================================================
  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <WalletMinimal className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Custos e Despesas</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Veja seus gastos relacionados ao trabalho, organizados por categoria e obra.
      </p>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4 mb-8">
        {/* Total de despesas – full width no mobile */}
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total de Despesas
          </p>
          <p className="text-base sm:text-xl font-semibold text-red-500">
            € {totalDespesas.toFixed(2)}
          </p>
        </div>

        {somaPorCategoria.map((c) => (
          <div
            key={c.name}
            className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center capitalize shadow-sm"
          >
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {c.name}
            </p>
            <p
              className="text-base sm:text-lg font-semibold"
              style={{ color: c.color }}
            >
              € {c.value.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {totalDespesas > 0 && (
        <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-10 shadow-sm">
          <h2 className="text-gray-800 dark:text-gray-300 font-medium mb-4 flex items-center gap-2 text-sm sm:text-base">
            <PieChart size={18} /> Distribuição de Custos
          </h2>
          <div className="h-52 sm:h-64">
            <ResponsiveContainer>
              <RePieChart>
                <Pie
                  data={somaPorCategoria.filter((c) => c.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                >
                  {somaPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todas">Todas as categorias</option>
          <option value="transporte">Transporte</option>
          <option value="alimentacao">Alimentação</option>
          <option value="ferramentas">Ferramentas</option>
          <option value="outros">Outros</option>
        </select>

        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todos">Todos os meses</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const ano = new Date().getFullYear();
            const mes = (i + 1).toString().padStart(2, "0");
            const label = new Date(`${ano}-${mes}-01`).toLocaleDateString(
              "pt-PT",
              {
                month: "long",
              }
            );
            return (
              <option key={mes} value={`${ano}-${mes}`}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            );
          })}
        </select>
      </div>

      {/* Lista de despesas */}
      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : despesas.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-16 text-sm sm:text-base">
          Nenhuma despesa registrada ainda.
        </p>
      ) : (
        <motion.div layout className="space-y-3 sm:space-y-4">
          <AnimatePresence>
            {despesas.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-3 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 sm:gap-0">
                  <div>
                    <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize flex items-center gap-2">
                      {d.categoria === "transporte" && <Car size={15} />}
                      {d.categoria === "alimentacao" && <Utensils size={15} />}
                      {d.categoria === "ferramentas" && <Wrench size={15} />}
                      {d.categoria === "outros" && <MoreHorizontal size={15} />}
                      {d.categoria}
                    </p>
                    <p className="text-gray-800 dark:text-gray-300 font-medium text-xs sm:text-sm">
                      € {d.valor.toFixed(2)}
                    </p>
                    <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />{" "}
                      {new Date(d.data).toLocaleDateString("pt-PT")}
                    </p>
                    {d.obra?.nome && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        🏗️ {d.obra.nome}
                      </p>
                    )}
                    {d.descricao && (
                      <p className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                        💬 {d.descricao}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {d.comprovativo_url ? (
                      <a
                        href={d.comprovativo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-[11px] sm:text-sm transition"
                      >
                        <FileText size={13} /> Ver comprovativo
                      </a>
                    ) : (
                      <button
                        disabled
                        className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-lg text-[11px] sm:text-sm cursor-not-allowed"
                      >
                        Sem comprovativo
                      </button>
                    )}
                    <button className="text-red-500 hover:text-red-400 text-[11px] sm:text-sm flex items-center gap-1">
                      <Trash2 size={13} /> Apagar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
