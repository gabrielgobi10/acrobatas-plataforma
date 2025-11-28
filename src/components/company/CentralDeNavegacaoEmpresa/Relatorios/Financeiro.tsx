"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  Calendar,
  Euro,
  Factory,
  Loader2,
  RefreshCcw,
  Download,
  FileDown,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =======================
   Tipos
======================= */

type EmpresaCustosMensaisRow = {
  empresa_id: string;
  obra_id: string;
  mes_referencia: string; // date
  horas_totais: number | null;
  custo_total: number | null;
  profissionais_distintos: number | null;
};

type ObraOption = {
  id: string;
  nome: string;
};

/* =======================
   Helpers
======================= */

const MESES_LABEL = [
  "Jan.",
  "Fev.",
  "Mar.",
  "Abr.",
  "Mai.",
  "Jun.",
  "Jul.",
  "Ago.",
  "Set.",
  "Out.",
  "Nov.",
  "Dez.",
];

const MESES_COMPLETO = [
  "Janeiro.",
  "Fevereiro.",
  "Março.",
  "Abril.",
  "Maio.",
  "Junho.",
  "Julho.",
  "Agosto.",
  "Setembro.",
  "Outubro.",
  "Novembro.",
  "Dezembro.",
];

const fmtNumber = (v: number, d = 2) =>
  Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(isFinite(v) ? v : 0);

const euro = (v: number) => `${fmtNumber(v, 2)} €`;

/* =======================
   Componente
======================= */

