import { useEffect, useState } from "react";
import {
  Users,
  Briefcase,
  Building2,
  FileWarning,
  TrendingUp,
  Sparkles,
  Clock,
  AlertTriangle,
  FileText,
  PlusCircle,
  Receipt,
  CheckSquare,
  HardHat,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "react-router-dom";

// =====================================================
// Painel Administrativo Inteligente (Completo)
// =====================================================
export default function PainelSection() {
  const navigate = useNavigate();

  // ========= 1️⃣ Cards Principais =========
  const [cards, setCards] = useState([
    {
      id: "profissionais",
      titulo: "Profissionais Ativos",
      valor: 0,
      variacao: 0,
      ultimaAtualizacao: null,
      rota: "/admin/profissionais",
      icone: <Users className="w-6 h-6" />,
      cor: "from-blue-500 to-blue-400",
    },
    {
      id: "empresas",
      titulo: "Empresas Parceiras",
      valor: 0,
      variacao: 0,
      ultimaAtualizacao: null,
      rota: "/admin/empresas",
      icone: <Briefcase className="w-6 h-6" />,
      cor: "from-green-500 to-emerald-400",
    },
    {
      id: "obras",
      titulo: "Obras Ativas",
      valor: 0,
      variacao: 0,
      ultimaAtualizacao: null,
      rota: "/admin/obras",
      icone: <Building2 className="w-6 h-6" />,
      cor: "from-purple-500 to-indigo-400",
    },
    {
      id: "faturamento",
      titulo: "Faturamento do Mês (€)",
      valor: 0,
      variacao: 0,
      ultimaAtualizacao: null,
      rota: "/admin/financeiro",
      icone: <TrendingUp className="w-6 h-6" />,
      cor: "from-yellow-500 to-amber-400",
    },
    {
      id: "pendencias",
      titulo: "Pendências Atuais",
      valor: 0,
      variacao: 0,
      ultimaAtualizacao: null,
      rota: "/admin/pendencias",
      icone: <FileWarning className="w-6 h-6" />,
      cor: "from-rose-500 to-pink-400",
    },
  ]);

  // ========= 2️⃣ Alertas =========
  const [alertas, setAlertas] = useState([]);

  // ========= 3️⃣ IA Recomendações =========
  const [iaRecomendacoes, setIaRecomendacoes] = useState({
    recomendou: [],
    detectou: [],
    previu: [],
  });

  // ========= 4️⃣ Gráficos =========
  const [periodo, setPeriodo] = useState("Mensal");

  const dataMensal = [
    { mes: "Jan", cadastros: 50 },
    { mes: "Fev", cadastros: 90 },
    { mes: "Mar", cadastros: 130 },
    { mes: "Abr", cadastros: 80 },
    { mes: "Mai", cadastros: 140 },
    { mes: "Jun", cadastros: 120 },
  ];

  const dadosPie = [
    { nome: "Profissionais", valor: 58, cor: "#3B82F6" },
    { nome: "Empresas", valor: 12, cor: "#22C55E" },
    { nome: "Administradores", valor: 7, cor: "#A855F7" },
  ];

  // ========= 5️⃣ Atividades =========
  const [atividades, setAtividades] = useState([]);

  // ========= 6️⃣ Resumo Diário =========
  const [resumo, setResumo] = useState(null);

  // ========= 🔄 Buscar dados =========
  useEffect(() => {
    async function fetchCards() {
      const { data: profissionais } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "profissional");

      const { data: empresas } = await supabase
        .from("usuarios")
        .select("*")
        .eq("tipo_usuario", "empresa");

      const { data: obras } = await supabase
        .from("obras")
        .select("*")
        .eq("status", "ativa");

      const { data: faturamento } = await supabase.rpc("get_faturamento_mes");

      const { data: pendencias } = await supabase
        .from("alertas")
        .select("*")
        .eq("status", "pendente");

      setCards((prev) =>
        prev.map((card) => {
          const base = {
            profissionais: profissionais?.length || 0,
            empresas: empresas?.length || 0,
            obras: obras?.length || 0,
            faturamento: faturamento?.[0]?.valor_total || 0,
            pendencias: pendencias?.length || 0,
          };
          return {
            ...card,
            valor: base[card.id],
            variacao: Math.floor(Math.random() * 15) - 5, // Mock de variação
            ultimaAtualizacao: new Date().toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        })
      );
    }

    async function fetchAlertas() {
      const { data } = await supabase
        .from("alertas")
        .select("*")
        .order("prioridade", { ascending: true });
      setAlertas(data || []);
    }

    async function fetchAtividades() {
      const { data } = await supabase
        .from("atividades")
        .select("*")
        .order("criado_em", { ascending: false });
      setAtividades(data || []);
    }

    async function fetchResumo() {
      const { data } = await supabase.rpc("get_resumo_dia");
      setResumo(data);
    }

    // IA Simulada
    setIaRecomendacoes({
      recomendou: [
        "📋 Enviar Pedro Silva para obra Porto Paranhos.",
        "🏢 Priorizar empresa Casais para novos contratos.",
      ],
      detectou: [
        "⚠️ Queda de produtividade de Ana Torres (-18%).",
        "💡 Obra de Lisboa com 60% de atraso estimado.",
      ],
      previu: [
        "📈 Receita estimada novembro: €67.000 (+12%).",
        "🏗️ 2 obras com risco alto — Porto Paranhos e Quiet Studio.",
      ],
    });

    fetchCards();
    fetchAlertas();
    fetchAtividades();
    fetchResumo();
  }, []);

  // ========= Supabase Realtime - Atividades =========
  useEffect(() => {
    const canal = supabase
      .channel("atividades")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atividades" },
        (payload) => {
          setAtividades((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  // =====================================================
  // Render principal
  // =====================================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen p-6 bg-[#f8fafc] space-y-8"
    >
      {/* =================== Linha 1 - Cards Principais =================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {cards.map((c) => (
          <motion.div
            key={c.id}
            onClick={() => navigate(c.rota)}
            whileHover={{ scale: 1.03 }}
            className={`cursor-pointer bg-gradient-to-br ${c.cor} text-white p-5 rounded-2xl shadow-md flex justify-between items-center`}
          >
            <div>
              <h4 className="text-sm opacity-90">{c.titulo}</h4>
              <p className="text-3xl font-bold mt-1">
                {c.id === "faturamento" ? "€" : ""} {c.valor}
              </p>
              <p
                className={`text-xs mt-1 ${
                  c.variacao >= 0 ? "text-green-200" : "text-red-200"
                }`}
              >
                {c.variacao >= 0 ? "↑" : "↓"} {Math.abs(c.variacao)}% vs mês anterior
              </p>
              <p className="text-[11px] text-white/70 mt-1">
                Atualizado às {c.ultimaAtualizacao}
              </p>
            </div>
            <div className="bg-white bg-gray-100/20 p-3 rounded-xl">{c.icone}</div>
          </motion.div>
        ))}
      </div>

      {/* =================== Linha 2 - Alertas Automáticos =================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white bg-white rounded-2xl p-5 shadow-sm border">
        {alertas.map((a) => (
          <div
            key={a.id}
            onClick={() => alert(JSON.stringify(a.detalhes, null, 2))}
            className={`flex items-center justify-between px-4 py-3 rounded-xl shadow-sm cursor-pointer ${
              a.prioridade === 1
                ? "bg-red-50 text-red-700"
                : a.prioridade === 2
                ? "bg-orange-50 text-orange-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            <span>{a.mensagem}</span>
            <button className="text-xs underline opacity-70 hover:opacity-100">
              Ver detalhes
            </button>
          </div>
        ))}
      </div>

      {/* =================== Linha 3 - Recomendações da IA =================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(iaRecomendacoes).map(([cat, lista]) => (
          <div key={cat} className="bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-700 mb-3 capitalize">
              {cat === "recomendou"
                ? "🤖 IA Recomendou"
                : cat === "detectou"
                ? "⚠️ IA Detectou"
                : "📈 IA Previu"}
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 text-gray-600">
              {lista.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* =================== Linha 4 - Gráficos =================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gráfico 1 */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">Novos Registos</h3>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm text-gray-600 text-gray-700"
            >
              <option>Mensal</option>
              <option>Trimestral</option>
              <option>Anual</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataMensal}>
              <XAxis dataKey="mes" stroke="#94A3B8" />
              <Tooltip />
              <Bar dataKey="cadastros" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 text-gray-500 mt-2">
            📊 Crescimento médio: +23% nos últimos 3 meses.
          </p>
        </div>

        {/* Gráfico 2 */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3">
            Distribuição de Usuários
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dadosPie}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="valor"
              >
                {dadosPie.map((d, i) => (
                  <Cell key={i} fill={d.cor} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3 */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3">
            Obras Iniciadas / Concluídas
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dataMensal}>
              <XAxis dataKey="mes" stroke="#94A3B8" />
              <Tooltip />
              <Bar dataKey="cadastros" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =================== Linha 5 - Timeline =================== */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" /> Atividades Recentes
        </h3>
        <div className="relative border-l-2 border-gray-100 border-gray-100 ml-4">
          {atividades.map((a) => (
            <div
              key={a.id}
              onClick={() => navigate(`/perfil/${a.entidade}`)}
              className="relative pl-6 mb-5 cursor-pointer hover:opacity-80"
            >
              <span className="absolute -left-2 top-1">
                <AlertTriangle className="w-3 h-3 text-blue-500" />
              </span>
              <p className="text-sm text-gray-700">
                {a.descricao} —{" "}
                <span className="text-gray-500 text-gray-600 text-xs">
                  {new Date(a.criado_em).toLocaleTimeString("pt-PT")}
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="text-right mt-3">
          <button
            onClick={() => navigate("/admin/atividades")}
            className="text-xs text-blue-600 hover:underline"
          >
            Ver tudo →
          </button>
        </div>
      </div>

      {/* =================== Linha 6 - Resumo Diário =================== */}
      {resumo && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">
            Resumo Diário — {resumo.data}
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>🏢 {resumo.empresas_novas} novas empresas cadastradas</li>
            <li>👷 {resumo.profissionais_ativos} profissionais iniciaram obra</li>
            <li>💰 Receita total do dia: €{resumo.receita_dia}</li>
            <li>📊 Status: {resumo.status}</li>
          </ul>
        </div>
      )}

      {/* =================== Linha 7 - Barra Fixa =================== */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex gap-4 bg-white dark:bg-zinc-900/80 backdrop-blur-md shadow-lg rounded-full px-6 py-3 z-50">
        {[
          { icone: <PlusCircle className="w-5 h-5" />, texto: "Novo Pedido" },
          { icone: <Receipt className="w-5 h-5" />, texto: "Gerar Fatura" },
          { icone: <CheckSquare className="w-5 h-5" />, texto: "Aprovar Empresa" },
          { icone: <HardHat className="w-5 h-5" />, texto: "Cadastrar Obra" },
          { icone: <Settings className="w-5 h-5" />, texto: "Gerar Relatório IA" },
        ].map((b, i) => (
          <button
            key={i}
            title={`${b.texto} — executar ação rapidamente`}
            className="flex items-center gap-2 bg-gray-50 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition"
          >
            {b.icone} {b.texto}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
