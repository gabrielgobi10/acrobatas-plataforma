import { useEffect, useState } from "react";
import {
  Building2,
  Search,
  Loader2,
  Users,
  MapPin,
  ChevronRight,
  Filter,
  Clock,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function ObrasLista({ onSelecionarObra }: any) {
  const [obras, setObras] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [loading, setLoading] = useState(true);

  // =========================================================
  // FAKE DATA (se o supabase estiver vazio)
  // =========================================================
  const obrasFake = [
    {
      id: "1",
      nome: "Construção de Moradia – Cascais",
      empresa_nome: "Construtora Diametro",
      status: "A iniciar",
      equipa: 0,
      endereco: "Cascais, Lisboa",
      data_inicio: "2024-06-15",
    },
    {
      id: "2",
      nome: "Reforma Comercial – Lisboa",
      empresa_nome: "Obras Lisboa",
      status: "Em andamento",
      equipa: 4,
      endereco: "Av. Liberdade, Lisboa",
      data_inicio: "2024-03-01",
    },
    {
      id: "3",
      nome: "Edifício Empresarial – Porto",
      empresa_nome: "Engenho & Arte LDA",
      status: "Concluída",
      equipa: 12,
      endereco: "Porto, Portugal",
      data_inicio: "2023-12-10",
    },
  ];

  // =========================================================
  // CARREGAR OBRAS DO SUPABASE
  // =========================================================
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data, error } = await supabase
        .from("obras")
        .select("*, empresas(nome)")
        .order("created_at", { ascending: false });

      if (!error && data?.length > 0) {
        const obrasFormatadas = data.map((obra) => ({
          ...obra,
          empresa_nome: obra.empresas?.nome || "Empresa não definida",
        }));

        setObras(obrasFormatadas);
      } else {
        setObras(obrasFake);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  // =========================================================
  // FILTROS
  // =========================================================
  const obrasFiltradas = obras.filter((obra) => {
    const nomeMatch = obra.nome.toLowerCase().includes(busca.toLowerCase());
    const statusMatch =
      filtroStatus === "todos" || obra.status === filtroStatus;

    return nomeMatch && statusMatch;
  });

  // =========================================================
  // COMPONENTE VISUAL
  // =========================================================
  return (
    <div className="w-full px-6 pb-20">

      {/* TÍTULO */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold flex items-center gap-2 mb-6"
      >
        <Briefcase className="w-6 h-6 text-yellow-400" />
        Obras & Equipas
      </motion.h1>

      {/* BUSCA & FILTRO */}
      <div
        className="
          bg-slate-800/60 dark:bg-slate-800 
          border border-white/10 
          rounded-xl p-4 mb-6
          flex flex-col md:flex-row gap-4
        "
      >
        <div className="relative w-full md:w-2/3">
          <Search className="absolute left-3 top-3 text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar obra..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="
              w-full bg-slate-900/40 dark:bg-slate-900 
              p-2 pl-10 rounded-lg 
              border border-white/10 text-white 
              outline-none
            "
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="
              bg-slate-900/40 dark:bg-slate-900 
              border border-white/10 
              text-white 
              p-2 rounded-lg
            "
          >
            <option value="todos">Todas</option>
            <option value="A iniciar">A iniciar</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluída">Concluídas</option>
          </select>
        </div>
      </div>

      {/* LISTA */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      ) : obrasFiltradas.length === 0 ? (
        <div className="bg-slate-800/40 border border-white/10 rounded-xl py-16 text-center">
          <p className="text-white/50">Nenhuma obra encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {obrasFiltradas.map((obra, index) => (
            <motion.div
              key={obra.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelecionarObra(obra)}
              className="
                bg-slate-800/70 dark:bg-slate-800 
                border border-white/10 
                rounded-xl p-5 cursor-pointer
                hover:border-yellow-500/40 
                transition
              "
            >
              {/* Nome */}
              <h2 className="text-lg font-semibold mb-2">{obra.nome}</h2>

              {/* Empresa */}
              <div className="flex items-center gap-2 text-white/60 mb-3">
                <Building2 className="w-4 h-4" />
                {obra.empresa_nome}
              </div>

              {/* Endereço */}
              <div className="flex items-center gap-2 text-white/60 mb-3">
                <MapPin className="w-4 h-4" />
                {obra.endereco}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-3">
                {obra.status === "A iniciar" && (
                  <Clock className="w-4 h-4 text-yellow-300" />
                )}
                {obra.status === "Em andamento" && (
                  <Loader2 className="w-4 h-4 text-blue-300 animate-spin-slow" />
                )}
                {obra.status === "Concluída" && (
                  <CheckCircle2 className="w-4 h-4 text-green-300" />
                )}

                <span
                  className={`
                    px-2 py-1 text-sm rounded-lg
                    ${
                      obra.status === "A iniciar"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : obra.status === "Em andamento"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-green-500/20 text-green-300"
                    }
                  `}
                >
                  {obra.status}
                </span>
              </div>

              {/* Equipa */}
              <div className="flex items-center gap-2 text-white/60 mb-3">
                <Users className="w-4 h-4" />
                {obra.equipa} profissionais
              </div>

              {/* Data início */}
              <div className="text-white/40 text-xs mb-4">
                Início: {new Date(obra.data_inicio).toLocaleDateString("pt-PT")}
              </div>

              {/* Botão ver obra */}
              <div className="flex items-center text-yellow-300 hover:text-yellow-200">
                Ver Obra
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
