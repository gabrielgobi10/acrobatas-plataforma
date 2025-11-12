// src/components/professional/CentralDeNavegacaoProfissional/Relatorios/HorasTrabalhadas.tsx
// ============================================================================
// ⏱️ HORAS TRABALHADAS – otimizado para mobile + modo claro aprimorado
// ============================================================================

import { useEffect, useState } from "react";
import {
  Clock4,
  CalendarDays,
  Building2,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

// Tipos
type RegistroHoras = {
  obra_nome: string;
  total_horas: number;
  ultimo_dia: string;
  status: string;
};

type ResumoHoras = {
  total_mes: number;
  meta_mes: number;
  percentual: number;
  obra_destaque: string;
  media_dia: number;
};

export default function HorasTrabalhadas() {
  const { user } = useAuth();
  const [resumo, setResumo] = useState<ResumoHoras | null>(null);
  const [detalhes, setDetalhes] = useState<RegistroHoras[]>([]);
  const [grafico, setGrafico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);

      // Simulação (substituir por SELECT real do Supabase)
      const dadosSimulados: ResumoHoras = {
        total_mes: 122,
        meta_mes: 180,
        percentual: (122 / 180) * 100,
        obra_destaque: "Residencial Cascais Prime",
        media_dia: 8,
      };

      const obras: RegistroHoras[] = [
        {
          obra_nome: "Residencial Cascais Prime",
          total_horas: 58,
          ultimo_dia: "28/10/2025",
          status: "Em andamento",
        },
        {
          obra_nome: "Pavilhão Industrial Almada",
          total_horas: 40,
          ultimo_dia: "25/10/2025",
          status: "Concluída",
        },
        {
          obra_nome: "Reabilitação Prédio Histórico",
          total_horas: 24,
          ultimo_dia: "22/10/2025",
          status: "Em andamento",
        },
      ];

      const graficoSemanal = [
        { semana: "Semana 1", horas: 32 },
        { semana: "Semana 2", horas: 40 },
        { semana: "Semana 3", horas: 28 },
        { semana: "Semana 4", horas: 22 },
      ];

      setResumo(dadosSimulados);
      setDetalhes(obras);
      setGrafico(graficoSemanal);
      setLoading(false);
    }

    carregar();
  }, [user]);

  const bgCard = "bg-white dark:bg-slate-800";
  const borderCard = "border border-slate-200 dark:border-slate-700";
  const textMuted = "text-gray-600 dark:text-gray-400";
  const textPrimary = "text-gray-900 dark:text-gray-100";

  if (loading)
    return (
      <div className="flex justify-center mt-20">
        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400" size={28} />
      </div>
    );

  if (!resumo) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <AlertCircle size={32} className="mx-auto mb-3 opacity-60" />
        Nenhum registro de horas encontrado. <br />
        Comece a marcar presenças para acompanhar seu progresso diário 💪
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 ${textPrimary}`}>
      {/* 🔹 Título */}
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <Clock4 className="text-blue-500 dark:text-blue-400" size={26} />
        <h1 className="text-xl md:text-2xl font-semibold">Horas Trabalhadas</h1>
      </div>

      <p className={`${textMuted} mb-6 md:mb-8 text-sm md:text-base`}>
        Veja abaixo o total de horas trabalhadas por obra, semana e mês.
      </p>

      {/* 🔹 Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8 md:mb-10">
        <Card titulo="Total do mês" valor={`${resumo.total_mes}h`} icone={<Clock4 />} />
        <Card titulo="Meta mensal" valor={`${resumo.meta_mes}h`} icone={<CalendarDays />} />
        <Card
          titulo="Atingido"
          valor={`${resumo.percentual.toFixed(0)}%`}
          icone={<TrendingUp />}
          cor={
            resumo.percentual >= 80
              ? "text-green-500"
              : resumo.percentual >= 50
              ? "text-yellow-500"
              : "text-red-500"
          }
        />
        <Card titulo="Obra destaque" valor={resumo.obra_destaque} icone={<Building2 />} />
        <Card titulo="Média por dia" valor={`${resumo.media_dia}h`} icone={<Clock4 />} />
      </div>

      {/* 🔹 Gráfico semanal */}
      <div className={`${bgCard} ${borderCard} rounded-2xl p-4 md:p-6 mb-8 md:mb-10`}>
        <h2 className="text-base md:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <TrendingUp size={18} /> Evolução semanal
        </h2>

        <div className="h-52 md:h-64">
          <ResponsiveContainer>
            <BarChart data={grafico}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#1e293b" : "#e2e8f0"}
              />
              <XAxis dataKey="semana" stroke={isDark ? "#94a3b8" : "#475569"} />
              <YAxis stroke={isDark ? "#94a3b8" : "#475569"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderRadius: 8,
                  border: "none",
                }}
              />
              <Bar
                dataKey="horas"
                fill={isDark ? "#3B82F6" : "#2563EB"}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🔹 Tabela detalhada */}
      <div className={`${bgCard} ${borderCard} rounded-2xl p-4 md:p-6`}>
        <h2 className="text-base md:text-lg font-medium mb-4 text-blue-500 dark:text-blue-400">
          Detalhes por obra
        </h2>

        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full text-xs md:text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 px-2">Obra</th>
                <th className="py-2 px-2">Horas</th>
                <th className="py-2 px-2">Último dia</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {detalhes.map((obra, i) => (
                <motion.tr
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-700/40 transition"
                >
                  <td className="py-2 px-2 font-medium">{obra.obra_nome}</td>
                  <td className="py-2 px-2">{obra.total_horas}h</td>
                  <td className="py-2 px-2 text-gray-500 dark:text-gray-400">
                    {obra.ultimo_dia}
                  </td>
                  <td
                    className={`py-2 px-2 font-medium ${
                      obra.status === "Concluída"
                        ? "text-green-500"
                        : "text-blue-500"
                    }`}
                  >
                    {obra.status}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 Rodapé motivacional */}
      <div className="mt-10 text-center">
        <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">
          ⏱️ Continue firme!
        </p>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-500">
          Cada presença registrada aumenta seu progresso e desempenho dentro da
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
  cor,
}: {
  titulo: string;
  valor: string | number;
  icone: any;
  cor?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className={`rounded-xl p-3 md:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700`}
    >
      <div className={`flex justify-center mb-1 md:mb-2 ${cor || "text-blue-500 dark:text-blue-400"}`}>
        {icone}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">{titulo}</p>
      <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
        {valor}
      </p>
    </motion.div>
  );
}
