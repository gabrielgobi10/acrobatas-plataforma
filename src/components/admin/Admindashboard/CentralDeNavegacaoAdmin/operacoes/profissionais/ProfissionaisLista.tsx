import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  Briefcase,
  Star,
  ShieldCheck,
  Phone,
  MapPin,
  ArrowRight,
  Users,
  CheckCircle2,
  Clock4,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function ProfissionaisPage({ onSelectSection }) {
  // =======================
  // ESTADOS
  // =======================
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [mobileFiltrosOpen, setMobileFiltrosOpen] = useState(false);
  const [funcoes, setFuncoes] = useState([]);

  // =======================
  // CARREGAMENTO DOS PROFISSIONAIS
  // =======================
  useEffect(() => {
    async function load() {
      setCarregando(true);
      const { data } = await supabase.from("profissionais").select("*");
      setLista(data || []);
      setCarregando(false);

      const fun = [...new Set((data || []).map((p) => p.funcao))];
      setFuncoes(fun);
    }
    load();
  }, []);

  // =======================
  // FILTRAGEM PRO
  // =======================
  const filtrados = useMemo(() => {
    return lista.filter((p) => {
      const nomeMatch = p.nome?.toLowerCase().includes(filtro.toLowerCase());
      const funcaoMatch = filtroFuncao ? p.funcao === filtroFuncao : true;
      const nivelMatch = filtroNivel ? p.nivel === filtroNivel : true;
      const statusMatch = statusFiltro ? p.status === statusFiltro : true;
      return nomeMatch && funcaoMatch && nivelMatch && statusMatch;
    });
  }, [lista, filtro, filtroFuncao, filtroNivel, statusFiltro]);

  // =======================
  // MÉTRICAS
  // =======================
  const total = lista.length;
  const ativos = lista.filter((p) => p.status === "ativo").length;
  const pendentes = lista.filter((p) => p.docs_status === "pendente").length;
  const emObra = lista.filter((p) => p.obra_atual).length;

  return (
    <div className="w-full space-y-8">
      {/* ======================= HEADER + MÉTRICAS ======================= */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> Profissionais
          </h1>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center">
            <p className="text-sm text-slate-400">Total</p>
            <p className="text-xl font-semibold">{total}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center">
            <p className="text-sm text-slate-400">Ativos</p>
            <p className="text-xl font-semibold text-green-400">{ativos}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center">
            <p className="text-sm text-slate-400">Pendentes</p>
            <p className="text-xl font-semibold text-yellow-400">{pendentes}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center">
            <p className="text-sm text-slate-400">Em obra</p>
            <p className="text-xl font-semibold text-blue-400">{emObra}</p>
          </div>
        </div>
      </div>

      {/* ======================= BUSCA + FILTROS ======================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* busca */}
        <div className="relative w-full md:w-2/3">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar profissional..."
            className="w-full pl-10 pr-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800"
          />
        </div>

        {/* filtros desktop */}
        <div className="hidden md:flex gap-3">
          <select
            value={filtroFuncao}
            onChange={(e) => setFiltroFuncao(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800"
          >
            <option value="">Todas as funções</option>
            {funcoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800"
          >
            <option value="">Todos os níveis</option>
            <option value="Aprendiz">Aprendiz</option>
            <option value="Auxiliar">Auxiliar</option>
            <option value="Profissional">Profissional</option>
            <option value="Oficial">Oficial</option>
            <option value="Encarregado">Encarregado</option>
            <option value="Mestre">Mestre</option>
          </select>
        </div>

        {/* botão mobile */}
        <button
          onClick={() => setMobileFiltrosOpen(!mobileFiltrosOpen)}
          className="md:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800"
        >
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {/* filtros mobile */}
      {mobileFiltrosOpen && (
        <div className="md:hidden bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mb-4 space-y-3">
          <select
            value={filtroFuncao}
            onChange={(e) => setFiltroFuncao(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border"
          >
            <option value="">Todas as funções</option>
            {funcoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border"
          >
            <option value="">Todos os níveis</option>
            <option value="Aprendiz">Aprendiz</option>
            <option value="Auxiliar">Auxiliar</option>
            <option value="Profissional">Profissional</option>
            <option value="Oficial">Oficial</option>
            <option value="Encarregado">Encarregado</option>
            <option value="Mestre">Mestre</option>
          </select>
        </div>
      )}

      {/* ======================= LISTA PROFISSIONAL ======================= */}

      {carregando ? (
        // Skeleton
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-slate-800/40 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtrados.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white/5 backdrop-blur-xl dark:bg-slate-900 rounded-xl border border-slate-700 hover:border-blue-500 transition shadow-lg p-5 flex flex-col"
            >
              {/* FOTO + NOME */}
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={p.foto_url && p.foto_url !== "" ? p.foto_url : "/default_user.png"}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/default_user.png";
                  }}
                  className="w-14 h-14 rounded-full object-cover border border-slate-700"
                  alt="foto"
                />
                <div>
                  <p className="font-semibold text-lg group-hover:text-blue-400 transition">
                    {p.nome}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {p.funcao || "Função não definida"}
                  </p>
                </div>
              </div>

              {/* INFO RESUMIDA */}
              <div className="text-xs space-y-2 text-slate-400 mb-4">
                <p className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  {p.nivel || "Nível indefinido"}
                </p>
                <p className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-400" />
                  {p.docs_status || "Documentos OK"}
                </p>
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  {p.obra_atual || "Sem obra"}
                </p>
              </div>

              {/* AÇÕES RÁPIDAS */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700">
                <button className="text-xs text-blue-400 hover:underline" onClick={() => onSelectSection("operacoes-profissional-perfil", p)}>
                  Ver Perfil
                </button>
                <button className="text-xs text-sky-400 hover:underline">Docs</button>
                <button className="text-xs text-emerald-400 hover:underline">Presenças</button>
                <button className="text-xs text-purple-400 hover:underline">Obra</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
