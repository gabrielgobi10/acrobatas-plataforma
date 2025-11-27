import { useEffect, useState } from "react";
import {
  History,
  Building2,
  MapPin,
  Clock4,
  Star,
  Loader2,
  Briefcase,
  Calendar,
  Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type Historico = {
  id: string;
  funcao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  horas_totais?: number | null;
  avaliacao_media?: number | null;
  obra?: {
    nome?: string | null;
    endereco?: string | null;
    empresa_nome?: string | null;
  } | null;
};

export default function HistoricoDeObras() {
  const { user } = useAuth();
  const [obras, setObras] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(
          `
          id, funcao, data_inicio, data_fim, horas_totais, avaliacao_media,
          obras ( nome, endereco, empresa_nome )
        `
        )
        .eq("profissional_id", user.id)
        .eq("status", "concluido")
        .order("data_fim", { ascending: false });

      if (!error && data) setObras(data as Historico[]);
      setLoading(false);
    }
    carregar();
  }, [user]);

  // Estatísticas resumidas
  const totalObras = obras.length;

  const totalHoras = obras.reduce((acc, o) => acc + (o.horas_totais || 0), 0);

  // Soma de dias trabalhados em obras concluídas
  const totalDiasTrabalhados = obras.reduce((acc, o) => {
    if (!o.data_inicio || !o.data_fim) return acc;

    const inicio = new Date(o.data_inicio);
    const fim = new Date(o.data_fim);

    const diffMs = fim.getTime() - inicio.getTime();
    if (isNaN(diffMs) || diffMs < 0) return acc;

    // +1 para contar o dia inicial também (ex: 10/01 até 10/01 = 1 dia)
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return acc + dias;
  }, 0);

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <History className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Histórico de Obras</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Veja aqui todas as obras que você já concluiu através da plataforma.
      </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Obras concluídas
          </p>
          <p className="text-base sm:text-xl font-semibold text-blue-500">
            {totalObras}
          </p>
        </div>

        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Horas totais
          </p>
          <p className="text-base sm:text-xl font-semibold text-green-500">
            {totalHoras.toFixed(1)}h
          </p>
        </div>

        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Dias trabalhados
          </p>
          <p className="text-base sm:text-xl font-semibold text-purple-400">
            {totalDiasTrabalhados}d
          </p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : obras.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-16 text-sm sm:text-base">
          Sem obras concluídas ainda.
        </p>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6"
        >
          <AnimatePresence>
            {obras.map((o) => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-3 sm:p-5 rounded-2xl shadow-sm hover:shadow-lg transition"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 sm:mb-3 gap-1 sm:gap-2">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {o.obra?.nome || "Obra sem nome"}
                  </h3>
                  <span className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[11px] sm:text-xs px-2 py-1 rounded-md flex items-center gap-1 self-start sm:self-auto">
                    <Briefcase size={12} /> {o.funcao || "Função não definida"}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                  <p className="flex items-center gap-2">
                    <Building2 size={13} />{" "}
                    {o.obra?.empresa_nome || "Empresa não informada"}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={13} /> {o.obra?.endereco || "Sem endereço"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar size={13} />{" "}
                    {o.data_inicio
                      ? new Date(o.data_inicio).toLocaleDateString("pt-PT")
                      : "—"}{" "}
                    até{" "}
                    {o.data_fim
                      ? new Date(o.data_fim).toLocaleDateString("pt-PT")
                      : "—"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock4 size={13} /> {o.horas_totais?.toFixed(1) || "0"}h
                    trabalhadas
                  </p>
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={14} />{" "}
                    <span className="text-xs sm:text-sm font-medium">
                      {o.avaliacao_media ? o.avaliacao_media.toFixed(1) : "—"}
                    </span>
                  </div>
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
