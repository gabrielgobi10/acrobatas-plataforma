import {
  Users,
  Building2,
  HardHat,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Activity,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useState } from "react";

/* ======================================================
   MOCK (provisório — depois liga no Supabase)
====================================================== */
const KPI_DATA = [
  {
    title: "Profissionais ativos",
    value: 12,
    trend: "+8%",
    icon: Users,
    color: "text-blue-400",
  },
  {
    title: "Empresas ativas",
    value: 4,
    trend: "+1",
    icon: Building2,
    color: "text-emerald-400",
  },
  {
    title: "Obras em andamento",
    value: 6,
    trend: "+2",
    icon: HardHat,
    color: "text-yellow-400",
  },
  {
    title: "Faturamento do mês (€)",
    value: "12.500",
    trend: "+12%",
    icon: TrendingUp,
    color: "text-purple-400",
  },
];

const DIAGNOSTICO = [
  {
    label: "Atividade operacional",
    score: 82,
    color: "text-blue-400",
    desc: "Fluxo forte nas obras hoje.",
  },
  {
    label: "Conformidade documental",
    score: 73,
    color: "text-emerald-400",
    desc: "Documentação quase toda válida.",
  },
  {
    label: "Produtividade geral",
    score: 69,
    color: "text-yellow-400",
    desc: "Horas entregues acima da média.",
  },
  {
    label: "Riscos & Alertas",
    score: 58,
    color: "text-red-400",
    desc: "Pendências precisam de atenção.",
  },
];

const ATIVIDADES = [
  {
    title: "Novo profissional aprovado",
    icon: Users,
    time: "há 2h",
  },
  {
    title: "Empresa cadastrada: Casais",
    icon: Building2,
    time: "há 5h",
  },
  {
    title: "Obra iniciada em Lisboa",
    icon: HardHat,
    time: "há 8h",
  },
  {
    title: "Relatório diário enviado",
    icon: FileText,
    time: "ontem",
  },
];

const GRAFICO = [
  { mes: "Jun", valor: 540 },
  { mes: "Jul", valor: 820 },
  { mes: "Ago", valor: 1020 },
  { mes: "Set", valor: 1190 },
  { mes: "Out", valor: 1520 },
];

/* ======================================================
   COMPONENTE PRINCIPAL
====================================================== */
export default function PainelSection() {
  const [ready, setReady] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 15 }}
      transition={{ duration: 0.4 }}
      className="space-y-10"
    >
      {/* Título */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">
          Visão Geral da Operação
        </h1>
        <p className="text-slate-400 text-sm">
          Informações essenciais do ecossistema Acrobatas.
        </p>
      </div>

      {/* ======================================================
          KPIs Premium (4 colunas → mobile 1)
      ======================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {KPI_DATA.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="
              p-5 rounded-xl bg-slate-900/40 border border-slate-800 
              shadow-xl hover:bg-slate-900/60 transition cursor-pointer
            "
          >
            <div className="flex items-start justify-between">
              <kpi.icon className={`w-7 h-7 ${kpi.color}`} />
              <span className="text-xs text-slate-500">{kpi.trend}</span>
            </div>

            <div className="mt-3 text-3xl font-bold">{kpi.value}</div>
            <p className="text-sm font-medium text-slate-300">{kpi.title}</p>
          </motion.div>
        ))}
      </div>

      {/* ======================================================
          Diagnóstico Inteligente (moderno premium)
      ======================================================= */}
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 shadow-xl">
        <h2 className="font-semibold mb-4">Diagnóstico Inteligente</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DIAGNOSTICO.map((item) => (
            <div
              key={item.label}
              className="
                p-4 rounded-lg bg-slate-900/60 
                border border-slate-800 shadow-md
              "
            >
              <div className="text-sm text-slate-400">{item.label}</div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl font-bold">{item.score}</span>
                <span className={`text-xl ${item.color}`}>●</span>
              </div>

              <p className="text-xs text-slate-500 mt-2">{item.desc}</p>

              <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color.replace(
                    "text",
                    "bg"
                  )} rounded-full`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================
          GRID FINAL: Atividades + Estado + Gráfico
      ======================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ===== ATIVIDADES RECENTES ===== */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 shadow-lg">
          <h2 className="font-semibold mb-4">Atividades Recentes</h2>
          <div className="space-y-4">
            {ATIVIDADES.map((a, i) => (
              <div
                key={i}
                className="
                  flex items-center gap-3 p-3 rounded-lg 
                  bg-slate-900/50 border border-slate-800
                "
              >
                <a.icon className="w-6 h-6 text-slate-300" />
                <div className="flex-1">
                  <div className="text-sm">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.time}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-4 text-xs text-blue-400 flex items-center gap-1">
            Ver todas <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* ===== ESTADO DA OPERAÇÃO ===== */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 shadow-lg">
          <h2 className="font-semibold mb-4">Estado da Operação</h2>

          <div className="space-y-4 text-sm">
            <ItemEstado
              icon={CheckCircle2}
              text="Nenhuma obra com atraso crítico"
              color="text-emerald-400"
            />
            <ItemEstado
              icon={AlertTriangle}
              text="Pendências de validação (3)"
              color="text-yellow-400"
            />
            <ItemEstado
              icon={AlertTriangle}
              text="Documentos vencidos (0)"
              color="text-red-400"
            />
          </div>
        </div>

        {/* ===== GRÁFICO PRINCIPAL ===== */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 shadow-lg">
          <h2 className="font-semibold mb-4">Movimento Geral</h2>

          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={GRAFICO}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

/* ======================================================
   SUBCOMPONENTES
====================================================== */
function ItemEstado({ icon: Icon, text, color }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-5 h-5 ${color}`} />
      <span>{text}</span>
    </div>
  );
}
