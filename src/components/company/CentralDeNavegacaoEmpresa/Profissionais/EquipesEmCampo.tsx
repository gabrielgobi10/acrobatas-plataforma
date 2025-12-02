// src/components/company/CentralDeNavegacaoEmpresa/Outros/EquipesEmCampo.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Loader2,
  User,
  Search,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../../lib/supabase";
import { toast } from "sonner";

/* =========================
   Tipos
========================= */
type Obra = {
  id: string;
  nome?: string | null;
  local?: string | null;
  data_inicio?: string | null;
  profissionais_obras?: Array<{
    id: string;
    funcao?: string | null;
    status?: string | null;
    profissional?: {
      id: string;
      nome?: string | null;
      area?: string | null;
      status?: string | null;
    } | null;
  }>;
  total_profissionais?: number;
  presentes_hoje?: number;
};

type ProfissionalLinha = {
  id: string;
  funcao?: string | null;
  status?: string | null;
  data_inicio?: string | null;
  obra?: { id: string; nome?: string | null } | null;
  profissional?: {
    id: string;
    user_id?: string | null;
    nome?: string | null;
    area?: string | null;
    status?: string | null;
    foto_url?: string | null;
  } | null;
  presenca_hoje?: "Presente" | "Ausente" | "Sem Registo";
};

type PresencaHoje = {
  profissional_id: string;
  obra_id: string | null;
  status: string | null;
};

type AvaliacaoTarget = {
  profissionalId: string;
  profissionalNome?: string | null;
  obraId: string | null;
  obraNome?: string | null;
};

