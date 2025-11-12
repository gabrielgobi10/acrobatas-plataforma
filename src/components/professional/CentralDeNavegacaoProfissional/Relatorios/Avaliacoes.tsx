import { useEffect, useState } from "react";
import {
  Star,
  ClipboardList,
  CalendarDays,
  Trophy,
  Clock4,
  Loader2,
  MessageSquareText,
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

// Tipagens
type AvaliacaoResumo = {
  nota_media: number;
  total_avaliacoes: number;
  melhor_mes: string;
  ultima_data: string;
  ranking: string;
};

type EvolucaoNota = {
  mes: string;
  nota: number;
};

type AvaliacaoDetalhe = {
  data: string;
  avaliador: string;
  obra: string;
  nota: number;
  comentario: string;
};

export default function Avaliacoes() {
  const { user } = useAuth();
  const [resumo, setResumo] = useState<AvaliacaoResumo | null>(null);
  const [evolucao, setEvolucao] = useState<EvolucaoNota[]>([]);
  const [feedbacks, setFeedbacks] = useState<AvaliacaoDetalhe[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);

      // Simulado — substituir depois por SELECT real
      const dadosResumo: AvaliacaoResumo = {
        nota_media: 4.7,
        total_avaliacoes: 36,
        melhor_mes: "Setembro",
        ultima_data: "30/10/2025",
        ranking: "Top 15%",
      };

      const dadosEvolucao: EvolucaoNota[] = [
        { mes: "Jan", nota: 4.2 },
        { mes: "Fev", nota: 4.3 },
        { mes: "Mar", nota: 4.5 },
        { mes: "Abr", nota: 4.6 },
        { mes: "Mai", nota: 4.7 },
        { mes: "Jun", nota: 4.8 },
        { mes: "Jul", nota: 4.8 },
        { mes: "Ago", nota: 4.9 },
        { mes: "Set", nota: 4.7 },
        { mes: "Out", nota: 4.8 },
      ];

      const dadosFeedback: AvaliacaoDetalhe[] = [
        {
          data: "30/10/2025",
          avaliador: "Hugo (Engenheiro)",
          obra: "Residencial Cascais Prime",
          nota: 5.0,
          comentario: "Excelente profissional — pontual, dedicado e educado.",
        },
        {
          data: "22/10/2025",
          avaliador: "Ana (Encarregada)",
          obra: "Pavilhão Industrial Almada",
          nota: 4.6,
          comentario: "Cumpriu as tarefas no prazo e manteve boa postura.",
        },
        {
          data: "10/10/2025",
          avaliador: "Carlos (Fiscal)",
          obra: "Reabilitação Prédio Histórico",
          nota: 4.5,
          comentario: "Bom trabalho, apenas precisa melhorar a comunicação.",
        },
      ];

      setResumo(dadosResumo);
      setEvolucao(dadosEvolucao);
      setFeedbacks(dadosFeedback);
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

  if (!resumo)
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <Star size={32} className="mx-auto mb-3 text-yellow-400 opacity-70" />
        Nenhuma avaliação encontrada ainda. <br />
        Continue trabalhando com qualidade — suas avaliações aparecerão aqui 💪
      </div>
    );

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <Star className="text-yellow-500 dark:text-yellow-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Avaliações</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-8">
        Acompanhe suas notas, evolução e comentários deixados por empresas e encarregados dentro da Acrobatas.
      </p>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <Card titulo="Nota média" valor={`${resumo.nota_media.toFixed(1)} / 5`} icone={<Star />} cor="text-yellow-500" />
        <Card titulo="Avaliações" valor={resumo.total_avaliacoes} icone={<ClipboardList />} />
        <Card titulo="Melhor mês" valor={resumo.melhor_mes} icone={<CalendarDays />} />
        <Card titulo="Última" valor={resumo.ultima_data} icone={<Clock4 />} />
        <Card titulo="Ranking" valor={resumo.ranking} icone={<Trophy />} cor="text-blue-500" />
      </div>

      {/* Gráfico de evolução */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-8 sm:mb-10 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-yellow-500 dark:text-yellow-400">
          <TrendingLine /> Evolução das notas
        </h2>
        <div className="h-52 sm:h-64">
          <ResponsiveContainer>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#cbd5e1"} />
              <XAxis dataKey="mes" stroke={isDark ? "#94a3b8" : "#334155"} />
              <YAxis domain={[4, 5]} stroke={isDark ? "#94a3b8" : "#334155"} tickFormatter={(v) => v.toFixed(1)} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="nota"
                stroke={isDark ? "#FACC15" : "#CA8A04"}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feedbacks */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <MessageSquareText size={18} /> Últimos feedbacks recebidos
        </h2>

        {/* MOBILE - cards */}
        <div className="space-y-3 sm:hidden">
          {feedbacks.map((f, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-[#232c3d] rounded-xl border border-zinc-200 dark:border-zinc-700 p-3"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-500">{f.data}</p>
                <span
                  className={`text-sm font-semibold ${
                    f.nota >= 4.5
                      ? "text-green-500"
                      : f.nota >= 4
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                >
                  {f.nota.toFixed(1)}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{f.obra}</p>
              <p className="text-xs text-gray-400">{f.avaliador}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                “{f.comentario}”
              </p>
            </div>
          ))}
        </div>

        {/* DESKTOP - tabela */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-300 dark:border-zinc-700">
                <th className="py-3 px-2">Data</th>
                <th className="py-3 px-2">Avaliador</th>
                <th className="py-3 px-2">Obra</th>
                <th className="py-3 px-2">Nota</th>
                <th className="py-3 px-2">Comentário</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f, i) => (
                <motion.tr
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#243043] transition"
                >
                  <td className="py-3 px-2">{f.data}</td>
                  <td className="py-3 px-2 font-medium">{f.avaliador}</td>
                  <td className="py-3 px-2">{f.obra}</td>
                  <td
                    className={`py-3 px-2 font-semibold ${
                      f.nota >= 4.5
                        ? "text-green-500"
                        : f.nota >= 4
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {f.nota.toFixed(1)}
                  </td>
                  <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                    {f.comentario}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-10 sm:mt-12 text-center">
        <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
          🌟 Continue evoluindo!
        </p>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-500">
          Cada boa avaliação melhora seu Índice Acrobatas e aumenta suas chances de novas oportunidades.
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
  cor,
}: {
  titulo: string;
  valor: string | number;
  icone: any;
  cor?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700"
    >
      <div className={`flex justify-center mb-1 sm:mb-2 ${cor || "text-blue-500 dark:text-blue-400"}`}>
        {icone}
      </div>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </motion.div>
  );
}

// 🔹 Ícone customizado
function TrendingLine() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
    </svg>
  );
}
