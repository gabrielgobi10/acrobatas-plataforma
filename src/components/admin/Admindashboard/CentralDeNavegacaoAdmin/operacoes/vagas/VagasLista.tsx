import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Filter,
  Building2,
  Briefcase,
  Eye,
  Edit3,
  Pause,
  Play,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

export default function VagasLista({ onSelectSection }: any) {
  const [vagas, setVagas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroNivel, setFiltroNivel] = useState("todos");

  // ==========================
  // 🔥 Carregar vagas do Supabase
  // ==========================
  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("vagas")
        .select("*, empresas(nome)");

      if (!error) setVagas(data || []);
      setLoading(false);
    }
    load();
  }, []);

  // ==========================
  // 🔍 Filtro em tempo real
  // ==========================
  const vagasFiltradas = vagas.filter((v) => {
    const texto = `${v.titulo} ${v.localizacao} ${v.empresas?.nome}`.toLowerCase();
    const buscaOk = texto.includes(busca.toLowerCase());

    const categoriaOk =
      filtroCategoria === "todos" || v.categoria === filtroCategoria;

    const nivelOk = filtroNivel === "todos" || v.nivel === filtroNivel;

    return buscaOk && categoriaOk && nivelOk;
  });

  // ==========================
  // 🧱 Componentes vizuais
  // ==========================
  const TituloSecao = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">Vagas Disponíveis</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie todas as vagas ativas e inativas publicadas na plataforma.
        </p>
      </div>
    </div>
  );

  // ==========================
  // 🔥 Renderização
  // ==========================
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6"
    >
      <TituloSecao />

      {/* ==========================
          BARRA DE BUSCA + FILTROS
      =========================== */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar vaga, empresa, localização..."
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Categoria */}
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        >
          <option value="todos">Todas categorias</option>
          <option value="Canalizador">Canalizador</option>
          <option value="Eletricista">Eletricista</option>
          <option value="Servente">Servente</option>
          <option value="Pedreiro">Pedreiro</option>
        </select>

        {/* Nível */}
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
        >
          <option value="todos">Todos os níveis</option>
          <option value="junior">Junior</option>
          <option value="pleno">Pleno</option>
          <option value="senior">Sênior</option>
        </select>
      </div>

      {/* ==========================
          LISTA / TABELA
      =========================== */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">Vaga</th>
              <th className="px-4 py-3 text-left">Empresa</th>
              <th className="px-4 py-3 text-left">Localização</th>
              <th className="px-4 py-3 text-left">Valor / dia</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                  <p className="mt-2 text-sm text-slate-500">Carregando vagas...</p>
                </td>
              </tr>
            ) : vagasFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  Nenhuma vaga encontrada.
                </td>
              </tr>
            ) : (
              vagasFiltradas.map((v) => (
                <tr
                  key={v.id}
                  className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <td className="px-4 py-3 font-medium">{v.titulo}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {v.empresas?.nome || "—"}
                  </td>
                  <td className="px-4 py-3">{v.localizacao}</td>
                  <td className="px-4 py-3">€ {v.valor_dia || "—"}</td>

                  <td className="px-4 py-3">
                    {v.ativa ? (
                      <span className="text-green-500">Ativa</span>
                    ) : (
                      <span className="text-red-500">Pausada</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {/* DETALHES */}
                      <button
                        onClick={() =>
                          onSelectSection("operacoes-vaga-detalhe", v)
                        }
                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* EDITAR */}
                      <button
                        onClick={() =>
                          onSelectSection("operacoes-vaga-editar", v)
                        }
                        className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* ATIVAR/PAUSAR */}
                      <button
                        onClick={() => {}}
                        className={`p-2 rounded-lg transition ${
                          v.ativa
                            ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
                            : "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
                        }`}
                      >
                        {v.ativa ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