export default function EquipesEmCampo() {
  const [modo, setModo] = useState<"obras" | "profissionais">("profissionais");
  const [obras, setObras] = useState<Obra[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalLinha[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(false);

  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroFuncao, setFiltroFuncao] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroPresenca, setFiltroPresenca] = useState("Todas");

  // Métricas
  const [metricPresentes, setMetricPresentes] = useState(0);
  const [metricObrasAtivasHoje, setMetricObrasAtivasHoje] = useState(0);
  const [metricAusencias, setMetricAusencias] = useState(0);

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const navigate = useNavigate();

  // Avaliação
  const [avaliacaoAlvo, setAvaliacaoAlvo] = useState<AvaliacaoTarget | null>(
    null
  );
  const [avaliacaoNota, setAvaliacaoNota] = useState(0);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState("");
  const [avaliando, setAvaliando] = useState(false);

  /* =========================
     Descobrir empresa da conta
  ========================== */
  useEffect(() => {
    let cancel = false;

    async function loadEmpresa() {
      const { data, error } = await supabase.rpc("minha_empresa_id");
      if (cancel) return;
      if (error) {
        console.error("[EquipesEmCampo] minha_empresa_id ->", error);
        setEmpresaId(null);
      } else {
        setEmpresaId(data ?? null);
      }
    }

    loadEmpresa();
    return () => {
      cancel = true;
    };
  }, []);

  /* =========================
     Helpers (presenças hoje)
  ========================== */
  async function getPresencasHojeByProfissionalIds(
    ids: string[]
  ): Promise<Record<string, PresencaHoje>> {
    if (!ids.length) return {};
    const { data, error } = await supabase
      .from("presencas_profissionais")
      .select("profissional_id, obra_id, status")
      .eq("data", hoje)
      .in("profissional_id", ids);

    if (error) {
      console.error("Erro ao buscar presenças:", error.message);
      return {};
    }

    const map: Record<string, PresencaHoje> = {};
    (data || []).forEach((row) => {
      map[row.profissional_id] = {
        profissional_id: row.profissional_id,
        obra_id: row.obra_id ?? null,
        status: row.status ?? null,
      };
    });
    return map;
  }

  /* =========================
     Obras + contadores
  ========================== */
  async function fetchObras(empId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("obras")
        .select(
          `
          id,
          nome,
          local,
          data_inicio,
          profissionais_obras:profissionais_obras (
            id,
            funcao,
            status,
            profissional:profissional_id ( id, nome, area, status )
          )
        `
        )
        .eq("empresa_id", empId)
        .order("data_inicio", { ascending: false });

      if (error) throw error;

      const base: Obra[] = (data || []).map((obra: any) => ({
        ...obra,
        total_profissionais: Array.isArray(obra.profissionais_obras)
          ? obra.profissionais_obras.length
          : 0,
      }));

      const profIds = base
        .flatMap((o) => o.profissionais_obras || [])
        .map((v) => v.profissional?.id)
        .filter(Boolean) as string[];

      const presencaMap = await getPresencasHojeByProfissionalIds(
        Array.from(new Set(profIds))
      );

      const comPresentes = base.map((obra) => {
        const presentes = (obra.profissionais_obras || []).reduce(
          (acc, vinc) => {
            const pid = vinc.profissional?.id;
            const pres = pid ? presencaMap[pid] : undefined;
            const presente =
              pres && (pres.status || "").toLowerCase() === "presente";
            return acc + (presente ? 1 : 0);
          },
          0
        );
        return { ...obra, presentes_hoje: presentes };
      });

      setObras(comPresentes);

      // métricas globais
      const totalPresentes = Object.values(presencaMap).filter(
        (p) => (p.status || "").toLowerCase() === "presente"
      ).length;
      const totalAusentes = Object.values(presencaMap).filter(
        (p) => (p.status || "").toLowerCase() === "ausente"
      ).length;
      const obrasComEquipa = comPresentes.filter(
        (o) => (o.presentes_hoje || 0) > 0
      ).length;

      setMetricPresentes(totalPresentes);
      setMetricAusencias(totalAusentes);
      setMetricObrasAtivasHoje(obrasComEquipa);
    } catch (e) {
      console.error(e);
      setObras([]);
      setMetricPresentes(0);
      setMetricAusencias(0);
      setMetricObrasAtivasHoje(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!empresaId) {
      setObras([]);
      setMetricPresentes(0);
      setMetricAusencias(0);
      setMetricObrasAtivasHoje(0);
      return;
    }
    fetchObras(empresaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  /* =========================
     Profissionais (lista geral)
  ========================== */
  async function fetchProfissionais(empId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(
          `
          id,
          funcao,
          status,
          data_inicio,
          obra:obra_id (id, nome, empresa_id),
          profissional:profissional_id ( id, user_id, nome, area, status, foto_url )
        `
        )
        .not("obra_id", "is", null) // só vínculos com obra
        .eq("obra.empresa_id", empId); // só obras desta empresa

      if (error) throw error;

      const linhas = (data || []) as ProfissionalLinha[];
      const ids = Array.from(
        new Set(
          linhas.map((l) => l.profissional?.id).filter(Boolean) as string[]
        )
      );
      const presMap = await getPresencasHojeByProfissionalIds(ids);

      const enr = linhas.map((l) => {
        const pid = l.profissional?.id;
        const pres = pid ? presMap[pid] : undefined;
        let presenca: ProfissionalLinha["presenca_hoje"] = "Sem Registo";
        if (pres) {
          const st = (pres.status || "").toLowerCase();
          if (st === "presente") presenca = "Presente";
          else if (st === "ausente") presenca = "Ausente";
        }
        return { ...l, presenca_hoje: presenca };
      });

      setProfissionais(enr);
    } catch (e) {
      console.error(e);
      setProfissionais([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (modo === "profissionais" && empresaId) {
      setObraSelecionada(null);
      fetchProfissionais(empresaId);
    }
  }, [modo, empresaId]);

  /* =========================
     Profissionais por obra
  ========================== */
  async function fetchProfissionaisObra(obraId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(
          `
          id,
          funcao,
          status,
          data_inicio,
          profissional:profissional_id ( id, user_id, nome, area, status, foto_url )
        `
        )
        .eq("obra_id", obraId);

      if (error) throw error;

      const linhas = (data || []) as ProfissionalLinha[];
      const ids = Array.from(
        new Set(
          linhas.map((l) => l.profissional?.id).filter(Boolean) as string[]
        )
      );
      const presMap = await getPresencasHojeByProfissionalIds(ids);

      const enr = linhas.map((l) => {
        const pid = l.profissional?.id;
        const pres = pid ? presMap[pid] : undefined;
        let presenca: ProfissionalLinha["presenca_hoje"] = "Sem Registo";
        if (pres) {
          const st = (pres.status || "").toLowerCase();
          if (st === "presente") presenca = "Presente";
          else if (st === "ausente") presenca = "Ausente";
        }
        return { ...l, presenca_hoje: presenca };
      });

      setProfissionais(enr);
    } catch (e) {
      console.error(e);
      setProfissionais([]);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Navegar p/ perfil oficial
  ========================== */
  function abrirPerfilProfissional(prof?: ProfissionalLinha["profissional"]) {
    if (!prof?.id) return;
    const targetId = prof.user_id || prof.id; // igual Base Acrobatas
    navigate(`/empresa/profissional/${targetId}?pid=${prof.id}`);
  }

  /* =========================
     Avaliação — helpers
  ========================== */
  function abrirAvaliacaoDeProfLinha(item: ProfissionalLinha) {
    const p = item.profissional;
    if (!p?.id) return;
    if (!item.obra?.id) {
      toast.error("Não foi possível identificar a obra deste profissional.");
      return;
    }
    setAvaliacaoNota(0);
    setAvaliacaoComentario("");
    setAvaliacaoAlvo({
      profissionalId: p.id,
      profissionalNome: p.nome,
      obraId: item.obra.id,
      obraNome: item.obra.nome,
    });
  }

  function abrirAvaliacaoNaObra(p: ProfissionalLinha["profissional"]) {
    if (!p?.id) return;
    if (!obraSelecionada?.id) {
      toast.error("Obra não encontrada para avaliação.");
      return;
    }
    setAvaliacaoNota(0);
    setAvaliacaoComentario("");
    setAvaliacaoAlvo({
      profissionalId: p.id,
      profissionalNome: p.nome,
      obraId: obraSelecionada.id,
      obraNome: obraSelecionada.nome,
    });
  }

  async function salvarAvaliacao() {
    if (!avaliacaoAlvo?.profissionalId || !avaliacaoAlvo.obraId) {
      toast.error("Dados da avaliação incompletos.");
      return;
    }
    if (!avaliacaoNota) {
      toast.error("Selecione uma nota para avaliar.");
      return;
    }
    try {
      setAvaliando(true);
      const { error } = await supabase
        .from("avaliacoes_profissionais")
        .insert([
          {
            profissional_id: avaliacaoAlvo.profissionalId,
            obra_id: avaliacaoAlvo.obraId,
            nota_geral: avaliacaoNota,
            comentario: avaliacaoComentario || null,
          },
        ]);
      if (error) throw error;
      toast.success("Avaliação registada com sucesso.");
      setAvaliacaoAlvo(null);
    } catch (e) {
      console.error("Erro ao salvar avaliação:", e);
      toast.error("Erro ao registar a avaliação.");
    } finally {
      setAvaliando(false);
    }
  }

  /* =========================
     Filtros em memória
  ========================== */
  const profissionaisFiltrados = useMemo(() => {
    return profissionais.filter((item) => {
      const p = item.profissional || {};
      const nomeMatch = (p.nome || "")
        .toLowerCase()
        .includes(busca.toLowerCase());
      const funcaoMatch =
        filtroFuncao === "Todas" || item.funcao === filtroFuncao;
      const statusMatch = filtroStatus === "Todos" || p.status === filtroStatus;
      const presencaMatch =
        filtroPresenca === "Todas" || item.presenca_hoje === filtroPresenca;
      return nomeMatch && funcaoMatch && statusMatch && presencaMatch;
    });
  }, [profissionais, busca, filtroFuncao, filtroStatus, filtroPresenca]);

  /* =========================
     UI: Detalhes da obra
  ========================== */
  if (obraSelecionada) {
    const localFmt =
      obraSelecionada.local?.split(",").slice(0, 2).join(",") ||
      "Local não informado";
    const total = profissionais.length;
    const ativos = profissionais.filter(
      (p) => (p.profissional?.status || "") === "Ativo"
    ).length;
    const funcoes = [
      ...new Set(profissionais.map((p) => p.funcao).filter(Boolean)),
    ];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
              {obraSelecionada.nome}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-500" /> {localFmt}
            </p>
          </div>
          <button
            onClick={() => {
              setObraSelecionada(null);
              setProfissionais([]);
              setModo("obras");
            }}
            className="px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50/60 dark:hover:bg-blue-950/40 transition flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Voltar
          </button>
        </div>

        {/* Cards superiores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Profissionais na equipa",
              value: `${ativos}/${total}`,
              color: "text-emerald-500",
            },
            {
              label: "Funções na obra",
              value: funcoes.length,
              color: "text-blue-500",
            },
            {
              label: "Data de início",
              value: obraSelecionada.data_inicio
                ? new Date(obraSelecionada.data_inicio).toLocaleDateString(
                    "pt-PT"
                  )
                : "—",
              color: "text-slate-700 dark:text-slate-200",
            },
            {
              label: "Status geral da equipa",
              value: ativos === total && total > 0 ? "Completa" : "Em formação",
              color:
                ativos === total && total > 0
                  ? "text-emerald-500"
                  : "text-amber-400",
            },
          ].map((c, i) => (
            <div
              key={i}
              className="bg-white/90 dark:bg-[#050816]/90 border border-slate-100/70 dark:border-slate-700 rounded-2xl p-4 shadow-sm"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {c.label}
              </p>
              <p className={`mt-1 text-xl font-semibold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Lista da equipa da obra */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : profissionais.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Nenhum profissional alocado nesta obra.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700 bg-white/95 dark:bg-[#050816]/95 shadow-sm">
            <div className="overflow-x-auto max-h-[56vh]">
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {["Nome", "Função", "Status", "Presença (hoje)", "Ações"].map(
                      (col) => (
                        <th
                          key={col}
                          className="py-3 px-5 text-left text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map((item, i) => {
                    const p = item.profissional || {};
                    const initials = (p.nome || "—")
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <tr
                        key={item.id || i}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/80 dark:hover:bg-slate-900 transition"
                      >
                        <td className="py-3 px-4 md:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                              {initials}
                            </div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {p.nome || "—"}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 md:px-6 text-slate-600 dark:text-slate-300 text-sm">
                          {item.funcao || "—"}
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          {p.status === "Ativo" ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-500/10 text-slate-400">
                              {p.status || "Inativo"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          <span
                            className={
                              item.presenca_hoje === "Presente"
                                ? "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-500"
                                : item.presenca_hoje === "Ausente"
                                ? "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-rose-500/10 text-rose-500"
                                : "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-500/10 text-slate-400"
                            }
                          >
                            {item.presenca_hoje}
                          </span>
                        </td>
                        <td className="py-3 px-4 md:px-6 text-right">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => abrirPerfilProfissional(p)}
                              disabled={!p.id}
                              className={`inline-flex items-center gap-1 text-xs md:text-sm font-medium ${
                                p.id
                                  ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                  : "text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              <User className="w-4 h-4" /> Ver Perfil
                            </button>
                            <button
                              onClick={() => abrirAvaliacaoNaObra(p)}
                              disabled={!p.id}
                              className={`inline-flex items-center gap-1 text-xs md:text-sm font-medium ${
                                p.id
                                  ? "text-amber-500 hover:text-amber-400"
                                  : "text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              <Star className="w-4 h-4" /> Avaliar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de avaliação */}
        <AnimatePresence>
          {avaliacaoAlvo && (
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-full max-w-md rounded-2xl bg-white dark:bg-[#050816] border border-slate-200 dark:border-slate-700 p-5 shadow-2xl"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50">
                      Avaliar profissional
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {avaliacaoAlvo.profissionalNome} —{" "}
                      {avaliacaoAlvo.obraNome || "Obra"}
                    </p>
                  </div>
                  <button
                    onClick={() => setAvaliacaoAlvo(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Nota geral
                    </p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setAvaliacaoNota(n)}
                          className={`p-1.5 rounded-full transition ${
                            avaliacaoNota >= n
                              ? "text-amber-400"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        >
                          <Star className="w-6 h-6 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Comentário (opcional)
                    </p>
                    <textarea
                      value={avaliacaoComentario}
                      onChange={(e) => setAvaliacaoComentario(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                      placeholder="Feedback sobre pontualidade, qualidade, comportamento..."
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setAvaliacaoAlvo(null)}
                    className="px-3 py-1.5 rounded-lg text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarAvaliacao}
                    disabled={avaliando}
                    className="px-4 py-1.5 rounded-lg text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-60"
                  >
                    {avaliando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                    Guardar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  /* =========================
     UI: Página principal
  ========================== */
  return (
    <div className="p-6 md:p-8">
      {/* Header + Ações */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/12 via-blue-600/10 to-indigo-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              Equipas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Visão rápida das equipas por obra e dos profissionais alocados hoje.
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-900 p-1">
          <button
            onClick={() => setModo("obras")}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition ${
              modo === "obras"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Obras
          </button>
          <button
            onClick={() => setModo("profissionais")}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition ${
              modo === "profissionais"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Profissionais
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="relative overflow-hidden bg-white/90 dark:bg-[#050816]/95 border border-slate-100/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-emerald-500/10" />
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
            Presentes hoje
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-500">
            {metricPresentes}
          </p>
        </div>
        <div className="relative overflow-hidden bg-white/90 dark:bg-[#050816]/95 border border-slate-100/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-blue-500/10" />
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
            Obras com equipa ativa
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-500">
            {metricObrasAtivasHoje}
          </p>
        </div>
        <div className="relative overflow-hidden bg-white/90 dark:bg-[#050816]/95 border border-slate-100/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="absolute -right-6 -top-6 w-16 h-16 rounded-full bg-rose-500/10" />
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
            Ausências hoje
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-500">
            {metricAusencias}
          </p>
        </div>
      </div>

      {/* Filtros */}
      {modo === "profissionais" && (
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-[#050816] text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>

          {[
            {
              label: "Função",
              value: filtroFuncao,
              set: setFiltroFuncao,
              options: ["Todas", ...new Set(profissionais.map((p) => p.funcao).filter(Boolean))],
            },
            {
              label: "Status",
              value: filtroStatus,
              set: setFiltroStatus,
              options: ["Todos", "Ativo", "Inativo"],
            },
            {
              label: "Presença",
              value: filtroPresenca,
              set: setFiltroPresenca,
              options: ["Todas", "Presente", "Ausente", "Sem Registo"],
            },
          ].map((f) => (
            <select
              key={f.label}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-[#050816] text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              {f.options.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      <AnimatePresence>
        {modo === "obras" ? (
          loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : obras.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma obra encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {obras.map((obra) => (
                <motion.div
                  key={obra.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white/95 dark:bg-[#050816]/95 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 w-20 h-20 rounded-bl-[999px] bg-blue-500/5" />
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
                        {obra.nome}
                      </h2>
                    </div>
                  </div>
                  <div className="text-sm mb-4 text-slate-600 dark:text-slate-300 space-y-1 relative z-10">
                    <div>
                      Início:{" "}
                      {obra.data_inicio
                        ? new Date(obra.data_inicio).toLocaleDateString("pt-PT")
                        : "—"}
                    </div>
                    <div>👷 {obra.total_profissionais} profissionais</div>
                    <div>✅ {obra.presentes_hoje ?? 0} presentes hoje</div>
                  </div>
                  <button
                    onClick={() => {
                      setObraSelecionada(obra);
                      setProfissionais([]);
                      fetchProfissionaisObra(obra.id);
                    }}
                    className="relative z-10 flex items-center justify-center gap-2 w-full text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-700/70 hover:border-blue-400 dark:hover:border-blue-500 rounded-full py-2 transition font-medium text-sm bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40"
                  >
                    Ver equipa <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <div className="overflow-hidden bg-white/95 dark:bg-[#050816]/95 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : profissionaisFiltrados.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhum profissional encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left min-w-[760px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {[
                        "Nome",
                        "Função",
                        "Obra",
                        "Status",
                        "Presença (hoje)",
                        "Ações",
                      ].map((col) => (
                        <th
                          key={col}
                          className="py-3 px-5 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profissionaisFiltrados.map((item, i) => {
                      const p = item.profissional || {};
                      const initials = (p.nome || "—")
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <tr
                          key={item.id || i}
                          className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/80 dark:hover:bg-slate-900 transition"
                        >
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                                {initials}
                              </div>
                              <div className="font-medium text-slate-900 dark:text-slate-50 text-sm">
                                {p.nome || "—"}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 md:px-6 text-slate-600 dark:text-slate-300 text-sm">
                            {item.funcao || "—"}
                          </td>
                          <td className="py-3 px-4 md:px-6 text-slate-600 dark:text-slate-300 text-sm">
                            {item.obra?.nome || "—"}
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            {p.status === "Ativo" ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-500/10 text-slate-400">
                                {p.status || "Inativo"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 md:px-6">
                            <span
                              className={
                                item.presenca_hoje === "Presente"
                                  ? "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-500"
                                  : item.presenca_hoje === "Ausente"
                                  ? "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-rose-500/10 text-rose-500"
                                  : "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-500/10 text-slate-400"
                              }
                            >
                              {item.presenca_hoje}
                            </span>
                          </td>
                          <td className="py-3 px-4 md:px-6 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => abrirPerfilProfissional(p)}
                                disabled={!p.id}
                                className={`inline-flex items-center gap-1 text-xs md:text-sm font-medium ${
                                  p.id
                                    ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                    : "text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <User className="w-4 h-4" /> Ver Perfil
                              </button>
                              <button
                                onClick={() => abrirAvaliacaoDeProfLinha(item)}
                                disabled={!p.id}
                                className={`inline-flex items-center gap-1 text-xs md:text-sm font-medium ${
                                  p.id
                                    ? "text-amber-500 hover:text-amber-400"
                                    : "text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <Star className="w-4 h-4" /> Avaliar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Modal de avaliação também disponível aqui (modo profissionais) */}
      <AnimatePresence>
        {avaliacaoAlvo && !obraSelecionada && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* aqui ele reaproveita o modal já renderizado acima */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
