/* ============================================================================
 * ACROBATAS PLATFORM — RELATÓRIO DE CUSTOS MENSAIS (AVANÇADO / ENTERPRISE)
 * Arquivo: CustosMensaisAvancado.tsx
 * Tema: Claro (padrão da plataforma)
 *
 * 👉 RECURSOS
 *  - Filtros completos (mês, ano, obra, categorias, faixa de valores, busca)
 *  - KPIs com variação vs. mês anterior e projeção do mês atual
 *  - Gráficos: Barras (por obra), Linhas (12 meses), Pizza (categorias)
 *  - Tabela detalhada com busca, ordenação, paginação e tooltips
 *  - Exportações: CSV e PDF (logo + cabeçalho + QR de validação)
 *  - Insights automáticos baseados nos dados
 *  - Animações e microinterações (Framer Motion)
 *
 *  📦 Dependências:
 *    npm i recharts framer-motion @headlessui/react html2canvas jspdf dayjs qrcode lucide-react
 *
 *  🗄️ Banco (Supabase):
 *    Tabela custos_obra:
 *      - id (uuid)
 *      - obra_id (uuid)
 *      - empresa_id (uuid)
 *      - categoria (text) — ex: "Mão de Obra", "Alojamento e Transporte", "Materiais e Outros"
 *      - descricao (text)
 *      - valor (numeric)
 *      - data_gasto (date)
 *      - criado_em (timestamptz)
 *    Tabela obras:
 *      - id (uuid)
 *      - nome (text)
 *
 *  🧭 Observação:
 *    - Este arquivo foi pensado para "colar e rodar". Caso não exista FK para fazer join
 *      direto no select (obras(nome)), o código faz um fallback buscando as obras e mapeando.
 * ============================================================================ */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, Transition } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import {
  Filter,
  FileDown,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  Percent,
  RefreshCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  Info,
} from "lucide-react";

/* ============================================================================
 * 🔧 Tipos
 * ============================================================================ */
type CustoObra = {
  id: string;
  obra_id: string;
  empresa_id?: string | null;
  categoria: string;
  descricao?: string | null;
  valor: number;
  data_gasto: string; // date (yyyy-mm-dd)
  criado_em?: string | null;
  // enriquecido em runtime:
  obra_nome?: string;
};

type Obra = { id: string; nome: string };

type SortState = { key: keyof CustoObra | "obra_nome"; dir: "asc" | "desc" };

/* ============================================================================
 * 🎨 Paleta e utilidades de UI
 * ============================================================================ */
const CAT_COLORS: Record<string, string> = {
  "Mão de Obra": "#2563EB",
  "Alojamento e Transporte": "#F97316",
  "Materiais e Outros": "#16A34A",
};

const SAFE_CATS = [
  "Mão de Obra",
  "Alojamento e Transporte",
  "Materiais e Outros",
];

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

/* ============================================================================
 * 🧮 Helpers matemáticos / de data
 * ============================================================================ */
const fmtMoney = (v: number) =>
  `€ ${Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0)}`;

const startEndMonth = (y: number, m1to12: number) => {
  const start = dayjs(`${y}-${String(m1to12).padStart(2, "0")}-01`);
  const end = start.endOf("month");
  return { start: start.format("YYYY-MM-DD"), end: end.format("YYYY-MM-DD") };
};

