import { useEffect, useState } from "react";
import {
  CalendarCheck2,
  Search,
  Loader2,
  User,
  Building2,
  Clock4,
  Filter,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function PresencasRegistos() {
  const [presencas, setPresencas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [loading, setLoading] = useState(true);

  // =========================================================
  // FAKE DATA
  // =========================================================
  const fakePresencas = [
    {
      id: "p1",
      data: "2024-06-12",
      status: "Presente",
      horas: "08:00",
      profissional: "João Ferreira",
      obra: "Moradia – Cascais",
      obra_empresa: "Construtora Diametro",
    },
    {
      id: "p2",
      data: "2024-06-12",
      status: "Falta",
      horas: "00:00",
      profissional: "Luís Amaral",
      obra: "Reforma Comercial – Lisboa",
      obra_empresa: "Obras Lisboa",
    },
    {
      id: "p3",
      data: "2024-06-12",
      status: "Justificado",
      horas: "00:00",
      profissional: "Ana Santos",
      obra: "Edifício Empresarial – Porto",
      obra_empresa: "Engenho & Arte LDA",
    },
  ];

  // =========================================================
  // CARREGAR DO SUPABASE (se existir)
  // =========================================================
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data, error } = await supabase
        .from("presencas")
        .select("*, profissionais(nome), obras(nome, empresa_nome)")
        .order("data", { ascending: false });

      if (!error && data?.length > 0) {
        const dataFormatada = data.map((p) => ({
          id: p.id,
          data: p.data,
          status: p.status,
          horas: p.horas,
          profissional: p.profissionais?.nome || "Profissional não encontrado",
          obra: p.obras?.nome || "Obra não definida",
          obra_empresa: p.obras?.empresa_nome || "Empresa não definida",
        }));

        setPresencas(dataFormatada);
      } else {
        setPresencas(fakePresencas);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  // =========================================================
  // FILTROS
  // =========================================================
  const presencasFiltradas = presencas.filter((p) => {
    const matchBusca =
      p.profissional.toLowerCase().includes(busca.toLowerCase()) ||
      p.obra.toLowerCase().includes(busca.toLowerCase());

    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;

    return matchBusca && matchStatus;
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
        <CalendarCheck2 className="w-6 h-6 text-blue-400" />
        Presenças & Registos
      </motion.h1>

      {/* BUSCA + FILTRO */}
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
            placeholder="Buscar por profissional ou obra..."
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
            <option value="todos">Todos</option>
            <option value="Presente">Presentes</option>
            <option value="Falta">Faltas</option>
            <option value="Justificado">Justificados</option>
          </select>
        </div>
      </div>

      {/* LISTAGEM */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      ) : presencasFiltradas.length === 0 ? (
        <div className="bg-slate-800/40 border border-white/10 rounded-xl py-16 text-center">
          <p className="text-white/50">Nenhuma presença encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {presencasFiltradas.map((p, index) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="
                bg-slate-800/70 dark:bg-slate-800 
                border border-white/10 
                rounded-xl p-5 
                hover:border-blue-500/40 
                transition
              "
            >
              {/* Data */}
              <p className="text-white/40 text-sm mb-2">
                {new Date(p.data).toLocaleDateString("pt-PT")}
              </p>

              {/* Profissional */}
              <div className="flex items-center gap-2 text-white mb-3">
                <User className="w-4 h-4 text-blue-300" />
                <span className="font-medium">{p.profissional}</span>
              </div>

              {/* Obra */}
              <div className="flex items-center gap-2 text-white/70 mb-2">
                <Building2 className="w-4 h-4" />
                {p.obra}
              </div>

              <div className="text-white/50 text-xs mb-3">
                Empresa: {p.obra_empresa}
              </div>

              {/* STATUS */}
              <div className="mb-3 flex items-center gap-2">
                {p.status === "Presente" && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                {p.status === "Falta" && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                {p.status === "Justificado" && (
                  <Info className="w-4 h-4 text-yellow-300" />
                )}

                <span
                  className={`
                    px-2 py-1 rounded-lg text-sm
                    ${
                      p.status === "Presente"
                        ? "bg-green-500/20 text-green-300"
                        : p.status === "Falta"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-yellow-500/20 text-yellow-200"
                    }
                  `}
                >
                  {p.status}
                </span>
              </div>

              {/* HORAS */}
              <div className="flex items-center gap-2 text-white/60 mb-4">
                <Clock4 className="w-4 h-4" />
                {p.horas} horas
              </div>

              {/* VER DETALHES */}
              <div className="flex items-center text-blue-300 hover:text-blue-200 cursor-pointer">
                Ver detalhes
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
