import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Eye,
  Loader2,
  MessageSquare,
  X,
  Star,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "react-router-dom";

// ===================================================
// 🔹 Função para verificar período
// ===================================================
const verificaPeriodo = (dataCadastro: string, filtro: string) => {
  if (!filtro || filtro === "todos") return true;
  const agora = new Date();
  const data = new Date(dataCadastro);
  const diff = (agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24); // dias
  if (filtro === "7dias") return diff <= 7;
  if (filtro === "30dias") return diff <= 30;
  if (filtro === "mes") return data.getMonth() === agora.getMonth();
  return true;
};

// ===================================================
// 🔹 Renderizar estrelas de confiabilidade
// ===================================================
const renderConfiabilidade = (valor: number | null) => {
  if (valor === null || valor === undefined) return <span className="text-gray-400">—</span>;
  const estrelas = Math.round(valor);
  const cor =
    valor >= 4.5 ? "text-green-500" : valor >= 3 ? "text-yellow-500" : "text-red-500";
  return (
    <span className={`flex items-center gap-1 ${cor}`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < estrelas ? "fill-current" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
};

export default function UsuariosSection() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState("todos");
  const [busca, setBusca] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProfissao, setFiltroProfissao] = useState("");
  const [filtroConfiabilidade, setFiltroConfiabilidade] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [profissoes, setProfissoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalUsuario, setModalUsuario] = useState<any>(null);
  const navigate = useNavigate();

  // ===================================================
  // 🔹 BUSCAR USUÁRIOS DO SUPABASE
  // ===================================================
  const carregarUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) console.error("Erro ao buscar usuários:", error);
    else {
      setUsuarios(data || []);
      const listaProf = [
        ...new Set(
          (data || [])
            .filter((u) => u.profissao)
            .map((u) => u.profissao)
        ),
      ];
      setProfissoes(listaProf);
    }

    setLoading(false);
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // ===================================================
  // 🔹 FILTRAR USUÁRIOS DINAMICAMENTE
  // ===================================================
  const usuariosFiltrados = usuarios.filter((u) => {
    const tipoMatch =
      tipoSelecionado === "todos" || u.tipo_usuario === tipoSelecionado;
    const buscaMatch =
      !busca ||
      u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      u.email?.toLowerCase().includes(busca.toLowerCase());
    const localMatch =
      !filtroLocal ||
      (u.localidade &&
        u.localidade.toLowerCase().includes(filtroLocal.toLowerCase()));
    const statusMatch =
      !filtroStatus || u.status === filtroStatus;
    const profissaoMatch =
      !filtroProfissao || u.profissao === filtroProfissao;
    const confiabMatch =
      !filtroConfiabilidade || u.confiavel_label === filtroConfiabilidade;
    const alertasMatch = !mostrarAlertas || u.alertas_ativos > 0;
    const periodoMatch = verificaPeriodo(u.data_cadastro || u.criado_em, filtroPeriodo);

    return (
      tipoMatch &&
      buscaMatch &&
      localMatch &&
      statusMatch &&
      profissaoMatch &&
      confiabMatch &&
      alertasMatch &&
      periodoMatch
    );
  });

  // ===================================================
  // 🔹 CONTADORES (CARDS)
  // ===================================================
  const cards = [
    {
      key: "todos",
      title: "Total de Usuários",
      color: "from-blue-600 to-blue-400",
      count: usuarios.length,
      icon: <Users className="w-6 h-6 text-white/90" />,
    },
    {
      key: "profissional",
      title: "Profissionais",
      color: "from-sky-500 to-cyan-400",
      count: usuarios.filter((u) => u.tipo_usuario === "profissional").length,
      icon: <Briefcase className="w-6 h-6 text-white/90" />,
    },
    {
      key: "empresa",
      title: "Empresas",
      color: "from-green-500 to-emerald-400",
      count: usuarios.filter((u) => u.tipo_usuario === "empresa").length,
      icon: <ShieldCheck className="w-6 h-6 text-white/90" />,
    },
    {
      key: "admin",
      title: "Administradores",
      color: "from-purple-500 to-indigo-400",
      count: usuarios.filter((u) => u.tipo_usuario === "admin").length,
      icon: <ShieldCheck className="w-6 h-6 text-white/90" />,
    },
  ];

  // ===================================================
  // 🔹 INICIAR CONVERSA
  // ===================================================
  const iniciarConversa = async (usuario: any) => {
    try {
      const { data: novaSessao, error: erroSessao } = await supabase
        .from("chat_sessoes")
        .insert([
          {
            titulo: `Conversa com ${usuario.nome}`,
            profissional_id:
              usuario.tipo_usuario === "profissional" ? usuario.id : null,
            empresa_id:
              usuario.tipo_usuario === "empresa" ? usuario.id : null,
            status: "ativo",
          },
        ])
        .select()
        .single();

      if (erroSessao) throw erroSessao;

      await supabase.from("chat_mensagens").insert([
        {
          sessao_id: novaSessao.id,
          remetente_id: "admin",
          conteudo: "💬 Olá! Esta conversa foi iniciada pelo suporte.",
          tipo: "texto",
        },
      ]);

      setModalUsuario(null);
      navigate("/painel/suporte", { state: { abrirSessaoId: novaSessao.id } });
    } catch (err) {
      console.error("Erro ao criar conversa:", err);
      alert("Erro ao enviar mensagem. Veja o console.");
    }
  };

  // ===================================================
  // 🔹 INTERFACE
  // ===================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-gradient-to-b from-[#f7f9fc] to-[#f0f4fa] p-8 rounded-3xl"
    >
      {/* Cabeçalho */}
      <div className="rounded-2xl p-6 bg-white bg-gray-100 border border-gray-100 border-gray-100 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <Users className="w-6 h-6" /> Gestão de Usuários
        </h2>
        <p className="text-gray-500 text-gray-500 mt-1">
          Visualize, filtre e gerencie os usuários cadastrados no sistema.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card) => (
          <motion.div
            key={card.key}
            onClick={() => setTipoSelecionado(card.key)}
            whileHover={{ scale: 1.03 }}
            className={`p-6 rounded-2xl text-white shadow-lg bg-gradient-to-br ${card.color} cursor-pointer transition-all ${
              tipoSelecionado === card.key ? "ring-4 ring-white/30" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium opacity-90 mb-1">
                  {card.title}
                </h3>
                <motion.p
                  key={card.count}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-4xl font-bold"
                >
                  {card.count}
                </motion.p>
              </div>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filtros + Busca */}
      <div className="bg-white bg-white rounded-2xl shadow border border-gray-100 border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-700 text-lg">
            Usuários Registrados
          </h3>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltroAberto(!filtroAberto)}
              className="flex items-center gap-2 bg-gray-50 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-gray-200 border-gray-200 text-sm text-gray-700 transition"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filtros
            </button>
            <div className="flex items-center gap-2 bg-gray-50 bg-white px-3 py-2 rounded-lg border border-gray-200 border-gray-300">
              <Search className="w-4 h-4 text-gray-500 text-gray-600" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 w-52"
              />
            </div>
          </div>
        </div>

        {/* Painel de filtros avançados */}
        {filtroAberto && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {/* Localidade */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Localidade</label>
              <input
                type="text"
                placeholder="Ex: Lisboa"
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Tipo de Usuário</label>
              <select
                value={tipoSelecionado}
                onChange={(e) => setTipoSelecionado(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none capitalize"
              >
                <option value="todos">Todos</option>
                <option value="profissional">Profissional</option>
                <option value="empresa">Empresa</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Profissão (condicional) */}
            {tipoSelecionado === "profissional" && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Profissão</label>
                <select
                  value={filtroProfissao}
                  onChange={(e) => setFiltroProfissao(e.target.value)}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none capitalize"
                >
                  <option value="">Todas</option>
                  {profissoes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Confiabilidade */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Confiabilidade</label>
              <select
                value={filtroConfiabilidade}
                onChange={(e) => setFiltroConfiabilidade(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              >
                <option value="">Todas</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>

            {/* Período */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Período de Cadastro</label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              >
                <option value="todos">Todos</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="mes">Este mês</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              >
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>

            {/* Checkbox de alertas */}
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={mostrarAlertas}
                onChange={() => setMostrarAlertas(!mostrarAlertas)}
              />
              <label className="text-sm text-gray-600 text-gray-600">
                Mostrar apenas com alertas ativos
              </label>
            </div>

            {/* Botão limpar */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFiltroLocal("");
                  setFiltroStatus("");
                  setBusca("");
                  setTipoSelecionado("todos");
                  setFiltroProfissao("");
                  setFiltroConfiabilidade("");
                  setFiltroPeriodo("");
                  setMostrarAlertas(false);
                }}
                className="flex items-center justify-center gap-2 w-full bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg px-3 py-2 font-medium text-sm transition"
              >
                <X className="w-4 h-4" /> Limpar Filtros
              </button>
            </div>
          </motion.div>
        )}

        {/* Lista de usuários */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-left text-gray-600 text-gray-700 border-b">
                  <th className="p-3 text-sm font-semibold">Nome</th>
                  <th className="p-3 text-sm font-semibold">Tipo</th>
                  <th className="p-3 text-sm font-semibold">Profissão</th>
                  <th className="p-3 text-sm font-semibold">Localidade</th>
                  <th className="p-3 text-sm font-semibold">Cadastrado em</th>
                  <th className="p-3 text-sm font-semibold">Confiabilidade</th>
                  <th className="p-3 text-sm font-semibold">Status</th>
                  <th className="p-3 text-sm font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b last:border-none hover:bg-gray-50 dark:bg-zinc-950 transition"
                  >
                    <td className="p-3 text-sm text-gray-800">{u.nome}</td>
                    <td className="p-3 text-sm text-gray-700 capitalize">{u.tipo_usuario}</td>
                    <td className="p-3 text-sm text-gray-700">{u.profissao || "—"}</td>
                    <td className="p-3 text-sm text-gray-700">{u.localidade || "—"}</td>
                    <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      {u.data_cadastro
                        ? new Date(u.data_cadastro).toLocaleDateString("pt-PT")
                        : "—"}
                    </td>
                    <td className="p-3 text-sm">{renderConfiabilidade(u.confiabilidade)}</td>
                    <td className="p-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          u.status === "ativo"
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {u.status || "—"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setModalUsuario(u)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 float-right"
                      >
                        <Eye className="w-4 h-4" /> Ver Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuariosFiltrados.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                Nenhum usuário encontrado com os filtros aplicados.
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