const pct = (curr: number, prev: number) => {
  if (!prev && !curr) return 0;
  if (!prev) return 100;
  return ((curr - prev) / Math.max(prev, 0.0000001)) * 100;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/* ============================================================================
 * 📄 Componente principal
 * ============================================================================ */
export default function CustosMensaisAvancado() {
  /* -------------------------------- State -------------------------------- */
  const today = dayjs();
  const [ano, setAno] = useState<number>(today.year());
  const [mes, setMes] = useState<number>(today.month() + 1);
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<string>("todas");

  // Filtros avançados (modal)
  const [openFilters, setOpenFilters] = useState(false);
  const [fCats, setFCats] = useState<string[]>([]); // multi-select
  const [fMin, setFMin] = useState<string>("");
  const [fMax, setFMax] = useState<string>("");
  const [fQuery, setFQuery] = useState<string>("");
  const [dateOverride, setDateOverride] = useState<{ from?: string; to?: string }>(
    {}
  );

  // Dados
  const [loading, setLoading] = useState<boolean>(false);
  const [custos, setCustos] = useState<CustoObra[]>([]);
  const [custosPrev, setCustosPrev] = useState<CustoObra[]>([]); // mês anterior
  const [last12Months, setLast12Months] = useState<CustoObra[]>([]);

  // Obra nome cache (fallback a caso join não exista)
  const obraNomeMap = useMemo(
    () =>
      obras.reduce<Record<string, string>>((acc, o) => {
        acc[o.id] = o.nome;
        return acc;
      }, {}),
    [obras]
  );

  // Ordenação da tabela
  const [sort, setSort] = useState<SortState>({ key: "data_gasto", dir: "desc" });

  // Paginação
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRpp] = useState(12);

  // Ref para exportar PDF (container do relatório)
  const pdfRef = useRef<HTMLDivElement>(null);

  /* ----------------------------- Carrega obras ---------------------------- */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome")
        .order("nome", { ascending: true });
      if (!error && data) setObras(data as Obra[]);
    })();
  }, []);

  /* --------------------------- Carrega custos mês ------------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { start, end } = dateOverride.from && dateOverride.to
        ? { start: dateOverride.from!, end: dateOverride.to! }
        : startEndMonth(ano, mes);

      let query = supabase
        .from("custos_obra")
        .select("*")
        .gte("data_gasto", start)
        .lte("data_gasto", end);

      if (obraId !== "todas") query = query.eq("obra_id", obraId);

      const { data: currData, error: currErr } = await query;

      // mês anterior
      const prev = dayjs(`${ano}-${String(mes).padStart(2, "0")}-01`).subtract(
        1,
        "month"
      );
      const { start: pStart, end: pEnd } = startEndMonth(prev.year(), prev.month() + 1);

      let qPrev = supabase
        .from("custos_obra")
        .select("*")
        .gte("data_gasto", pStart)
        .lte("data_gasto", pEnd);
      if (obraId !== "todas") qPrev = qPrev.eq("obra_id", obraId);

      const { data: pData } = await qPrev;

      // últimos 12 meses (para a linha)
      const twelveStart = dayjs(end).subtract(11, "month").startOf("month");
      const twelveEnd = dayjs(end).endOf("month");

      let q12 = supabase
        .from("custos_obra")
        .select("*")
        .gte("data_gasto", twelveStart.format("YYYY-MM-DD"))
        .lte("data_gasto", twelveEnd.format("YYYY-MM-DD"));
      if (obraId !== "todas") q12 = q12.eq("obra_id", obraId);

      const { data: d12 } = await q12;

      // Enriquecer com nome da obra (fallback)
      const enrich = (arr: any[]) =>
        (arr || []).map((c) => ({
          ...c,
          obra_nome: c.obra_nome || obraNomeMap[c.obra_id] || "—",
          valor: Number(c.valor) || 0,
        }));

      setCustos(enrich(currData || []));
      setCustosPrev(enrich(pData || []));
      setLast12Months(enrich(d12 || []));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes, obraId, obraNomeMap, dateOverride.from, dateOverride.to]);

  /* ============================================================================
   * 🧠 Métricas e cálculos derivados
   * ============================================================================ */

  // Totais atuais e por categoria
  const totalsNow = useMemo(() => {
    const base = { total: 0, mao: 0, aloj: 0, mat: 0 };
    for (const c of custos) {
      base.total += c.valor;
      if (c.categoria === "Mão de Obra") base.mao += c.valor;
      else if (c.categoria === "Alojamento e Transporte") base.aloj += c.valor;
      else base.mat += c.valor;
    }
    return base;
  }, [custos]);

  // Totais do mês anterior
  const totalsPrev = useMemo(() => {
    const base = { total: 0, mao: 0, aloj: 0, mat: 0 };
    for (const c of custosPrev) {
      base.total += c.valor;
      if (c.categoria === "Mão de Obra") base.mao += c.valor;
      else if (c.categoria === "Alojamento e Transporte") base.aloj += c.valor;
      else base.mat += c.valor;
    }
    return base;
  }, [custosPrev]);

  // Variações (%)
  const varTotal = useMemo(() => pct(totalsNow.total, totalsPrev.total), [totalsNow, totalsPrev]);
  const varMao = useMemo(() => pct(totalsNow.mao, totalsPrev.mao), [totalsNow, totalsPrev]);
  const varAloj = useMemo(() => pct(totalsNow.aloj, totalsPrev.aloj), [totalsNow, totalsPrev]);
  const varMat = useMemo(() => pct(totalsNow.mat, totalsPrev.mat), [totalsNow, totalsPrev]);

  // Projeção de fechamento do mês (média diária * dias do mês)
  const projecao = useMemo(() => {
    const now = dayjs();
    const selMonth = dayjs(`${ano}-${String(mes).padStart(2, "0")}-01`);
    const diasMes = selMonth.daysInMonth();
    // se for mês passado/futuro, considerar dados inteiros
    const diasAteHoje =
      selMonth.isSame(now, "month") && selMonth.isSame(now, "year")
        ? Math.max(1, now.date())
        : Math.max(1, diasMes);
    const mediaDiaria = totalsNow.total / diasAteHoje;
    return clamp(mediaDiaria * diasMes, 0, Number.MAX_SAFE_INTEGER);
  }, [totalsNow.total, mes, ano]);

  // Custos por obra (gráfico de barras)
  const custosPorObra = useMemo(() => {
    const group = new Map<string, number>();
    for (const c of custos) {
      const name = c.obra_nome || "—";
      group.set(name, (group.get(name) || 0) + c.valor);
    }
    return [...group.entries()]
      .map(([obra, total]) => ({ obra, total }))
      .sort((a, b) => b.total - a.total);
  }, [custos]);

  // Linha 12 meses
  const linha12Meses = useMemo(() => {
    // Monta 12 labels a partir do fim
    const end = dayjs(`${ano}-${String(mes).padStart(2, "0")}-01`).endOf("month");
    const months: { label: string; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = end.subtract(i, "month");
      months.push({
        label: d.format("MMM/YY"),
        key: d.format("YYYY-MM"),
      });
    }
    const map = new Map<string, number>();
    for (const c of last12Months) {
      const k = dayjs(c.data_gasto).format("YYYY-MM");
      map.set(k, (map.get(k) || 0) + (Number(c.valor) || 0));
    }
    return months.map((m) => ({ mes: m.label, total: map.get(m.key) || 0 }));
  }, [last12Months, ano, mes]);

  // Pizza categorias
  const pizzaCats = useMemo(
    () => [
      { name: "Mão de Obra", value: totalsNow.mao, color: CAT_COLORS["Mão de Obra"] },
      { name: "Alojamento e Transporte", value: totalsNow.aloj, color: CAT_COLORS["Alojamento e Transporte"] },
      { name: "Materiais e Outros", value: totalsNow.mat, color: CAT_COLORS["Materiais e Outros"] },
    ],
    [totalsNow]
  );

  /* ============================================================================
   * 🔎 Tabela (filtros locais, ordenação, paginação)
   * ============================================================================ */
  const filteredTable = useMemo(() => {
    let arr = [...custos];
    // categorias
    if (fCats.length > 0) arr = arr.filter((c) => fCats.includes(c.categoria));
    // faixa de valores
    const min = Number(fMin) || -Infinity;
    const max = Number(fMax) || Infinity;
    arr = arr.filter((c) => c.valor >= min && c.valor <= max);
    // busca textual
    const q = fQuery.trim().toLowerCase();
    if (q) {
      arr = arr.filter((c) => {
        const s =
          `${c.obra_nome || ""} ${c.categoria || ""} ${c.descricao || ""}`.toLowerCase();
        return s.includes(q);
      });
    }
    // ordenação
    arr.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const ak = (a as any)[sort.key] ?? "";
      const bk = (b as any)[sort.key] ?? "";
      if (typeof ak === "number" && typeof bk === "number") return (ak - bk) * dir;
      return String(ak).localeCompare(String(bk)) * dir;
    });
    return arr;
  }, [custos, fCats, fMin, fMax, fQuery, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredTable.length / rowsPerPage));
  const pageData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredTable.slice(start, start + rowsPerPage);
  }, [filteredTable, page, rowsPerPage]);

  useEffect(() => {
    // sempre que filtros mudarem, volta pra página 1
    setPage(1);
  }, [fCats, fMin, fMax, fQuery, rowsPerPage]);

  /* ============================================================================
   * 💬 Insights automáticos
   * ============================================================================ */
  const insights = useMemo(() => {
    const items: string[] = [];
    // variações
    if (isFinite(varTotal)) {
      if (varTotal > 5)
        items.push(
          `Os custos **totais** cresceram ${varTotal.toFixed(
            1
          )}% em relação ao mês anterior.`
        );
      else if (varTotal < -5)
        items.push(
          `Os custos **totais** reduziram ${Math.abs(varTotal).toFixed(
            1
          )}% em relação ao mês anterior.`
        );
    }
    // categoria destaque
    const maxCat = [
      { k: "Mão de Obra", v: totalsNow.mao },
      { k: "Alojamento e Transporte", v: totalsNow.aloj },
      { k: "Materiais e Outros", v: totalsNow.mat },
    ].sort((a, b) => b.v - a.v)[0];
    if (maxCat?.v) {
      items.push(
        `**${maxCat.k}** é o maior centro de custo do período (${fmtMoney(
          maxCat.v
        )}).`
      );
    }
    // obra destaque
    if (custosPorObra.length > 0) {
      const top = custosPorObra[0];
      items.push(`A obra **${top.obra}** concentra ${fmtMoney(top.total)} no mês.`);
    }
    // projeção
    if (projecao > 0) {
      items.push(
        `Com base no ritmo atual, o **fechamento previsto** do mês é de **${fmtMoney(
          projecao
        )}**.`
      );
    }
    return items;
  }, [varTotal, totalsNow, custosPorObra, projecao]);

  /* ============================================================================
   * ⬇️ Exportações: CSV / PDF
   * ============================================================================ */
  const exportCSV = () => {
    const header = [
      "Obra",
      "Categoria",
      "Valor (€)",
      "Data",
      "Descrição",
      "Obra ID",
      "Empresa ID",
    ];
    const rows = filteredTable.map((c) => [
      c.obra_nome || "",
      c.categoria || "",
      (Number(c.valor) || 0).toFixed(2).replace(".", ","),
      c.data_gasto,
      (c.descricao || "").replace(/\n/g, " "),
      c.obra_id || "",
      c.empresa_id || "",
    ]);
    const csv = [header, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Custos_${MESES[mes - 1]}_${ano}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const el = pdfRef.current;
    if (!el) return;

    // Primeiro renderiza o container em alta resolução
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // Cabeçalho / Documento
    const doc = new jsPDF("p", "mm", "a4");
    // Logo
    try {
      doc.addImage("/Green Modern Marketing Logo.png", "PNG", 12, 8, 28, 28);
    } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Relatório de Custos Mensais — Acrobatas Platform", 44, 16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${MESES[mes - 1]} / ${ano}`, 44, 23);
    if (obraId !== "todas") {
      const nomeObra = obraNomeMap[obraId] || "Obra";
      doc.text(`Obra: ${nomeObra}`, 44, 30);
    } else {
      doc.text(`Obra: Todas`, 44, 30);
    }

    // Imagem do relatório (ocupa quase a página)
    // Mantém a proporção pra caber em 1 página. A4: 210mm x 297mm -> margens
    doc.addImage(imgData, "PNG", 10, 40, 190, 0);

    // QR code de validação
    try {
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(
        qrCanvas,
        `https://acrobatas.pt/relatorio?m=${mes}&a=${ano}&o=${obraId}`,
        { width: 96 }
      );
      const qrData = qrCanvas.toDataURL("image/png");
      doc.addImage(qrData, "PNG", 172, 8, 28, 28);
    } catch {}

    // Rodapé
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Gerado automaticamente por Acrobatas Platform • https://acrobatas.pt",
      105,
      292,
      { align: "center" }
    );

    doc.save(`Relatorio_Custos_${MESES[mes - 1]}_${ano}.pdf`);
  };

  /* ============================================================================
   * 🧱 UI
   * ============================================================================ */
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800">
            Relatórios ▸ Custos Mensais
          </h1>
          <p className="text-sm text-zinc-500">
            Visão gerencial e analítica dos custos por obra/categoria no período
            selecionado, com comparação, projeção e exportações.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOpenFilters(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white bg-gray-100 px-3 py-2 text-sm hover:bg-zinc-50"
          >
            <Filter size={16} />
            Filtros Avançados
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white bg-white px-3 py-2 text-sm hover:bg-zinc-50"
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
          >
            <FileDown size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-zinc-500" />
          <select
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {[ano - 1, ano, ano + 1].map((yy) => (
              <option key={yy} value={yy}>
                {yy}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-zinc-500" />
          <select
            className="min-w-[200px] rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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
            setFCats([]);
            setFMin("");
            setFMax("");
            setFQuery("");
            setSort({ key: "data_gasto", dir: "desc" });
            setPage(1);
          }}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-50"
        >
          <RefreshCcw size={16} />
          Limpar filtros
        </button>

        <button
          onClick={() => {
            const { start, end } = startEndMonth(ano, mes);
            setDateOverride({ from: start, to: end });
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Filter size={16} />
          Aplicar
        </button>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Kpi
          title="Total do Mês"
          value={totalsNow.total}
          diff={varTotal}
          color="#111827"
        />
        <Kpi title="Mão de Obra" value={totalsNow.mao} diff={varMao} color={CAT_COLORS["Mão de Obra"]} />
        <Kpi
          title="Alojamento e Transporte"
          value={totalsNow.aloj}
          diff={varAloj}
          color={CAT_COLORS["Alojamento e Transporte"]}
        />
        <Kpi
          title="Materiais e Outros"
          value={totalsNow.mat}
          diff={varMat}
          color={CAT_COLORS["Materiais e Outros"]}
        />
      </div>

      {/* PROJEÇÃO */}
      <div className="mb-5 rounded-xl border border-zinc-200 bg-gradient-to-r from-white to-zinc-50 p-4">
        <div className="flex items-center gap-3">
          <Percent className="text-blue-600" size={18} />
          <p className="text-sm text-zinc-700">
            Projeção do mês ({MESES[mes - 1]} {ano}):{" "}
            <span className="font-semibold">{fmtMoney(projecao)}</span>{" "}
            {totalsPrev.total > 0 && (
              <>
                — tendência{" "}
                <strong
                  className={
                    projecao > totalsPrev.total ? "text-green-600" : "text-red-600"
                  }
                >
                  {projecao > totalsPrev.total ? "de alta" : "de baixa"}
                </strong>{" "}
                em relação a {MESES[dayjs().subtract(1, "month").month()]} (
                {fmtMoney(totalsPrev.total)}).
              </>
            )}
          </p>
        </div>
      </div>

      {/* RELATÓRIO (container para PDF) */}
      <div ref={pdfRef} className="space-y-6">
        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Custos por Obra">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={custosPorObra}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="obra" />
                  <YAxis />
                  <ReTooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Bar dataKey="total" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Evolução dos Custos (12 meses)">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={linha12Meses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <ReTooltip formatter={(v: any) => fmtMoney(Number(v))} />
                  <Line type="monotone" dataKey="total" stroke="#16A34A" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card title="Distribuição por Categoria">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pizzaCats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(p) => `${p.name} (${((p.value / Math.max(1, totalsNow.total)) * 100).toFixed(1)}%)`}
                >
                  {pizzaCats.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
                <Legend />
                <ReTooltip formatter={(v: any) => fmtMoney(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* INSIGHTS */}
        <Card title="Insights Automáticos">
          {insights.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem insights suficientes para este período.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {insights.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Info size={16} className="mt-0.5 text-blue-600" />
                  <span
                    dangerouslySetInnerHTML={{
                      __html: s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* TABELA */}
        <Card title="Detalhamento de Custos">
          {/* Barra de busca e controles */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={fQuery}
                onChange={(e) => setFQuery(e.target.value)}
                placeholder="Buscar por obra, categoria ou descrição…"
                className="rounded-lg border border-zinc-200 pl-8 pr-3 py-2 text-sm"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-zinc-500">Linhas:</label>
              <select
                value={rowsPerPage}
                onChange={(e) => setRpp(Number(e.target.value))}
                className="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
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
                <tr className="border-b bg-zinc-50 text-left text-[13px] text-zinc-600">
                  <Th
                    label="Obra"
                    sortKey="obra_nome"
                    sort={sort}
                    onSort={setSort}
                  />
                  <Th
                    label="Categoria"
                    sortKey="categoria"
                    sort={sort}
                    onSort={setSort}
                  />
                  <Th
                    label="Valor (€)"
                    sortKey="valor"
                    sort={sort}
                    onSort={setSort}
                  />
                  <Th
                    label="Data"
                    sortKey="data_gasto"
                    sort={sort}
                    onSort={setSort}
                  />
                  <th className="px-3 py-2">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-zinc-500">
                      Nenhum registro encontrado para os filtros aplicados.
                    </td>
                  </tr>
                )}
                {pageData.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-zinc-50">
                    <td className="px-3 py-2">{c.obra_nome || "—"}</td>
                    <td className="px-3 py-2">{c.categoria}</td>
                    <td className="px-3 py-2">{fmtMoney(c.valor)}</td>
                    <td className="px-3 py-2">
                      {dayjs(c.data_gasto).format("DD/MM/YYYY")}
                    </td>
                    <td className="px-3 py-2">
                      {c.descricao ? (
                        <span title={c.descricao}>{c.descricao}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* paginação */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {filteredTable.length} registro(s) • Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 p-1 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 p-1 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* MODAL FILTROS AVANÇADOS */}
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
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-2"
              >
                <Dialog.Panel className="w-full max-w-2xl rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold">
                      Filtros Avançados
                    </Dialog.Title>
                    <button
                      onClick={() => setOpenFilters(false)}
                      className="rounded-lg border border-zinc-200 p-1 hover:bg-zinc-50"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Data customizada */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">
                        De (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        value={dateOverride.from || ""}
                        onChange={(e) =>
                          setDateOverride((d) => ({ ...d, from: e.target.value }))
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">
                        Até (YYYY-MM-DD)
                      </label>
                      <input
                        type="date"
                        value={dateOverride.to || ""}
                        onChange={(e) =>
                          setDateOverride((d) => ({ ...d, to: e.target.value }))
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>

                    {/* Categorias */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">
                        Categorias
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SAFE_CATS.map((cat) => {
                          const active = fCats.includes(cat);
                          return (
                            <button
                              key={cat}
                              onClick={() =>
                                setFCats((prev) =>
                                  prev.includes(cat)
                                    ? prev.filter((c) => c !== cat)
                                    : [...prev, cat]
                                )
                              }
                              className={`rounded-full border px-3 py-1 text-xs ${
                                active
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-zinc-200 bg-white dark:bg-zinc-900 text-zinc-700 hover:bg-zinc-50"
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Faixa de valor */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">
                        Valor Mínimo (€)
                      </label>
                      <input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={fMin}
                        onChange={(e) => setFMin(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600">
                        Valor Máximo (€)
                      </label>
                      <input
                        inputMode="decimal"
                        placeholder="99999.99"
                        value={fMax}
                        onChange={(e) => setFMax(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>

                    {/* Busca */}
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-zinc-600">
                        Buscar em obra/categoria/descrição
                      </label>
                      <input
                        placeholder="Ex.: Cascais, deslocamento, hotel…"
                        value={fQuery}
                        onChange={(e) => setFQuery(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setFCats([]);
                        setFMin("");
                        setFMax("");
                        setFQuery("");
                        setDateOverride({});
                        setOpenFilters(false);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={() => setOpenFilters(false)}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
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

/* ============================================================================
 * 🔹 Subcomponentes reutilizáveis
 * ============================================================================ */

function Kpi({
  title,
  value,
  diff,
  color,
}: {
  title: string;
  value: number;
  diff: number;
  color: string;
}) {
  const up = diff >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="mt-1 text-xl font-semibold" style={{ color }}>
            {fmtMoney(value)}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
            up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
          title="Variação vs. mês anterior"
        >
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isFinite(diff) ? `${diff.toFixed(1)}%` : "–"}
        </div>
      </div>
    </motion.div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">{title}</h3>
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
  sortKey: SortState["key"];
  sort: SortState;
  onSort: (s: SortState) => void;
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
          className={active ? "text-zinc-800" : "text-zinc-400"}
        />
      </div>
    </th>
  );
}





