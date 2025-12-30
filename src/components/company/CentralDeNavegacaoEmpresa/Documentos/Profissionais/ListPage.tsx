"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Search,
  Calendar,
  Clock4,
  RefreshCcw,
  ChevronDown,
  SortAsc,
  SortDesc,
  Shield,
  User as UserIcon,
  Users,
  CircleDot,
  Circle,
  Folder,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

/* ======================
   Tipos
====================== */
type Status = "Válido" | "Pendente" | "Vencido" | "Reprovado";
type SortKey = "nome" | "categoria" | "validade" | "atualizado_em" | "status";
type Responsabilidade = "profissional" | "acrobatas" | "ambos";

type Documento = {
  id: string;
  profissional_id: string;
  tipo_id: string;
  nome: string;
  categoria: string | null;
  validade?: string | null; // dd/mm/yyyy
  status: Status;
  atualizado_em?: string | null; // dd/mm/yyyy
  url?: string | null;
  obrigatorio?: boolean | null;
  responsabilidade: Responsabilidade;
  prof_pode_enviar?: boolean | null;
  bloqueado?: boolean | null;
};

type ProfissionalResumo = {
  id: string;
  nome: string;
  ativoEmObra: boolean;
  totalDocs: number;
  pendentes: number;
  vencidos: number;
  validos: number;
};

/* ======================
   Helpers de data
====================== */
function parsePTDate(d?: string | null): Date | null {
  if (!d) return null;
  const [dd, mm, yyyy] = d.split("/").map((v) => parseInt(v, 10));
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 12);
}

