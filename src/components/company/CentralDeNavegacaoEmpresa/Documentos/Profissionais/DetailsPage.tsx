// src/components/company/CentralDeNavegacaoEmpresa/Documentos/Profissionais/DetailsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Shield,
  FileText,
  BadgeCheck,
  AlertTriangle,
  Clock,
  Building2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn, fmt, statusClasses } from "./utils";

/* ---------------------- Helpers / categorias ---------------------- */
type CategoriaKey =
  | "Identificação"
  | "Segurança"
  | "Certificação"
  | "Fiscal"
  | "Saúde"
  | "Outros";

const CATEG_ICON: Record<CategoriaKey, React.ReactNode> = {
  Identificação: <FileText className="h-4 w-4" />,
  Segurança: <Shield className="h-4 w-4" />,
  Certificação: <BadgeCheck className="h-4 w-4" />,
  Fiscal: <Building2 className="h-4 w-4" />,
  Saúde: <FileText className="h-4 w-4" />,
  Outros: <FileText className="h-4 w-4" />,
};

function categoriaFromTipo(tipo?: string): CategoriaKey {
  const t = (tipo || "").toLowerCase();
  if (t.includes("ident")) return "Identificação";
  if (t.includes("segur")) return "Segurança";
  if (t.includes("certif")) return "Certificação";
  if (t.includes("fiscal") || t.includes("nif")) return "Fiscal";
  if (t.includes("saúde") || t.includes("medic")) return "Saúde";
  return "Outros";
}

/* ------------------------------ Tipos ----------------------------- */
type DetailsPageProps = {
  profId: string;
  onBack?: () => void;
};

type Documento = {
  id: string;
  nome?: string | null;
  tipo?: string | null;
  emissor?: string | null;
  numero?: string | null;
  validade?: string | null; // yyyy-mm-dd
  observacao?: string | null;
  status: "válido" | "pendente" | "vencido";
  arquivo_url?: string | null;
};

type Profissional = {
  id: string;
  nome: string;
  profissao?: string | null;
  senioridade?: string | null;
  funcao?: string | null;
  obras?: string[];
  documentos?: Documento[];
};

