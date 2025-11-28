/* ===================================================================================
 * ACROBATAS PLATFORM — RELATÓRIO DE DESEMPENHO (AVANÇADO) — v2 (Atualizado)
 * - Assiduidade usa dias úteis (com feriados) e não penaliza quando não há lançamentos
 * - Linha exige amostra mínima por dia (evita picos “falsos”)
 * - Radar normalizado 0–100 e metas explícitas
 * - Pesos do ranking configuráveis
 * - Exportações (CSV/PDF) com obra/período e QR de validação
 * - Integração Supabase tolerante (tenta várias tabelas/colunas)
 * - Ajustado para dark mode (cards, botões, inputs, tabela)
 * =================================================================================== */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

import {
  Filter,
  Download,
  FileDown,
  Calendar,
  Building2,
  RefreshCcw,
  ArrowUpDown,
  Search,
  X,
  Users,
  Clock,
  Award,
  Sparkles,
} from "lucide-react";

/* ───────────────────────────────────────── Config ───────────────────────────────────────── */
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const META_H_DIA = 8; // alvo de horas por dia
const MIN_SAMPLE = 3; // mínimo de registros para plotar um ponto na linha de assiduidade
const PESO_ASSID = 0.4; // pesos do ranking
const PESO_PROD = 0.4;
const PESO_HDIA = 0.2;

type Prof = { id: string; nome: string; funcao?: string | null };
type Obra = { id: string; nome: string };

type Presenca = {
  profissional_id: string;
  obra_id?: string | null;
  data: string;
  presente: boolean;
  horas?: number;
};
type Hora = { profissional_id: string; data: string; horas: number };
type Tarefa = {
  profissional_id: string;
  data: string;
  concluidas: number;
  planejadas?: number | null;
};

type SortState = { key: string; dir: "asc" | "desc" };

const fmt = (n: number, d = 2) =>
  Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(isFinite(n) ? n : 0);
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/* ────────────────────────────────── Util: dias úteis ────────────────────────────────────── */
function businessDays(fromISO: string, toISO: string, holidaysISO: string[] = []) {
  const set = new Set(holidaysISO);
  let d = dayjs(fromISO),
    end = dayjs(toISO),
    total = 0;
  while (d.isBefore(end) || d.isSame(end, "day")) {
    const dow = d.day(); // 0=Dom,6=Sab
    if (dow !== 0 && dow !== 6 && !set.has(d.format("YYYY-MM-DD"))) total++;
    d = d.add(1, "day");
  }
  return total;
}

