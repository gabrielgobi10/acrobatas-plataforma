// src/components/company/CentralDeNavegacaoEmpresa/Outros/EquipesEmCampo.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  X,
  CalendarDays,
  Briefcase,
  Activity,
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

/* =========================
   UI Helpers
========================= */
function initialsFromName(nome?: string | null) {
  const safe = (nome || "—").trim();
  if (!safe) return "—";
  return safe
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function BadgeStatus({ status }: { status?: string | null }) {
  const st = (status || "").toLowerCase();
  if (st === "ativo") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-slate-500/10 text-slate-400">
      {status || "Inativo"}
    </span>
  );
}

function BadgePresenca({
  presenca,
}: {
  presenca?: "Presente" | "Ausente" | "Sem Registo";
}) {
  const cls =
    presenca === "Presente"
      ? "bg-emerald-500/10 text-emerald-500"
      : presenca === "Ausente"
      ? "bg-rose-500/10 text-rose-500"
      : "bg-slate-500/10 text-slate-400";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {presenca || "Sem Registo"}
    </span>
  );
}

/** Card sem “manchas” (sem círculo decorativo no canto) */
function CardMetric({
  label,
  value,
  hint,
  Icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  Icon: any;
  tone?: "blue" | "emerald" | "rose";
}) {
  const toneMap: Record<string, { iconBg: string; value: string }> = {
    blue: {
      iconBg: "bg-blue-600/10 text-blue-600 dark:text-blue-400",
      value: "text-blue-600 dark:text-blue-400",
    },
    emerald: {
      iconBg: "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-600 dark:text-emerald-400",
    },
    rose: {
      iconBg: "bg-rose-600/10 text-rose-600 dark:text-rose-400",
      value: "text-rose-600 dark:text-rose-400",
    },
  };

  const t = toneMap[tone];

  return (
    <div className="bg-white/95 dark:bg-[#050816]/95 border border-slate-100/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-slate-400 dark:text-slate-500 uppercase">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold ${t.value}`}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>

        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${t.iconBg} shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function AvaliacaoModal({
  alvo,
  nota,
  setNota,
  comentario,
  setComentario,
  onClose,
  onSave,
  saving,
}: {
  alvo: AvaliacaoTarget;
  nota: number;
  setNota: (n: number) => void;
  comentario: string;
  setComentario: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#050816] border border-slate-200 dark:border-slate-700 p-5 shadow-2xl"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50">
              Avaliar profissional
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">
              {alvo.profissionalNome} — {alvo.obraNome || "Obra"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Nota geral</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  className={`p-1.5 rounded-full transition ${
                    nota >= n ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
                  }`}
                  aria-label={`Nota ${n}`}
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
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              placeholder="Feedback sobre pontualidade, qualidade, comportamento..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs md:text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const navigate = useNavigate();

  // Avaliação
  const [avaliacaoAlvo, setAvaliacaoAlvo] = useState<AvaliacaoTarget | null>(null);
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
  async function getPresencasHojeByProfissionalIds(ids: string[]): Promise<Record<string, PresencaHoje>> {
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
    (data || []).forEach((row: any) => {
      map[row.profissional_id] = {
        profissional_id: row.profissional_id,
        obra_id: row.obra_id ?? null,
        status: row.status ?? null,
      };
    });
    return map;
  }

  /* =========================
     Obras + presentes por obra
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
        total_profissionais: Array.isArray(obra.profissionais_obras) ? obra.profissionais_obras.length : 0,
      }));

      const profIds = base
        .flatMap((o) => o.profissionais_obras || [])
        .map((v) => v.profissional?.id)
        .filter(Boolean) as string[];

      const presencaMap = await getPresencasHojeByProfissionalIds(Array.from(new Set(profIds)));

      const comPresentes = base.map((obra) => {
        const presentes = (obra.profissionais_obras || []).reduce((acc, vinc) => {
          const pid = vinc.profissional?.id;
          const pres = pid ? presencaMap[pid] : undefined;
          const presente = pres && (pres.status || "").toLowerCase() === "presente";
          return acc + (presente ? 1 : 0);
        }, 0);
        return { ...obra, presentes_hoje: presentes };
      });

      setObras(comPresentes);
    } catch (e) {
      console.error(e);
      setObras([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!empresaId) {
      setObras([]);
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
        .not("obra_id", "is", null)
        .eq("obra.empresa_id", empId);

      if (error) throw error;

      const linhas = (data || []) as ProfissionalLinha[];
      const ids = Array.from(new Set(linhas.map((l) => l.profissional?.id).filter(Boolean) as string[]));
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
      const ids = Array.from(new Set(linhas.map((l) => l.profissional?.id).filter(Boolean) as string[]));
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
      const { error } = await supabase.from("avaliacoes_profissionais").insert([
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
  const opcoesFuncoes = useMemo(() => {
    const set = new Set((profissionais || []).map((p) => p.funcao).filter(Boolean) as string[]);
    return ["Todas", ...Array.from(set)];
  }, [profissionais]);

  const profissionaisFiltrados = useMemo(() => {
    return profissionais.filter((item) => {
      const p = item.profissional || {};
      const nomeMatch = (p.nome || "").toLowerCase().includes(busca.toLowerCase());
      const funcaoMatch = filtroFuncao === "Todas" || item.funcao === filtroFuncao;
      const statusMatch = filtroStatus === "Todos" || p.status === filtroStatus;
      const presencaMatch = filtroPresenca === "Todas" || item.presenca_hoje === filtroPresenca;
      return nomeMatch && funcaoMatch && statusMatch && presencaMatch;
    });
  }, [profissionais, busca, filtroFuncao, filtroStatus, filtroPresenca]);

  function limparFiltros() {
    setBusca("");
    setFiltroFuncao("Todas");
    setFiltroStatus("Todos");
    setFiltroPresenca("Todas");
  }

  /* =========================
     UI: Detalhes da obra
  ========================== */
  if (obraSelecionada) {
    const localFmt =
      obraSelecionada.local?.split(",").slice(0, 2).join(",") || "Local não informado";

    const total = profissionais.length;
    const ativos = profissionais.filter((p) => (p.profissional?.status || "") === "Ativo").length;
    const funcoes = [...new Set(profissionais.map((p) => p.funcao).filter(Boolean))];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8">
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/12 via-blue-600/10 to-indigo-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 truncate">
                  {obraSelecionada.nome}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-blue-500" /> {localFmt}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setObraSelecionada(null);
              setProfissionais([]);
              setModo("obras");
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Voltar
          </button>
        </div>

        {/* Cards superiores (sem manchas) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          <CardMetric
            label="Profissionais na equipa"
            value={`${ativos}/${total}`}
            hint="Ativos / Total"
            Icon={Users}
            tone="emerald"
          />
          <CardMetric
            label="Funções na obra"
            value={funcoes.length}
            hint="Distribuição por função"
            Icon={Activity}
            tone="blue"
          />
          <CardMetric
            label="Data de início"
            value={
              obraSelecionada.data_inicio
                ? new Date(obraSelecionada.data_inicio).toLocaleDateString("pt-PT")
                : "—"
            }
            hint="Registo da obra"
            Icon={CalendarDays}
            tone="blue"
          />
          <CardMetric
            label="Status da equipa"
            value={ativos === total && total > 0 ? "Completa" : "Em formação"}
            hint={ativos === total && total > 0 ? "Todos ativos" : "Ainda a consolidar"}
            Icon={CheckCircle2}
            tone={ativos === total && total > 0 ? "emerald" : "rose"}
          />
        </div>

        {/* Lista */}
        <div className="bg-white/95 dark:bg-[#050816]/95 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Equipa</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Profissionais alocados nesta obra e presença de hoje.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : profissionais.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum profissional alocado nesta obra.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[62vh]">
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {["Nome", "Função", "Status", "Presença (hoje)", "Ações"].map((col) => (
                      <th
                        key={col}
                        className="py-3 px-5 text-left text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map((item, i) => {
                    const p = item.profissional || {};
                    const initials = initialsFromName(p.nome);
                    return (
                      <tr
                        key={item.id || i}
                        className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/70 dark:hover:bg-slate-900 transition"
                      >
                        <td className="py-3 px-4 md:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-50 text-sm truncate">
                                {p.nome || "—"}
                              </div>
                              <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                                {p.area || item.funcao || "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 md:px-6 text-slate-600 dark:text-slate-300 text-sm">
                          {item.funcao || "—"}
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          <BadgeStatus status={p.status} />
                        </td>
                        <td className="py-3 px-4 md:px-6">
                          <BadgePresenca presenca={item.presenca_hoje} />
                        </td>
                        <td className="py-3 px-4 md:px-6">
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
                                p.id ? "text-amber-500 hover:text-amber-400" : "text-slate-400 cursor-not-allowed"
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

        {/* Modal de avaliação */}
        <AnimatePresence>
          {avaliacaoAlvo && (
            <AvaliacaoModal
              alvo={avaliacaoAlvo}
              nota={avaliacaoNota}
              setNota={setAvaliacaoNota}
              comentario={avaliacaoComentario}
              setComentario={setAvaliacaoComentario}
              onClose={() => setAvaliacaoAlvo(null)}
              onSave={salvarAvaliacao}
              saving={avaliando}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  /* =========================
     UI: Página principal
     (sem os 3 cards do topo)
  ========================== */
  return (
    <div className="p-6 md:p-8">
      {/* Header + Toggle */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/12 via-blue-600/10 to-indigo-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Equipas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Visão rápida por obra e profissionais alocados com presença de hoje.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/60 dark:border-slate-800">
          <button
            onClick={() => setModo("obras")}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition ${
              modo === "obras"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/70"
            }`}
          >
            Obras
          </button>
          <button
            onClick={() => setModo("profissionais")}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition ${
              modo === "profissionais"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/70"
            }`}
          >
            Profissionais
          </button>
        </div>
      </div>

      {/* Filtros (em card) */}
      {modo === "profissionais" && (
        <div className="bg-white/95 dark:bg-[#050816]/95 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-[#050816] text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>

            <select
              value={filtroFuncao}
              onChange={(e) => setFiltroFuncao(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-[#050816] text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              {opcoesFuncoes.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-[#050816] text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              {["Todos", "Ativo", "Inativo"].map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>

            <select
              value={filtroPresenca}
              onChange={(e) => setFiltroPresenca(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-[#050816] text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              {["Todas", "Presente", "Ausente", "Sem Registo"].map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={limparFiltros}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 transition"
            >
              Limpar
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {profissionaisFiltrados.length} resultado(s)
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        {modo === "obras" ? (
          <motion.div
            key="modo-obras"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : obras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhuma obra encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {obras.map((obra) => {
                  const localFmt =
                    obra.local?.split(",").slice(0, 2).join(",") || "Local não informado";
                  const inicio =
                    obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString("pt-PT") : "—";
                  const total = obra.total_profissionais ?? 0;
                  const presentes = obra.presentes_hoje ?? 0;

                  return (
                    <motion.div
                      key={obra.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white/95 dark:bg-[#050816]/95 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-50 truncate">
                            {obra.nome}
                          </h2>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            {localFmt}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            presentes > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {presentes > 0 ? "Equipa ativa" : "Sem presença"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Início
                          </p>
                          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{inicio}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Profissionais
                          </p>
                          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{total}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Presentes
                          </p>
                          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{presentes}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setObraSelecionada(obra);
                          setProfissionais([]);
                          fetchProfissionaisObra(obra.id);
                        }}
                        className="mt-4 flex items-center justify-center gap-2 w-full text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-700/70 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl py-2 transition font-medium text-sm bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/40"
                      >
                        Ver equipa <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="modo-profissionais"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white/95 dark:bg-[#050816]/95 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
          >
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
                <table className="w-full text-left min-w-[820px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {["Nome", "Função", "Obra", "Status", "Presença (hoje)", "Ações"].map((col) => (
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
                      const initials = initialsFromName(p.nome);

                      return (
                        <tr
                          key={item.id || i}
                          className="border-t border-slate-100 dark:border-slate-800 hover:bg-blue-50/70 dark:hover:bg-slate-900 transition"
                        >
                          <td className="py-3 px-4 md:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 dark:text-slate-50 text-sm truncate">
                                  {p.nome || "—"}
                                </div>
                                <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                                  {p.area || item.funcao || "—"}
                                </div>
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
                            <BadgeStatus status={p.status} />
                          </td>

                          <td className="py-3 px-4 md:px-6">
                            <BadgePresenca presenca={item.presenca_hoje} />
                          </td>

                          <td className="py-3 px-4 md:px-6">
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
                                  p.id ? "text-amber-500 hover:text-amber-400" : "text-slate-400 cursor-not-allowed"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de avaliação */}
      <AnimatePresence>
        {avaliacaoAlvo && (
          <AvaliacaoModal
            alvo={avaliacaoAlvo}
            nota={avaliacaoNota}
            setNota={setAvaliacaoNota}
            comentario={avaliacaoComentario}
            setComentario={setAvaliacaoComentario}
            onClose={() => setAvaliacaoAlvo(null)}
            onSave={salvarAvaliacao}
            saving={avaliando}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