/* ---------------------------- Component --------------------------- */
export default function DetailsPage({ profId, onBack }: DetailsPageProps) {
  const [prof, setProf] = useState<Profissional | null>(null);
  const [tab, setTab] = useState<"todos" | "válido" | "pendente" | "vencido">("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfissional() {
      setLoading(true);

      // 1) Dados do profissional (view resiliente)
      const { data: rows, error } = await supabase
        .from("profissionais_view")
        .select("*")
        .eq("profissional_id", profId);

      if (error) {
        console.error("[DetailsPage] profissionais_view ->", error);
        setProf(null);
        setLoading(false);
        return;
      }

      const p: any = rows && rows.length > 0 ? rows[0] : null;

      // 2) Documentos do profissional
      const { data: docsRaw, error: eDocs } = await supabase
        .from("documentos_profissionais")
        .select("id,nome,tipo,emissor,numero,validade,observacao,status,arquivo_url")
        .eq("profissional_id", profId);

      if (eDocs) console.warn("[DetailsPage] documentos_profissionais ->", eDocs);

      setProf({
        id: p?.profissional_id || p?.id || profId,
        nome: p?.nome_profissional || p?.nome || "Sem nome",
        profissao: p?.profissao || p?.funcao || "—",
        senioridade: p?.senioridade || null,
        funcao: p?.profissao || p?.funcao || "—",
        obras: p?.nome_obra ? [p.nome_obra] : [],
        documentos: (docsRaw || []) as Documento[],
      });

      setLoading(false);
    }

    if (profId) fetchProfissional();
  }, [profId]);

  const counters = useMemo(() => {
    const arr = prof?.documentos ?? [];
    return {
      total: arr.length,
      válido: arr.filter((d) => d.status === "válido").length,
      pendente: arr.filter((d) => d.status === "pendente").length,
      vencido: arr.filter((d) => d.status === "vencido").length,
    };
  }, [prof]);

  const grouped = useMemo(() => {
    const arr = prof?.documentos ?? [];
    const filtered = tab === "todos" ? arr : arr.filter((d) => d.status === tab);
    const byCat = new Map<CategoriaKey, Documento[]>();
    for (const d of filtered) {
      const c = categoriaFromTipo(d.tipo || d.nome || "");
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c)!.push(d);
    }
    return byCat;
  }, [prof, tab]);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Carregando dados do profissional…
      </div>
    );
  }

  if (!prof) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 py-10">
        <div className="rounded-lg border border-gray-200 dark:border-zinc-800 p-6 text-sm text-gray-600 dark:text-gray-400">
          Profissional não encontrado.
        </div>
      </div>
    );
  }

  const initials =
    prof.nome
      ?.split(" ")
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "P";

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      {/* Header Card */}
      <div className="rounded-2xl border bg-white shadow-sm border-gray-200 dark:bg-white/5 dark:border-zinc-800">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-blue-600 text-white grid place-content-center font-semibold">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-semibold leading-6 truncate text-gray-900 dark:text-gray-100">
                    {prof.nome}
                  </h1>
                  {prof.senioridade && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300">
                      {prof.senioridade}
                    </span>
                  )}
                </div>
                <div className="text-sm mt-0.5 flex items-center gap-3 flex-wrap text-gray-600 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 opacity-60" />
                    {prof.profissao || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <StatBox title="Documentos" value={counters.total} icon={<FileText className="h-4 w-4 opacity-70" />} />
            <StatBox title="Válidos" value={counters["válido"]} tone="ok" icon={<CheckCircle2 className="h-4 w-4" />} />
            <StatBox title="Pendentes" value={counters.pendente} tone="warn" icon={<AlertTriangle className="h-4 w-4" />} />
            <StatBox title="Vencidos" value={counters.vencido} tone="danger" icon={<Clock className="h-4 w-4" />} />
          </div>

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["todos", "válido", "pendente", "vencido"] as const).map((s) => (
              <button
                key={s}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs transition-colors",
                  tab === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-white/5"
                )}
                onClick={() => setTab(s)}
              >
                {s}
              </button>
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              {counters.total} documentos
            </span>
          </div>
        </div>
      </div>

      {/* Lista agrupada */}
      <div className="mt-6 grid gap-4">
        {[...grouped.entries()].map(([cat, docs]) => (
          <section
            key={cat}
            className="rounded-xl border bg-white shadow-sm border-gray-200 dark:bg-white/5 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-blue-600 dark:text-blue-400">{CATEG_ICON[cat]}</div>
                <h2 className="text-sm font-medium truncate text-gray-900 dark:text-gray-100" title={cat}>
                  {cat}
                </h2>
                <span className="text-[11px] rounded-full px-1.5 py-0.5 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300">
                  {docs.length}
                </span>
              </div>
            </div>

            <div className="p-3 sm:p-4 grid gap-3">
              {docs.map((d) => (
                <div key={d.id} className="rounded-lg border border-gray-200 dark:border-zinc-800 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {d.nome || d.tipo || "Documento"}
                      </div>

                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-2">
                        {d.numero && <span>nº {d.numero}</span>}
                        {d.validade && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 opacity-70" />
                            validade: {fmt(d.validade)}
                          </span>
                        )}
                        {d.emissor && <span>emissor: {d.emissor}</span>}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
                            statusClasses[d.status]
                          )}
                        >
                          {d.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <a
                        href={d.arquivo_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "px-2.5 py-1.5 rounded-md text-xs inline-flex items-center gap-1 justify-center",
                          d.arquivo_url
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-zinc-800 dark:text-gray-400"
                        )}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Pré-visualizar
                      </a>
                      <a
                        href={d.arquivo_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-xs inline-flex items-center gap-1 justify-center",
                          d.arquivo_url
                            ? "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-white/5"
                            : "border-gray-200 text-gray-400 cursor-not-allowed dark:border-zinc-800"
                        )}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {docs.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 px-1 py-8 text-center">
                  Sem documentos nesta seção.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- StatBox --------------------------- */
function StatBox({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  const tones: Record<typeof tone, string> = {
    default: "bg-black/5 text-gray-800 dark:bg-white/5 dark:text-gray-100",
    ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warn: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", tones[tone])}>
      {icon && <div className="shrink-0 text-current opacity-80">{icon}</div>}
      <div className="min-w-0">
        <div className="text-[11px] uppercase opacity-60">{title}</div>
        <div className="text-sm font-semibold leading-5 truncate">{value}</div>
      </div>
    </div>
  );
}
