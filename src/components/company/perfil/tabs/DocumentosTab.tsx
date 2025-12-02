"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Filter as FilterIcon,
  Search,
  Calendar,
  Clock4,
  RefreshCcw,
  ChevronDown,
  SortAsc,
  SortDesc,
  Shield,
  User as UserIcon,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ======================
   Tipos
====================== */
type Status = "Válido" | "Pendente" | "Vencido" | "Reprovado";
type SortKey = "nome" | "categoria" | "validade" | "atualizado_em" | "status";
type Responsabilidade = "profissional" | "acrobatas" | "ambos";

type Documento = {
  id: string; // id em documentos_acrobatas (doc_id na view)
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
  comentario_admin?: string | null;
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
   Barra de filtros
====================== */
type FiltroResp = "todas" | "profissional" | "acrobatas";

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
  filtroResp,
  setFiltroResp,
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
  filtroResp: FiltroResp;
  setFiltroResp: (f: FiltroResp) => void;
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
            <FilterIcon
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70"
            />
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

      {/* Filtro rápido de responsabilidade */}
      <div className="flex justify-center sm:justify-end gap-1 rounded-lg bg-zinc-900/5 dark:bg-zinc-100/5 p-1">
        <RespToggleItem
          active={filtroResp === "todas"}
          onClick={() => setFiltroResp("todas")}
          label="Todos"
        />
        <RespToggleItem
          active={filtroResp === "profissional"}
          onClick={() => setFiltroResp("profissional")}
          label="Profissional"
          icon={<UserIcon size={14} />}
        />
        <RespToggleItem
          active={filtroResp === "acrobatas"}
          onClick={() => setFiltroResp("acrobatas")}
          label="Acrobatas"
          icon={<Shield size={14} />}
        />
      </div>
    </div>
  );
}

function RespToggleItem({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs sm:text-sm transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ======================
   Card de Resumo
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
      <p className="text-[11px] sm:text-sm text-zinc-600 dark:text-zinc-400">
        {titulo}
      </p>
      <p className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {valor}
      </p>
    </motion.div>
  );
}

/* ======================
   Componente principal (EMPRESA)
====================== */

type DocumentosTabProps = {
  profissionalId: string | null;
  usuarioId: string; // se quiser usar depois para algo extra
};

