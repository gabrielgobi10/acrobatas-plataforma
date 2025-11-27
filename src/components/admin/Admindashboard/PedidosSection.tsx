// src/components/admin/Admindashboard/PedidosSection.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Search,
  Users,
  Building2,
  FileText,
  ShieldCheck,
  Eye,
  UserSquare2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ======================================
   Config / Consts
====================================== */
const BUCKET = "comprovantes"; // bucket privado do storage
const PAGE = 50; // paginação simples para as filas de docs

/* ======================================
   Helpers de estilo
====================================== */
const statusChip = (s?: string) => {
  const map: Record<string, string> = {
    em_analise:
      "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
    aprovado:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    reprovado:
      "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300",
  };
  return map[s ?? ""] ?? "bg-slate-500/10 text-slate-600 dark:text-slate-300";
};

/* ======================================
   Tipos locais
====================================== */
type Pedido = any;

type DocItem = {
  id: string;
  origem: "experiencias" | "documentos_profissionais" | "documentos_empresas";
  pessoa_tipo: "profissional" | "empresa";
  pessoa_id?: string | null;            // id na tabela profissionais
  pessoa_usuario_id?: string | null;    // usuario_id do profissional (para abrir perfil)
  pessoa_nome?: string | null;
  empresa_id?: string | null;
  empresa_nome?: string | null;
  tipo?: string | null;     // curso/certificado/treinamento/documento
  nome?: string | null;     // nome do doc/curso
  emissor?: string | null;
  validade?: string | null;
  criado_em?: string | null;
  status?: "em_analise" | "aprovado" | "reprovado" | string | null;
  comprovante_url?: string | null; // path privado OU URL pública
};

/* ======================================
   Navegação auxiliar (empresa)
====================================== */
function abrirEmpresa(idEmpresa?: string) {
  if (!idEmpresa) return;
  alert("Abrir página da empresa: " + idEmpresa);
}

/* ======================================
   Atualizadores (Pedidos + Docs)
====================================== */
async function updatePedidoStatus(
  id: string,
  novoStatus: "em_analise" | "aprovado" | "reprovado",
  setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>
) {
  try {
    setPedidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p))
    );
    const { error } = await supabase
      .from("pedidos_empresa_v2")
      .update({ status: novoStatus })
      .eq("id", id);
    if (error) throw error;
  } catch (err) {
    console.error("Erro ao atualizar status do pedido:", err);
    alert("Erro ao atualizar status.");
  }
}

async function updateDocStatus(
  item: DocItem,
  novoStatus: "em_analise" | "aprovado" | "reprovado",
  setDocs: React.Dispatch<React.SetStateAction<DocItem[]>>
) {
  try {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === item.id && d.origem === item.origem ? { ...d, status: novoStatus } : d
      )
    );

    const tabela =
      item.origem === "experiencias"
        ? "experiencias"
        : item.origem === "documentos_profissionais"
        ? "documentos_profissionais"
        : "documentos_empresas";

    const { error } = await supabase
      .from(tabela)
      .update({ status: novoStatus })
      .eq("id", item.id);

    if (error) throw error;
  } catch (err) {
    console.error("Erro ao atualizar documento:", err);
    alert("Erro ao atualizar documento.");
  }
}

/* ======================================
   Utilitário: abrir comprovante (signed URL p/ bucket privado)
====================================== */
async function abrirComprovante(url?: string | null) {
  if (!url) return;
  try {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(url, 600);
    if (error) throw error;
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error("abrirComprovante error", e);
    alert("Não foi possível abrir o comprovante.");
  }
}

