// src/components/admin/Admindashboard/RelatoriosSection.tsx
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Download,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  Tooltip,
  AreaChart,
  Area,
  LineChart as LChart,
  Line,
  Legend,
} from "recharts";

export default function RelatoriosSection() {
  const metricas = [
    {
      title: "Relatórios Gerados",
      value: 24,
      color: "from-pink-500 to-rose-500",
      icon: <FileText className="w-6 h-6 text-white opacity-90" />,
    },
    {
      title: "Taxa de Crescimento",
      value: "+18%",
      color: "from-green-500 to-emerald-500",
      icon: <ArrowUpRight className="w-6 h-6 text-white opacity-90" />,
    },
    {
      title: "Atividade Média Diária",
      value: "76%",
      color: "from-blue-500 to-cyan-500",
      icon: <BarChart3 className="w-6 h-6 text-white opacity-90" />,
    },
  ];

  const crescimentoData = [
    { mes: "Jan", valor: 40 },
    { mes: "Fev", valor: 75 },
    { mes: "Mar", valor: 110 },
    { mes: "Abr", valor: 85 },
    { mes: "Mai", valor: 130 },
    { mes: "Jun", valor: 120 },
  ];

  const atividadeData = [
    { dia: "Seg", usuarios: 65 },
    { dia: "Ter", usuarios: 78 },
    { dia: "Qua", usuarios: 92 },
    { dia: "Qui", usuarios: 70 },
    { dia: "Sex", usuarios: 88 },
    { dia: "Sáb", usuarios: 55 },
  ];

  const historicoRelatorios = [
    {
      titulo: "Relatório Mensal - Junho",
      data: "15/06/2025",
      tipo: "Performance",
      status: "Concluído",
    },
    {
      titulo: "Relatório Financeiro - Maio",
      data: "15/05/2025",
      tipo: "Financeiro",
      status: "Concluído",
    },
    {
      titulo: "Relatório de Usuários",
      data: "05/05/2025",
      tipo: "Atividade",
      status: "Em Geração",
    },
  ];

  const CardTooltip = ({ label, payload }: any) => {
    const item = payload?.[0];
    if (!item) return null;
    const value = item.value;
    const key = item.name || item.dataKey;
    return (
      <div className="rounded-lg border border-gray-200 border-gray-200 bg-white bg-gray-100 px-3 py-2 shadow text-sm">
        <div className="text-gray-500 text-gray-500">{label}</div>
        <div className="font-semibold text-gray-800">
          {key}: {value}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-b from-[#f7f9fc] to-[#f0f4fa] p-8 rounded-3xl"
    >
      {/* Cabeçalho */}
      <div className="rounded-2xl p-6 bg-white bg-white border border-gray-100 border-gray-100 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Relatórios e Estatísticas
        </h2>
        <p className="text-gray-500 text-gray-600 mt-1">
          Gere relatórios automáticos, acompanhe métricas e visualize o desempenho geral da plataforma.
        </p>
      </div>

      {/* Métricas Principais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {metricas.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className={`p-5 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg cursor-pointer`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm opacity-90">{card.title}</p>
                <h2 className="text-3xl font-bold mt-1">{card.value}</h2>
              </div>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Gráfico 1 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 border-gray-200">
          <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-blue-500" /> Crescimento Mensal
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={crescimentoData}>
              <defs>
                <linearGradient id="gradCresc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip content={<CardTooltip />} />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#3B82F6"
                fill="url(#gradCresc)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-700">
          <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-green-500" /> Atividade Semanal
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={atividadeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" />
              <Tooltip content={<CardTooltip />} />
              <Bar dataKey="usuarios" fill="#22C55E" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3 */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow border border-gray-100 dark:border-zinc-700">
          <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-purple-500" /> Performance Geral
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LChart data={crescimentoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <Tooltip content={<CardTooltip />} />
              <Legend verticalAlign="bottom" height={28} />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="#8B5CF6"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </LChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Histórico de Relatórios */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow border border-gray-100 dark:border-zinc-700 p-6">
        <h3 className="font-semibold text-gray-700 text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" /> Histórico de Relatórios
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="text-left text-gray-600 text-gray-600 border-b">
                <th className="p-3 text-sm font-semibold">Título</th>
                <th className="p-3 text-sm font-semibold">Data</th>
                <th className="p-3 text-sm font-semibold">Tipo</th>
                <th className="p-3 text-sm font-semibold">Status</th>
                <th className="p-3 text-sm font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {historicoRelatorios.map((rel, i) => (
                <tr
                  key={i}
                  className="border-b last:border-none hover:bg-gray-50 bg-gray-50 transition"
                >
                  <td className="p-3 text-sm text-gray-800 font-medium">
                    {rel.titulo}
                  </td>
                  <td className="p-3 text-sm text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> {rel.data}
                  </td>
                  <td className="p-3 text-sm text-gray-600 text-gray-700">{rel.tipo}</td>
                  <td className="p-3 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rel.status === "Concluído"
                          ? "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {rel.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-center">
                    <button className="flex items-center justify-center gap-2 text-blue-600 hover:underline text-xs mx-auto">
                      <Download className="w-4 h-4" /> Baixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
