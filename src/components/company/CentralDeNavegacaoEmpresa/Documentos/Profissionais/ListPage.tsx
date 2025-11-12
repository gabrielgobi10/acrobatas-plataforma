// Empresa/Documentos/Profissionais/ListPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Filter,
  Building2,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

/** ============================
 * Tipos do domínio
 * ============================ */
type DocStatus = "válido" | "pendente" | "vencido";
type SortField = "criticidade" | "nome" | "validos";

type Documento = {
  id: string;
  nome?: string | null;
  grupo?: string | null;
  status: DocStatus;
  validade?: string | null; // ISO string
  arquivo_url?: string | null;
};

type Prof = {
  id: string;
  nome: string;
  funcao: string; // profissão
  senioridade?: string | null; // se houver
  obras: string[];
  documentos: Documento[];
  counters: { validos: number; pendentes: number; vencidos: number };
  criticidade: number; // 0..100 derivado de counters
};

/** ============================
 * Utils de UI e helpers
 * ============================ */
function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
function useDebounced<T>(v: T, d = 250) {
  const [x, s] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => s(v), d);
    return () => clearTimeout(id);
  }, [v, d]);
  return x;
}
function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function mark(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded px-0.5 bg-yellow-300/60 dark:bg-yellow-400/30">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}
function critClass(n: number) {
  if (n >= 40) return { bar: "from-red-500 to-rose-600", text: "text-red-500" };
  if (n >= 20) return { bar: "from-amber-500 to-orange-600", text: "text-amber-500" };
  return { bar: "from-blue-500 to-indigo-600", text: "text-blue-500" };
}
function CritBar({ value }: { value: number }) {
  const { bar, text } = critClass(value);
  const w = Math.min(100, Math.max(0, value));
  return (
    <div className="min-w-[220px] text-right">
      <div className="text-[11px] uppercase opacity-60">criticidade</div>
      <div className={cn("text-xl font-semibold", text)}>{value}</div>
      <div className="h-2 w-40 bg-black/10 dark:bg-white/10 rounded-full mt-1 overflow-hidden ml-auto">
        <div className={cn("h-full bg-gradient-to-r", bar)} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

/** ============================
 * MultiSelect (sem bugs de hover)
 * ============================ */
type Option = { label: string; value: string };
function MultiSelect({
  options,
  value,
  onChange,
  icon,
  placeholder = "Selecionar…",
  allLabel = "Todas",
}: {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? options : options.filter((o) => o.label.toLowerCase().includes(s));
  }, [q, options]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };
  const clear = () => onChange([]);

  const label =
    value.length === 0
      ? allLabel
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label || placeholder
      : `${value.length} selecionados`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-black/10 dark:border-white/10 px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 hover:bg-black/5 dark:hover:bg-white/5"
        aria-expanded={open}
      >
        {icon}
        {label}
        <ChevronDown className="ml-1 h-4 w-4 opacity-60" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute z-20 top-full left-0 mt-1 w-[280px] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl p-2"
            role="menu"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar…"
                  className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-black/10 dark:border-white/10 bg-transparent"
                />
              </div>
              <button onClick={clear} className="text-xs rounded-md border border-black/10 dark:border-white/10 px-2 py-1">
                Limpar
              </button>
            </div>
            <div className="max-h-64 overflow-auto pr-1 space-y-1">
              <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm">
                <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
                <span>{allLabel}</span>
              </label>
              {filtered.map((o) => (
                <label key={o.value} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm">
                  <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
                  <span className="truncate">{o.label}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** ============================
 * helpers de status
 * ============================ */
function normalizeStatus(s: any): DocStatus {
  const t = String(s ?? "").toLowerCase();
  if (t.startsWith("v")) return "vencido"; // "vencido"/"vencidos"
  if (t.startsWith("p")) return "pendente"; // "pendente"/"pendentes"
  return "válido"; // "valido"/"válido"
}
function countStatuses(arr: Documento[]) {
  return arr.reduce(
    (acc, d) => {
      if (d.status === "válido") acc.validos++;
      else if (d.status === "pendente") acc.pendentes++;
      else acc.vencidos++;
      return acc;
    },
    { validos: 0, pendentes: 0, vencidos: 0 },
  );
}

/** ============================
 * Drawer de detalhe
 * ============================ */
function QuickDrawer({ prof, onClose }: { prof: Prof; onClose: () => void }) {
  return (
    <AnimatePresence>
      {prof && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] z-50 bg-white dark:bg-neutral-950 border-l border-black/10 dark:border-white/10 p-4 overflow-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-[12px] font-semibold bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-600/30">
                  {initials(prof.nome)}
                </div>
                <div>
                  <div className="font-semibold leading-tight">{prof.nome}</div>
                  <div className="text-sm opacity-70">
                    {prof.senioridade ? `${prof.senioridade} • ` : ""}
                    {prof.funcao}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border border-black/10 dark:border-white/10 p-1.5 hover:bg-black/5 dark:hover:bg-white/5"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
                <div className="text-[11px] uppercase opacity-60">criticidade</div>
                <CritBar value={prof.criticidade} />
              </div>

              <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
                <div className="text-[11px] uppercase opacity-60 mb-2">obras</div>
                <ul className="text-sm space-y-1">
                  {prof.obras.map((o, i) => (
                    <li key={o + i} className="flex items-center gap-2">
                      <Building2 size={14} className="opacity-60" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
                <div className="text-[11px] uppercase opacity-60">documentos</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
                  <div className="rounded border border-green-500/30 text-green-600 dark:text-green-300 bg-green-500/5 p-2 text-center">
                    <div className="text-[11px] uppercase opacity-70">válidos</div>
                    <div className="text-base font-semibold">{prof.counters.validos}</div>
                  </div>
                  <div className="rounded border border-amber-500/30 text-amber-600 dark:text-amber-300 bg-amber-500/5 p-2 text-center">
                    <div className="text-[11px] uppercase opacity-70">pendentes</div>
                    <div className="text-base font-semibold">{prof.counters.pendentes}</div>
                  </div>
                  <div className="rounded border border-red-500/30 text-red-600 dark:text-red-300 bg-red-500/5 p-2 text-center">
                    <div className="text-[11px] uppercase opacity-70">vencidos</div>
                    <div className="text-base font-semibold">{prof.counters.vencidos}</div>
                  </div>
                </div>
              </div>

              <a
                onClick={(e) => e.preventDefault()}
                href="#"
                className="inline-flex items-center gap-2 text-sm text-blue-600"
                title="Abrir página completa de documentos"
              >
                <Eye size={16} />
                Abrir página completa
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** ============================
 * Data layer (Supabase) — completo com fallbacks
 * ============================ */
async function fetchProfissionaisComUsuarios(): Promise<Prof[]> {
  // 0) Tenta a VIEW principal
  try {
    const { data: view, error: ev } = await supabase
      .from("profissionais_view")
      .select(
        "profissional_id, nome_profissional, profissao, senioridade, nome_obra, nome_empresa"
      );

    if (ev) console.warn("VIEW profissionais_view:", ev.message);

    if (view && view.length) {
      // documentos + meta
      const { data: docs } = await supabase
        .from("documentos_profissionais")
        .select("id, profissional_id, tipo_id, status, validade, arquivo_url");

      const { data: tipos } = await supabase
        .from("tipos_documentos")
        .select("id, nome, grupo_id");

      const { data: grupos } = await supabase
        .from("grupos_documentos")
        .select("id, nome");

      const tipoMap = new Map((tipos ?? []).map((t: any) => [t.id, t]));
      const grupoMap = new Map((grupos ?? []).map((g: any) => [g.id, g.nome]));

      const docsByProf = new Map<string, Documento[]>();
      (docs ?? []).forEach((d: any) => {
        const t = tipoMap.get(d.tipo_id);
        const gNome = t ? (grupoMap.get(t.grupo_id) ?? null) : null;
        const arr = docsByProf.get(d.profissional_id) ?? [];
        arr.push({
          id: d.id,
          nome: t?.nome ?? null,
          grupo: gNome,
          status: normalizeStatus(d.status),
          validade: d.validade ?? null,
          arquivo_url: d.arquivo_url ?? null,
        });
        docsByProf.set(d.profissional_id, arr);
      });

      return (view ?? []).map((p: any) => {
        const documentos = docsByProf.get(p.profissional_id) ?? [];
        const counters = countStatuses(documentos);
        const crit = Math.min(100, counters.vencidos * 20 + counters.pendentes * 10);
        return {
          id: p.profissional_id,
          nome: p.nome_profissional ?? "Sem nome",
          funcao: p.profissao ?? "—",
          senioridade: p.senioridade ?? null,
          obras: p.nome_obra ? [p.nome_obra] : [],
          documentos,
          counters,
          criticidade: crit,
        };
      });
    }
  } catch (e) {
    console.warn("Sem VIEW ou sem permissão, usando tabelas base…", e);
  }

  // 1) Tabelas base (sem 'uuid'): tenta detectar coluna do vínculo com usuários
  let profs: any[] = [];
  {
    const try1 = await supabase
      .from("profissionais")
      .select("id, usuario_uuid, senioridade");
    if (!try1.error) {
      profs = try1.data ?? [];
    } else {
      const try2 = await supabase
        .from("profissionais")
        .select("id, usuario, senioridade");
      if (!try2.error) {
        profs = (try2.data ?? []).map((p: any) => ({
          id: p.id,
          usuario_uuid: p.usuario,
          senioridade: p.senioridade,
        }));
      } else {
        const try3 = await supabase
          .from("profissionais")
          .select("id, senioridade");
        if (try3.error) throw try3.error;
        profs = try3.data ?? [];
      }
    }
  }

  // 2) Usuários
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("uuid, nome, profissão, profissao, status");
  const uMap = new Map((usuarios ?? []).map((u: any) => [u.uuid, u]));

  // 3) Obras (tenta view simplificada; fallback para relacionamento)
  const obrasByProf = new Map<string, string[]>();
  try {
    const { data: obrasView, error: eov } = await supabase
      .from("obras_com_profissionais")
      .select("profissional_id, obra_nome");
    if (!eov && obrasView?.length) {
      obrasView.forEach((r: any) => {
        const arr = obrasByProf.get(r.profissional_id) ?? [];
        arr.push(r.obra_nome);
        obrasByProf.set(r.profissional_id, arr);
      });
    } else {
      const { data: po } = await supabase
        .from("profissionais_obras")
        .select("profissional_id, obras(nome)");
      (po ?? []).forEach((r: any) => {
        const arr = obrasByProf.get(r.profissional_id) ?? [];
        arr.push(r.obras?.nome ?? "Obra");
        obrasByProf.set(r.profissional_id, arr);
      });
    }
  } catch (e) {
    console.warn("Sem relação de obras (ok em dev)", e);
  }

  // 4) Documentos
  const { data: docs } = await supabase
    .from("documentos_profissionais")
    .select("id, profissional_id, tipo_id, status, validade, arquivo_url");
  const { data: tipos } = await supabase
    .from("tipos_documentos")
    .select("id, nome, grupo_id");
  const { data: grupos } = await supabase
    .from("grupos_documentos")
    .select("id, nome");

  const tipoMap = new Map((tipos ?? []).map((t: any) => [t.id, t]));
  const grupoMap = new Map((grupos ?? []).map((g: any) => [g.id, g.nome]));

  const docsByProf = new Map<string, Documento[]>();
  (docs ?? []).forEach((d: any) => {
    const t = tipoMap.get(d.tipo_id);
    const gNome = t ? (grupoMap.get(t.grupo_id) ?? null) : null;
    const arr = docsByProf.get(d.profissional_id) ?? [];
    arr.push({
      id: d.id,
      nome: t?.nome ?? null,
      grupo: gNome,
      status: normalizeStatus(d.status),
      validade: d.validade ?? null,
      arquivo_url: d.arquivo_url ?? null,
    });
    docsByProf.set(d.profissional_id, arr);
  });

  // 5) Monta resposta
  return (profs ?? []).map((p: any) => {
    const u = uMap.get(p.usuario_uuid); // pode ser undefined
    const nome = u?.nome ?? "Sem nome";
    const funcao = u?.profissão ?? u?.profissao ?? "—";
    const documentos = docsByProf.get(p.id) ?? [];
    const counters = countStatuses(documentos);
    const crit = Math.min(100, counters.vencidos * 20 + counters.pendentes * 10);
    return {
      id: p.id,
      nome,
      funcao,
      senioridade: p.senioridade ?? null,
      obras: obrasByProf.get(p.id) ?? [],
      documentos,
      counters,
      criticidade: crit,
    };
  });
}

/** ============================
 * Página (Lista)
 * ============================ */
type ListPageProps = { onOpenDetails?: (profId: string) => void };

export default function ListPage({ onOpenDetails }: ListPageProps) {
  // ===== Dados (Supabase)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Prof[]>([]);

  // Drawer control
  const [drawerProf, setDrawerProf] = useState<Prof | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchProfissionaisComUsuarios();
        if (mounted) setData(res);
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message ?? "Erro ao carregar dados");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const obrasAll = useMemo(
    () =>
      Array.from(new Set(data.flatMap((p) => p.obras))).map((o) => ({
        label: o,
        value: o,
      })),
    [data],
  );
  const funcoesAll = useMemo(
    () =>
      Array.from(new Set(data.map((p) => p.funcao))).map((f) => ({
        label: f,
        value: f,
      })),
    [data],
  );

  // ===== Estado de filtros/ordenação
  const [q, setQ] = useState("");
  const qDeb = useDebounced(q, 250);
  const [obrasSel, setObrasSel] = useState<string[]>([]);
  const [funcSel, setFuncSel] = useState<string[]>([]);
  const [status, setStatus] = useState<DocStatus | "todos">("todos");
  const [sortBy, setSortBy] = useState<SortField>("criticidade");

  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ===== Filtragem/Ordenação — determinística (nada “gruda”)
  const filteredSorted = useMemo(() => {
    const s = qDeb.trim().toLowerCase();
    let arr = data.filter((p) => {
      const byQ =
        !s ||
        p.nome.toLowerCase().includes(s) ||
        p.funcao.toLowerCase().includes(s) ||
        p.obras.join(", ").toLowerCase().includes(s);

      const byObra = obrasSel.length === 0 ? true : p.obras.some((o) => obrasSel.includes(o));
      const byFunc = funcSel.length === 0 ? true : funcSel.includes(p.funcao);
      const byStatus = status === "todos" ? true : p.documentos.some((d) => d.status === status);

      return byQ && byObra && byFunc && byStatus;
    });

    // Ordenação DESC fixa (sem “Desc/Asc”)
    arr = arr.sort((a, b) => {
      if (sortBy === "criticidade") return b.criticidade - a.criticidade;
      if (sortBy === "nome") return a.nome.localeCompare(b.nome);
      return b.counters.validos - a.counters.validos;
    });

    return arr;
  }, [data, qDeb, obrasSel, funcSel, status, sortBy]);

  // ===== Contadores do cabeçalho (derivados da lista base filtrada por Q/obra/função também, para ficar consistente)
  const statusCounts = useMemo(() => {
    // Contamos no universo afetado por q/obras/funções, mas independente do “status” chip atual
    const s = qDeb.trim().toLowerCase();
    const base = data.filter((p) => {
      const byQ =
        !s ||
        p.nome.toLowerCase().includes(s) ||
        p.funcao.toLowerCase().includes(s) ||
        p.obras.join(", ").toLowerCase().includes(s);
      const byObra = obrasSel.length === 0 ? true : p.obras.some((o) => obrasSel.includes(o));
      const byFunc = funcSel.length === 0 ? true : funcSel.includes(p.funcao);
      return byQ && byObra && byFunc;
    });

    const t = { valido: 0, pendente: 0, vencido: 0 };
    base.forEach((p) => {
      t.valido += p.counters.validos;
      t.pendente += p.counters.pendentes;
      t.vencido += p.counters.vencidos;
    });
    return t;
  }, [data, qDeb, obrasSel, funcSel]);

  // ===== Resumo final
  const summary = useMemo(() => {
    const t = filteredSorted.reduce(
      (acc, p) => {
        acc.v += p.counters.validos;
        acc.p += p.counters.pendentes;
        acc.x += p.counters.vencidos;
        acc.c += p.criticidade;
        return acc;
      },
      { v: 0, p: 0, x: 0, c: 0 },
    );
    const avg = filteredSorted.length ? Math.round(t.c / filteredSorted.length) : 0;
    return { validos: t.v, pendentes: t.p, vencidos: t.x, avgCrit: avg };
  }, [filteredSorted]);

  const resetAll = () => {
    setQ("");
    setObrasSel([]);
    setFuncSel([]);
    setStatus("todos");
    setSortBy("criticidade");
  };

  // ========================= Render
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Título (no padrão das “Obras Ativas”) */}
      <div className="mb-2">
        <h1 className="text-xl font-semibold">
          Documentos — <span className="text-blue-600">Profissionais</span>
        </h1>
        <p className="text-sm opacity-70">Acompanhe a situação documental por função e obra.</p>
      </div>

      {/* Toolbar (duas linhas: 1) busca + ordenar  |  2) filtros + chips de status) */}
      <div className="sticky top-0 z-10 -mx-4 px-4">
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 shadow-sm p-4">
          {/* Linha 1 */}
          <div className="grid gap-x-6 gap-y-2 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-start">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar por nome, função ou obra… (⌘/Ctrl + K)"
                className="w-full h-10 pl-9 pr-10 text-sm rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  aria-label="Limpar"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Ordenar (DESC fixo) */}
            <div className="flex items-center gap-3 justify-start lg:justify-end">
              <span className="text-xs opacity-60">Ordenar</span>
              <div className="inline-flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden shadow-sm">
                {(["criticidade", "validos", "nome"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSortBy(f)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium",
                      sortBy === f
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-neutral-950 hover:bg-black/5 dark:hover:bg-white/5",
                      f !== "criticidade" && "border-l border-black/10 dark:border-white/10"
                    )}
                  >
                    {f === "criticidade" ? "Criticidade" : f === "validos" ? "Válidos" : "Nome"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* divisor suave */}
          <div className="mt-3 h-px bg-black/5 dark:bg-white/10" />

          {/* Linha 2 — Filtros + chips de status */}
          <div className="pt-2 flex flex-wrap gap-2 items-center">
            <MultiSelect
              options={funcoesAll}
              value={funcSel}
              onChange={setFuncSel}
              icon={<SlidersHorizontal className="h-4 w-4 opacity-60" />}
              allLabel="Todas as funções"
            />
            <MultiSelect
              options={obrasAll}
              value={obrasSel}
              onChange={setObrasSel}
              icon={<Filter className="h-4 w-4 opacity-60" />}
              allLabel="Todas as obras"
            />

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {(["todos", "válido", "pendente", "vencido"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium border transition",
                    status === s
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-neutral-900 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
                  )}
                >
                  {s === "todos" ? (
                    "todos"
                  ) : s === "válido" ? (
                    <>válidos <span className="opacity-70">({statusCounts.valido})</span></>
                  ) : s === "pendente" ? (
                    <>pendentes <span className="opacity-70">({statusCounts.pendente})</span></>
                  ) : (
                    <>vencidos <span className="opacity-70">({statusCounts.vencido})</span></>
                  )}
                </button>
              ))}

              <button
                onClick={resetAll}
                className="h-8 px-3 rounded-full text-xs font-medium border bg-white dark:bg-neutral-900 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { k: "resultado", label: "resultado", value: `${filteredSorted.length} profissionais`, tone: "" },
          { k: "validos", label: "válidos", value: summary.validos, tone: "text-green-600 dark:text-green-400" },
          { k: "pendentes", label: "pendentes", value: summary.pendentes, tone: "text-amber-600 dark:text-amber-400" },
          { k: "vencidos", label: "vencidos", value: summary.vencidos, tone: "text-red-600 dark:text-red-400" },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 shadow-sm p-2">
            <div className="text-[11px] uppercase opacity-60">{c.label}</div>
            <div className={cn("text-sm font-medium", c.tone)}>{c.value}</div>
          </div>
        ))}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 shadow-sm p-2 sm:col-span-4 flex items-center justify-between">
          <div className="text-[11px] uppercase opacity-60">criticidade média</div>
          <div className={cn("text-sm font-semibold", critClass(summary.avgCrit).text)}>{summary.avgCrit}</div>
        </div>
      </div>

      {/* Lista */}
      {loading && (
        <div className="py-16 text-center text-sm opacity-70">Carregando…</div>
      )}
      {error && !loading && (
        <div className="py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-xs">
            <Info size={14} /> {error}
          </div>
        </div>
      )}
      {!loading && !error && (
        <div className="mt-2 grid gap-3">
          <AnimatePresence initial={false}>
            {filteredSorted.map((p) => {
              const more = Math.max(0, p.obras.length - 1);
              const main = p.obras[0];
              const health =
                p.counters.vencidos > 0
                  ? "from-red-500/70 to-rose-500/70"
                  : p.counters.pendentes > 0
                  ? "from-amber-500/70 to-orange-500/70"
                  : "from-blue-500/60 to-indigo-500/60";

              const openDrawer = () => {
                if (onOpenDetails) onOpenDetails(p.id);
                else setDrawerProf(p);
              };

              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "group rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm p-4 relative overflow-hidden hover:shadow-md hover:ring-1 hover:ring-black/10 dark:hover:ring-white/10 focus:outline-none",
                  )}
                  onClick={openDrawer}
                >
                  {/* indicador de saúde */}
                  <div className={cn("absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b", health)} aria-hidden />

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* left */}
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-[12px] font-semibold bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-600/30">
                        {initials(p.nome)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium truncate">{mark(p.nome, qDeb)}</h3>
                          {p.senioridade && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10">
                              {p.senioridade}
                            </span>
                          )}
                          <span className="text-xs opacity-70">• {mark(p.funcao, qDeb)}</span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm opacity-80">
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={14} />
                            <span className="truncate">{mark(main || "—", qDeb)}</span>
                            {more > 0 && <ObrasPopover obras={p.obras} q={qDeb} />}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[12px]">
                          <span className="px-2 py-0.5 text-[12px] rounded border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">
                            {p.counters.validos} válidos
                          </span>
                          <span className="px-2 py-0.5 text-[12px] rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            {p.counters.pendentes} pendentes
                          </span>
                          <span className="px-2 py-0.5 text-[12px] rounded border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300">
                            {p.counters.vencidos} vencidos
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* right */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[11px] uppercase opacity-60">ordenado por</div>
                        <div className="text-xs">
                          {sortBy === "validos" ? "Válidos" : sortBy === "nome" ? "Nome" : "Criticidade"}
                        </div>
                      </div>
                      <CritBar value={p.criticidade} />
                      <div className="hidden sm:flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenDetails) onOpenDetails(p.id);
                            else setDrawerProf(p);
                          }}
                          className="px-3 py-1.5 rounded-md text-white text-sm inline-flex items-center gap-1 shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 active:scale-[0.99]"
                        >
                          <Eye size={14} /> Ver documentos
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredSorted.length === 0 && (
            <div className="py-24 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-xs">
                <Info size={14} /> Nenhum profissional encontrado
              </div>
              <p className="mt-2 text-sm opacity-70">
                Ajuste os filtros ou{" "}
                <button onClick={resetAll} className="underline">
                  limpe tudo
                </button>
                .
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drawer (só quando não há navegação externa via onOpenDetails) */}
      {!onOpenDetails && drawerProf && (
        <QuickDrawer prof={drawerProf} onClose={() => setDrawerProf(null)} />
      )}
    </div>
  );
} // fim do componente ListPage

// ============================
// Popover com as outras obras
// ============================
interface ObrasPopoverProps {
  obras: string[];
  q: string;
}
function ObrasPopover({ obras, q }: ObrasPopoverProps) {
  const [open, setOpen] = useState(false);
  const more = Math.max(0, obras.length - 1);
  if (more <= 0) return null;

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex items-center text-xs px-1.5 py-0.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5"
        aria-expanded={open}
        title="Outras obras"
      >
        +{more} {more === 1 ? "obra" : "obras"}{" "}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute z-20 top-full left-0 mt-1 w-[260px] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-lg p-2"
            role="menu"
          >
            <div className="text-[11px] uppercase opacity-60 px-1">Todas as obras</div>
            <ul className="mt-1 max-h-56 overflow-auto pr-1 space-y-1">
              {obras.map((o, i) => (
                <li key={o + i} className="px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-sm">
                  {mark(o, q)}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



