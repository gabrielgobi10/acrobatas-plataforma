// src/components/company/Relatorios.tsx
"use client";

import { useState, useEffect } from "react";
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
  const custosOperacionais = faturamentoTotal * (custoPercent / 100);
  const lucroLiquido = faturamentoTotal - custosOperacionais;

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
  const cores = ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b"];

  const dadosFinanceiros = [
    { mes: "Jan", faturamento: 75000, custos: 52000, lucro: 23000 },
    { mes: "Fev", faturamento: 82000, custos: 58000, lucro: 24000 },
    { mes: "Mar", faturamento: 91000, custos: 61000, lucro: 30000 },
    { mes: "Abr", faturamento: 102000, custos: 72000, lucro: 30000 },
    { mes: "Mai", faturamento: 125000, custos: 78500, lucro: 46500 },
  ];

  const dadosCustos = [
    { name: "Custos Operacionais", value: custosOperacionais },
    { name: "Lucro Líquido", value: lucroLiquido },
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Carregando dados...
      </div>
    );

  /* ==========================
   *   LAYOUT
   * ========================== */
  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 sm:space-y-10">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-500 text-white rounded-2xl shadow-lg"
      >
        <div className="p-4 sm:p-6">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            Relatórios e Desempenho Geral
          </h1>
          <p className="text-xs sm:text-sm opacity-80 mt-1">
            Acompanhe métricas financeiras, produtividade e desempenho global da empresa.
          </p>

          <div className="flex gap-2 sm:gap-3 flex-wrap mt-3 sm:mt-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-all px-3 sm:px-4 py-2 rounded-lg"
            >
              <RefreshCcw className="w-4 h-4" /> Atualizar
            </button>
            <button className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-100 dark:bg-[#1e2a3a] dark:text-blue-400 transition-all px-3 sm:px-4 py-2 rounded-lg">
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>
      </motion.div>

      {/* ================= DESKTOP ================= */}
      <div className="hidden md:block space-y-8">
        <div className="grid grid-cols-5 gap-4">
          <CardIndicador
            titulo="Faturamento Total"
            valor={`€${faturamentoTotal.toLocaleString()}`}
            cor="from-blue-500 to-cyan-500"
            icone={<DollarSign />}
            variacao="+12%"
          />
          <CardIndicador
            titulo="Custos Operacionais"
            valor={`€${custosOperacionais.toLocaleString()}`}
            cor="from-green-500 to-emerald-500"
            icone={<ArrowDownCircle />}
            variacao={`${custoPercent}%`}
          />
          <CardLucroLiquido
            valor={`€${lucroLiquido.toLocaleString()}`}
            custoPercent={custoPercent}
            setCustoPercent={setCustoPercent}
            onSalvar={handleSalvarPercent}
          />
          <CardIndicador
            titulo="Produtividade Média"
            valor="87%"
            cor="from-yellow-500 to-orange-500"
            icone={<TrendingUp />}
            variacao="↑ Estável"
          />
          <CardIndicador
            titulo="Pontualidade"
            valor="93%"
            cor="from-indigo-500 to-blue-700"
            icone={<Building2 />}
            variacao="↑ Boa"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-3 gap-6">
          <GraficoCard titulo="Evolução Financeira (€)" icone={<TrendingUp className="text-blue-600" />}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dadosFinanceiros}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="mes" stroke="#999" />
                <Tooltip />
                <Line type="monotone" dataKey="faturamento" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="custos" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </GraficoCard>

          <GraficoCard titulo="Custos x Lucro" icone={<PieIcon className="text-green-600" />}>
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
                    <Cell key={i} fill={cores[i % cores.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChartRecharts>
            </ResponsiveContainer>
          </GraficoCard>

          <GraficoCard titulo="Produtividade por Equipe" icone={<BarChart3 className="text-orange-500" />}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosProdutividade}>
                <XAxis dataKey="nome" stroke="#999" />
                <Tooltip />
                <Bar dataKey="produtividade" fill="#3b82f6" radius={[10, 10, 0, 0]} />
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
        <div className="grid grid-cols-2 gap-3">
          <KpiMobile titulo="Faturamento" valor={`€${faturamentoTotal.toLocaleString()}`} grad="from-blue-500 to-cyan-500" />
          <KpiMobile titulo="Custos" valor={`€${custosOperacionais.toLocaleString()}`} grad="from-green-500 to-emerald-500" />
          <KpiMobile titulo="Lucro" valor={`€${lucroLiquido.toLocaleString()}`} grad="from-fuchsia-500 to-purple-500" />
          <KpiMobile titulo="Produtividade" valor="87%" grad="from-yellow-500 to-orange-500" />
        </div>

        {/* Input de % */}
        <div className="bg-[#0f1724] dark:bg-[#161d27] rounded-2xl p-4 text-white shadow-md border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm">Percentual de Custo Operacional</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={custoPercent}
              onChange={(e) => setCustoPercent(Number(e.target.value))}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg w-20 text-center focus:outline-none"
            />
            <button
              onClick={handleSalvarPercent}
              className="flex-1 bg-blue-600 hover:bg-blue-700 transition-all py-2 rounded-lg text-sm"
            >
              Salvar
            </button>
          </div>
        </div>

        {/* Carrossel */}
        <div className="bg-[#0f1724] dark:bg-[#161d27] border border-gray-100/10 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/90">
              {slide === 0
                ? "Evolução Financeira (€)"
                : slide === 1
                ? "Custos x Lucro"
                : "Produtividade"}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setSlide((slide + 2) % 3)} className="w-8 h-8 rounded-full bg-white/10 text-white/70">‹</button>
              <button onClick={() => setSlide((slide + 1) % 3)} className="w-8 h-8 rounded-full bg-white/10 text-white/70">›</button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              {slide === 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dadosFinanceiros}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3647" />
                    <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="faturamento" stroke="#60a5fa" strokeWidth={2} />
                    <Line type="monotone" dataKey="custos" stroke="#f87171" strokeWidth={2} />
                    <Line type="monotone" dataKey="lucro" stroke="#34d399" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {slide === 1 && (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChartRecharts>
                    <Pie
                      data={dadosCustos}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {dadosCustos.map((_, i) => (
                        <Cell key={i} fill={cores[i % cores.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChartRecharts>
                </ResponsiveContainer>
              )}
              {slide === 2 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dadosProdutividade}>
                    <XAxis dataKey="nome" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="produtividade" fill="#3b82f6" radius={[8, 8, 0, 0]} />
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
                className={`w-2.5 h-2.5 rounded-full ${
                  slide === i ? "bg-blue-500 scale-110" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Rankings */}
        <div className="space-y-4">
          <RankingCard titulo="Obras com Melhor Lucro" dados={obrasTop} />
          <RankingCard titulo="Profissionais Destaque" dados={profissionaisTop} />
        </div>
      </div>
    </div>
  );
}

/* ===== COMPONENTES ===== */
function CardIndicador({ titulo, valor, cor, icone, variacao }: any) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className={`bg-gradient-to-r ${cor} text-white p-5 rounded-2xl shadow-lg`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm opacity-90">{titulo}</span>
        {icone}
      </div>
      <h3 className="text-2xl font-bold">{valor}</h3>
      <span className="text-sm opacity-90">{variacao}</span>
    </motion.div>
  );
}

function CardLucroLiquido({ valor, custoPercent, setCustoPercent, onSalvar }: any) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-5 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm opacity-90">Lucro Líquido</span>
        <ArrowUpCircle />
      </div>
      <h3 className="text-2xl font-bold">{valor}</h3>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="number"
          value={custoPercent}
          onChange={(e) => setCustoPercent(Number(e.target.value))}
          className="text-black px-2 py-1 rounded-md w-14 text-center focus:outline-none"
        />
        <button
          onClick={onSalvar}
          className="bg-white text-purple-700 font-semibold px-3 py-1 rounded-md hover:bg-purple-100 transition"
        >
          Salvar
        </button>
      </div>
    </motion.div>
  );
}

/* KPI compacto (mobile) */
function KpiMobile({ titulo, valor, grad }: any) {
  return (
    <div
      className={`bg-gradient-to-br ${grad} text-white rounded-xl p-3 shadow-md h-[86px] flex flex-col justify-between`}
    >
      <span className="text-[11px] leading-tight opacity-90">{titulo}</span>
      <strong className="text-lg leading-none">{valor}</strong>
    </div>
  );
}

/* Cartão de gráfico (desktop e carrossel) */
function GraficoCard({ titulo, icone, children }: any) {
  return (
    <div className="bg-white dark:bg-[#161d27] border border-gray-100 dark:border-[#1f2a37] rounded-2xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
        {icone} {titulo}
      </h2>
      {children}
    </div>
  );
}

/* Ranking de obras/profissionais */
function RankingCard({ titulo, dados }: any) {
  if (!dados || dados.length === 0) {
    return (
      <div className="bg-white dark:bg-[#161d27] border border-gray-100 dark:border-[#1f2a37] rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 h-[180px]">
        <p>Nenhum dado disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#161d27] border border-gray-100 dark:border-[#1f2a37] rounded-2xl p-4 sm:p-5 shadow-sm">
      <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">
        {titulo}
      </h2>
      <div className="space-y-2 sm:space-y-3">
        {dados.map((item: any, i: number) => (
          <div
            key={i}
            className="flex justify-between items-center bg-gray-50 dark:bg-[#1e2a3a] hover:bg-gray-100 dark:hover:bg-[#263447] px-3 py-2 sm:p-3 rounded-lg transition-all"
          >
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                {item.nome}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {item.subtitulo || `⭐ ${item.avaliacao}`}
              </p>
            </div>
            <p className="font-medium text-blue-600 dark:text-blue-400 text-sm sm:text-base">
              {item.valor ||
                (item.lucro
                  ? `€${item.lucro.toLocaleString()}`
                  : item.funcao || "-")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
