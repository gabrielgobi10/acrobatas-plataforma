// src/components/company/Relatorios.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  RefreshCcw,
  Download,
  Percent,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  CartesianGrid,
  Pie,
  PieChart as PieChartRecharts,
  Cell,
  Bar,
  BarChart,
} from "recharts";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* ===========================
   Paleta neutra p/ gráficos
   =========================== */
const COLOR_PRIMARY = "#3b82f6"; // blue-500
const COLOR_SECONDARY = "#64748b"; // slate-500
const COLOR_SUCCESS = "#10b981"; // emerald-500
const GRID_LIGHT = "#eef2f7";
const GRID_DARK = "rgba(148,163,184,0.15)";

const fmtEUR = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function Relatorios() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [slide, setSlide] = useState(0);
  const [faturamentoTotal, setFaturamentoTotal] = useState(0);
  const [custoPercent, setCustoPercent] = useState<number>(0);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ==========================
   *   BUSCA DE DADOS
   * ========================== */
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      setLoading(true);

      try {
        // Empresa (id + custo_operacional_percent)
        const { data: empresa } = await supabase
          .from("empresas")
          .select("id, custo_operacional_percent")
          .eq("auth_id", user.id)
          .single();

        if (empresa) {
          setEmpresaId(empresa.id);
          setCustoPercent(Number(empresa.custo_operacional_percent || 0));
        }

        // Faturamento total (somatório dos custos das obras da empresa)
        const { data: obras } = await supabase
          .from("obras")
          .select("custo_total")
          .eq("empresa_id", empresa?.id);

        const total = obras?.reduce(
          (sum: number, item: any) => sum + Number(item.custo_total || 0),
          0
        );

        setFaturamentoTotal(total || 0);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  /* ==========================
   *   CÁLCULOS
   * ========================== */
  const custosOperacionais = useMemo(
    () => faturamentoTotal * (custoPercent / 100),
    [faturamentoTotal, custoPercent]
  );
  const lucroLiquido = useMemo(
    () => faturamentoTotal - custosOperacionais,
    [faturamentoTotal, custosOperacionais]
  );

  async function handleSalvarPercent() {
    if (!empresaId) return;
    try {
      await supabase
        .from("empresas")
        .update({ custo_operacional_percent: custoPercent })
        .eq("id", empresaId);
      alert("Percentual atualizado com sucesso!");
    } catch {
      alert("Erro ao salvar percentual.");
    }
  }

  /* ==========================
   *   MOCKS & GRÁFICOS
   * ========================== */
  const pieColors = [COLOR_PRIMARY, COLOR_SECONDARY];

  const dadosFinanceiros = [
    { mes: "Jan", faturamento: 75000, custos: 52000, lucro: 23000 },
    { mes: "Fev", faturamento: 82000, custos: 58000, lucro: 24000 },
    { mes: "Mar", faturamento: 91000, custos: 61000, lucro: 30000 },
    { mes: "Abr", faturamento: 102000, custos: 72000, lucro: 30000 },
    { mes: "Mai", faturamento: 125000, custos: 78500, lucro: 46500 },
  ];

  const dadosCustos = [
    { name: "Custos Operacionais", value: Math.max(custosOperacionais, 0) },
    { name: "Lucro Líquido", value: Math.max(lucroLiquido, 0) },
  ];

  const dadosProdutividade = [
    { nome: "Equipa A", produtividade: 92 },
    { nome: "Equipa B", produtividade: 85 },
    { nome: "Equipa C", produtividade: 78 },
    { nome: "Equipa D", produtividade: 88 },
  ];

  const obrasTop = [
    { nome: "Residencial Porto Alto", lucro: 18500, avaliacao: 4.8 },
    { nome: "Hotel da Serra", lucro: 16200, avaliacao: 4.9 },
    { nome: "Condomínio Vale Verde", lucro: 15000, avaliacao: 4.5 },
  ];

  const profissionaisTop = [
    { nome: "André Sousa", funcao: "Canalizador", avaliacao: 4.9 },
    { nome: "Ricardo Alves", funcao: "Eletricista", avaliacao: 4.8 },
    { nome: "Marcos Silva", funcao: "Pintor", avaliacao: 4.7 },
  ];

  /* ==========================
   *   LAYOUT
   * ========================== */
  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* HEADER — instantâneo; sem bloquear a renderização */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1724] shadow-sm"
      >
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <div className="sm:col-span-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Relatórios e Desempenho Geral
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Acompanhe métricas financeiras, produtividade e desempenho global da empresa.
              </p>
            </div>

            <div className="flex sm:justify-end gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#0b1220] text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl"
              >
                <RefreshCcw className="w-4 h-4" />
                {loading ? "Atualizando…" : "Atualizar"}
              </button>
              <button
                disabled={loading || faturamentoTotal === 0}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-[#0b1a33] text-blue-700 dark:text-blue-300 px-4 py-2.5 rounded-xl ${
                  loading || faturamentoTotal === 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-100 dark:hover:bg-[#0e2242]"
                }`}
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================= DESKTOP ================= */}
      <div className="hidden md:block space-y-10">
        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          <CardIndicador
            titulo="Faturamento Total"
            valor={fmtEUR.format(faturamentoTotal)}
            icone={<DollarSign className="w-5 h-5" />}
            hint="+12%"
          />
          <CardIndicador
            titulo="Custos Operacionais"
            valor={fmtEUR.format(custosOperacionais)}
            icone={<ArrowDownCircle className="w-5 h-5" />}
            hint={`${custoPercent}%`}
          />
          <CardLucroLiquido
            valor={fmtEUR.format(lucroLiquido)}
            custoPercent={custoPercent}
            setCustoPercent={setCustoPercent}
            onSalvar={handleSalvarPercent}
          />
          <CardIndicador
            titulo="Produtividade Média"
            valor="87%"
            icone={<TrendingUp className="w-5 h-5" />}
            hint="Estável"
          />
          <CardIndicador
            titulo="Pontualidade"
            valor="93%"
            icone={<Building2 className="w-5 h-5" />}
            hint="Boa"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-3 gap-6">
          <GraficoCard
            titulo="Evolução Financeira (€)"
            icone={<TrendingUp className="text-blue-600 dark:text-blue-400" />}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dadosFinanceiros}>
                <CartesianGrid strokeDasharray="2 4" stroke={GRID_LIGHT} />
                <XAxis dataKey="mes" stroke="#9ca3af" />
                <Tooltip />
                <Line type="monotone" dataKey="faturamento" stroke={COLOR_PRIMARY} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="custos" stroke={COLOR_SECONDARY} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lucro" stroke={COLOR_SUCCESS} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GraficoCard>

          <GraficoCard
            titulo="Custos x Lucro"
            icone={<PieIcon className="text-blue-600 dark:text-blue-400" />}
          >
            {faturamentoTotal > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChartRecharts>
                  <Pie
                    data={dadosCustos}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label
                  >
                    {dadosCustos.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChartRecharts>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </GraficoCard>

          <GraficoCard
            titulo="Produtividade por Equipe"
            icone={<BarChart3 className="text-blue-600 dark:text-blue-400" />}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosProdutividade}>
                <XAxis dataKey="nome" stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="produtividade" fill={COLOR_PRIMARY} radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GraficoCard>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-2 gap-6">
          <RankingCard titulo="Obras com Melhor Lucro" dados={obrasTop} />
          <RankingCard titulo="Profissionais Destaque" dados={profissionaisTop} />
        </div>
      </div>

      {/* ================= MOBILE ================= */}
      <div className="md:hidden space-y-6">
        {/* KPIs */}
        <section aria-label="Indicadores">
          <div className="grid grid-cols-2 gap-3">
            <KpiMobile
              titulo="Faturamento"
              valor={fmtEUR.format(faturamentoTotal)}
              icone={<DollarSign className="w-4 h-4" />}
            />
            <KpiMobile
              titulo="Custos"
              valor={fmtEUR.format(custosOperacionais)}
              icone={<ArrowDownCircle className="w-4 h-4" />}
            />
            <KpiMobile
              titulo="Lucro"
              valor={fmtEUR.format(lucroLiquido)}
              icone={<ArrowUpCircle className="w-4 h-4" />}
            />
            <KpiMobile
              titulo="Produtividade"
              valor="87%"
              icone={<TrendingUp className="w-4 h-4" />}
            />
          </div>
        </section>

        {/* Percentual de Custo Operacional */}
        <section
          aria-label="Percentual de Custo Operacional"
          className="rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1724]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100">
              Percentual de Custo Operacional
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                aria-label="Diminuir percentual"
                onClick={() => setCustoPercent((v) => Math.max(0, v - 1))}
                className="px-3 py-2 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#111827] active:scale-[0.98]"
              >
                –
              </button>
              <input
                type="number"
                value={custoPercent}
                onChange={(e) => setCustoPercent(Number(e.target.value))}
                className="bg-white dark:bg-[#0f1724] text-gray-900 dark:text-gray-100 px-3 py-2 w-20 text-center outline-none"
              />
              <button
                aria-label="Aumentar percentual"
                onClick={() => setCustoPercent((v) => Math.min(100, v + 1))}
                className="px-3 py-2 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#111827] active:scale-[0.98]"
              >
                +
              </button>
            </div>

            <button
              onClick={handleSalvarPercent}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-all py-2.5 rounded-lg text-sm"
            >
              Salvar
            </button>
          </div>
        </section>

        {/* Carrossel */}
        <section
          aria-label="Gráficos"
          className="rounded-2xl p-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1724]"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {slide === 0 ? "Evolução Financeira (€)" : slide === 1 ? "Custos x Lucro" : "Produtividade"}
            </h3>
            <div className="flex items-center gap-2">
              <NavBtn onClick={() => setSlide((slide + 2) % 3)} ariaLabel="Anterior">
                <ChevronLeft className="w-4 h-4" />
              </NavBtn>
              <NavBtn onClick={() => setSlide((slide + 1) % 3)} ariaLabel="Próximo">
                <ChevronRight className="w-4 h-4" />
              </NavBtn>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              {slide === 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dadosFinanceiros}>
                    <CartesianGrid strokeDasharray="2 4" stroke={GRID_DARK} />
                    <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="faturamento" stroke={COLOR_PRIMARY} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="custos" stroke={COLOR_SECONDARY} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="lucro" stroke={COLOR_SUCCESS} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {slide === 1 && (
                faturamentoTotal > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChartRecharts>
                      <Pie
                        data={dadosCustos}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label
                      >
                        {dadosCustos.map((_, i) => (
                          <Cell key={i} fill={pieColors[i % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChartRecharts>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState height={220} />
                )
              )}
              {slide === 2 && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosProdutividade}>
                    <XAxis dataKey="nome" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="produtividade" fill={COLOR_PRIMARY} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 mt-3">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`h-3.5 px-2 rounded-full transition ${
                  slide === i ? "bg-blue-600 dark:bg-blue-400" : "bg-gray-300 dark:bg-gray-600"
                }`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
        </section>

        {/* Rankings */}
        <section className="space-y-4">
          <RankingCard titulo="Obras com Melhor Lucro" dados={obrasTop} />
          <RankingCard titulo="Profissionais Destaque" dados={profissionaisTop} />
        </section>
      </div>
    </div>
  );
}

/* ===== COMPONENTES ===== */

function NavBtn({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-200 active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

/** Card KPI neutro, com ícone em badge consistente */
function CardIndicador({
  titulo,
  valor,
  icone,
  hint,
}: {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
  hint?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1724] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{titulo}</span>
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 dark:bg-[#0b1a33] dark:text-blue-300">
          {icone}
        </div>
      </div>
      <h3 className="text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100">{valor}</h3>
      {hint && <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 inline-block">{hint}</span>}
    </motion.div>
  );
}

/** Card de lucro com input % — visual neutro */
function CardLucroLiquido({
  valor,
  custoPercent,
  setCustoPercent,
  onSalvar,
}: {
  valor: string;
  custoPercent: number;
  setCustoPercent: (n: number) => void;
  onSalvar: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.015 }}
      className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1724] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Lucro Líquido</span>
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ArrowUpCircle className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100">{valor}</h3>

      <div className="flex items-center gap-2 mt-3">
        <input
          type="number"
          value={custoPercent}
          onChange={(e) => setCustoPercent(Number(e.target.value))}
          className="bg-gray-50 dark:bg-[#111827] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-2.5 py-2 rounded-lg w-20 text-center focus:outline-none"
        />
        <button
          onClick={onSalvar}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg transition"
        >
          Salvar
        </button>
      </div>
    </motion.div>
  );
}

/** KPI compacto (mobile) com ícone e altura uniforme */
function KpiMobile({
  titulo,
  valor,
  icone,
}: {
  titulo: string;
  valor: string;
  icone?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-3 shadow-sm h-[92px] flex flex-col justify-between border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f1724]">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        {icone && <span className="text-blue-600 dark:text-blue-400">{icone}</span>}
        <span className="text-[11px] leading-tight">{titulo}</span>
      </div>
      <strong className="text-lg leading-none text-gray-900 dark:text-gray-100">{valor}</strong>
    </div>
  );
}

/** Cartão de gráfico */
function GraficoCard({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#0f1724] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        {icone} {titulo}
      </h2>
      {children}
    </div>
  );
}

/** Ranking de obras/profissionais */
function RankingCard({ titulo, dados }: any) {
  if (!dados || dados.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0f1724] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 h-[180px]">
        <p>Nenhum dado disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0f1724] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
        {titulo}
      </h2>
      <div className="space-y-2 sm:space-y-3">
        {dados.map((item: any, i: number) => (
          <div
            key={i}
            className="flex justify-between items-center bg-gray-50 dark:bg-[#111827] hover:bg-gray-100 dark:hover:bg-[#0b1220] px-3 py-2 sm:p-3 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                {item.nome}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {item.subtitulo || `⭐ ${item.avaliacao}`}
              </p>
            </div>
            <p className="font-medium text-blue-600 dark:text-blue-400 text-sm sm:text-base">
              {item.valor ||
                (item.lucro
                  ? fmtEUR.format(item.lucro)
                  : item.funcao || "-")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder elegante para gráficos sem dados */
function EmptyState({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 rounded-xl border border-dashed border-gray-200 dark:border-gray-700"
      style={{ height }}
    >
      <div className="text-sm">Sem dados suficientes.</div>
      <div className="text-xs">Registe custos ou faturamento para visualizar.</div>
    </div>
  );
}
