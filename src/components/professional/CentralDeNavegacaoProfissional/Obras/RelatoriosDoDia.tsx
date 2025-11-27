"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CalendarDays,
  Clock4,
  Building2,
  Loader2,
  Search,
  Wrench,
  Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type Relatorio = {
  id: string;
  data_relatorio: string;
  descricao?: string | null;
  horas_trabalhadas_total?: number | null;
  progresso_total?: number | null;
  obras?: {
    nome?: string | null;
    endereco?: string | null;
  } | null;
};

export default function RelatoriosDoDia() {
  const { user } = useAuth();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroObra, setFiltroObra] = useState("todas");
  const [obras, setObras] = useState<{ id: string; nome: string | null }[]>([]);
  const [busca, setBusca] = useState("");

  // 🔹 Carrega relatórios com as colunas corretas
  useEffect(() => {
    async function carregar() {
      if (!user?.id) return;
      setLoading(true);

      try {
        // Buscar o usuario_id pelo auth_id
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("id")
          .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();

        if (!usuario) {
          console.warn("Nenhum usuario encontrado para auth_id:", user.id);
          setRelatorios([]);
          setLoading(false);
          return;
        }

        // Buscar o profissional_id
        const { data: prof } = await supabase
          .from("profissionais")
          .select("id")
          .eq("usuario_id", usuario.id)
          .maybeSingle();

        let query = supabase
          .from("relatorios_obras")
          .select(
            `id, data_relatorio, descricao, horas_trabalhadas_total, progresso_total,
             obras:obra_id ( nome, endereco )`
          )
          .order("data_relatorio", { ascending: false });

        if (prof?.id) query = query.eq("profissional_id", prof.id);

        if (filtroMes !== "todos") {
          const [ano, mes] = filtroMes.split("-");
          const inicio = `${ano}-${mes}-01`;
          const fim = new Date(parseInt(ano), parseInt(mes), 0)
            .toISOString()
            .slice(0, 10);
          query = query.gte("data_relatorio", inicio).lte("data_relatorio", fim);
        }

        if (filtroObra !== "todas") query = query.eq("obra_id", filtroObra);

        const { data, error } = await query;
        if (error) throw error;

        setRelatorios(data || []);
      } catch (e) {
        console.error("Erro ao carregar relatórios:", e);
        setRelatorios([]);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [user?.id, filtroMes, filtroObra]);

  // 🔹 Carrega lista de obras
  useEffect(() => {
    async function carregarObras() {
      if (!user?.id) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id")
        .or(`auth_id.eq.${user.id},id.eq.${user.id}`)
        .maybeSingle();

      const { data: prof } = await supabase
        .from("profissionais")
        .select("id")
        .eq("usuario_id", usuario?.id)
        .maybeSingle();

      const { data } = await supabase
        .from("profissionais_obras")
        .select("obras ( id, nome )")
        .eq("profissional_id", prof?.id || "");

      if (data) {
        setObras(
          data
            .map((d: any) => ({
              id: d.obras?.id,
              nome: d.obras?.nome,
            }))
            .filter((o: any) => o.id)
        );
      }
    }
    carregarObras();
  }, [user?.id]);

  // 🔹 Filtro texto
  const relatoriosFiltrados = relatorios.filter((r) =>
    busca.length === 0
      ? true
      : r.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
        r.obras?.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  // 🔹 Estatísticas
  const totalHoras = relatorios.reduce(
    (acc, r) => acc + (r.horas_trabalhadas_total || 0),
    0
  );

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <FileText className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Relatórios do Dia</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Aqui você pode consultar todos os relatórios enviados nas suas obras.
      </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Relatórios totais", valor: relatorios.length, cor: "text-blue-500" },
          { label: "Horas registradas", valor: `${totalHoras.toFixed(1)}h`, cor: "text-green-500" },
          {
            label: "Obras envolvidas",
            valor: new Set(relatorios.map((r) => r.obras?.nome)).size,
            cor: "text-yellow-500",
          },
          {
            label: "Mês selecionado",
            valor:
              filtroMes === "todos"
                ? "Todos"
                : new Date(filtroMes).toLocaleDateString("pt-PT", {
                    month: "long",
                    year: "numeric",
                  }),
            cor: "text-purple-500",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm"
          >
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {item.label}
            </p>
            <p className={`text-base sm:text-xl font-semibold ${item.cor} truncate`}>
              {item.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por obra ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 pl-9 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
          />
        </div>

        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todos">Todos os meses</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const ano = new Date().getFullYear();
            const mes = (i + 1).toString().padStart(2, "0");
            const label = new Date(`${ano}-${mes}-01`).toLocaleDateString("pt-PT", { month: "long" });
            return (
              <option key={mes} value={`${ano}-${mes}`}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            );
          })}
        </select>

        <select
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todas">Todas as obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : relatoriosFiltrados.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-16 text-sm sm:text-base">
          Nenhum relatório encontrado.
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence>
            {relatoriosFiltrados.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="text-blue-500 w-4 h-4" />
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {new Date(r.data_relatorio).toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                  <span className="text-[10px] sm:text-xs bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-md flex items-center gap-1">
                    <Wrench size={12} /> {r.progresso_total ? `${r.progresso_total}%` : "Relatório"}
                  </span>
                </div>

                <p className="text-gray-900 dark:text-gray-100 font-medium text-sm sm:text-base mb-1">
                  {r.obras?.nome || "Obra não identificada"}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                  {r.descricao || "Sem descrição"}
                </p>

                <div className="flex items-center justify-between text-[11px] sm:text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock4 size={12} />{" "}
                    {r.horas_trabalhadas_total ? `${r.horas_trabalhadas_total.toFixed(1)}h` : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 size={12} /> {r.obras?.endereco || "Sem endereço"}
                  </span>
                </div>

                <div className="flex justify-end mt-3 sm:mt-4">
                  <button className="flex items-center gap-1 text-blue-500 hover:text-blue-400 text-xs sm:text-sm">
                    <Eye size={13} /> Ver detalhes
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
