// src/components/professional/CentralDeNavegacaoProfissional/Obras/ConvitesDeObra.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  X,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../context/AuthContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type ProfissionalRow = {
  id: string;
  funcao?: string | null;
};

type ObraRow = {
  id: string;
  nome: string | null;
  cidade?: string | null;
  local?: string | null;
  endereco?: string | null;
  status_obras?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
};

type EmpresaRow = {
  id: string;
  nome_comercial?: string | null;
  nome_legal?: string | null;
  nome?: string | null;
};

type ConviteRowBase = {
  id: string;
  obra_id: string;
  profissional_id: string;
  empresa_id: string;
  mensagem: string | null;
  status: "pendente" | "aceito" | "recusado" | "cancelado" | "expirado";
  criado_em: string;
  respondido_em: string | null;
};

type ConviteRow = ConviteRowBase & {
  obras: ObraRow | null;
  empresas: EmpresaRow | null;
};

type FiltroStatus = "pendente" | "aceito" | "recusado" | "todos";

// Ajuste se a sua rota for diferente:
const ROUTE_OBRAS_ATIVAS = "/profissional/obras/obras-ativas";

// Key já usado no ObrasAtivas.tsx
const LS_OBRA_ATIVAS_ID = "prof_obras_ativas_obraId";

export default function ConvitesDeObra() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profissional, setProfissional] = useState<ProfissionalRow | null>(null);
  const [convites, setConvites] = useState<ConviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAcaoId, setLoadingAcaoId] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("pendente");
  const [busca, setBusca] = useState("");

  const [obraModal, setObraModal] = useState<{
    obra: ObraRow | null;
    convite: ConviteRow | null;
  } | null>(null);

  const [empresaModal, setEmpresaModal] = useState<{
    empresa: EmpresaRow | null;
    convite: ConviteRow | null;
  } | null>(null);

  const [confirmarRecusa, setConfirmarRecusa] = useState<{ convite: ConviteRow } | null>(null);

  useEffect(() => {
    if (!user) return;
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function carregarDados() {
    try {
      setLoading(true);

      // 0) Auth user real
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error("[convites] auth.getUser error:", authErr);
        toast.error("Erro ao validar sessão. Faça login novamente.");
        setProfissional(null);
        setConvites([]);
        return;
      }

      const authUid = authData?.user?.id ?? null;
      const authEmail = authData?.user?.email ?? null;

      if (!authUid) {
        toast.error("Sessão inválida. Faça login novamente.");
        setProfissional(null);
        setConvites([]);
        return;
      }

      // 1) Resolver profissional
      let profissionalEncontrado: ProfissionalRow | null = null;

      {
        const { data, error } = await supabase
          .from("profissionais")
          .select("id, funcao")
          .eq("usuario_id", authUid)
          .maybeSingle<ProfissionalRow>();
        if (error) console.error("[convites] profissionais(usuario_id) error:", error);
        else if (data) profissionalEncontrado = data;
      }

      if (!profissionalEncontrado) {
        const { data, error } = await supabase
          .from("profissionais")
          .select("id, funcao")
          .eq("auth_id", authUid)
          .maybeSingle<ProfissionalRow>();
        if (error) console.error("[convites] profissionais(auth_id) error:", error);
        else if (data) profissionalEncontrado = data;
      }

      if (!profissionalEncontrado && authEmail) {
        const { data: usuarioRow, error: usuarioErr } = await supabase
          .from("usuarios")
          .select("id, auth_id")
          .eq("email", authEmail)
          .maybeSingle<{ id: string; auth_id: string | null }>();

        if (usuarioErr) console.error("[convites] usuarios(email) error:", usuarioErr);

        if (usuarioRow) {
          const { data: p1, error: p1Err } = await supabase
            .from("profissionais")
            .select("id, funcao")
            .eq("user_id", usuarioRow.id)
            .maybeSingle<ProfissionalRow>();
          if (p1Err) console.error("[convites] profissionais(user_id=usuarios.id) error:", p1Err);
          else if (p1) profissionalEncontrado = p1;

          if (!profissionalEncontrado && usuarioRow.auth_id) {
            const { data: p2, error: p2Err } = await supabase
              .from("profissionais")
              .select("id, funcao")
              .eq("user_id", usuarioRow.auth_id)
              .maybeSingle<ProfissionalRow>();
            if (p2Err) console.error("[convites] profissionais(user_id=usuarios.auth_id) error:", p2Err);
            else if (p2) profissionalEncontrado = p2;
          }
        }
      }

      if (!profissionalEncontrado) {
        console.warn("[convites] profissional não encontrado", { authUid, authEmail });
        toast.error("Perfil de profissional não encontrado. Termine o cadastro para receber convites.");
        setProfissional(null);
        setConvites([]);
        return;
      }

      setProfissional(profissionalEncontrado);

      // 2) Buscar convites
      const { data: convitesData, error: convitesError } = await supabase
        .from("obras_convites")
        .select("id, obra_id, profissional_id, empresa_id, mensagem, status, criado_em, respondido_em")
        .eq("profissional_id", profissionalEncontrado.id)
        .order("criado_em", { ascending: false });

      if (convitesError) {
        console.error("[convites] obras_convites select error:", convitesError);
        toast.error("Erro ao carregar convites de obra.");
        setConvites([]);
        return;
      }

      const base: ConviteRowBase[] = (convitesData as any) || [];
      if (base.length === 0) {
        setConvites([]);
        return;
      }

      // 3) Buscar obras e empresas
      const obraIds = Array.from(new Set(base.map((c) => c.obra_id)));
      const empresaIds = Array.from(new Set(base.map((c) => c.empresa_id)));

      const [obrasRes, empresasRes] = await Promise.all([
        obraIds.length
          ? supabase
              .from("obras")
              .select("id, nome, cidade, local, endereco, status, status_obras, data_inicio, data_fim")
              .in("id", obraIds)
          : Promise.resolve({ data: [] } as any),
        empresaIds.length
          ? supabase
              .from("empresas")
              .select("id, nome_comercial, nome_legal, nome")
              .in("id", empresaIds)
          : Promise.resolve({ data: [] } as any),
      ]);

      if (obrasRes.error) console.error("[convites] obras error:", obrasRes.error);
      if (empresasRes.error) console.error("[convites] empresas error:", empresasRes.error);

      const obrasMap = new Map<string, ObraRow>();
      const empresasMap = new Map<string, EmpresaRow>();

      (obrasRes.data as ObraRow[] | null)?.forEach((o) => obrasMap.set(o.id, o));
      (empresasRes.data as EmpresaRow[] | null)?.forEach((e) => empresasMap.set(e.id, e));

      const convitesCompletos: ConviteRow[] = base.map((c) => ({
        ...c,
        obras: obrasMap.get(c.obra_id) || null,
        empresas: empresasMap.get(c.empresa_id) || null,
      }));

      setConvites(convitesCompletos);
    } catch (e) {
      console.error("[convites] carregarDados erro:", e);
      toast.error("Erro inesperado ao carregar convites.");
      setConvites([]);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const pendentes = convites.filter((c) => c.status === "pendente").length;
    const aceitos = convites.filter((c) => c.status === "aceito").length;
    const recusados = convites.filter((c) => c.status === "recusado").length;
    return { pendentes, aceitos, recusados, total: convites.length };
  }, [convites]);

  const convitesFiltrados = useMemo(() => {
    const list = filtroStatus === "todos" ? convites : convites.filter((c) => c.status === filtroStatus);
    const b = busca.trim().toLowerCase();
    if (!b) return list;

    return list.filter((c) => {
      const obra = c.obras;
      const emp = c.empresas;
      const hay =
        `${obra?.nome ?? ""} ${obra?.cidade ?? ""} ${localObra(obra) ?? ""} ${nomeEmpresa(emp) ?? ""}`.toLowerCase();
      return hay.includes(b);
    });
  }, [convites, filtroStatus, busca]);

  async function handleAceitar(convite: ConviteRow) {
    if (!profissional) return;

    try {
      setLoadingAcaoId(convite.id);

      // 1) Atualiza status do convite (com select para validar que realmente atualizou)
      const { data: updated, error: updateError } = await supabase
        .from("obras_convites")
        .update({
          status: "aceito",
          respondido_em: new Date().toISOString(),
        })
        .eq("id", convite.id)
        .eq("profissional_id", profissional.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("[convites] aceitar update error:", updateError);
        toast.error("Erro ao aceitar convite.");
        return;
      }

      if (!updated?.id) {
        // aqui pega exatamente teu caso: RLS bloqueia, não atualiza linha
        console.error("[convites] aceitar: nenhuma linha atualizada (RLS/where).", {
          conviteId: convite.id,
          profissionalId: profissional.id,
        });
        toast.error("Não foi possível aceitar (permissão/RLS). Ajuste as policies de obras_convites.");
        return;
      }

      // 2) vínculo em profissionais_obras
      const { data: relacaoExistente, error: relacaoError } = await supabase
        .from("profissionais_obras")
        .select("id")
        .eq("profissional_id", profissional.id)
        .eq("obra_id", convite.obra_id)
        .maybeSingle();

      if (relacaoError) console.error("[convites] vínculo check error:", relacaoError);

      if (!relacaoExistente) {
        const { error: inserirRelacaoError } = await supabase.from("profissionais_obras").insert({
          profissional_id: profissional.id,
          obra_id: convite.obra_id,
          funcao: profissional.funcao ?? "Profissional",
          status: "Ativo",
          empresa_id: convite.empresa_id,
          progresso: 0,
        });

        if (inserirRelacaoError) {
          console.error("[convites] inserir vínculo error:", inserirRelacaoError);
          toast.error("Convite aceito, mas houve erro ao ligar você à obra. Fale com o suporte.");
        }
      }

      // UX
      setFiltroStatus("aceito");
      await carregarDados();

      toast.success("Convite aceito! Indo para Obras Ativas...");

      try {
        if (typeof window !== "undefined" && convite.obra_id) {
          localStorage.setItem(LS_OBRA_ATIVAS_ID, convite.obra_id);
        }
      } catch {}

      navigate(ROUTE_OBRAS_ATIVAS);
    } finally {
      setLoadingAcaoId(null);
    }
  }

  async function handleRecusarConfirmado(convite: ConviteRow) {
    if (!profissional) return;

    try {
      setLoadingAcaoId(convite.id);

      const { data: updated, error } = await supabase
        .from("obras_convites")
        .update({
          status: "recusado",
          respondido_em: new Date().toISOString(),
        })
        .eq("id", convite.id)
        .eq("profissional_id", profissional.id)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("[convites] recusar update error:", error);
        toast.error("Erro ao recusar convite.");
        return;
      }

      if (!updated?.id) {
        console.error("[convites] recusar: nenhuma linha atualizada (RLS/where).", {
          conviteId: convite.id,
          profissionalId: profissional.id,
        });
        toast.error("Não foi possível recusar (permissão/RLS). Ajuste as policies de obras_convites.");
        return;
      }

      setFiltroStatus("recusado");
      toast.success("Convite recusado.");
      await carregarDados();
    } finally {
      setLoadingAcaoId(null);
    }
  }

  function formatarData(value?: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-PT");
  }

  function formatarStatus(status: ConviteRow["status"]) {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "aceito":
        return "Aceito";
      case "recusado":
        return "Recusado";
      case "cancelado":
        return "Cancelado";
      case "expirado":
        return "Expirado";
      default:
        return status;
    }
  }

  function nomeEmpresa(e?: EmpresaRow | null) {
    return e?.nome_comercial || e?.nome || e?.nome_legal || "Empresa";
  }

  function statusObra(o?: ObraRow | null) {
    return o?.status_obras || o?.status || null;
  }

  function localObra(o?: ObraRow | null) {
    return o?.local || o?.endereco || null;
  }

  function statusBadgeClasses(status: ConviteRow["status"]) {
    if (status === "pendente") return "bg-amber-50 text-amber-700 border-amber-100";
    if (status === "aceito") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "recusado") return "bg-rose-50 text-rose-700 border-rose-100";
    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  return (
    <div className="w-full h-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
                Convites de Obra
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aceite para entrar na obra ou recuse caso não tenha disponibilidade.
              </p>
            </div>
          </div>

          <div className="w-full sm:w-[420px]">
            <div className="bg-app-card border border-app rounded-2xl px-3 py-2 flex items-center gap-2">
              <span className="text-slate-400 text-xs">Buscar</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Obra, empresa, cidade, local..."
                className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-app-card border border-app rounded-2xl px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Pendentes</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.pendentes}</div>
        </div>

        <div className="bg-app-card border border-app rounded-2xl px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Aceitos</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.aceitos}</div>
        </div>

        <div className="bg-app-card border border-app rounded-2xl px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Recusados</div>
          <div className="mt-1 text-2xl font-semibold text-rose-600">{stats.recusados}</div>
        </div>

        <div className="bg-app-card border border-dashed border-app rounded-2xl px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.total}</div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "pendente", label: "Pendentes" },
              { id: "aceito", label: "Aceitos" },
              { id: "recusado", label: "Recusados" },
              { id: "todos", label: "Todos" },
            ] as { id: FiltroStatus; label: string }[]
          ).map((item) => {
            const ativo = filtroStatus === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFiltroStatus(item.id)}
                className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-all ${
                  ativo
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-app-card text-slate-600 dark:text-slate-300 border-app hover:border-blue-300"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500">
          Mostrando{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{convitesFiltrados.length}</span> convite(s)
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Carregando convites...</p>
            </div>
          </div>
        ) : convitesFiltrados.length === 0 ? (
          <div className="bg-app-card border border-dashed border-app rounded-2xl py-10 px-6 flex flex-col items-center gap-3 text-center">
            <Inbox className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nenhum convite encontrado.</p>
            <p className="text-xs text-slate-500 max-w-md">
              Assim que uma empresa convidar você para uma nova obra, o convite aparecerá aqui.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {convitesFiltrados.map((convite) => {
              const obra = convite.obras;
              const empresa = convite.empresas;
              const status = convite.status;
              const isPendente = status === "pendente";

              return (
                <motion.div
                  key={convite.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-app-card border border-app rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                          {obra?.nome || "Obra sem nome"}
                        </h2>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBadgeClasses(
                            status
                          )}`}
                        >
                          {formatarStatus(status)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {nomeEmpresa(empresa)}
                        </span>

                        {obra?.cidade && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {obra.cidade}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Convite em {formatarData(convite.criado_em)}
                        </span>

                        {convite.respondido_em && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Respondido em {formatarData(convite.respondido_em)}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/40 dark:bg-slate-900/30 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Início</div>
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-100">
                            {obra?.data_inicio ? formatarData(obra.data_inicio) : "-"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/40 dark:bg-slate-900/30 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Local</div>
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                            {localObra(obra) || "-"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/40 dark:bg-slate-900/30 px-3 py-2">
                          <div className="text-[11px] text-slate-500">Status da obra</div>
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                            {statusObra(obra) || "-"}
                          </div>
                        </div>
                      </div>

                      {convite.mensagem && (
                        <div className="mt-2 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-slate-500 mr-1">Mensagem da empresa:</span>
                          {convite.mensagem}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setObraModal({ obra: obra || null, convite })}
                          disabled={!obra}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Ver detalhes da obra
                        </button>

                        <button
                          type="button"
                          onClick={() => setEmpresaModal({ empresa: empresa || null, convite })}
                          disabled={!empresa}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Ver empresa
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:items-end">
                      {isPendente ? (
                        <>
                          <button
                            onClick={() => setConfirmarRecusa({ convite })}
                            disabled={loadingAcaoId === convite.id}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed w-full lg:w-auto"
                          >
                            <XCircle className="w-4 h-4" />
                            Recusar
                          </button>

                          <button
                            onClick={() => handleAceitar(convite)}
                            disabled={loadingAcaoId === convite.id}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed w-full lg:w-auto"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {loadingAcaoId === convite.id ? "Confirmando..." : "Aceitar convite"}
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <div className="text-[11px] text-slate-500 lg:text-right">
                            Ao aceitar, você será enviado para <span className="font-semibold">Obras Ativas</span>.
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic lg:text-right">
                          Este convite já foi {formatarStatus(status).toLowerCase()}.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* MODAL: Confirmar Recusa */}
      <AnimatePresence>
        {confirmarRecusa && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-app-card border border-app shadow-xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/10 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Confirmar recusa</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Você tem certeza que deseja recusar este convite?
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setConfirmarRecusa(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/40 dark:bg-slate-900/30 p-3">
                <div className="text-xs text-slate-500">Convite</div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {confirmarRecusa.convite.obras?.nome || "Obra sem nome"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {nomeEmpresa(confirmarRecusa.convite.empresas)}{" "}
                  {confirmarRecusa.convite.obras?.cidade ? `• ${confirmarRecusa.convite.obras?.cidade}` : ""}
                </div>
              </div>

              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmarRecusa(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const c = confirmarRecusa.convite;
                    setConfirmarRecusa(null);
                    await handleRecusarConfirmado(c);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                >
                  Sim, recusar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Detalhes da Obra */}
      <AnimatePresence>
        {obraModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-app-card border border-app shadow-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Detalhes da obra</h3>
                <button
                  onClick={() => setObraModal(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{obraModal.obra?.nome || "Obra sem nome"}</p>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {obraModal.obra?.cidade && (
                  <div className="inline-flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{obraModal.obra.cidade}</span>
                  </div>
                )}

                {localObra(obraModal.obra) && (
                  <div>
                    <span className="font-medium">Local: </span>
                    {localObra(obraModal.obra)}
                  </div>
                )}

                {statusObra(obraModal.obra) && (
                  <div>
                    <span className="font-medium">Status da obra: </span>
                    {statusObra(obraModal.obra)}
                  </div>
                )}

                {obraModal.obra?.data_inicio && (
                  <div>
                    <span className="font-medium">Início: </span>
                    {formatarData(obraModal.obra.data_inicio)}
                  </div>
                )}

                {obraModal.obra?.data_fim && (
                  <div>
                    <span className="font-medium">Fim: </span>
                    {formatarData(obraModal.obra.data_fim)}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setObraModal(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Detalhes da Empresa */}
      <AnimatePresence>
        {empresaModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-app-card border border-app shadow-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Sobre a empresa</h3>
                <button
                  onClick={() => setEmpresaModal(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{nomeEmpresa(empresaModal.empresa)}</p>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {empresaModal.empresa?.nome_legal && (
                  <div>
                    <span className="font-medium">Nome legal: </span>
                    {empresaModal.empresa.nome_legal}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 pt-1">
                Depois que você aceitar, a empresa e o suporte podem alinhar os detalhes finais.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setEmpresaModal(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