/* ======================================
   Seção: PEDIDOS (mantém tua lógica)
====================================== */
function SecaoPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function fetchPedidos() {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos_empresa_v2")
        .select("*")
        .order("criado_em", { ascending: false });

      if (!error) setPedidos(data || []);
      else setPedidos([]);

      setLoading(false);
    }
    fetchPedidos();
  }, []);

  const pedidosFiltrados = useMemo(() => {
    const q = busca.toLowerCase();
    return pedidos.filter(
      (p: any) =>
        p.nome_empresa?.toLowerCase().includes(q) ||
        p.tipo_profissional?.toLowerCase().includes(q) ||
        p.local?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q)
    );
  }, [busca, pedidos]);

  const countByStatus = (status: string) =>
    pedidos.filter((p: any) => p.status === status).length;

  const statusCards = [
    {
      title: "Em Análise",
      value: countByStatus("em_analise"),
      color: "from-sky-500 to-cyan-500",
      icon: <ClipboardList className="w-6 h-6 text-sky-100" />,
    },
    {
      title: "Aprovados",
      value: countByStatus("aprovado"),
      color: "from-emerald-500 to-green-500",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-100" />,
    },
    {
      title: "Reprovados",
      value: countByStatus("reprovado"),
      color: "from-red-500 to-rose-500",
      icon: <Clock className="w-6 h-6 text-red-100" />,
    },
  ];

  return (
    <>
      {/* Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {statusCards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-md`}
          >
            <div className="flex justify-between">
              <div>
                <p className="text-sm opacity-90">{card.title}</p>
                <h2 className="text-3xl font-semibold">{card.value}</h2>
              </div>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Busca */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3 mt-4">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por empresa, profissional, local…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-100 w-full"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Pedidos recentes
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : pedidosFiltrados.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum pedido encontrado.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Empresa</th>
                    <th className="p-3 font-semibold">Criado em</th>
                    <th className="p-3 font-semibold">Profissional</th>
                    <th className="p-3 font-semibold">Data início</th>
                    <th className="p-3 font-semibold">Data fim</th>
                    <th className="p-3 font-semibold">Valor (€)</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-center">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {pedidosFiltrados.map((p: any) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="p-3 font-semibold">#{String(p.id).slice(0, 8)}</td>
                      <td className="p-3">{p.nome_empresa}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(p.criado_em).toLocaleString("pt-PT")}
                      </td>
                      <td className="p-3 flex items-center gap-1">
                        <Users className="w-4 h-4 text-sky-500" />
                        {p.tipo_profissional} {p.experiencia && `(${p.experiencia})`}
                      </td>
                      <td className="p-3">{p.data_inicio || "—"}</td>
                      <td className="p-3">{p.data_fim || "—"}</td>
                      <td className="p-3 font-semibold">
                        €
                        {Number(p.custo_total ?? 0).toLocaleString("pt-PT", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusChip(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {p.status === "em_analise" && (
                            <button
                              onClick={() => updatePedidoStatus(p.id, "aprovado", setPedidos)}
                              className="px-3 py-1 text-xs rounded-lg bg-emerald-600 text-white"
                            >
                              Aprovar
                            </button>
                          )}
                          {p.status !== "reprovado" && (
                            <button
                              onClick={() => updatePedidoStatus(p.id, "reprovado", setPedidos)}
                              className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white"
                            >
                              Reprovar
                            </button>
                          )}
                          <button
                            onClick={() => abrirEmpresa(p.id_empresa)}
                            className="px-3 py-1 text-xs rounded-lg bg-sky-600 text-white"
                          >
                            Ver Empresa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="grid gap-3 md:hidden">
              {pedidosFiltrados.map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{p.nome_empresa}</p>
                      <p className="text-slate-500">#{String(p.id).slice(0, 8)}</p>
                      <p className="text-[11px] text-slate-400">
                        Criado em: {new Date(p.criado_em).toLocaleString("pt-PT")}
                      </p>
                    </div>

                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${statusChip(p.status)}`}>
                      {p.status}
                    </span>
                  </div>

                  <p className="mt-2 text-slate-600 dark:text-slate-300">
                    {p.tipo_profissional} {p.experiencia && `• ${p.experiencia}`}
                  </p>

                  <div className="mt-2 text-[11px]">
                    Início: <strong>{p.data_inicio || "—"}</strong> &nbsp;·&nbsp; Fim:{" "}
                    <strong>{p.data_fim || "—"}</strong>
                  </div>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      €
                      {Number(p.custo_total ?? 0).toLocaleString("pt-PT", {
                        minimumFractionDigits: 2,
                      })}
                    </span>

                    <div className="flex gap-1">
                      {p.status === "em_analise" && (
                        <button
                          onClick={() => updatePedidoStatus(p.id, "aprovado", setPedidos)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded"
                        >
                          Aprovar
                        </button>
                      )}
                      {p.status !== "reprovado" && (
                        <button
                          onClick={() => updatePedidoStatus(p.id, "reprovado", setPedidos)}
                          className="px-2 py-1 bg-red-600 text-white rounded"
                        >
                          Reprovar
                        </button>
                      )}
                      <button
                        onClick={() => abrirEmpresa(p.id_empresa)}
                        className="px-2 py-1 bg-sky-600 text-white rounded"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-center text-slate-400 mt-4">
          Sincronizado com Supabase — visão em tempo real.
        </p>
      </div>
    </>
  );
}

/* ======================================
   Seção: LISTA DE DOCS (Profissionais/Empresas)
====================================== */
function ListaDocs({ tipo }: { tipo: "profissionais" | "empresas" }) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const navigate = useNavigate();
  const verPerfil = (usuarioId: string) => navigate(`/admin/profissionais/${usuarioId}`);

  async function fetchDocs(pageToLoad = 1) {
    setLoading(true);
    try {
      const results: DocItem[] = [];
      const from = (pageToLoad - 1) * PAGE;
      const to = from + PAGE - 1;

      if (tipo === "profissionais") {
        // 1) EXPERIENCIAS — trazer também user_id
        {
          const { data, error } = await supabase
            .from("experiencias")
            .select(`
              id,
              categoria,
              nome,
              instituicao,
              validade,
              status,
              comprovante_url,
              created_at,
              profissional_id,
              profissional:profissionais ( id, user_id, nome )
            `)
            .order("created_at", { ascending: false })
            .range(from, to);
          if (!error && data) {
            data.forEach((row: any) => {
              results.push({
                id: row.id,
                origem: "experiencias",
                pessoa_tipo: "profissional",
                pessoa_id: row.profissional?.id ?? row.profissional_id ?? null,
                pessoa_usuario_id: row.profissional?.user_id ?? null,
                pessoa_nome: row.profissional?.nome ?? null,
                tipo: row.categoria ?? "certificado",
                nome: row.nome ?? null,
                emissor: row.instituicao ?? null,
                validade: row.validade ?? null,
                criado_em: row.created_at ?? null,
                status: row.status ?? "em_analise",
                comprovante_url: row.comprovante_url ?? null,
              });
            });
          }
        }

        // 2) DOCUMENTOS PESSOAIS — também com user_id
        {
          const { data, error } = await supabase
            .from("documentos_profissionais")
            .select(`
              id,
              tipo,
              nome,
              emissor,
              validade,
              status,
              comprovante_url,
              created_at,
              profissional_id,
              profissional:profissionais ( id, user_id, nome )
            `)
            .order("created_at", { ascending: false })
            .range(from, to);
          if (!error && data) {
            data.forEach((row: any) => {
              results.push({
                id: row.id,
                origem: "documentos_profissionais",
                pessoa_tipo: "profissional",
                pessoa_id: row.profissional?.id ?? row.profissional_id ?? null,
                pessoa_usuario_id: row.profissional?.user_id ?? null,
                pessoa_nome: row.profissional?.nome ?? null,
                tipo: row.tipo ?? "documento",
                nome: row.nome ?? null,
                emissor: row.emissor ?? null,
                validade: row.validade ?? null,
                criado_em: row.created_at ?? null,
                status: row.status ?? "em_analise",
                comprovante_url: row.comprovante_url ?? null,
              });
            });
          }
        }
      } else {
        // EMPRESAS
        const { data, error } = await supabase
          .from("documentos_empresas")
          .select(`
            id,
            tipo,
            nome,
            emissor,
            validade,
            status,
            comprovante_url,
            created_at,
            empresa_id,
            empresa:empresas ( id, nome )
          `)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (!error && data) {
          data.forEach((row: any) => {
            results.push({
              id: row.id,
              origem: "documentos_empresas",
              pessoa_tipo: "empresa",
              empresa_id: row.empresa?.id ?? row.empresa_id ?? null,
              empresa_nome: row.empresa?.nome ?? null,
              tipo: row.tipo ?? "documento",
              nome: row.nome ?? null,
              emissor: row.emissor ?? null,
              validade: row.validade ?? null,
              criado_em: row.created_at ?? null,
              status: row.status ?? "em_analise",
              comprovante_url: row.comprovante_url ?? null,
            });
          });
        }
      }

      setDocs((prev) => (pageToLoad === 1 ? results : [...prev, ...results]));
      setHasMore(results.length >= PAGE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    fetchDocs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return docs.filter((d) => {
      const alvo =
        (d.pessoa_nome ?? "") +
        (d.empresa_nome ?? "") +
        (d.tipo ?? "") +
        (d.nome ?? "") +
        (d.emissor ?? "") +
        (d.status ?? "");
      return alvo.toLowerCase().includes(q);
    });
  }, [busca, docs]);

  const countByStatus = (s: string) => docs.filter((d) => d.status === s).length;

  const cards = [
    {
      title: "Em Análise",
      value: countByStatus("em_analise"),
      color: "from-sky-500 to-cyan-500",
      icon: <FileText className="w-6 h-6 text-sky-100" />,
    },
    {
      title: "Aprovados",
      value: countByStatus("aprovado"),
      color: "from-emerald-500 to-green-500",
      icon: <ShieldCheck className="w-6 h-6 text-emerald-100" />,
    },
    {
      title: "Reprovados",
      value: countByStatus("reprovado"),
      color: "from-red-500 to-rose-500",
      icon: <Clock className="w-6 h-6 text-red-100" />,
    },
  ];

  return (
    <>
      {/* Cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-md`}
          >
            <div className="flex justify-between">
              <div>
                <p className="text-sm opacity-90">{card.title}</p>
                <h2 className="text-3xl font-semibold">{card.value}</h2>
              </div>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </section>

      {/* Busca */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3 mt-4">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Buscar em ${tipo === "profissionais" ? "profissionais" : "empresas"}…`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-100 w-full"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
          {tipo === "profissionais" ? "Documentos de profissionais" : "Documentos de empresas"}
        </h3>

        {loading && docs.length === 0 ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum registro encontrado.</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 font-semibold">Pessoa</th>
                    <th className="p-3 font-semibold">Tipo</th>
                    <th className="p-3 font-semibold">Nome</th>
                    <th className="p-3 font-semibold">Emissor</th>
                    <th className="p-3 font-semibold">Validade</th>
                    <th className="p-3 font-semibold">Criado em</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((d) => (
                    <tr
                      key={`${d.origem}-${d.id}`}
                      className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <td className="p-3">
                        {d.pessoa_tipo === "profissional" ? (
                          <span className="inline-flex items-center gap-2">
                            <Users className="w-4 h-4 text-sky-500" />
                            <span>{d.pessoa_nome || "—"}</span>
                            {d.pessoa_usuario_id && (
                              <button
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-800 text-white"
                                onClick={() => verPerfil(d.pessoa_usuario_id!)}
                                title="Ver perfil"
                              >
                                <UserSquare2 size={14} />
                                Ver perfil
                              </button>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            <span>{d.empresa_nome || "—"}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">{d.tipo || "—"}</td>
                      <td className="p-3">{d.nome || "—"}</td>
                      <td className="p-3">{d.emissor || "—"}</td>
                      <td className="p-3">{d.validade || "—"}</td>
                      <td className="p-3 text-slate-500">
                        {d.criado_em ? new Date(d.criado_em).toLocaleString("pt-PT") : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusChip(d.status || undefined)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {d.comprovante_url && (
                            <button
                              onClick={() => abrirComprovante(d.comprovante_url)}
                              className="px-3 py-1 text-xs rounded-lg bg-slate-700 text-white inline-flex items-center gap-1"
                            >
                              <Eye size={14} />
                              Ver comprovante
                            </button>
                          )}

                          {d.status === "em_analise" && (
                            <button
                              onClick={() => updateDocStatus(d, "aprovado", setDocs)}
                              className="px-3 py-1 text-xs rounded-lg bg-emerald-600 text-white"
                            >
                              Aprovar
                            </button>
                          )}

                          {d.status !== "reprovado" && (
                            <button
                              onClick={() => updateDocStatus(d, "reprovado", setDocs)}
                              className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white"
                            >
                              Reprovar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="grid gap-3 md:hidden">
              {filtrados.map((d) => (
                <div
                  key={`${d.origem}-${d.id}`}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {d.pessoa_tipo === "profissional" ? d.pessoa_nome : d.empresa_nome}
                      </p>
                      <p className="text-slate-500 truncate">{d.tipo || "documento"}</p>
                      {d.criado_em && (
                        <p className="text-[11px] text-slate-400">
                          Criado em: {new Date(d.criado_em).toLocaleString("pt-PT")}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${statusChip(d.status || undefined)}`}>
                      {d.status}
                    </span>
                  </div>

                  <p className="mt-2 text-slate-600 dark:text-slate-300 truncate">
                    {d.nome || "—"} {d.emissor ? `• ${d.emissor}` : ""}
                  </p>

                  <div className="mt-2 text-[11px]">
                    Validade: <strong>{d.validade || "—"}</strong>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-between items-center gap-2">
                    <div className="flex gap-1">
                      {d.comprovante_url && (
                        <button
                          onClick={() => abrirComprovante(d.comprovante_url!)}
                          className="px-2 py-1 bg-slate-700 text-white rounded inline-flex items-center gap-1"
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                      )}

                      {d.pessoa_tipo === "profissional" && d.pessoa_usuario_id && (
                        <button
                          onClick={() => verPerfil(d.pessoa_usuario_id!)}
                          className="px-2 py-1 bg-slate-800 text-white rounded inline-flex items-center gap-1"
                        >
                          <UserSquare2 size={12} />
                          Perfil
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {d.status === "em_analise" && (
                        <button
                          onClick={() => updateDocStatus(d, "aprovado", setDocs)}
                          className="px-2 py-1 bg-emerald-600 text-white rounded"
                        >
                          Aprovar
                        </button>
                      )}

                      {d.status !== "reprovado" && (
                        <button
                          onClick={() => updateDocStatus(d, "reprovado", setDocs)}
                          className="px-2 py-1 bg-red-600 text-white rounded"
                        >
                          Reprovar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={async () => {
                    const next = page + 1;
                    await fetchDocs(next);
                    setPage(next);
                  }}
                  className="px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}

        <p className="text-[11px] text-center text-slate-400 mt-4">
          Fila de validação — {tipo === "profissionais" ? "profissionais" : "empresas"}.
        </p>
      </div>
    </>
  );
}

/* ======================================
   Componente principal com switch
====================================== */
export default function PedidosSection() {
  const [tab, setTab] = useState<"pedidos" | "docs_prof" | "docs_emp">("pedidos");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header + Tabs */}
      <div className="rounded-2xl px-4 py-4 sm:px-6 sm:py-5 bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg sm:text-2xl font-semibold flex items-center gap-2 text-sky-600">
            <ClipboardList className="w-6 h-6" />
            Gestão de Pedidos & Documentação
          </h2>

          <div className="flex gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTab("pedidos")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === "pedidos"
                  ? "bg-white dark:bg-slate-900 text-sky-600"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setTab("docs_prof")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === "docs_prof"
                  ? "bg-white dark:bg-slate-900 text-sky-600"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Docs • Profissionais
            </button>
            <button
              onClick={() => setTab("docs_emp")}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tab === "docs_emp"
                  ? "bg-white dark:bg-slate-900 text-sky-600"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Docs • Empresas
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo por guia */}
      {tab === "pedidos" && <SecaoPedidos />}
      {tab === "docs_prof" && <ListaDocs tipo="profissionais" />}
      {tab === "docs_emp" && <ListaDocs tipo="empresas" />}
    </motion.div>
  );
}