function daysUntil(dateStr?: string | null): number | null {
  const dt = parsePTDate(dateStr);
  if (!dt) return null;
  const t0 = new Date();
  const ms = dt.setHours(0, 0, 0, 0) - t0.setHours(0, 0, 0, 0);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/* ======================
   UI helpers
====================== */
function StatusBadge({ status }: { status: Status }) {
  const cls =
    status === "Válido"
      ? "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-400"
      : status === "Pendente"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-400"
      : status === "Reprovado"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-300"
      : "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-400";

  return (
    <span className={`px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full ${cls}`}>
      {status}
    </span>
  );
}

function VencimentoBadge({ validade }: { validade?: string | null }) {
  const d = daysUntil(validade);
  if (d === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
        <Calendar size={14} /> Sem validade
      </span>
    );
  }
  if (d < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <Calendar size={14} /> Vencido há {Math.abs(d)}d
      </span>
    );
  }
  const near = d <= 15;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        near ? "text-yellow-600" : "text-zinc-600 dark:text-zinc-300"
      }`}
    >
      <Calendar size={14} /> Vence em {d}d
    </span>
  );
}

function ResponsabilidadeBadge({ resp }: { resp: Responsabilidade }) {
  if (resp === "profissional") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-300">
        <UserIcon size={12} /> Profissional
      </span>
    );
  }
  if (resp === "acrobatas") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300">
        <Shield size={12} /> Acrobatas
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300">
      <UserIcon size={12} />
      <Shield size={12} /> Ambos
    </span>
  );
}

/* ======================
   Barra de filtros docs
====================== */
function FiltroBar({
  categorias,
  query,
  setQuery,
  categoria,
  setCategoria,
  status,
  setStatus,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  onReset,
}: {
  categorias: string[];
  query: string;
  setQuery: (s: string) => void;
  categoria: string;
  setCategoria: (s: string) => void;
  status: "Todos" | Status;
  setStatus: (s: "Todos" | Status) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  sortDir: "asc" | "desc";
  setSortDir: (d: "asc" | "desc") => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
      <div className="flex-1 flex items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar documento..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725] outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <div className="relative">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725]"
            >
              <option value="Todas">Todas categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70"
            />
          </div>

          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725]"
            >
              <option value="Todos">Todos status</option>
              <option value="Válido">Válidos</option>
              <option value="Pendente">Pendentes</option>
              <option value="Vencido">Vencidos</option>
              <option value="Reprovado">Reprovados</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725]"
            >
              <option value="validade">Ordenar por validade</option>
              <option value="status">Ordenar por status</option>
              <option value="nome">Ordenar por nome</option>
              <option value="categoria">Ordenar por categoria</option>
              <option value="atualizado_em">Ordenar por atualização</option>
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70">
              {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
            </div>
          </div>

          <button
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            className="px-2 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Inverter ordem"
          >
            {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>

          <button
            onClick={onReset}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Limpar filtros"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================
   Card de resumo
====================== */
function ResumoCard({
  titulo,
  valor,
  cor,
  icone,
}: {
  titulo: string;
  valor: number | string;
  cor: string;
  icone: ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700"
    >
      <div className={`flex justify-center mb-1 sm:mb-2 ${cor}`}>{icone}</div>
      <p className="text-[11px] sm:text-sm text-zinc-600 dark:text-zinc-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {valor}
      </p>
    </motion.div>
  );
}

/* ======================
   Página principal
====================== */
export default function DocumentosProfissionaisEmpresa() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalResumo[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);

  // filtros docs
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [status, setStatus] = useState<"Todos" | Status>("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("validade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // filtros profissionais
  const [buscaProf, setBuscaProf] = useState("");
  const [filtroAtividade, setFiltroAtividade] = useState<"todos" | "ativos" | "inativos">("todos");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setDocumentos([]);
      setProfissionais([]);
      setSelectedProfId(null);
      return;
    }

    let ativo = true;

    async function carregar() {
      setLoading(true);

      try {
        // 1) empresa do user
        const { data: empId, error: empErr } = await supabase.rpc("minha_empresa_id");
        if (empErr) throw empErr;

        const empresaId = empId as string | null;
        if (!empresaId) {
          if (ativo) {
            setDocumentos([]);
            setProfissionais([]);
            setSelectedProfId(null);
            setLoading(false);
          }
          return;
        }

        // 2) profissionais vinculados
        const { data: vinc, error: vincErr } = await supabase
          .from("profissionais_obras")
          .select("profissional_id")
          .eq("empresa_id", empresaId);

        if (vincErr) throw vincErr;

        const idsProfissionais = Array.from(
          new Set((vinc || []).map((v: any) => v.profissional_id).filter(Boolean) as string[]),
        );

        if (idsProfissionais.length === 0) {
          if (ativo) {
            setDocumentos([]);
            setProfissionais([]);
            setSelectedProfId(null);
            setLoading(false);
          }
          return;
        }

        // 3) nomes
        const { data: profDb, error: profErr } = await supabase
          .from("profissionais")
          .select("id, nome")
          .in("id", idsProfissionais);

        if (profErr) throw profErr;

        // 4) DOCUMENTOS (painel empresa deve usar empresa_docs_prof_v)
        const { data: docsDb, error: docsErr } = await supabase
          .from("empresa_docs_prof_v")
          .select(
            "doc_id, empresa_id, profissional_id, tipo_id, documento_nome, categoria, obrigatorio, responsavel, prof_pode_enviar, status, validade, arquivo_url, atualizado_em, bloqueado, comentario_admin, ordem",
          )
          .eq("empresa_id", empresaId)
          .in("profissional_id", idsProfissionais)
          .order("profissional_id", { ascending: true })
          .order("ordem", { ascending: true })
          .order("documento_nome", { ascending: true });

        if (docsErr) throw docsErr;

        if (!ativo) return;

        const mappedDocs: Documento[] = [];
        const profMap = new Map<string, ProfissionalResumo>();

        (profDb || []).forEach((p: any) => {
          const id = p.id as string;
          profMap.set(id, {
            id,
            nome: p.nome || "Profissional",
            ativoEmObra: true,
            totalDocs: 0,
            pendentes: 0,
            vencidos: 0,
            validos: 0,
          });
        });

        (docsDb || []).forEach((d: any) => {
          const originalNome: string = d.documento_nome || "";

          // remover contactos de emergência da lista
          if (originalNome.toLowerCase().startsWith("contactos de emergência")) {
            return;
          }

          const nomeNormalizado = originalNome.startsWith(
            "Comprovativo de regularização de trabalhadores estrangeiros",
          )
            ? "Comprovativo de regularização de trabalhadores estrangeiros (Título ou Autorização de Residência/CPLP/TR)"
            : originalNome;

          const validadeStr = d.validade ? new Date(d.validade).toLocaleDateString("pt-PT") : null;
          const atualizadoStr = d.atualizado_em
            ? new Date(d.atualizado_em).toLocaleDateString("pt-PT")
            : null;

          let statusDoc: Status = d.status as Status;

          // recalcula vencido só se tiver validade e não estiver pendente/reprovado
          if (validadeStr && statusDoc !== "Pendente" && statusDoc !== "Reprovado") {
            const diff = daysUntil(validadeStr);
            if (diff !== null && diff < 0) statusDoc = "Vencido";
          }

          let resp: Responsabilidade;
          const r = String(d.responsavel || "").toLowerCase();
          if (r === "profissional") resp = "profissional";
          else if (r === "acrobatas" || r === "admin") resp = "acrobatas";
          else resp = "ambos";

          // regra fixa (como você já tinha)
          if (
            nomeNormalizado.includes("Ficha de Aptidão Médica") ||
            nomeNormalizado.includes("Registo de distribuição de EPI") ||
            nomeNormalizado.includes("Comprovativo de Comunicação de Admissão na Segurança Social")
          ) {
            resp = "acrobatas";
          }

          mappedDocs.push({
            id: String(d.doc_id),
            profissional_id: String(d.profissional_id),
            tipo_id: String(d.tipo_id),
            nome: nomeNormalizado,
            categoria: d.categoria,
            validade: validadeStr,
            status: statusDoc,
            atualizado_em: atualizadoStr,
            url: d.arquivo_url,
            obrigatorio: d.obrigatorio,
            responsabilidade: resp,
            prof_pode_enviar: d.prof_pode_enviar,
            bloqueado: d.bloqueado,
          });

          const pid = String(d.profissional_id);
          const resumo = profMap.get(pid) || {
            id: pid,
            nome: "Profissional",
            ativoEmObra: true,
            totalDocs: 0,
            pendentes: 0,
            vencidos: 0,
            validos: 0,
          };

          resumo.totalDocs += 1;
          if (statusDoc === "Pendente") resumo.pendentes += 1;
          if (statusDoc === "Vencido") resumo.vencidos += 1;
          if (statusDoc === "Válido") resumo.validos += 1;

          profMap.set(pid, resumo);
        });

        const profList = Array.from(profMap.values()).sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt"),
        );

        setDocumentos(mappedDocs);
        setProfissionais(profList);

        if (profList.length > 0) {
          const primeiroAtivo = profList.find((p) => p.ativoEmObra);
          setSelectedProfId((primeiroAtivo || profList[0]).id);
        } else {
          setSelectedProfId(null);
        }

        setLoading(false);
      } catch (e) {
        console.error("Erro a carregar documentos da empresa:", e);
        if (ativo) {
          setDocumentos([]);
          setProfissionais([]);
          setSelectedProfId(null);
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [user?.id]);

  const docsDoProf = useMemo(
    () => documentos.filter((d) => (selectedProfId ? d.profissional_id === selectedProfId : false)),
    [documentos, selectedProfId],
  );

  const resumoSelecionado = useMemo(() => {
    const validos = docsDoProf.filter((d) => d.status === "Válido").length;
    const pendentes = docsDoProf.filter((d) => d.status === "Pendente").length;
    const vencidos = docsDoProf.filter((d) => d.status === "Vencido").length;
    const obrigatorios = docsDoProf.filter((d) => d.obrigatorio).length || docsDoProf.length;
    const completion = obrigatorios ? Math.round((validos / obrigatorios) * 100) : 0;
    return { validos, pendentes, vencidos, completion };
  }, [docsDoProf]);

  const categorias = useMemo(
    () =>
      Array.from(new Set(docsDoProf.map((d) => d.categoria).filter(Boolean) as string[])).sort(
        (a, b) => a.localeCompare(b),
      ),
    [docsDoProf],
  );

  const docsFiltrados = useMemo(() => {
    let arr = [...docsDoProf];

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (d) =>
          d.nome.toLowerCase().includes(q) ||
          (d.categoria || "").toLowerCase().includes(q) ||
          (d.validade || "").includes(q),
      );
    }
    if (categoria !== "Todas") arr = arr.filter((d) => d.categoria === categoria);
    if (status !== "Todos") arr = arr.filter((d) => d.status === status);

    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "validade" || sortKey === "atualizado_em") {
        const da = parsePTDate(a[sortKey] || "");
        const db = parsePTDate(b[sortKey] || "");
        const va = da ? da.getTime() : sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        const vb = db ? db.getTime() : sortDir === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        return va > vb ? dir : va < vb ? -dir : 0;
      }
      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      return va > vb ? dir : va < vb ? -dir : 0;
    });

    return arr;
  }, [docsDoProf, query, categoria, status, sortKey, sortDir]);

  const profSelecionado = useMemo(
    () => profissionais.find((p) => p.id === selectedProfId) || null,
    [profissionais, selectedProfId],
  );

  const profissionaisFiltrados = useMemo(() => {
    let arr = [...profissionais];

    if (filtroAtividade === "ativos") arr = arr.filter((p) => p.ativoEmObra);
    else if (filtroAtividade === "inativos") arr = arr.filter((p) => !p.ativoEmObra);

    if (buscaProf.trim()) {
      const q = buscaProf.toLowerCase();
      arr = arr.filter((p) => p.nome.toLowerCase().includes(q));
    }

    return arr;
  }, [profissionais, filtroAtividade, buscaProf]);

  const handleResetFiltrosDocs = () => {
    setQuery("");
    setCategoria("Todas");
    setStatus("Todos");
    setSortKey("validade");
    setSortDir("asc");
  };

  function openInNewTab(url?: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
          <div className="relative">
            <Folder className="w-10 h-10 animate-pulse" />
            <Loader2 className="w-4 h-4 animate-spin absolute -bottom-2 -right-2" />
          </div>
          <span className="text-xs sm:text-sm">A carregar documentos…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center gap-3 mb-2">
        <Users className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Documentos dos Profissionais</h1>
      </div>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base mb-6 max-w-3xl">
        Consulte a documentação dos trabalhadores associados à sua empresa, verifique prazos de validade e faça
        download dos ficheiros quando necessário.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-72 xl:w-80 bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-blue-500" />
            <h2 className="text-sm font-semibold">Profissionais</h2>
          </div>

          <div className="mb-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={buscaProf}
                onChange={(e) => setBuscaProf(e.target.value)}
                placeholder="Pesquisar profissional..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#101725] focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-1 mb-3 text-[11px]">
            <button
              onClick={() => setFiltroAtividade("todos")}
              className={`flex-1 px-2 py-1 rounded-md border text-center ${
                filtroAtividade === "todos"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroAtividade("ativos")}
              className={`flex-1 px-2 py-1 rounded-md border text-center flex items-center justify-center gap-1 ${
                filtroAtividade === "ativos"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              <CircleDot size={11} /> Ativos
            </button>
            <button
              onClick={() => setFiltroAtividade("inativos")}
              className={`flex-1 px-2 py-1 rounded-md border text-center flex items-center justify-center gap-1 ${
                filtroAtividade === "inativos"
                  ? "bg-zinc-700 text-white border-zinc-700"
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
              }`}
            >
              <Circle size={11} /> Inativos
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-auto pr-1">
            {profissionaisFiltrados.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum profissional encontrado.</p>
            ) : (
              profissionaisFiltrados.map((p) => {
                const isSelected = p.id === selectedProfId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfId(p.id)}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs border transition flex flex-col gap-1 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[11px] line-clamp-1 text-sm">
                        {p.nome}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[10px] ${
                          p.ativoEmObra
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-700/30 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-200"
                        }`}
                      >
                        {p.ativoEmObra ? (
                          <>
                            <CircleDot size={9} /> Ativo em obra
                          </>
                        ) : (
                          <>
                            <Circle size={9} /> Sem obra
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                      <span>Total: {p.totalDocs}</span>
                      <span>Pendentes: {p.pendentes}</span>
                      <span>Vencidos: {p.vencidos}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex-1">
          {!profSelecionado ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Selecione um profissional à esquerda para ver os documentos.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/10 flex items-center justify-center">
                      <UserIcon size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold">
                        Documentos de {profSelecionado.nome}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} /> Profissional ligado à sua empresa
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {profSelecionado.ativoEmObra ? (
                            <>
                              <CircleDot size={10} className="text-emerald-500" /> Ativo em obra
                            </>
                          ) : (
                            <>
                              <Circle size={10} className="text-zinc-400" /> Sem obra ativa
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <ResumoCard
                  titulo="Válidos"
                  valor={resumoSelecionado.validos}
                  cor="text-green-500"
                  icone={<CheckCircle2 size={18} />}
                />
                <ResumoCard
                  titulo="Pendentes"
                  valor={resumoSelecionado.pendentes}
                  cor="text-yellow-500"
                  icone={<AlertTriangle size={18} />}
                />
                <ResumoCard
                  titulo="Vencidos"
                  valor={resumoSelecionado.vencidos}
                  cor="text-red-500"
                  icone={<XCircle size={18} />}
                />
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Completude do perfil de documentos
                  </span>
                  <span className="text-sm font-medium">{resumoSelecionado.completion}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${resumoSelecionado.completion}%` }}
                  />
                </div>
              </div>

              <FiltroBar
                categorias={categorias}
                query={query}
                setQuery={setQuery}
                categoria={categoria}
                setCategoria={setCategoria}
                status={status}
                setStatus={setStatus}
                sortKey={sortKey}
                setSortKey={setSortKey}
                sortDir={sortDir}
                setSortDir={setSortDir}
                onReset={handleResetFiltrosDocs}
              />

              <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-sm">
                <h3 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
                  <FileText size={18} /> Documentos
                </h3>

                {docsFiltrados.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Nenhum documento encontrado para este profissional.
                    </p>
                    <button
                      onClick={handleResetFiltrosDocs}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                    >
                      <RefreshCcw size={16} /> Limpar filtros
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 sm:hidden">
                      {docsFiltrados.map((doc) => (
                        <motion.div
                          key={doc.id}
                          whileHover={{ scale: 1.02 }}
                          className="rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#232c3d]"
                        >
                          <div className="flex justify-between items-start gap-3 mb-1">
                            <div className="flex-1">
                              <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">
                                {doc.nome}
                              </p>
                              <div className="flex items-center gap-2 mt-[2px] flex-wrap">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {doc.categoria || "—"}
                                </span>
                                <ResponsabilidadeBadge resp={doc.responsabilidade} />
                              </div>
                              <div className="mt-1 text-[11px]">
                                {doc.url ? (
                                  <button
                                    onClick={() => openInNewTab(doc.url)}
                                    className="inline-flex items-center gap-1 text-blue-400 hover:underline underline-offset-2 break-all"
                                  >
                                    <FileText size={11} />
                                    Ver documento enviado
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                    <FileText size={11} />
                                    Nenhum ficheiro enviado
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge status={doc.status} />
                          </div>

                          <div className="flex items-center justify-between mt-2 text-xs">
                            <VencimentoBadge validade={doc.validade} />
                            <span className="text-zinc-500 dark:text-zinc-400">
                              <Clock4 size={12} className="inline mr-1" />
                              {doc.atualizado_em ? `Atualizado ${doc.atualizado_em}` : "Nunca atualizado"}
                            </span>
                          </div>

                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={() => openInNewTab(doc.url)}
                              disabled={!doc.url}
                              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition ${
                                doc.url
                                  ? "bg-blue-600/90 text-white hover:bg-blue-700"
                                  : "bg-zinc-400 text-white opacity-70"
                              }`}
                            >
                              <Eye size={14} /> Ver
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div className="hidden sm:block">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left border-b border-zinc-300 dark:border-zinc-700">
                            <th className="py-3 px-2">Documento</th>
                            <th className="py-3 px-2">Categoria</th>
                            <th className="py-3 px-2">Responsável</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2">Validade</th>
                            <th className="py-3 px-2">Atualizado</th>
                            <th className="py-3 px-2 text-center">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docsFiltrados.map((doc) => (
                            <motion.tr
                              key={doc.id}
                              whileHover={{ scale: 1.01 }}
                              className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#243043] transition"
                            >
                              <td className="py-3 px-2 font-medium align-top">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span>{doc.nome}</span>
                                  </div>
                                  <div className="text-[11px]">
                                    {doc.url ? (
                                      <button
                                        onClick={() => openInNewTab(doc.url)}
                                        className="inline-flex items-center gap-1 text-blue-400 hover:underline underline-offset-2 break-all"
                                      >
                                        <FileText size={11} />
                                        Ver documento enviado
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                                        <FileText size={11} />
                                        Nenhum ficheiro enviado
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2">{doc.categoria || "—"}</td>
                              <td className="py-3 px-2">
                                <ResponsabilidadeBadge resp={doc.responsabilidade} />
                              </td>
                              <td className="py-3 px-2">
                                <StatusBadge status={doc.status} />
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <span>{doc.validade || "—"}</span>
                                  <VencimentoBadge validade={doc.validade} />
                                </div>
                              </td>
                              <td className="py-3 px-2">{doc.atualizado_em || "—"}</td>
                              <td className="py-3 px-2">
                                <div className="flex justify-center">
                                  <button
                                    title={doc.url ? "Ver (abre em nova aba)" : "Sem ficheiro"}
                                    onClick={() => openInNewTab(doc.url)}
                                    disabled={!doc.url}
                                    className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 ${
                                      doc.url ? "" : "opacity-50 cursor-not-allowed"
                                    }`}
                                  >
                                    <Eye size={18} className="text-blue-500" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 sm:mt-10 text-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
                Os documentos são enviados pelos profissionais ou pela equipa Acrobatas e analisados para garantir a
                conformidade legal e de segurança. A empresa tem acesso apenas para consulta e download.
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
