// src/components/admin/Admindashboard/RelatoriosSection.tsx
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
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

const CardTooltip = ({ label, payload }: any) => {
  const item = payload?.[0];
  if (!item) return null;
  const value = item.value;
  const key = item.name || item.dataKey;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow text-xs sm:text-sm">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-semibold text-slate-800 dark:text-slate-100">
        {key}: {value}
      </div>
    </div>
  );
};

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Cabeçalho compacto */}
      <div className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5 bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500" />
          Relatórios e Estatísticas
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gere relatórios automáticos, acompanhe métricas e visualize o
          desempenho geral da plataforma.
        </p>
      </div>

      {/* Métricas principais – compactas, sem fundo gigante */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {metricas.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-md border border-white/10`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-xs sm:text-sm opacity-90">{card.title}</p>
                <h2 className="text-2xl sm:text-3xl font-semibold mt-1 leading-tight">
                  {card.value}
                </h2>
              </div>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Gráficos – cards alinhados com o tema */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Gráfico 1 – Crescimento Mensal */}
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold mb-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <LineIcon className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />{" "}
            Crescimento Mensal
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={crescimentoData}>
              <defs>
                <linearGradient id="gradCresc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" stroke="#6B7280" />
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

        {/* Gráfico 2 – Atividade semanal */}
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold mb-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <PieIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />{" "}
            Atividade Semanal
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={atividadeData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
              />
              <XAxis dataKey="dia" stroke="#6B7280" />
              <Tooltip content={<CardTooltip />} />
              <Bar
                dataKey="usuarios"
                fill="#22C55E"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3 – Performance geral */}
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold mb-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <LineIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />{" "}
            Performance Geral
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <LChart data={crescimentoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" stroke="#6B7280" />
              <Tooltip content={<CardTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={24}
                wrapperStyle={{ fontSize: 11 }}
              />
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

      {/* Histórico de relatórios – tabela + cards mobile */}
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
          Histórico de Relatórios
        </h3>

        {/* Desktop: tabela */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="p-3 font-semibold">Título</th>
                <th className="p-3 font-semibold">Data</th>
                <th className="p-3 font-semibold">Tipo</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {historicoRelatorios.map((rel, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 dark:border-slate-800 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                >
                  <td className="p-3 text-slate-800 dark:text-slate-100 font-medium">
                    {rel.titulo}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" /> {rel.data}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {rel.tipo}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rel.status === "Concluído"
                          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                      }`}
                    >
                      {rel.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="inline-flex items-center justify-center gap-2 text-sky-600 dark:text-sky-400 hover:underline text-xs">
                      <Download className="w-4 h-4" /> Baixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards compactos */}
        <div className="grid gap-3 md:hidden text-xs">
          {historicoRelatorios.map((rel, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 px-3 py-3"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-50">
                {rel.titulo}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                <Calendar className="w-3 h-3 text-slate-400" />
                {rel.data} • {rel.tipo}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    rel.status === "Concluído"
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}
                >
                  {rel.status}
                </span>
                <button className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400">
                  <Download className="w-3 h-3" />
                  Baixar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
