import React, { useState, useEffect } from "react";
import {
  Search,
  Briefcase,
  Plug,
  Wrench,
  Hammer,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export default function VagasDisponiveis() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [experiencia, setExperiencia] = useState("todos");
  const [vagas, setVagas] = useState<any[]>([]);
  const [vagaSelecionada, setVagaSelecionada] = useState<any | null>(null);
  const [observacao, setObservacao] = useState("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // 🔹 Carregar vagas do Supabase
  useEffect(() => {
    async function fetchVagas() {
      setLoading(true);
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("status", "ativa")
        .order("criada_em", { ascending: false });

      if (error) {
        console.error("Erro ao buscar vagas:", error);
      } else {
        setVagas(data || []);
      }
      setLoading(false);
    }

    fetchVagas();
  }, []);

  // 🔹 Filtro de vagas
  const vagasFiltradas = vagas.filter(
    (vaga) =>
      (categoria === "todas" || vaga.categoria === categoria) &&
      (experiencia === "todos" || vaga.experiencia === experiencia) &&
      vaga.titulo?.toLowerCase().includes(search.toLowerCase())
  );

  // 🔹 Ícones por categoria
  const getIcon = (categoria: string) => {
    switch (categoria) {
      case "Elétrica":
        return <Plug className="text-yellow-400" size={22} />;
      case "Canalização":
        return <Wrench className="text-blue-400" size={22} />;
      default:
        return <Hammer className="text-gray-400" size={22} />;
    }
  };

  // 🔹 Enviar candidatura
  async function enviarCandidatura() {
    if (!user?.id) {
      alert("Aguarde um momento, seu perfil ainda está sendo carregado.");
      return;
    }

    if (!vagaSelecionada) return;

    setEnviando(true);

    try {
      console.log("Usuário logado:", user.id, user.email);

      // 🔸 Busca o profissional vinculado ao user.id
      const { data: prof, error: profError } = await supabase
        .from("profissionais")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profError) {
        console.error("Erro ao buscar profissional:", profError.message);
        alert("Erro ao identificar seu perfil profissional.");
        setEnviando(false);
        return;
      }

      if (!prof) {
        alert("Perfil profissional não encontrado. Verifique seu cadastro.");
        setEnviando(false);
        return;
      }

      console.log("Profissional encontrado:", prof.id);

      // 🔸 Insere a candidatura
      const { error: insertError } = await supabase
        .from("vagas_candidaturas")
        .insert([
          {
            vaga_id: vagaSelecionada.id,
            profissional_id: prof.id,
            observacao,
            status: "Pendente",
            criada_em: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        console.error("Erro ao enviar candidatura:", insertError.message);
        alert("Erro ao enviar candidatura. Tente novamente.");
      } else {
        setEnviado(true);
        setTimeout(() => {
          setVagaSelecionada(null);
          setObservacao("");
          setEnviado(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Ocorreu um erro inesperado. Tente novamente.");
    }

    setEnviando(false);
  }

  return (
    <div className="w-full px-4 md:px-6 py-8 md:py-10 transition-all duration-700 scroll-smooth">
      <div
        className="max-w-7xl mx-auto bg-white dark:bg-[#1e293b]
        rounded-3xl shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] 
        dark:shadow-[0_10px_25px_rgba(0,0,0,0.6)]
        border border-gray-200 dark:border-slate-800 
        p-5 md:p-10 relative"
      >
        {/* Cabeçalho */}
        <div className="flex flex-col items-center justify-center mb-6 md:mb-8 gap-3 text-center">
          <Briefcase className="text-pink-500 animate-bounce" size={28} />
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] dark:text-white">
            Vagas Disponíveis
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Veja e candidate-se às oportunidades abertas na Acrobatas.
          </p>
        </div>

        {/* Filtros */}
        <div
          className="p-4 md:p-6 rounded-2xl mb-8 flex flex-col md:flex-row 
          gap-3 md:gap-4 items-stretch md:items-center justify-between 
          bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700"
        >
          {/* Campo de busca */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Pesquisar vaga..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 
                dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 
                dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mostrar filtros (mobile) */}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex md:hidden items-center justify-center gap-2 bg-slate-900 dark:bg-slate-700 text-white text-sm px-4 py-2 rounded-lg font-medium mt-2"
          >
            <SlidersHorizontal size={16} />
            {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
            {mostrarFiltros ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Filtros secundários */}
          <div
            className={`flex-col sm:flex-row gap-3 w-full md:w-auto mt-2 md:mt-0 ${
              mostrarFiltros ? "flex" : "hidden md:flex"
            }`}
          >
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 
                bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
            >
              <option value="todas">Todas as categorias</option>
              <option value="Canalização">Canalização</option>
              <option value="Elétrica">Elétrica</option>
              <option value="Construção Civil">Construção Civil</option>
              <option value="Pintura">Pintura</option>
              <option value="Serralharia">Serralharia</option>
              <option value="Climatização">Climatização</option>
              <option value="Carpintaria">Carpintaria</option>
              <option value="Pedreiro">Pedreiro</option>
              <option value="Servente">Servente</option>
              <option value="Outros">Outros</option>
            </select>

            <select
              value={experiencia}
              onChange={(e) => setExperiencia(e.target.value)}
              className="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 
                bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
            >
              <option value="todos">Todos os níveis</option>
              <option value="1–2 anos">1–2 anos</option>
              <option value="1–3 anos">1–3 anos</option>
              <option value="3–5 anos">3–5 anos</option>
              <option value="5+ anos">5+ anos</option>
            </select>
          </div>
        </div>

        {/* Lista de vagas */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : vagasFiltradas.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-16">
            Nenhuma vaga encontrada.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
            {vagasFiltradas.map((vaga) => (
              <div
                key={vaga.id}
                className="group bg-white dark:bg-slate-800/80 
                p-4 md:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 
                shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]
                hover:shadow-[0_4px_20px_rgba(59,130,246,0.25)]
                transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                    {vaga.titulo}
                  </h3>
                  {getIcon(vaga.categoria)}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {vaga.localizacao} • {vaga.experiencia}
                </p>

                <p className="text-blue-600 dark:text-blue-400 font-bold text-base md:text-lg mb-3">
                  € {vaga.valor_dia}/dia
                </p>

                <button
                  onClick={() => setVagaSelecionada(vaga)}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 
                  text-white py-2 md:py-2.5 rounded-lg font-medium hover:scale-[1.02] 
                  transition-transform shadow-sm hover:shadow-lg text-sm md:text-base"
                >
                  Candidatar-se
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {vagaSelecionada && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:w-[90%] md:max-w-md relative border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setVagaSelecionada(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X size={22} />
              </button>

              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                {getIcon(vagaSelecionada.categoria)}
                {vagaSelecionada.titulo}
              </h2>

              <p className="text-green-600 font-bold text-lg mb-2">
                €{vagaSelecionada.valor_dia}/dia
              </p>

              <div className="space-y-1 mb-3 text-sm text-gray-700 dark:text-gray-300">
                <p>📍 <strong>Local:</strong> {vagaSelecionada.localizacao}</p>
                <p>⏳ <strong>Duração:</strong> {vagaSelecionada.duracao}</p>
                <p>🚀 <strong>Início:</strong> {vagaSelecionada.inicio}</p>
                <p>🧰 <strong>Experiência:</strong> {vagaSelecionada.experiencia}</p>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-sm">
                {vagaSelecionada.descricao}
              </p>

              <textarea
                placeholder="Observação (ex: posso começar segunda-feira...)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm 
                  bg-white dark:bg-slate-900 text-gray-800 dark:text-white placeholder-gray-400 mb-4"
              />

              <button
                disabled={enviando || enviado}
                onClick={enviarCandidatura}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-white shadow-md transition-all text-sm md:text-base ${
                  enviado
                    ? "bg-emerald-600"
                    : enviando
                    ? "bg-blue-600 opacity-80"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110"
                }`}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </>
                ) : enviado ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> Candidatura enviada!
                  </>
                ) : (
                  "Enviar Candidatura"
                )}
              </button>

              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-3">
                🔒 Seus dados são usados apenas para recrutamento.  
                A Acrobatas nunca cobra taxas para candidaturas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
