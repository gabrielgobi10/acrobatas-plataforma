import { useEffect, useState } from "react";
import {
  Building2,
  Search,
  ChevronRight,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function EmpresasLista({ onSelecionarEmpresa }: any) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [loading, setLoading] = useState(true);

  // ================================
  // EMPRESAS FAKE (caso supabase vazio)
  // ================================
  const empresasFake = [
    {
      id: "1",
      nome: "Construtora Diametro",
      nif: "509123456",
      status: "Ativa",
      created_at: "2024-05-10",
    },
    {
      id: "2",
      nome: "Obras Lisboa",
      nif: "507998321",
      status: "Pendente",
      created_at: "2024-03-21",
    },
    {
      id: "3",
      nome: "Engenho & Arte LDA",
      nif: "501223889",
      status: "Inativa",
      created_at: "2023-11-30",
    },
  ];

  // ================================
  // CARREGAR EMPRESAS REAIS
  // ================================
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data?.length > 0) {
        setEmpresas(data);
      } else {
        // usa fake se não houver empresas reais
        setEmpresas(empresasFake);
      }

      setLoading(false);
    }

    carregar();
  }, []);

  // ================================
  // FILTROS
  // ================================
  const empresasFiltradas = empresas.filter((emp) => {
    const matchBusca = emp.nome?.toLowerCase().includes(busca.toLowerCase());

    const matchStatus =
      filtroStatus === "todos" || emp.status === filtroStatus;

    return matchBusca && matchStatus;
  });

  // ================================
  // COMPONENTE VISUAL
  // ================================
  return (
    <div className="w-full px-6 pb-20">

      {/* TÍTULO */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold flex items-center gap-2 mb-6"
      >
        <Building2 className="w-6 h-6 text-blue-400" />
        Empresas
      </motion.h1>

      {/* BUSCA / FILTRO */}
      <div
        className="
          flex flex-col md:flex-row 
          bg-slate-800/60 dark:bg-slate-800
          border border-white/10
          p-4 rounded-xl 
          mb-6 gap-4
        "
      >
        {/* busca */}
        <div className="relative w-full md:w-2/3">
          <Search className="absolute left-3 top-3 text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            className="
              w-full bg-slate-900/40 dark:bg-slate-900
              p-2 pl-10 rounded-lg 
              border border-white/10
              focus:border-blue-500
              outline-none text-white
            "
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* filtro */}
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
            <option value="Ativa">Ativas</option>
            <option value="Pendente">Pendentes</option>
            <option value="Inativa">Inativas</option>
          </select>
        </div>
      </div>

      {/* LISTA DE EMPRESAS */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        </div>
      ) : empresasFiltradas.length === 0 ? (
        <div className="flex justify-center items-center bg-slate-800/40 border border-white/10 rounded-xl py-16">
          <p className="text-white/50">Nenhuma empresa encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {empresasFiltradas.map((emp, index) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="
                bg-slate-800/70 dark:bg-slate-800 
                border border-white/10 
                rounded-xl p-5 
                hover:border-blue-500/40 
                transition cursor-pointer
              "
              onClick={() => onSelecionarEmpresa(emp)}
            >
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="w-6 h-6 text-blue-400" />
                <h2 className="text-lg font-semibold">{emp.nome}</h2>
              </div>

              {/* NIF */}
              <p className="text-sm text-white/60 mb-2">
                <span className="font-semibold">NIF:</span> {emp.nif}
              </p>

              {/* STATUS */}
              <div className="flex items-center gap-2 mb-3">
                {emp.status === "Ativa" && (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                {emp.status === "Inativa" && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                {emp.status === "Pendente" && (
                  <Clock className="w-4 h-4 text-yellow-300" />
                )}

                <span
                  className={`
                    text-sm px-2 py-1 rounded-lg
                    ${
                      emp.status === "Ativa"
                        ? "bg-green-500/20 text-green-300"
                        : emp.status === "Inativa"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-yellow-500/20 text-yellow-200"
                    }
                  `}
                >
                  {emp.status}
                </span>
              </div>

              {/* Data */}
              <p className="text-white/40 text-xs mb-4">
                Criada em:{" "}
                {new Date(emp.created_at).toLocaleDateString("pt-PT")}
              </p>

              {/* Ver Perfil */}
              <div className="flex items-center text-blue-400 hover:text-blue-300 font-medium">
                Ver Perfil
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