/* ───────────────────────────────────────── Componente ───────────────────────────────────── */
export default function DesempenhoAvancado() {
  const today = dayjs();
  const [ano, setAno] = useState(today.year());
  const [mes, setMes] = useState(today.month() + 1);
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<string>("todas");

  const [profs, setProfs] = useState<Prof[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [horas, setHoras] = useState<Hora[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [feriados, setFeriados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [openFilters, setOpenFilters] = useState(false);
  const [fRole, setFRole] = useState<string>("todos");
  const [fQuery, setFQuery] = useState("");
  const [dateOverride, setDateOverride] = useState<{ from?: string; to?: string }>(
    {}
  );

  const [sort, setSort] = useState<SortState>({ key: "nome", dir: "asc" });
  const [page, setPage] = useState(1);
  const [rpp, setRpp] = useState(12);

  const pdfRef = useRef<HTMLDivElement>(null);

  /* ───────────── Carregar obras & profissionais ───────────── */
  useEffect(() => {
    (async () => {
      const { data: ob } = await supabase
        .from("obras")
        .select("id, nome")
        .order("nome");
      setObras((ob || []) as Obra[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let data: any[] | null = null;
      const a = await supabase.from("profissionais").select("id,nome,funcao");
      if (!a.error && a.data) data = a.data;
      if (!data) {
        const b = await supabase.from("professionals").select("id,nome,funcao");
        if (!b.error && b.data) data = b.data;
      }
      setProfs((data || []) as Prof[]);
    })();
  }, []);

  /* ───────────── Carregar feriados (se tabela existir) ───────────── */
  const startISO =
    dateOverride.from ||
    dayjs(`${ano}-${String(mes).padStart(2, "0")}-01`).format("YYYY-MM-DD");
  const endISO =
    dateOverride.to || dayjs(startISO).endOf("month").format("YYYY-MM-DD");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("feriados_empresa")
          .select("data")
          .gte("data", startISO)
          .lte("data", endISO);
        setFeriados((data || []).map((x: any) => x.data));
      } catch {
        setFeriados([]);
      }
    })();
  }, [startISO, endISO]);

  /* ───────────── Carregar métricas ───────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);

      // PRESENÇAS
      const tryPres = async (
        table: string,
        colDate: string,
        colStatus: string,
        colHoras?: string
      ) => {
        let q: any = supabase
          .from(table)
          .select(
            `profissional_id, obra_id, ${colDate}, ${colStatus}${
              colHoras ? "," + colHoras : ""
            }`
          )
          .gte(colDate, startISO)
          .lte(colDate, endISO);
        if (obraId !== "todas") q = q.eq("obra_id", obraId);
        const { data } = await q;
        return (data || []).map(
          (r: any) =>
            ({
              profissional_id: r.profissional_id,
              obra_id: r.obra_id,
              data: r[colDate],
              presente:
                typeof r[colStatus] === "boolean"
                  ? r[colStatus]
                  : String(r[colStatus]).toLowerCase() !== "falta",
              horas: colHoras ? Number(r[colHoras]) || undefined : undefined,
            } as Presenca)
        );
      };
      let pres = await tryPres("presencas", "data", "presente", "horas");
      if (!pres.length)
        pres = await tryPres(
          "faltas_presencas",
          "data",
          "status",
          "horas_trabalhadas"
        );
      if (!pres.length) pres = await tryPres("frequencia", "data", "presente");

      // HORAS
      const tryHoras = async (table: string, colDate: string, colHoras: string) => {
        let q: any = supabase
          .from(table)
          .select(`profissional_id, ${colDate}, ${colHoras}`)
          .gte(colDate, startISO)
          .lte(colDate, endISO);
        if (obraId !== "todas") q = q.eq("obra_id", obraId);
        const { data } = await q;
        return (data || []).map(
          (r: any) =>
            ({
              profissional_id: r.profissional_id,
              data: r[colDate],
              horas: Number(r[colHoras]) || 0,
            } as Hora)
        );
      };
      let hrs = await tryHoras("horas_trabalhadas", "data", "horas");
      if (!hrs.length) hrs = await tryHoras("apontamentos", "data", "horas");
      if (!hrs.length) hrs = await tryHoras("timesheets", "data", "horas");

      // TAREFAS
      const tryTarefas = async (
        table: string,
        colDate: string,
        colDone: string,
        colPlan?: string
      ) => {
        let q: any = supabase
          .from(table)
          .select(
            `profissional_id, ${colDate}, ${colDone}${
              colPlan ? "," + colPlan : ""
            }`
          )
          .gte(colDate, startISO)
          .lte(colDate, endISO);
        if (obraId !== "todas") q = q.eq("obra_id", obraId);
        const { data } = await q;
        return (data || []).map(
          (r: any) =>
            ({
              profissional_id: r.profissional_id,
              data: r[colDate],
              concluidas: Number(r[colDone]) || 0,
              planejadas: colPlan ? Number(r[colPlan]) || null : null,
            } as Tarefa)
        );
      };
      let tks = await tryTarefas(
        "tarefas",
        "data",
        "concluidas",
        "planejadas"
      );
      if (!tks.length)
        tks = await tryTarefas("producao", "data", "realizado", "planejado");
      if (!tks.length)
        tks = await tryTarefas("producao_diaria", "data", "concluidas");

      setPresencas(pres);
      setHoras(hrs);
      setTarefas(tks);
      setLoading(false);
    })();
  }, [obraId, startISO, endISO]);

  /* ───────────── Mapas auxiliares ───────────── */
  const profNome = useMemo(() => {
    const m = new Map<string, string>();
    profs.forEach((p) => m.set(p.id, p.nome));
    return m;
  }, [profs]);
  const profFunc = useMemo(() => {
    const m = new Map<string, string | undefined>();
    profs.forEach((p) => m.set(p.id, p.funcao || undefined));
    return m;
  }, [profs]);

  const rangeDays = useMemo(() => {
    const out: string[] = [];
    let d = dayjs(startISO),
      end = dayjs(endISO);
    while (d.isBefore(end) || d.isSame(end, "day")) {
      out.push(d.format("YYYY-MM-DD"));
      d = d.add(1, "day");
    }
    return out;
  }, [startISO, endISO]);

  /* ───────────── Agregação por profissional ───────────── */
  const agg = useMemo(() => {
    const map = new Map<
      string,
      {
        nome: string;
        funcao?: string;
        presentes: number;
        faltas: number;
        horas: number;
        horasExtra: number;
        concluidas: number;
        planejadas: number;
        assiduidade: number;
        prod: number;
        horasMediasDia: number;
        diasPeriodo: number;
      }
    >();
    const diasPeriodo = rangeDays.length || 1;
    // presenças
    for (const p of presencas) {
      const k = p.profissional_id;
      if (!map.has(k))
        map.set(k, {
          nome: profNome.get(k) || "—",
          funcao: profFunc.get(k),
          presentes: 0,
          faltas: 0,
          horas: 0,
          horasExtra: 0,
          concluidas: 0,
          planejadas: 0,
          assiduidade: 0,
          prod: 0,
          horasMediasDia: 0,
          diasPeriodo,
        });
      const o = map.get(k)!;
      p.presente ? o.presentes++ : o.faltas++;
      if (typeof p.horas === "number") {
        o.horas += p.horas;
        if (p.horas > 8) o.horasExtra += p.horas - 8;
      }
    }
    // horas (complemento)
    for (const h of horas) {
      const k = h.profissional_id;
      if (!map.has(k))
        map.set(k, {
          nome: profNome.get(k) || "—",
          funcao: profFunc.get(k),
          presentes: 0,
          faltas: 0,
          horas: 0,
          horasExtra: 0,
          concluidas: 0,
          planejadas: 0,
          assiduidade: 0,
          prod: 0,
          horasMediasDia: 0,
          diasPeriodo,
        });
      const o = map.get(k)!;
      o.horas += h.horas;
      if (h.horas > 8) o.horasExtra += h.horas - 8;
    }
    // tarefas
    for (const t of tarefas) {
      const k = t.profissional_id;
      if (!map.has(k))
        map.set(k, {
          nome: profNome.get(k) || "—",
          funcao: profFunc.get(k),
          presentes: 0,
          faltas: 0,
          horas: 0,
          horasExtra: 0,
          concluidas: 0,
          planejadas: 0,
          assiduidade: 0,
          prod: 0,
          horasMediasDia: 0,
          diasPeriodo,
        });
      const o = map.get(k)!;
      o.concluidas += t.concluidas;
      o.planejadas += t.planejadas || 0;
    }

    // métricas finais
    const diasUteis = businessDays(startISO, endISO, feriados);
    for (const [k, o] of map) {
      // assiduidade justa (esperados = dias úteis; se não tem nenhuma marcação, não penaliza)
      const houveLanc = o.presentes + o.faltas > 0;
      const esperados = diasUteis;
      const denom = houveLanc
        ? Math.max(1, Math.min(esperados, o.presentes + o.faltas))
        : 1;
      o.assiduidade = houveLanc ? (o.presentes / denom) * 100 : 0;

      // produtividade (proxy quando não há planejamento)
      const basePlan =
        o.planejadas > 0 ? o.planejadas : Math.max(1, o.concluidas);
      o.prod = Math.min(100, (o.concluidas / basePlan) * 100);

      o.horasMediasDia = o.horas / Math.max(1, o.presentes || diasPeriodo);
      map.set(k, o);
    }
    return map;
  }, [presencas, horas, tarefas, profNome, profFunc, rangeDays.length, startISO, endISO, feriados]);

  /* ───────────── KPIs globais ───────────── */
  const kpi = useMemo(() => {
    const arr = [...agg.values()];
    const totalPresentes = arr.reduce((s, a) => s + a.presentes, 0);
    const diasUteis =
      businessDays(startISO, endISO, feriados) * Math.max(1, arr.length);
    const assid = diasUteis ? (totalPresentes / diasUteis) * 100 : 0;

    const horasTot = arr.reduce((s, a) => s + a.horas, 0);
    const divisorHoras = arr.reduce(
      (s, a) => s + Math.max(1, a.presentes || 1),
      0
    );
    const hmedia = divisorHoras ? horasTot / divisorHoras : 0;

    const prod = arr.length
      ? arr.reduce((s, a) => s + a.prod, 0) / arr.length
      : 0;
    const extra = arr.reduce((s, a) => s + a.horasExtra, 0);

    return { assidGlobal: assid, horasMedias: hmedia, prodMedia: prod, extra };
  }, [agg, startISO, endISO, feriados]);

  /* ───────────── Séries dos gráficos ───────────── */
  const serieAssid = useMemo(() => {
    const map = new Map<string, { presentes: number; total: number }>();
    rangeDays.forEach((d) => map.set(d, { presentes: 0, total: 0 }));
    for (const p of presencas) {
      if (!map.has(p.data)) continue;
      const m = map.get(p.data)!;
      m.total++;
      if (p.presente) m.presentes++;
    }
    return rangeDays.map((d) => {
      const m = map.get(d)!;
      const show = m.total >= MIN_SAMPLE;
      return {
        dia: dayjs(d).format("DD/MM"),
        assid: show
          ? Number(((m.presentes / m.total) * 100).toFixed(2))
          : null,
      };
    });
  }, [presencas, rangeDays]);

  const barrasHoras = useMemo(
    () =>
      [...agg.entries()]
        .map(([id, o]) => ({
          id,
          nome: o.nome,
          horas: Number(o.horas.toFixed(2)),
        }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 12),
    [agg]
  );

  const radar = useMemo(() => {
    const assid = clamp(kpi.assidGlobal, 0, 100);
    const prod = clamp(kpi.prodMedia, 0, 100);
    const horas = clamp((kpi.horasMedias / META_H_DIA) * 100, 0, 100);
    const extraIndex = clamp(
      100 -
        (kpi.extra / (rangeDays.length * Math.max(1, profs.length)) || 0) *
          100,
      0,
      100
    );
    return [
      { eixo: "Assiduidade", valor: Number(assid.toFixed(1)) },
      { eixo: "Produtividade", valor: Number(prod.toFixed(1)) },
      { eixo: "Horas/Dia", valor: Number(horas.toFixed(1)) },
      { eixo: "Gestão de Extra", valor: Number(extraIndex.toFixed(1)) },
    ];
  }, [kpi, rangeDays.length, profs.length]);

  /* ───────────── Tabela ───────────── */
  const allRows = useMemo(() => {
    let arr = [...agg.entries()].map(([id, o]) => ({
      id,
      nome: o.nome,
      funcao: o.funcao || "—",
      assid: Number(o.assiduidade.toFixed(1)),
      presentes: o.presentes,
      faltas: o.faltas,
      horas: Number(o.horas.toFixed(2)),
      hmedia: Number(o.horasMediasDia.toFixed(2)),
      hextra: Number(o.horasExtra.toFixed(2)),
      concluidas: o.concluidas,
      planejadas: o.planejadas,
      prod: Number(o.prod.toFixed(1)),
    }));

    if (fRole !== "todos")
      arr = arr.filter(
        (r) => (r.funcao || "").toLowerCase() === fRole.toLowerCase()
      );
    const q = fQuery.trim().toLowerCase();
    if (q)
      arr = arr.filter(
        (r) =>
          r.nome.toLowerCase().includes(q) ||
          r.funcao.toLowerCase().includes(q)
      );

    arr.sort((a: any, b: any) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const av = a[sort.key];
      const bv = b[sort.key];
      return typeof av === "number" && typeof bv === "number"
        ? (av - bv) * dir
        : String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [agg, fRole, fQuery, sort]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / rpp));
  const pageRows = useMemo(
    () => allRows.slice((page - 1) * rpp, (page - 1) * rpp + rpp),
    [allRows, page, rpp]
  );
  useEffect(() => {
    setPage(1);
  }, [fRole, fQuery, rpp]);

  /* ───────────── Ranking ───────────── */
  const ranking = useMemo(() => {
    const score = (o: any) =>
      o.assid * PESO_ASSID +
      o.prod * PESO_PROD +
      clamp((o.hmedia / META_H_DIA) * 100, 0, 120) * PESO_HDIA;
    return [...allRows]
      .map((r) => ({ ...r, score: Number(score(r).toFixed(1)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [allRows]);

  /* ───────────── Insights ───────────── */
  const insights = useMemo(() => {
    const out: string[] = [];
    if (kpi.assidGlobal >= 90)
      out.push("Assiduidade geral **excelente** (≥ 90%).");
    else if (kpi.assidGlobal >= 80)
      out.push("Assiduidade geral **boa** (≥ 80%).");
    else out.push("Assiduidade **abaixo do ideal** — atenção a faltas.");

    out.push(
      `Média de horas/dia por profissional: **${fmt(
        kpi.horasMedias,
        2
      )}h** (meta ${META_H_DIA}h).`
    );

    if (kpi.prodMedia >= 100)
      out.push("Produtividade média **no alvo** (≥ 100%).");
    else if (kpi.prodMedia >= 80)
      out.push("Produtividade média **satisfatória** (≥ 80%).");
    else
      out.push("Produtividade média **baixa** — revisar metas/alocação.");

    if (kpi.extra > 0)
      out.push(`Total de horas extra no período: **${fmt(kpi.extra, 2)}h**.`);

    if (ranking.length)
      out.push(
        `Top desempenho: **${ranking[0].nome}** (score ${fmt(
          ranking[0].score,
          1
        )}).`
      );
    return out;
  }, [kpi, ranking]);

  /* ───────────── Exportações ───────────── */
  const obraText =
    obraId === "todas"
      ? "Todas as obras"
      : obras.find((o) => o.id === obraId)?.nome || "Obra";

  const exportCSV = () => {
    const header = [
      "Profissional",
      "Função",
      "Assid (%)",
      "Presentes",
      "Faltas",
      "Horas",
      "Horas/Dia",
      "Horas Extra",
      "Concl.",
      "Plan.",
      "Prod (%)",
    ];
    const rows = allRows.map((r) => [
      r.nome,
      r.funcao,
      fmt(r.assid, 1).replace(".", ","),
      r.presentes,
      r.faltas,
      fmt(r.horas, 2).replace(".", ","),
      fmt(r.hmedia, 2).replace(".", ","),
      fmt(r.hextra, 2).replace(".", ","),
      r.concluidas,
      r.planejadas ?? "",
      fmt(r.prod, 1).replace(".", ","),
    ]);
    const preface = `# Obra: ${obraText} | Período: ${
      MESES[mes - 1]
    }/${ano}\n`;
    const csv =
      preface + [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Desempenho_${MESES[mes - 1]}_${ano}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const doc = new jsPDF("p", "mm", "a4");
    try {
      doc.addImage("/Green Modern Marketing Logo.png", "PNG", 12, 8, 28, 28);
    } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Relatório de Desempenho — Acrobatas Platform", 44, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Período: ${MESES[mes - 1]} / ${ano}`, 44, 23);
    doc.text(`Obra: ${obraText}`, 44, 30);
    doc.addImage(img, "PNG", 10, 40, 190, 0);
    try {
      const c = document.createElement("canvas");
      await QRCode.toCanvas(
        c,
        `https://acrobatas/relatorio/desempenho?m=${mes}&a=${ano}&o=${obraId}`,
        { width: 96 }
      );
      doc.addImage(c.toDataURL("image/png"), "PNG", 172, 8, 28, 28);
    } catch {}
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "Gerado automaticamente por Acrobatas Platform",
      105,
      292,
      { align: "center" }
    );
    doc.save(`Desempenho_${MESES[mes - 1]}_${ano}.pdf`);
  };

  /* ───────────── UI ───────────── */
  return (
    <div className="p-4 sm:p-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            Relatórios ▸ Desempenho
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Acompanhe assiduidade, horas, produtividade e ranking por obra/período.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpenFilters(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900/80 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            <Filter size={16} />
            Filtros Avançados
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900/80 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <FileDown size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-slate-950/60 p-3">
        <div className="flex items-center gap-2">
          <Calendar
            size={16}
            className="text-zinc-500 dark:text-zinc-400"
          />
          <select
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
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
          <Building2
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
            setDateOverride({});
            setFRole("todos");
            setFQuery("");
            setSort({ key: "nome", dir: "asc" });
            setPage(1);
          }}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
        >
          <RefreshCcw size={16} />
          Limpar filtros
        </button>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
          Carregando…
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Kpi
              title="Assiduidade"
              value={`${fmt(kpi.assidGlobal, 1)}%`}
              hint="Presenças / dias úteis"
              icon={<Users className="text-blue-500" size={18} />}
            />
            <Kpi
              title="Horas médias/dia"
              value={`${fmt(kpi.horasMedias, 2)}h`}
              hint={`Meta: ${META_H_DIA}h`}
              icon={
                <Clock
                  className={
                    kpi.horasMedias >= META_H_DIA
                      ? "text-emerald-500"
                      : "text-amber-500"
                  }
                  size={18}
                />
              }
            />
            <Kpi
              title="Produtividade média"
              value={`${fmt(kpi.prodMedia, 1)}%`}
              hint="Concluídas / Planejadas"
              icon={<Award className="text-orange-500" size={18} />}
            />
            <Kpi
              title="Horas extra (total)"
              value={`${fmt(kpi.extra, 2)}h`}
              hint="Acima de 8h/dia"
              icon={<Sparkles className="text-violet-500" size={18} />}
            />
          </div>

          {/* Área exportável */}
          <div ref={pdfRef} className="space-y-6">
            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Assiduidade por Dia">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serieAssid}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <ReTooltip
                        formatter={(v: any) =>
                          v === null ? "—" : `${fmt(Number(v), 1)}%`
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="assid"
                        connectNulls
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Horas por Profissional (Top 12)">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barrasHoras}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" />
                      <YAxis />
                      <ReTooltip
                        formatter={(v: any, _, p: any) => {
                          const total = barrasHoras.reduce(
                            (s, a) => s + a.horas,
                            0
                          );
                          const perc = total
                            ? (Number(v) / total) * 100
                            : 0;
                          return [
                            `${fmt(Number(v), 2)}h (${fmt(perc, 1)}%)`,
                            p.payload.nome,
                          ];
                        }}
                      />
                      <Bar dataKey="horas" fill="#16A34A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card title="Índice de Desempenho (Radar)">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="eixo" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Índice"
                      dataKey="valor"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.4}
                    />
                    <Legend />
                    <ReTooltip
                      formatter={(v: any) => `${fmt(Number(v), 1)} pts`}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Ranking */}
            <Card title="Ranking de Profissionais (Top 8)">
              {ranking.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sem dados suficientes.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {ranking.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-slate-950/60"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                            {i + 1}. {r.nome}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {r.funcao || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Score
                          </div>
                          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {fmt(r.score, 1)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                        <div>
                          <span className="text-zinc-400">Assid:</span>{" "}
                          {fmt(r.assid, 1)}%
                        </div>
                        <div>
                          <span className="text-zinc-400">Prod:</span>{" "}
                          {fmt(r.prod, 1)}%
                        </div>
                        <div>
                          <span className="text-zinc-400">H/dia:</span>{" "}
                          {fmt(r.hmedia, 2)}
                        </div>
                        <div>
                          <span className="text-zinc-400">Extra:</span>{" "}
                          {fmt(r.hextra, 2)}h
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            {/* Insights */}
            <Card title="Insights Automáticos">
              {insights.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sem insights suficientes.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {insights.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                      <span>{s.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Tabela */}
            <Card title="Detalhamento por Profissional">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <input
                    className="rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    placeholder="Buscar por nome/função…"
                    value={fQuery}
                    onChange={(e) => setFQuery(e.target.value)}
                  />
                </div>
                <select
                  value={fRole}
                  onChange={(e) => setFRole(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
                >
                  <option value="todos">Todas as funções</option>
                  {[...new Set(
                    profs.map((p) => (p.funcao || "—").toLowerCase())
                  )]
                    .filter(Boolean)
                    .map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Linhas:
                  </span>
                  <select
                    value={rpp}
                    onChange={(e) => setRpp(Number(e.target.value))}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
                  >
                    {[8, 12, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[13px] text-zinc-600 dark:border-zinc-800 dark:bg-slate-950/60 dark:text-zinc-300">
                      <Th
                        label="Profissional"
                        sortKey="nome"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Função"
                        sortKey="funcao"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Assid (%)"
                        sortKey="assid"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Presentes"
                        sortKey="presentes"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Faltas"
                        sortKey="faltas"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Horas"
                        sortKey="horas"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="H/dia"
                        sortKey="hmedia"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Extra"
                        sortKey="hextra"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Concl."
                        sortKey="concluidas"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Plan."
                        sortKey="planejadas"
                        sort={sort}
                        onSort={setSort}
                      />
                      <Th
                        label="Prod (%)"
                        sortKey="prod"
                        sort={sort}
                        onSort={setSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="py-10 text-center text-zinc-500 dark:text-zinc-400"
                        >
                          Sem registros.
                        </td>
                      </tr>
                    )}
                    {pageRows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-2">{r.nome}</td>
                        <td className="px-3 py-2">{r.funcao}</td>
                        <td className="px-3 py-2">
                          {fmt(r.assid, 1)}%
                        </td>
                        <td className="px-3 py-2">{r.presentes}</td>
                        <td className="px-3 py-2">{r.faltas}</td>
                        <td className="px-3 py-2">
                          {fmt(r.horas, 2)}h
                        </td>
                        <td className="px-3 py-2">
                          {fmt(r.hmedia, 2)}
                        </td>
                        <td className="px-3 py-2">
                          {fmt(r.hextra, 2)}h
                        </td>
                        <td className="px-3 py-2">
                          {r.concluidas}
                        </td>
                        <td className="px-3 py-2">
                          {r.planejadas ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {fmt(r.prod, 1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {allRows.length} registro(s) • Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white p-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                  >
                    ‹
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white p-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                  >
                    ›
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Modal filtros */}
      <Transition show={openFilters} as={React.Fragment}>
        <Dialog onClose={() => setOpenFilters(false)} className="relative z-40">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 translate-y-2"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0 translate-y-2"
              >
                <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
                  <div className="mb-3 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                      Filtros Avançados
                    </Dialog.Title>
                    <button
                      onClick={() => setOpenFilters(false)}
                      className="rounded-lg border border-zinc-200 bg-white p-1 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        De
                      </label>
                      <input
                        type="date"
                        value={dateOverride.from || ""}
                        onChange={(e) =>
                          setDateOverride((d) => ({
                            ...d,
                            from: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Até
                      </label>
                      <input
                        type="date"
                        value={dateOverride.to || ""}
                        onChange={(e) =>
                          setDateOverride((d) => ({
                            ...d,
                            to: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Função
                      </label>
                      <select
                        value={fRole}
                        onChange={(e) => setFRole(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
                      >
                        <option value="todos">Todas</option>
                        {[...new Set(
                          profs.map((p) => (p.funcao || "—").toLowerCase())
                        )]
                          .filter(Boolean)
                          .map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Buscar
                      </label>
                      <input
                        placeholder="Ex.: pedreiro, encarregado, João…"
                        value={fQuery}
                        onChange={(e) => setFQuery(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setDateOverride({});
                        setFRole("todos");
                        setFQuery("");
                        setOpenFilters(false);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-slate-900 dark:text-zinc-100 dark:hover:bg-slate-800"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={() => setOpenFilters(false)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Aplicar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

/* ───────────────────────── Subcomponents ───────────────────────── */
function Kpi({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60"
    >
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
        <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/60">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-slate-950/60">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: string;
  sort: { key: string; dir: "asc" | "desc" };
  onSort: (s: any) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      className="select-none px-3 py-2"
      onClick={() =>
        onSort({
          key: sortKey,
          dir: active ? (sort.dir === "asc" ? "desc" : "asc") : "asc",
        })
      }
    >
      <div className="inline-flex cursor-pointer items-center gap-1">
        <span>{label}</span>
        <ArrowUpDown
          size={14}
          className={
            active
              ? "text-zinc-800 dark:text-zinc-100"
              : "text-zinc-400 dark:text-zinc-500"
          }
        />
      </div>
    </th>
  );
}