const DocumentosTab: React.FC<DocumentosTabProps> = ({ profissionalId }) => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");
  const [status, setStatus] = useState<"Todos" | Status>("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("validade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filtroResp, setFiltroResp] = useState<FiltroResp>("todas");

  // carregar documentos para o profissional selecionado
  useEffect(() => {
    if (!profissionalId) {
      setDocumentos([]);
      setLoading(false);
      return;
    }

    let ativo = true;

    async function carregar() {
      setLoading(true);

      const { data: docsDb, error: docsError } = await supabase
        .from("admin_docs_prof_v")
        .select("*")
        .eq("profissional_id", profissionalId)
        .order("documento_nome", { ascending: true });

      if (!ativo) return;

      if (docsError) {
        console.error("Erro a carregar documentos:", docsError);
        setDocumentos([]);
        setLoading(false);
        return;
      }

      const mapped: Documento[] = [];

      (docsDb || []).forEach((d: any) => {
        const originalNome: string = d.documento_nome || "";

        // aqui a empresa pode ver TODOS, inclusive contactos de emergência

        // normalizar nome do TR (mesma lógica do profissional)
        const nomeNormalizado = originalNome.startsWith(
          "Comprovativo de regularização de trabalhadores estrangeiros",
        )
          ? "Comprovativo de regularização de trabalhadores estrangeiros (Título ou Autorização de Residência/CPLP/TR)"
          : originalNome;

        const validadeStr = d.validade
          ? new Date(d.validade).toLocaleDateString("pt-PT")
          : null;
        const atualizadoStr = d.atualizado_em
          ? new Date(d.atualizado_em).toLocaleDateString("pt-PT")
          : null;

        let status: Status = d.status as Status;
        if (validadeStr && status !== "Pendente" && status !== "Reprovado") {
          const diff = daysUntil(validadeStr);
          if (diff !== null && diff < 0) status = "Vencido";
        }

        let resp: Responsabilidade;
        const r = (d.responsavel || "").toLowerCase();
        if (r === "profissional") resp = "profissional";
        else if (r === "acrobatas" || r === "admin") resp = "acrobatas";
        else resp = "ambos";

        // overrides (mesma lógica: alguns docs são sempre responsabilidade Acrobatas)
        if (
          nomeNormalizado.includes("Ficha de Aptidão Médica") ||
          nomeNormalizado.includes("Registo de distribuição de EPI") ||
          nomeNormalizado.includes(
            "Comprovativo de Comunicação de Admissão na Segurança Social",
          )
        ) {
          resp = "acrobatas";
        }

        mapped.push({
          id: d.doc_id,
          profissional_id: d.profissional_id,
          tipo_id: d.tipo_id,
          nome: nomeNormalizado,
          categoria: d.categoria,
          validade: validadeStr,
          status,
          atualizado_em: atualizadoStr,
          url: d.arquivo_url,
          obrigatorio: d.obrigatorio,
          responsabilidade: resp,
          prof_pode_enviar: d.prof_pode_enviar,
          bloqueado: d.bloqueado,
          comentario_admin: d.comentario_admin ?? null,
        });
      });

      setDocumentos(mapped);
      setLoading(false);
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [profissionalId]);

  const resumo = useMemo(() => {
    const validos = documentos.filter((d) => d.status === "Válido").length;
    const pendentes = documentos.filter((d) => d.status === "Pendente").length;
    const vencidos = documentos.filter((d) => d.status === "Vencido").length;
    const obrigatorios =
      documentos.filter((d) => d.obrigatorio).length || documentos.length;
    const completion = obrigatorios
      ? Math.round((validos / obrigatorios) * 100)
      : 0;
    return { validos, pendentes, vencidos, completion, obrigatorios };
  }, [documentos]);

  const categorias = useMemo(
    () =>
      Array.from(
        new Set(documentos.map((d) => d.categoria).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b)),
    [documentos],
  );

  const filtrados = useMemo(() => {
    let arr = [...documentos];

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (d) =>
          d.nome.toLowerCase().includes(q) ||
          (d.categoria || "").toLowerCase().includes(q) ||
          (d.validade || "").includes(q),
      );
    }
    if (categoria !== "Todas")
      arr = arr.filter((d) => d.categoria === categoria);
    if (status !== "Todos") arr = arr.filter((d) => d.status === status);
    if (filtroResp !== "todas") {
      arr = arr.filter((d) =>
        filtroResp === "profissional"
          ? d.responsabilidade !== "acrobatas"
          : d.responsabilidade === "acrobatas",
      );
    }

    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "validade" || sortKey === "atualizado_em") {
        const da = parsePTDate(a[sortKey] || "");
        const db = parsePTDate(b[sortKey] || "");
        const va = da
          ? da.getTime()
          : sortDir === "asc"
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY;
        const vb = db
          ? db.getTime()
          : sortDir === "asc"
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY;
        return va > vb ? dir : va < vb ? -dir : 0;
      }
      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      return va > vb ? dir : va < vb ? -dir : 0;
    });

    return arr;
  }, [documentos, query, categoria, status, sortKey, sortDir, filtroResp]);

  const handleResetFiltros = () => {
    setQuery("");
    setCategoria("Todas");
    setStatus("Todos");
    setSortKey("validade");
    setSortDir("asc");
    setFiltroResp("todas");
  };

  function openInNewTab(url?: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const docsEmDia =
    resumo.obrigatorios > 0 &&
    resumo.completion === 100 &&
    resumo.pendentes === 0 &&
    resumo.vencidos === 0;

  if (loading) {
    return (
      <div className="flex justify-center mt-20">
        <FileText className="animate-pulse text-blue-500" size={28} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 text-zinc-900 dark:text-zinc-100">
      {/* Título */}
      <div className="flex items-center gap-3 mb-3">
        <FileText className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <div>
          <h1 className="text-lg sm:text-2xl font-semibold">Documentação</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">
            Visão geral dos documentos deste profissional e situação de validade.
          </p>
        </div>
      </div>

      {/* Status geral */}
      <div className="mb-4 sm:mb-6">
        <div
          className={`flex items-start gap-3 rounded-2xl border px-3 py-3 sm:px-4 sm:py-3 text-xs sm:text-sm ${
            docsEmDia
              ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-amber-500/40 bg-amber-50 dark:bg-amber-900/20"
          }`}
        >
          {docsEmDia ? (
            <ShieldCheck className="mt-[2px] w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="mt-[2px] w-5 h-5 text-amber-500" />
          )}

          <div>
            <p className="font-semibold mb-1">
              {docsEmDia
                ? "Documentação em dia"
                : "Documentação com pendências ou documentos em falta"}
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300">
              A empresa pode usar este resumo para decidir se o profissional
              está apto a iniciar ou manter atividades na obra, conforme
              documentação exigida.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <ResumoCard
          titulo="Válidos"
          valor={resumo.validos}
          cor="text-green-500"
          icone={<CheckCircle2 size={18} />}
        />
        <ResumoCard
          titulo="Pendentes"
          valor={resumo.pendentes}
          cor="text-yellow-500"
          icone={<AlertTriangle size={18} />}
        />
        <ResumoCard
          titulo="Vencidos"
          valor={resumo.vencidos}
          cor="text-red-500"
          icone={<XCircle size={18} />}
        />
      </div>

      {/* Barra de completude */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Completude do perfil de documentos obrigatórios
          </span>
          <span className="text-sm font-medium">{resumo.completion}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              docsEmDia ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${resumo.completion}%` }}
          />
        </div>
      </div>

      {/* Filtros */}
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
        onReset={handleResetFiltros}
        filtroResp={filtroResp}
        setFiltroResp={setFiltroResp}
      />

      {/* Lista */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <FileText size={18} /> Documentos
        </h2>

        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Nenhum documento encontrado para este profissional.
            </p>
            <button
              onClick={handleResetFiltros}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <RefreshCcw size={16} /> Limpar filtros
            </button>
          </div>
        ) : (
          <>
            {/* MOBILE – Cards */}
            <div className="space-y-3 sm:hidden">
              {filtrados.map((doc) => (
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

                      {doc.comentario_admin && (
                        <div className="mt-2">
                          <div className="rounded-lg border border-blue-500/20 bg-blue-50/80 dark:bg-blue-900/20 px-2.5 py-1.5">
                            <div className="flex items-start gap-1.5">
                              <MessageCircle
                                size={13}
                                className="mt-[2px] text-blue-500 dark:text-blue-300"
                              />
                              <p className="text-[11px] leading-snug text-blue-900 dark:text-blue-50">
                                {doc.comentario_admin}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs">
                    <VencimentoBadge validade={doc.validade} />
                    <span className="text-zinc-500 dark:text-zinc-400">
                      <Clock4 size={12} className="inline mr-1" />
                      {doc.atualizado_em
                        ? `Atualizado ${doc.atualizado_em}`
                        : "Nunca atualizado"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* DESKTOP – Tabela */}
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
                    <th className="py-3 px-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((doc) => (
                    <motion.tr
                      key={doc.id}
                      whileHover={{ scale: 1.01 }}
                      className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#243043] transition"
                    >
                      <td className="py-3 px-2 font-medium align-top">
                        <div className="flex flex-col gap-1">
                          <span>{doc.nome}</span>
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

                          {doc.comentario_admin && (
                            <div className="mt-2">
                              <div className="inline-flex max-w-xl">
                                <div className="flex items-start gap-2 rounded-lg border border-blue-500/25 bg-blue-50/90 dark:bg-blue-900/20 dark:border-blue-800/60 px-3 py-2">
                                  <MessageCircle
                                    size={14}
                                    className="mt-[2px] text-blue-500 dark:text-blue-300 shrink-0"
                                  />
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700/80 dark:text-blue-200/80">
                                      Observação da equipa Acrobatas
                                    </p>
                                    <p className="text-[11px] leading-snug text-blue-900 dark:text-blue-50">
                                      {doc.comentario_admin}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
                      <td className="py-3 px-2">
                        {doc.atualizado_em || "—"}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center gap-2">
                          <button
                            title={
                              doc.url
                                ? "Ver (abre em nova aba)"
                                : "Sem ficheiro"
                            }
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

      {/* Rodapé */}
      <div className="mt-8 sm:mt-10 text-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
        Estes dados refletem o que foi enviado e validado na plataforma Acrobatas.
        A empresa deve sempre confirmar se todos os documentos obrigatórios para a
        função estão válidos antes de autorizar o profissional a atuar na obra.
      </div>
    </div>
  );
};

export default DocumentosTab;
