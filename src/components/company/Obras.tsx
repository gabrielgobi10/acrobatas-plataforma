import { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  User,
  DollarSign,
  Clock,
  Folder,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import MapaObras from "../MapaObras";

export default function ObrasPage() {
  const [obras, setObras] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchObras() {
      setLoading(true);

      const { data, error } = await supabase
        .from("obras")
        .select(`
          id,
          nome,
          cidade,
          local,
          status,
          data_inicio,
          data_fim,
          progresso_total,
          custo_total,
          profissionais_obras (profissional_id)
        `);

      if (error) {
        console.error("Erro ao carregar obras:", error);
        setObras([]);
      } else {
        const obrasFormatadas = (data || []).map((obra: any) => ({
          id: obra.id,
          nome: obra.nome || "—",
          local:
            obra.local ||
            obra.cidade ||
            obra.endereco ||
            "Local não informado",
          status:
            obra.status === "ativa"
              ? "Em andamento"
              : obra.status === "concluida"
              ? "Concluída"
              : obra.status === "atrasada"
              ? "Atrasada"
              : obra.status || "Em andamento",
          progresso: Number(obra.progresso_total || 0),
          custo_total: Number(obra.custo_total || 0),
          profissionais: obra.profissionais_obras?.length || 0,
          prazo:
            obra.data_fim && obra.data_inicio
              ? new Date(obra.data_fim).toLocaleDateString("pt-PT")
              : "—",
        }));

        setObras(obrasFormatadas);
      }

      setLoading(false);
    }

    fetchObras();
  }, []);

  const statusColors: any = {
    "Em andamento": "from-blue-400 to-blue-600",
    Atrasada: "from-yellow-400 to-orange-500",
    Concluída: "from-green-400 to-emerald-500",
  };

  const obrasFiltradas =
    filtro === "Todas" ? obras : obras.filter((o) => o.status === filtro);

  return (
    <div className="p-4 sm:p-6 space-y-8 sm:space-y-10 max-w-6xl mx-auto">
      {/* HEADER */}
      <motion.div
        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 sm:p-8 rounded-2xl shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
          Obras Cadastradas
        </h1>
        <p className="opacity-80 text-xs sm:text-sm mt-1">
          Visualize todas as obras da empresa com progresso e status em tempo real.
        </p>
      </motion.div>

      {/* MAPA DE OBRAS */}
      <motion.div
        className="bg-white dark:bg-[#161d27] rounded-2xl p-4 sm:p-6 shadow border border-gray-100 dark:border-[#1f2a37]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 mb-3 text-sm sm:text-base">
          <MapPin className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" /> Mapa de Obras
        </h2>
        <div className="rounded-xl overflow-hidden">
          <MapaObras />
        </div>
      </motion.div>

      {/* LISTA DE OBRAS */}
      <motion.div
        className="bg-white dark:bg-[#161d27] p-4 sm:p-6 rounded-2xl shadow border border-gray-100 dark:border-[#1f2a37]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-5 sm:mb-6">
          <h3 className="font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100 text-base sm:text-lg">
            <Folder className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" /> Obras Cadastradas
          </h3>
          <select
            className="border rounded-lg px-2 sm:px-3 py-1 text-xs sm:text-sm text-gray-700 dark:text-gray-200 
            bg-white dark:bg-[#1f2a37] border-gray-200 dark:border-[#2a3647] transition"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option>Todas</option>
            <option>Em andamento</option>
            <option>Atrasada</option>
            <option>Concluída</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 sm:h-40">
            <Loader2 className="animate-spin w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
        ) : obrasFiltradas.length === 0 ? (
          // 👇 Mantém altura estável quando não há obras
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 min-h-[360px] sm:min-h-[420px]">
            <div className="col-span-full flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600" />
                Nenhuma obra encontrada.
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
            {obrasFiltradas.map((obra) => (
              <motion.div
                key={obra.id}
                whileHover={{ y: -4, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 160 }}
                className="relative group cursor-pointer"
              >
                {/* BARRA COLORIDA */}
                <div
                  className={`bg-gradient-to-b ${
                    statusColors[obra.status] || "from-blue-400 to-blue-600"
                  } rounded-t-2xl h-5 sm:h-6 w-[94%] mx-auto transition-all group-hover:h-7`}
                />

                {/* CARD */}
                <div className="bg-white dark:bg-[#1b2535] shadow-md sm:shadow-lg rounded-b-2xl border border-gray-200 dark:border-[#2a3647] p-4 sm:p-5 -mt-1 relative z-10 transition-all">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[80%]">
                      {obra.nome}
                    </h4>
                    <span
                      className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md ${
                        obra.status === "Concluída"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : obra.status === "Atrasada"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {obra.status}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <MapPin size={14} /> {obra.local}
                  </p>

                  <div className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <p className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      👷 {obra.profissionais} profissionais
                    </p>
                    <p className="flex items-center gap-2">
                      <DollarSign size={14} className="text-gray-400" /> Custo:{" "}
                      <span className="font-semibold">
                        € {obra.custo_total.toLocaleString("pt-PT")}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" /> Prazo:{" "}
                      <span>{obra.prazo}</span>
                    </p>
                  </div>

                  {/* PROGRESSO */}
                  <div className="mt-3 sm:mt-4">
                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Progresso</span>
                      <span>{obra.progresso}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-[#2a3647] rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          obra.progresso < 50
                            ? "bg-yellow-400"
                            : obra.progresso < 90
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${obra.progresso}%` }}
                      />
                    </div>
                  </div>

                  {/* AÇÕES */}
                  <div className="mt-3 sm:mt-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex gap-4 sm:gap-3 justify-between">
                    <button
                      onClick={() =>
                        navigate(`/empresa/obras/${obra.id}/detalhes`)
                      }
                      className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium hover:underline"
                    >
                      Ver detalhes
                    </button>
                    <button className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm hover:underline">
                      Editar
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
