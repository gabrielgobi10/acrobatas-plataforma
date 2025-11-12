import { useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  Building2,
  Star,
  CheckCircle2,
  Clock4,
  Award,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

type Desempenho = {
  total_obras: number;
  total_horas: number;
  total_presencas: number;
  avaliacao_media: number;
  indice_acrobatas: number;
};

type Evolucao = { mes: string; horas: number; avaliacao: number };

export default function DesempenhoGeral() {
  const { user } = useAuth();
  const [dados, setDados] = useState<Desempenho | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);

      const { data: desempenho } = await supabase
        .from("desempenho_profissional_view")
        .select("*")
        .eq("profissional_id", user.id)
        .single();

      const { data: evol } = await supabase
        .from("evolucao_mensal_profissional")
        .select("mes, horas, avaliacao")
        .eq("profissional_id", user.id)
        .order("mes", { ascending: true });

      setDados(desempenho);
      setEvolucao(evol || []);
      setLoading(false);
    }

    carregar();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center mt-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* 🔹 Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <BarChart3 className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Desempenho Geral</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-8">
        Acompanhe seu progresso, produtividade e reputação dentro da Acrobatas.
      </p>

      {/* 🔹 Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <Card titulo="Obras" valor={dados?.total_obras ?? "0"} icone={<Building2 />} />
        <Card titulo="Horas" valor={dados ? `${dados.total_horas}h` : "—"} icone={<Clock4 />} />
        <Card titulo="Presenças" valor={dados?.total_presencas ?? "0"} icone={<CheckCircle2 />} />
        <Card
          titulo="Avaliação"
          valor={dados?.avaliacao_media ? dados.avaliacao_media.toFixed(1) : "—"}
          icone={<Star />}
        />
        <Card
          titulo="Índice"
          valor={dados ? `${dados.indice_acrobatas ?? 0}%` : "—"}
          icone={<Award />}
        />
      </div>

      {/* 🔹 Gráfico */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-8 sm:mb-10 shadow-sm flex flex-col justify-center items-center">
        {dados && evolucao.length > 0 ? (
          <div className="w-full h-56 sm:h-72">
            <ResponsiveContainer>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#cbd5e1"} />
                <XAxis dataKey="mes" stroke={isDark ? "#94a3b8" : "#334155"} />
                <YAxis stroke={isDark ? "#94a3b8" : "#334155"} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="horas"
                  stroke={isDark ? "#3B82F6" : "#2563EB"}
                  strokeWidth={2.5}
                  name="Horas trabalhadas"
                />
                <Line
                  type="monotone"
                  dataKey="avaliacao"
                  stroke={isDark ? "#EAB308" : "#CA8A04"}
                  strokeWidth={2.5}
                  name="Avaliação média"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center">
            <TrendingUp className="mx-auto mb-3 text-slate-400 opacity-50" size={36} />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Nenhum dado de desempenho disponível ainda
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Continue registrando presenças e relatórios — seu progresso aparecerá aqui
              automaticamente 💪
            </p>
          </div>
        )}
      </div>

      {/* 🔹 Ranking */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 shadow-sm">
        <div>
          <p className="text-base sm:text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
            Ranking Acrobatas
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {dados
              ? "Você está entre os 15% melhores profissionais do mês."
              : "Seu ranking será exibido assim que houver registros de desempenho."}
          </p>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-blue-500 dark:text-blue-400">
          {dados ? `🏆 ${dados.indice_acrobatas}%` : "—"}
        </div>
      </div>

      {/* 🔹 Rodapé */}
      <div className="mt-8 sm:mt-12 text-center">
        <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
          🚀 Comece a construir seu histórico!
        </p>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-500 max-w-sm mx-auto">
          Cada presença, relatório e avaliação conta pontos no seu desempenho geral dentro da
          Acrobatas.
        </p>
      </div>
    </div>
  );
}

// 🔹 Card reutilizável
function Card({
  titulo,
  valor,
  icone,
}: {
  titulo: string;
  valor: string | number;
  icone: any;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700"
    >
      <div className="flex justify-center mb-1 sm:mb-2 text-blue-600 dark:text-blue-400">
        {icone}
      </div>
      <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </motion.div>
  );
}