export default function FinanceiroRelatorio() {
  const { empresa } = useAuth(); // se tiver empresa logada
  const today = dayjs();

  const [ano, setAno] = useState(today.year());
  const [obraId, setObraId] = useState<string>("todas");

  const [obras, setObras] = useState<ObraOption[]>([]);
  const [rows, setRows] = useState<EmpresaCustosMensaisRow[]>([]);
  const [loading, setLoading] = useState(false);

  const pdfRef = useRef<HTMLDivElement | null>(null);

  /* ========= Carregar obras ========= */

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome")
        .order("nome", { ascending: true });

      if (!error && data) {
        setObras(
          (data as any[]).map((o) => ({
            id: o.id as string,
            nome: o.nome as string,
          }))
        );
      }
    })();
  }, []);

  /* ========= Carregar custos mensais ========= */

  useEffect(() => {
    (async () => {
      setLoading(true);

      // ajusta o nome da view/tabela aqui se for diferente
      let q = supabase
        .from("empresa_custos_mensais") // <===== AJUSTA PRA VIEW QUE USAS
        .select(
          "empresa_id, obra_id, mes_referencia, horas_totais, custo_total, profissionais_distintos"
        );

      // se tiver empresa logada
      if (empresa?.id) {
        q = q.eq("empresa_id", empresa.id);
      }

      // filtrar por ano
      q = q.gte("mes_referencia", `${ano}-01-01`).lte(
        "mes_referencia",
        `${ano}-12-31`
      );

      if (obraId !== "todas") {
        q = q.eq("obra_id", obraId);
      }

      const { data, error } = await q;

      if (!error && data) {
        setRows(data as EmpresaCustosMensaisRow[]);
      } else {
        setRows([]);
      }

      setLoading(false);
    })();
  }, [ano, obraId, empresa?.id]);

  /* ========= Transformar em série mensal ========= */

  const serieMensal = useMemo(() => {
    const base = Array.from({ length: 12 }).map((_, i) => ({
      mesIndex: i,
      mesLabel: MESES_LABEL[i],
      horas: 0,
      custo: 0,
      profissionais: 0,
    }));

    for (const r of rows) {
      if (!r.mes_referencia) continue;
      const d = dayjs(r.mes_referencia);
      const idx = d.month(); // 0-11
      const alvo = base[idx];
      alvo.horas += r.horas_totais || 0;
      alvo.custo += r.custo_total || 0;
      alvo.profissionais += r.profissionais_distintos || 0;
    }

    return base;
  }, [rows]);

  /* ========= KPIs ========= */

  const kpis = useMemo(() => {
    const totalCusto = serieMensal.reduce((s, m) => s + m.custo, 0);
    const totalHoras = serieMensal.reduce((s, m) => s + m.horas, 0);
    const totalMesesComMov = serieMensal.filter((m) => m.custo > 0).length;

    const custoMedioHora = totalHoras > 0 ? totalCusto / totalHoras : 0;

    let mesMaisCaro: string | null = null;
    let mesMaisBarato: string | null = null;
    let maior = -Infinity;
    let menor = Infinity;

    serieMensal.forEach((m, idx) => {
      if (m.custo > 0 && m.custo > maior) {
        maior = m.custo;
        mesMaisCaro = MESES_COMPLETO[idx];
      }
      if (m.custo > 0 && m.custo < menor) {
        menor = m.custo;
        mesMaisBarato = MESES_COMPLETO[idx];
      }
    });

    // tendência simples: custo do último mês com dados vs anterior
    const indicesComDados = serieMensal
      .map((m, idx) => ({ idx, custo: m.custo }))
      .filter((m) => m.custo > 0)
      .map((m) => m.idx);

    let tendencia: "subindo" | "descendo" | "estavel" | null = null;
    if (indicesComDados.length >= 2) {
      const last = indicesComDados[indicesComDados.length - 1];
      const prev = indicesComDados[indicesComDados.length - 2];
      const cLast = serieMensal[last].custo;
      const cPrev = serieMensal[prev].custo;
      if (cLast > cPrev * 1.05) tendencia = "subindo";
      else if (cLast < cPrev * 0.95) tendencia = "descendo";
      else tendencia = "estavel";
    }

    // projeção simples: média mensal * 12
    const mediaMensal =
      totalMesesComMov > 0 ? totalCusto / totalMesesComMov : 0;
    const projecaoAnual = mediaMensal * 12;

    return {
      totalCusto,
      totalHoras,
      custoMedioHora,
      mesMaisCaro,
      mesMaisBarato,
      tendencia,
      projecaoAnual,
    };
  }, [serieMensal]);

  /* ========= Tabela com variação mensal ========= */

  const tabelaMensal = useMemo(() => {
    let anterior = 0;
    return serieMensal.map((m, idx) => {
      const variacao =
        anterior > 0 ? ((m.custo - anterior) / anterior) * 100 : null;
      anterior = m.custo;
      return {
        mesLabel: MESES_COMPLETO[idx],
        horas: m.horas,
        custo: m.custo,
        profissionais: m.profissionais,
        variacao,
      };
    });
  }, [serieMensal]);

  /* ========= Exportações ========= */

  const exportCSV = () => {
    const header = [
      "Mês",
      "Horas totais",
      "Custo total (€)",
      "Profissionais distintos",
      "Variação vs mês anterior (%)",
    ];
    const lines = tabelaMensal.map((r) => [
      r.mesLabel,
      fmtNumber(r.horas, 2).replace(".", ","),
      fmtNumber(r.custo, 2).replace(".", ","),
      r.profissionais,
      r.variacao !== null ? fmtNumber(r.variacao, 2).replace(".", ",") : "",
    ]);

    const csv =
      ["Relatório Financeiro Acrobatas", "", header.join(";")]
        .concat(lines.map((l) => l.join(";")))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Financeiro_${ano}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Relatório Financeiro — Acrobatas", 14, 18);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Ano: ${ano}`, 14, 26);
    if (obraId !== "todas") {
      const obraNome =
        obras.find((o) => o.id === obraId)?.nome || "Obra selecionada";
      pdf.text(`Obra: ${obraNome}`, 14, 32);
    } else {
      pdf.text("Obra: Todas as obras", 14, 32);
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", margin, 40, imgWidth, imgHeight);
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(
      "Gerado automaticamente pela plataforma Acrobatas",
      pageWidth / 2,
      290,
      { align: "center" }
    );
    pdf.save(`Financeiro_${ano}.pdf`);
  };

  /* ========= Render ========= */

  return (
    <div className="p-4 sm:p-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            Relatórios ▸ Financeiro
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Visão consolidada dos custos de mão de obra por mês, no período
            selecionado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            <FileDown size={16} />
            Exportar PDF
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Calendar
            size={16}
            className="text-zinc-500 dark:text-zinc-400"
          />
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
        </div>
        <div className="flex items-center gap-2">
          <Factory
            size={16}
            className="text-zinc-500 dark:text-zinc-400"
          />
          <select
            className="min-w-[200px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
          >
            <option value="todas">Todas as obras</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setObraId("todas");
          }}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
        >
          <RefreshCcw size={16} />
          Limpar filtros
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500 dark:text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          A carregar dados financeiros…
        </div>
      ) : (
        <div ref={pdfRef} className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <KpiCard
              title="Custo total no ano"
              value={euro(kpis.totalCusto)}
              icon={<Euro className="text-emerald-500" size={18} />}
            />
            <KpiCard
              title="Horas totais no ano"
              value={`${fmtNumber(kpis.totalHoras, 2)}h`}
              icon={<ClockIcon size={18} />}
            />
            <KpiCard
              title="Custo médio por hora"
              value={euro(kpis.custoMedioHora)}
              icon={<Euro className="text-blue-500" size={18} />}
            />
            <KpiCard
              title="Projeção anual"
              value={euro(kpis.projecaoAnual)}
              icon={<TrendingIcon size={18} />}
              hint={
                kpis.tendencia === "subindo"
                  ? "Tendência: a subir"
                  : kpis.tendencia === "descendo"
                  ? "Tendência: a descer"
                  : kpis.tendencia === "estavel"
                  ? "Tendência: estável"
                  : undefined
              }
            />
          </div>

          {/* Info mes mais caro/barato */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoCard
              label="Mês com maior custo"
              value={kpis.mesMaisCaro || "—"}
            />
            <InfoCard
              label="Mês com menor custo"
              value={kpis.mesMaisBarato || "—"}
            />
          </div>

          {/* Gráfico */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Custo total por mês
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serieMensal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesLabel" />
                  <YAxis />
                  <ReTooltip
                    formatter={(v: any) => euro(Number(v))}
                    labelFormatter={(l: any) => `Mês: ${l}`}
                  />
                  <Bar dataKey="custo" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Detalhe mensal
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[13px] text-zinc-600 dark:border-zinc-800 dark:bg-slate-950/60 dark:text-zinc-300">
                    <th className="px-3 py-2">Mês</th>
                    <th className="px-3 py-2">Horas totais</th>
                    <th className="px-3 py-2">Custo total</th>
                    <th className="px-3 py-2">Profissionais</th>
                    <th className="px-3 py-2">Variação vs mês anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaMensal.every((r) => r.custo === 0) ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-zinc-500 dark:text-zinc-400"
                      >
                        Sem dados financeiros para este ano / filtros.
                      </td>
                    </tr>
                  ) : (
                    tabelaMensal.map((r) => (
                      <tr
                        key={r.mesLabel}
                        className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-2">{r.mesLabel}</td>
                        <td className="px-3 py-2">
                          {fmtNumber(r.horas, 2)}h
                        </td>
                        <td className="px-3 py-2">
                          {euro(r.custo)}
                        </td>
                        <td className="px-3 py-2">
                          {r.profissionais}
                        </td>
                        <td className="px-3 py-2">
                          {r.variacao === null
                            ? "—"
                            : `${fmtNumber(r.variacao, 2)} %`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   Subcomponentes
======================= */

function KpiCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}

/** Ícones simples só para não depender de outros */
function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      className={`text-zinc-500 ${props.className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TrendingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      className={`text-emerald-500 ${props.className ?? ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
