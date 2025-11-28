"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  FileText,
  Download,
  Loader2,
  Filter,
  Euro,
  AlertCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type FaturaRow = {
  id: string;
  numero: string;
  data_emissao: string;
  periodo_referencia: string;
  valor_total: number;
  status: "emitida" | "enviada" | "paga" | "vencida";
  url_pdf: string | null;
  obra_id: string | null;
  obras?: { nome: string | null } | null;
};

const STATUS_OPTIONS = [
  { value: "todas", label: "Todos os estados" },
  { value: "emitida", label: "Emitida" },
  { value: "enviada", label: "Enviada" },
  { value: "paga", label: "Paga" },
  { value: "vencida", label: "Vencida" },
];

const fmtNumber = (v: number, d = 2) =>
  Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(isFinite(v) ? v : 0);

const euro = (v: number) => `${fmtNumber(v, 2)} €`;

export default function FaturasEmpresa() {
  const { empresa } = useAuth();
  const now = dayjs();

  const [ano, setAno] = useState(now.year());
  const [status, setStatus] = useState<string>("todas");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FaturaRow[]>([]);

  useEffect(() => {
    if (!empresa?.id) return;

    (async () => {
      setLoading(true);

      let q = supabase
        .from("faturas_empresas")
        .select(
          `
          id,
          numero,
          data_emissao,
          periodo_referencia,
          valor_total,
          status,
          url_pdf,
          obra_id,
          obras ( nome )
        `
        )
        .eq("empresa_id", empresa.id)
        .gte("data_emissao", `${ano}-01-01`)
        .lte("data_emissao", `${ano}-12-31`)
        .order("data_emissao", { ascending: false });

      if (status !== "todas") {
        q = q.eq("status", status);
      }

      const { data, error } = await q;

      if (!error && data) {
        setRows(data as unknown as FaturaRow[]);
      } else {
        setRows([]);
      }

      setLoading(false);
    })();
  }, [empresa?.id, ano, status]);

  const totalAno = useMemo(
    () => rows.reduce((s, r) => s + (r.valor_total || 0), 0),
    [rows]
  );

  return (
    <div className="p-4 sm:p-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            Faturas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Consulte e descarregue as faturas emitidas pela Acrobatas para a
            sua empresa.
          </p>
        </div>
      </div>

      {/* Filtros + resumo */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-zinc-500 dark:text-zinc-400" />
          <select
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {[ano - 1, ano, ano + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <Euro size={14} />
            Total no ano:{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">
              {euro(totalAno)}
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Faturas emitidas
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            A carregar faturas…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <FileText className="h-6 w-6" />
            <span>Não existem faturas para os filtros selecionados.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[13px] text-zinc-600 dark:border-zinc-800 dark:bg-slate-950/60 dark:text-zinc-300">
                  <th className="px-3 py-2">Nº fatura</th>
                  <th className="px-3 py-2">Data emissão</th>
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2">Obra</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const data = dayjs(r.data_emissao).format("DD/MM/YYYY");
                  const periodo = dayjs(r.periodo_referencia).format(
                    "MMMM [de] YYYY"
                  );
                  const obraNome = r.obras?.nome || "Várias obras / Geral";

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2">{r.numero}</td>
                      <td className="px-3 py-2">{data}</td>
                      <td className="px-3 py-2 capitalize">{periodo}</td>
                      <td className="px-3 py-2">{obraNome}</td>
                      <td className="px-3 py-2">{euro(r.valor_total)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.url_pdf ? (
                          <button
                            onClick={() => window.open(r.url_pdf!, "_blank")}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                          >
                            <Download size={14} />
                            Descarregar
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                            <AlertCircle size={14} />
                            Sem ficheiro
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* =======================
   Subcomponentes
======================= */

function StatusBadge({
  status,
}: {
  status: "emitida" | "enviada" | "paga" | "vencida";
}) {
  let label = "";
  let classes = "";

  switch (status) {
    case "emitida":
      label = "Emitida";
      classes =
        "bg-zinc-50 text-zinc-700 ring-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:ring-zinc-700";
      break;
    case "enviada":
      label = "Enviada";
      classes =
        "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60";
      break;
    case "paga":
      label = "Paga";
      classes =
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60";
      break;
    case "vencida":
      label = "Vencida";
      classes =
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60";
      break;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${classes}`}
    >
      {label}
    </span>
  );
}
