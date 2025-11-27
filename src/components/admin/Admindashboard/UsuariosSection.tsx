// src/components/admin/Admindashboard/UsuariosSection.tsx
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
  X,
  Star,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

// ===================================================
// 🔹 Verifica período
// ===================================================
const verificaPeriodo = (dataCadastro: string, filtro: string) => {
  if (!filtro || filtro === "todos") return true;
  const agora = new Date();
  const data = new Date(dataCadastro);
  const diff = (agora.getTime() - data.getTime()) / (1000 * 60 * 60 * 24);

  if (filtro === "7dias") return diff <= 7;
  if (filtro === "30dias") return diff <= 30;
  if (filtro === "mes") return data.getMonth() === agora.getMonth();
  return true;
};

// ===================================================
// 🔹 Renderizar estrelas
// ===================================================
const renderConfiabilidade = (valor: number | null) => {
  if (!valor) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }

  const estrelas = Math.round(valor);
  const cor =
    valor >= 4.5
      ? "text-emerald-500"
      : valor >= 3
      ? "text-amber-400"
      : "text-red-500";

  return (
    <span className={`flex items-center gap-1 ${cor}`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < estrelas ? "fill-current" : "text-slate-600/30"
          }`}
        />
      ))}
    </span>
  );
};

// ===================================================
// 🔹 COMPONENTE PRINCIPAL
// ===================================================
export default function UsuariosSection({ onSelectSection }: any) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState("todos");
  const [busca, setBusca] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProfissao, setFiltroProfissao] = useState("");
  const [filtroConfiabilidade, setFiltroConfiabilidade] = useState("");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [profissoes, setProfissoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ===================================================
  // 🔹 BUSCAR USUÁRIOS
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
        ...new Set((data || []).filter((u) => u.profissao).map((u) => u.profissao)),
      ];
      setProfissoes(listaProf);
    }

    setLoading(false);
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  // ===================================================
  // 🔹 FILTRO
  // ===================================================
  const usuariosFiltrados = usuarios.filter((u) => {
    const tipoMatch = tipoSelecionado === "todos" || u.tipo_usuario === tipoSelecionado;
    const buscaMatch =
      !busca ||
      u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      u.email?.toLowerCase().includes(busca.toLowerCase());
    const localMatch =
      !filtroLocal ||
      u.localidade?.toLowerCase().includes(filtroLocal.toLowerCase());
    const statusMatch = !filtroStatus || u.status === filtroStatus;
    const profissaoMatch = !filtroProfissao || u.profissao === filtroProfissao;
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
  // 🔹 CARDS RESUMO
  // ===================================================
  const cards = [
    {
      key: "todos",
      title: "Total de Usuários",
      color: "from-sky-500 to-blue-500",
      count: usuarios.length,
      icon: <Users className="w-6 h-6 text-white/90" />,
    },
    {
      key: "profissional",
      title: "Profissionais",
      color: "from-cyan-500 to-emerald-400",
      count: usuarios.filter((u) => u.tipo_usuario === "profissional").length,
      icon: <Briefcase className="w-6 h-6 text-white/90" />,
    },
    {
      key: "empresa",
      title: "Empresas",
      color: "from-emerald-500 to-green-400",
      count: usuarios.filter((u) => u.tipo_usuario === "empresa").length,
      icon: <ShieldCheck className="w-6 h-6 text-white/90" />,
    },
    {
      key: "admin",
      title: "Administradores",
      color: "from-violet-500 to-indigo-400",
      count: usuarios.filter((u) => u.tipo_usuario === "admin").length,
      icon: <ShieldCheck className="w-6 h-6 text-white/90" />,
    },
  ];

  // ===================================================
  // 🔹 UI
  // ===================================================
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* CABEÇALHO */}
      <div className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5 bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg sm:text-2xl font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-50">
          <Users className="w-6 h-6 text-sky-500" />
          Gestão de Usuários
        </h2>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => (
          <motion.button
            key={card.key}
            onClick={() => setTipoSelecionado(card.key)}
            whileHover={{ scale: 1.02 }}
            className={`text-left p-3 sm:p-4 rounded-2xl text-white shadow-md border border-white/10 bg-gradient-to-br ${card.color} transition-all cursor-pointer ${
              tipoSelecionado === card.key ? "ring-2 ring-white/60" : "opacity-90 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-medium opacity-90">{card.title}</h3>
                <motion.p
                  key={card.count}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl sm:text-3xl font-semibold"
                >
                  {card.count}
                </motion.p>
              </div>
              {card.icon}
            </div>
          </motion.button>
        ))}
      </div>

      {/* LISTA */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">

        {/* TOPO LISTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
            Usuários Registrados
          </h3>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">

            {/* BUSCA */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 flex-1"
              />
            </div>

            {/* FILTROS */}
            <button
              onClick={() => setFiltroAberto(!filtroAberto)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* LISTA DESKTOP */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Profissão</th>
                    <th className="px-3 py-2">Localidade</th>
                    <th className="px-3 py-2">Cadastrado em</th>
                    <th className="px-3 py-2">Confiabilidade</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                    >
                      <td className="px-3 py-2">{u.nome}</td>
                      <td className="px-3 py-2 capitalize">{u.tipo_usuario}</td>
                      <td className="px-3 py-2">{u.profissao || "—"}</td>
                      <td className="px-3 py-2">{u.localidade || "—"}</td>
                      <td className="px-3 py-2">
                        {u.data_cadastro
                          ? new Date(u.data_cadastro).toLocaleDateString("pt-PT")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{renderConfiabilidade(u.confiabilidade)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            u.status === "ativo"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* 🔵 ABRE PERFIL */}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onSelectSection("perfil-usuario", u)}
                          className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-300 text-xs"
                        >
                          <Eye className="w-4 h-4" />
                          Ver perfil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LISTA MOBILE */}
            <div className="grid gap-3 md:hidden">
              {usuariosFiltrados.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{u.nome}</p>
                      <p className="text-[11px] text-slate-500">{u.email}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-[10px] bg-slate-900 text-white uppercase">
                      {u.tipo_usuario}
                    </span>
                  </div>

                  <div className="mt-2 text-xs flex gap-2 text-slate-500">
                    <span>{u.profissao || "—"}</span>•<span>{u.localidade || "—"}</span>
                  </div>

                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {renderConfiabilidade(u.confiabilidade)}

                      <span
                        className={`px-2 py-1 rounded-full text-[10px] ${
                          u.status === "ativo"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectSection("perfil-usuario", u)}
                      className="text-sky-400 text-[11px]"
                    >
                      Ver perfil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
