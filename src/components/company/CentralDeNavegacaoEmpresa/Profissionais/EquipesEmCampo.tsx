import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Search,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";

export default function EquipesEmCampo() {
  const [modo, setModo] = useState<"obras" | "profissionais">("obras");
  const [obras, setObras] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<any | null>(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroPresenca, setFiltroPresenca] = useState("Todas");

  // ==========================================================
  // 🔹 Buscar Obras com contador de profissionais
  // ==========================================================
  useEffect(() => {
    async function fetchObras() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("obras")
          .select(`
            id,
            nome,
            local,
            data_inicio,
            profissionais_obras:profissionais_obras (
              id,
              funcao,
              status,
              profissional:profissional_id (
                id,
                nome,
                area,
                status
              )
            )
          `)
          .order("data_inicio", { ascending: false });

        if (error) throw error;

        const obrasComContagem = (data || []).map((obra) => ({
          ...obra,
          total_profissionais: Array.isArray(obra.profissionais_obras)
            ? obra.profissionais_obras.length
            : 0,
        }));

        setObras(obrasComContagem);
      } catch (err) {
        console.error("Erro ao carregar obras:", err);
        setObras([]);
      } finally {
        setLoading(false);
      }
    }

    fetchObras();
  }, []);

  // ==========================================================
  // 🔹 Buscar todos os profissionais (modo lista)
  // ==========================================================
  async function fetchProfissionais() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(`
          id,
          funcao,
          status,
          data_inicio,
          obra:obra_id (id, nome),
          profissional:profissional_id (
            id,
            nome,
            area,
            status
          )
        `);

      if (error) throw error;
      setProfissionais(data || []);
    } catch (err) {
      console.error("Erro ao carregar profissionais:", err);
      setProfissionais([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (modo === "profissionais") {
      setObraSelecionada(null);
      setProfissionalSelecionado(null);
      fetchProfissionais();
    }
  }, [modo]);

  // ==========================================================
  // 🔹 Buscar profissionais da obra selecionada
  // ==========================================================
  async function fetchProfissionaisObra(obraId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(`
          id,
          funcao,
          status,
          data_inicio,
          profissional:profissional_id (
            id,
            nome,
            area,
            status
          )
        `)
        .eq("obra_id", obraId);

      if (error) throw error;
      setProfissionais(data || []);
    } catch (err) {
      console.error("Erro ao carregar profissionais da obra:", err);
      setProfissionais([]);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // 🔹 Buscar perfil individual
  // ==========================================================
  async function fetchProfissional(id: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profissionais")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProfissionalSelecionado(data);
    } catch (err) {
      console.error("Erro ao carregar profissional:", err);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // 🔹 Filtros aplicados em memória
  // ==========================================================
  const profissionaisFiltrados = useMemo(() => {
    return profissionais.filter((item) => {
      const p = item.profissional || item.profissionais || {};
      const nomeMatch = p.nome?.toLowerCase().includes(busca.toLowerCase());
      const funcaoMatch = filtroFuncao === "Todas" || item.funcao === filtroFuncao;
      const statusMatch = filtroStatus === "Todos" || p.status === filtroStatus;
      const presencaMatch = filtroPresenca === "Todas" || p.presenca === filtroPresenca;
      return nomeMatch && funcaoMatch && statusMatch && presencaMatch;
    });
  }, [profissionais, busca, filtroFuncao, filtroStatus, filtroPresenca]);

  // ==========================================================
  // 🔹 Tela de perfil individual
  // ==========================================================
  if (profissionalSelecionado) {
    const p = profissionalSelecionado;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
        <div className="flex flex-col items-center text-center mb-12">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-semibold text-white shadow-md ${
              p.status === "Ativo"
                ? "bg-green-500 shadow-green-400/40"
                : "bg-gray-400 shadow-gray-300/30"
            }`}
          >
            {p.nome?.[0] || "?"}
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-800 dark:text-gray-100">
            {p.nome}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {p.area || "Função não definida"} •{" "}
            <span
              className={`font-medium ${
                p.status === "Ativo" ? "text-green-600" : "text-gray-500"
              }`}
            >
              {p.status}
            </span>
          </p>
          <button
            onClick={() => setProfissionalSelecionado(null)}
            className="mt-6 text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </motion.div>
    );
  }

  // ==========================================================
  // 🔹 Tela de detalhes da obra
  // ==========================================================
  if (obraSelecionada) {
    const localFormatado =
      obraSelecionada.local?.split(",").slice(0, 2).join(",") || "Local não informado";
    const total = profissionais.length;
    const ativos = profissionais.filter(
      (p) => p.profissional?.status === "Ativo" || p.profissionais?.status === "Ativo"
    ).length;
    const funcoes = [...new Set(profissionais.map((p) => p.funcao).filter(Boolean))];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {obraSelecionada.nome}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-500" /> {localFormatado}
            </p>
          </div>
          <button
            onClick={() => {
              setObraSelecionada(null);
              setProfissionais([]);
            }}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Profissionais Ativos", value: `${ativos}/${total}`, color: "text-green-600" },
            { label: "Funções em Execução", value: funcoes.length, color: "text-blue-600" },
            {
              label: "Data de Início",
              value: obraSelecionada.data_inicio
                ? new Date(obraSelecionada.data_inicio).toLocaleDateString("pt-PT")
                : "—",
              color: "text-gray-700",
            },
            {
              label: "Status Geral",
              value: ativos === total ? "Completa" : "Em andamento",
              color: ativos === total ? "text-green-600" : "text-yellow-600",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-xl p-4 text-center"
            >
              <h3 className="text-sm text-gray-500 dark:text-gray-400">{card.label}</h3>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Lista de profissionais da obra */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                <tr>
                  {["Nome", "Função", "Status", "Presença", "Ações"].map((col) => (
                    <th
                      key={col}
                      className="py-3 px-5 text-sm font-medium text-gray-600 dark:text-gray-300"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profissionais.map((item, i) => {
                  const p = item.profissional || item.profissionais || {};
                  return (
                    <tr
                      key={p.id || i}
                      className={`border-t border-gray-200 dark:border-zinc-700 ${
                        i % 2 === 0
                          ? "bg-white dark:bg-[#1b2332]"
                          : "bg-gray-50 dark:bg-zinc-800"
                      } hover:bg-blue-50 dark:hover:bg-[#243147] transition`}
                    >
                      <td className="py-3 px-6 font-medium text-gray-800 dark:text-gray-100">
                        {p.nome || "—"}
                      </td>
                      <td className="py-3 px-6 text-gray-600 dark:text-gray-300">
                        {item.funcao || "—"}
                      </td>
                      <td className="py-3 px-6">
                        {p.status === "Ativo" ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Ativo
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            {p.status || "Inativo"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {p.presenca === "Presente" ? "✔" : "✖"}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => p.id && fetchProfissional(p.id)}
                          disabled={!p.id}
                          className={`font-medium text-sm flex items-center gap-1 ml-auto ${
                            p.id
                              ? "text-blue-600 hover:text-blue-700"
                              : "text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <User className="w-4 h-4" /> Ver Perfil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    );
  }

  // ==========================================================
  // 🔹 Página principal
  // ==========================================================
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Equipes em Campo
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Acompanhe as obras ou visualize todos os profissionais em campo.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setModo("obras")}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              modo === "obras"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-[#1b2332] border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Obras
          </button>
          <button
            onClick={() => setModo("profissionais")}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              modo === "profissionais"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-[#1b2332] border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Profissionais
          </button>
        </div>
      </div>

      {/* 🔍 Filtros */}
      {modo === "profissionais" && (
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#1b2332] text-sm text-gray-800 dark:text-gray-100"
            />
          </div>

          {[
            {
              label: "Função",
              value: filtroFuncao,
              set: setFiltroFuncao,
              options: ["Todas", ...new Set(profissionais.map((p) => p.funcao).filter(Boolean))],
            },
            { label: "Status", value: filtroStatus, set: setFiltroStatus, options: ["Todos", "Ativo", "Inativo"] },
            { label: "Presença", value: filtroPresenca, set: setFiltroPresenca, options: ["Todas", "Presente", "Ausente"] },
          ].map((f) => (
            <select
              key={f.label}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#1b2332] text-sm text-gray-800 dark:text-gray-100"
            >
              {f.options.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      <AnimatePresence>
        {modo === "obras" ? (
          loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {obras.map((obra) => (
                <motion.div
                  key={obra.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-[#1b2332] rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {obra.nome}
                      </h2>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Início:{" "}
                    {obra.data_inicio
                      ? new Date(obra.data_inicio).toLocaleDateString("pt-PT")
                      : "—"}
                  </p>
                  <div className="flex items-center gap-1 text-sm mb-4 text-gray-600 dark:text-gray-300">
                    👷 {obra.total_profissionais}{" "}
                    {obra.total_profissionais === 1 ? "profissional" : "profissionais"}
                  </div>
                  <button
                    onClick={() => {
                      setObraSelecionada(obra);
                      setProfissionais([]);
                      fetchProfissionaisObra(obra.id);
                    }}
                    className="flex items-center justify-center gap-2 w-full text-blue-600 hover:text-blue-700 border border-blue-200 dark:border-blue-700 hover:border-blue-400 rounded-lg py-2 transition font-medium text-sm"
                  >
                    Ver Detalhes <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          // 🔹 Modo Profissionais
          <div className="overflow-x-auto bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-sm">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
                  <tr>
                    {["Nome", "Função", "Obra", "Status", "Presença", "Ações"].map((col) => (
                      <th
                        key={col}
                        className="py-3 px-5 text-sm font-medium text-gray-600 dark:text-gray-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profissionaisFiltrados.map((item, i) => {
                    const p = item.profissional || {};
                    return (
                      <tr
                        key={item.id || i}
                        className={`border-t border-gray-200 dark:border-zinc-700 ${
                          i % 2 === 0
                            ? "bg-white dark:bg-[#1b2332]"
                            : "bg-gray-50 dark:bg-zinc-800"
                        } hover:bg-blue-50 dark:hover:bg-[#243147] transition`}
                      >
                        <td className="py-3 px-6 font-medium text-gray-800 dark:text-gray-100">
                          {p.nome || "—"}
                        </td>
                        <td className="py-3 px-6 text-gray-600 dark:text-gray-300">
                          {item.funcao || "—"}
                        </td>
                        <td className="py-3 px-6 text-gray-600 dark:text-gray-300">
                          {item.obra?.nome || "—"}
                        </td>
                        <td className="py-3 px-6">
                          {p.status === "Ativo" ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Ativo
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              {p.status || "Inativo"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center">
                          {p.presenca === "Presente" ? "✔" : "✖"}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <button
                            onClick={() => p.id && fetchProfissional(p.id)}
                            disabled={!p.id}
                            className={`font-medium text-sm flex items-center gap-1 ml-auto ${
                              p.id
                                ? "text-blue-600 hover:text-blue-700"
                                : "text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <User className="w-4 h-4" /> Ver Perfil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
