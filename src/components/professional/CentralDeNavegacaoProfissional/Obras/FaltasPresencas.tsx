import { useEffect, useState } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
// ❌ não precisa mais do useNavigate
// import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type Presenca = {
  id: string;
  data: string;
  hora_entrada?: string | null;
  hora_saida?: string | null;
  status: string; // presente | falta
  obra?: { nome?: string | null } | null;
};

type FaltasPresencasProps = {
  /** Chamar Obras Ativas (aba) quando o usuário quer marcar presença */
  onIrParaObrasAtivas?: () => void;
};

export default function FaltasPresencas({
  onIrParaObrasAtivas,
}: FaltasPresencasProps) {
  const { user } = useAuth();
  // const navigate = useNavigate();

  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [presenteHoje, setPresenteHoje] = useState(false);

  // 🔹 Carregar histórico
  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);

      let query = supabase
        .from("presencas")
        .select(`id, data, hora_entrada, hora_saida, status, obras (nome)`)
        .eq("profissional_id", user.id)
        .order("data", { ascending: false });

      if (filtroMes !== "todos") {
        const [ano, mes] = filtroMes.split("-");
        const inicio = `${ano}-${mes}-01`;
        const fim = new Date(parseInt(ano), parseInt(mes), 0)
          .toISOString()
          .slice(0, 10);
        query = query.gte("data", inicio).lte("data", fim);
      }

      const { data, error } = await query;
      if (!error && data) setPresencas(data as Presenca[]);
      setLoading(false);
    }
    carregar();
  }, [user, filtroMes]);

  // 🔹 Verificar se já marcou hoje
  useEffect(() => {
    async function checkHoje() {
      if (!user) return;
      const hoje = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("presencas")
        .select("id")
        .eq("profissional_id", user.id)
        .eq("data", hoje);
      setPresenteHoje(!!data && data.length > 0);
    }
    checkHoje();
  }, [user]);

  // 🔹 Estatísticas
  const totalPresencas = presencas.filter((p) => p.status === "presente").length;
  const totalFaltas = presencas.filter((p) => p.status === "falta").length;

  // ========================================================================
  // 🔹 UI
  // ========================================================================
  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <CalendarCheck2 className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">
          Faltas e Presenças
        </h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Veja aqui todas as suas presenças e faltas registradas nas obras.
      </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          {
            label: "Dias Presentes",
            valor: totalPresencas,
            cor: "text-green-500",
          },
          { label: "Faltas", valor: totalFaltas, cor: "text-red-500" },
          {
            label: "Mês Selecionado",
            valor:
              filtroMes === "todos"
                ? "Todos"
                : new Date(filtroMes).toLocaleDateString("pt-PT", {
                    month: "long",
                    year: "numeric",
                  }),
            cor: "text-blue-500",
          },
          {
            label: "Total de Registos",
            valor: presencas.length,
            cor: "text-yellow-500",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm"
          >
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {item.label}
            </p>
            <p
              className={`text-base sm:text-xl font-semibold ${item.cor} truncate`}
            >
              {item.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Botão de ação */}
      <div className="flex justify-center mb-8 sm:mb-10">
        {presenteHoje ? (
          <button
            disabled
            className="bg-green-800/30 dark:bg-green-800/40 text-green-700 dark:text-green-300 px-6 py-3 rounded-xl font-medium flex items-center gap-2 cursor-default"
          >
            <CheckCircle2 size={18} /> Presença já marcada hoje
          </button>
        ) : (
          <button
            onClick={() => onIrParaObrasAtivas?.()}
            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition"
          >
            <CheckCircle2 size={18} /> Marcar Presença Agora
            <ArrowRight size={18} />
          </button>
        )}
      </div>

      {/* Filtro */}
      <div className="flex justify-start mb-6">
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todos">Todos os meses</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const ano = new Date().getFullYear();
            const mes = (i + 1).toString().padStart(2, "0");
            const label = new Date(`${ano}-${mes}-01`).toLocaleDateString(
              "pt-PT",
              { month: "long" }
            );
            return (
              <option key={mes} value={`${ano}-${mes}`}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            );
          })}
        </select>
      </div>

      {/* Histórico */}
      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : presencas.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-16 text-sm sm:text-base">
          Nenhuma presença encontrada.
        </p>
      ) : (
        <motion.div layout className="space-y-3 sm:space-y-4">
          <AnimatePresence>
            {presencas.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0 shadow-sm hover:shadow-md transition"
              >
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-gray-100 font-medium text-sm sm:text-base">
                    {new Date(p.data).toLocaleDateString("pt-PT")}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {p.hora_entrada
                      ? `Entrada: ${p.hora_entrada}`
                      : "Sem entrada registrada"}
                    {p.hora_saida && ` | Saída: ${p.hora_saida}`}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {p.obra?.nome || "Sem obra vinculada"}
                  </p>
                </div>

                {p.status === "presente" ? (
                  <span className="bg-green-500/10 dark:bg-green-600/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                    <CheckCircle2 size={13} /> Presente
                  </span>
                ) : (
                  <span className="bg-red-500/10 dark:bg-red-600/20 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                    <AlertCircle size={13} /> Falta
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

