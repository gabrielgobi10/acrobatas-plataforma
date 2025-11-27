// src/components/company/CentralDeNavegacaoEmpresa/Outros/EquipesEmCampo.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Search,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";

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

export default function EquipesEmCampo() {
  const [modo, setModo] = useState<"obras" | "profissionais">("profissionais");
  const [obras, setObras] = useState<Obra[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalLinha[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<Obra | null>(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

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
  async function fetchObras() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("obras")
        .select(`
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
        `)
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

      // métricas globais
      const totalPresentes = Object.values(presencaMap).filter(
        (p) => (p.status || "").toLowerCase() === "presente"
      ).length;
      const totalAusentes = Object.values(presencaMap).filter(
        (p) => (p.status || "").toLowerCase() === "ausente"
      ).length;
      const obrasComEquipa = comPresentes.filter((o) => (o.presentes_hoje || 0) > 0).length;

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
    fetchObras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     Profissionais (lista)
  ========================== */
  async function fetchProfissionais() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(`
          id,
          funcao,
          status,
          data_inicio,
          obra:obra_id (id, nome),
          profissional:profissional_id ( id, nome, area, status, foto_url )
        `);
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
    if (modo === "profissionais") {
      setObraSelecionada(null);
      setProfissionalSelecionado(null);
      fetchProfissionais();
    }
  }, [modo]);

  /* =========================
     Profissionais por obra
  ========================== */
  async function fetchProfissionaisObra(obraId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(`
          id,
          funcao,
          status,
          data_inicio,
          profissional:profissional_id ( id, nome, area, status, foto_url )
        `)
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
     Perfil (visual simples)
  ========================== */
  async function fetchProfissional(id: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("profissionais").select("*").eq("id", id).single();
      if (error) throw error;
      setProfissionalSelecionado(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Filtros em memória
  ========================== */
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

  /* =========================
     UI: Perfil (mínimo)
  ========================== */
  if (profissionalSelecionado) {
    const p = profissionalSelecionado;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
        <div className="max-w-xl mx-auto bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-2xl p-8 text-center shadow-sm">
          <div
            className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl font-semibold text-white ${
              p.status === "Ativo" ? "bg-green-500" : "bg-gray-400"
            }`}
          >
            {p.nome?.[0] || "?"}
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-100">{p.nome}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {p.area || "Função não definida"} •{" "}
            <span className={p.status === "Ativo" ? "text-green-600" : "text-gray-400"}>{p.status}</span>
          </p>
          <button
            onClick={() => setProfissionalSelecionado(null)}
            className="mt-6 inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </motion.div>
    );
  }

  /* =========================
     UI: Detalhes da obra
  ========================== */
  if (obraSelecionada) {
    const localFmt = obraSelecionada.local?.split(",").slice(0, 2).join(",") || "Local não informado";
    const total = profissionais.length;
    const ativos = profissionais.filter((p) => (p.profissional?.status || "") === "Ativo").length;
    const funcoes = [...new Set(profissionais.map((p) => p.funcao).filter(Boolean))];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{obraSelecionada.nome}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-500" /> {localFmt}
            </p>
          </div>
          <button
            onClick={() => {
              setObraSelecionada(null);
              setProfissionais([]);
            }}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Profissionais Ativos", value: `${ativos}/${total}`, color: "text-green-600" },
            { label: "Funções em Execução", value: funcoes.length, color: "text-blue-600" },
            {
              label: "Data de Início",
              value: obraSelecionada.data_inicio ? new Date(obraSelecionada.data_inicio).toLocaleDateString("pt-PT") : "—",
              color: "text-gray-700",
            },
            {
              label: "Status Geral",
              value: ativos === total && total > 0 ? "Completa" : "Em andamento",
              color: ativos === total && total > 0 ? "text-green-600" : "text-yellow-600",
            },
          ].map((c, i) => (
            <div key={i} className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : profissionais.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center text-sm text-gray-400">
            Nenhum profissional alocado nesta obra.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-[#1b2332]">
            <div className="overflow-x-auto max-h-[56vh]">
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur border-b border-gray-200 dark:border-zinc-700">
                  <tr>
                    {["Nome", "Função", "Status", "Presença (hoje)", "Ações"].map((col) => (
                      <th key={col} className="py-3 px-5 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map((item, i) => {
                    const p = item.profissional || {};
                    const initials = (p.nome || "—").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
                    return (
                      <tr
                        key={item.id || i}
                        className={`border-t border-gray-200 dark:border-zinc-700 ${
                          i % 2 === 0 ? "bg-white dark:bg-[#1b2332]" : "bg-gray-50 dark:bg-zinc-800"
                        } hover:bg-blue-50/60 dark:hover:bg-[#243147] transition`}
                      >
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                              {initials}
                            </div>
                            <div className="font-medium text-gray-800 dark:text-gray-100">{p.nome || "—"}</div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-gray-600 dark:text-gray-300">{item.funcao || "—"}</td>
                        <td className="py-3 px-6">
                          {p.status === "Ativo" ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400">
                              {p.status || "Inativo"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6">
                          <span
                            className={
                              item.presenca_hoje === "Presente"
                                ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600"
                                : item.presenca_hoje === "Ausente"
                                ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-500"
                                : "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400"
                            }
                          >
                            {item.presenca_hoje}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <button
                            onClick={() => p.id && fetchProfissional(p.id)}
                            disabled={!p.id}
                            className={`inline-flex items-center gap-1 text-sm font-medium ${
                              p.id ? "text-blue-600 hover:text-blue-700" : "text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <User className="w-4 h-4" /> Ver Perfil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  /* =========================
     UI: Página principal
  ========================== */
  return (
    <div className="p-8">
      {/* Header + Ações */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Equipes em Campo</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Acompanhe as obras ou visualize todos os profissionais em campo.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModo("obras")}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              modo === "obras"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-[#1b2332] border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Obras
          </button>
          <button
            onClick={() => setModo("profissionais")}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              modo === "profissionais"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-[#1b2332] border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-200"
            }`}
          >
            Profissionais
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Presentes Hoje</p>
          <p className="text-2xl font-bold text-green-600">{metricPresentes}</p>
        </div>
        <div className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Obras com Equipa Ativa</p>
          <p className="text-2xl font-bold text-blue-600">{metricObrasAtivasHoje}</p>
        </div>
        <div className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-xl p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ausências Hoje</p>
          <p className="text-2xl font-bold text-red-500">{metricAusencias}</p>
        </div>
      </div>

      {/* Filtros */}
      {modo === "profissionais" && (
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#1b2332] text-sm text-gray-800 dark:text-gray-100"
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
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#1b2332] text-sm text-gray-800 dark:text-gray-100"
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
            <div className="rounded-2xl border border-dashed border-zinc-700 p-10 text-center text-sm text-gray-400">
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
                  className="bg-white dark:bg-[#1b2332] rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{obra.nome}</h2>
                    </div>
                  </div>
                  <div className="text-sm mb-4 text-gray-600 dark:text-gray-300 space-y-1">
                    <div>
                      Início:{" "}
                      {obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString("pt-PT") : "—"}
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
                    className="flex items-center justify-center gap-2 w-full text-blue-600 hover:text-blue-700 border border-blue-200 dark:border-blue-700 hover:border-blue-400 rounded-lg py-2 transition font-medium text-sm"
                  >
                    Ver Detalhes <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <div className="overflow-hidden bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-sm">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : profissionaisFiltrados.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">Nenhum profissional encontrado.</div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left min-w-[760px]">
                  <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-zinc-800/95 backdrop-blur border-b border-gray-200 dark:border-zinc-700">
                    <tr>
                      {["Nome", "Função", "Obra", "Status", "Presença (hoje)", "Ações"].map((col) => (
                        <th key={col} className="py-3 px-5 text-sm font-medium text-gray-600 dark:text-gray-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {profissionaisFiltrados.map((item, i) => {
                      const p = item.profissional || {};
                      const initials = (p.nome || "—").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
                      return (
                        <tr
                          key={item.id || i}
                          className={`border-t border-gray-200 dark:border-zinc-700 ${
                            i % 2 === 0 ? "bg-white dark:bg-[#1b2332]" : "bg-gray-50 dark:bg-zinc-800"
                          } hover:bg-blue-50/60 dark:hover:bg-[#243147] transition`}
                        >
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                                {initials}
                              </div>
                              <div className="font-medium text-gray-800 dark:text-gray-100">{p.nome || "—"}</div>
                            </div>
                          </td>
                          <td className="py-3 px-6 text-gray-600 dark:text-gray-300">{item.funcao || "—"}</td>
                          <td className="py-3 px-6 text-gray-600 dark:text-gray-300">{item.obra?.nome || "—"}</td>
                          <td className="py-3 px-6">
                            {p.status === "Ativo" ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400">
                                {p.status || "Inativo"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-6">
                            <span
                              className={
                                item.presenca_hoje === "Presente"
                                  ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600"
                                  : item.presenca_hoje === "Ausente"
                                  ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-500"
                                  : "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-400"
                              }
                            >
                              {item.presenca_hoje}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right">
                            <button
                              onClick={() => p.id && fetchProfissional(p.id)}
                              disabled={!p.id}
                              className={`inline-flex items-center gap-1 text-sm font-medium ${
                                p.id ? "text-blue-600 hover:text-blue-700" : "text-gray-400 cursor-not-allowed"
                              }`}
                            >
                              <User className="w-4 h-4" /> Ver Perfil
                            </button>
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
    </div>
  );
}
