/* ==========================================================================================
 * ACROBATAS PLATFORM — RELATÓRIO FINANCEIRO (AVANÇADO/ENTERPRISE) — v1
 * ------------------------------------------------------------------------------------------
 * • KPIs: Receita, Despesa, Margem Bruta, Margem Operacional, Saldo de Caixa Projetado
 * • Gráficos:
 *    - Linha/Área: Fluxo de Caixa Acumulado por dia
 *    - Barras: Resultado por Obra (Receita-Despesa)
 *    - Pizza: Despesas por Centro de Custo
 *    - Waterfall (DRE): Receita → Custo Direto → Desp. Oper. → EBITDA → Impostos → Resultado
 * • Tabela de Lançamentos: busca, filtros, ordenação, paginação, drill-down
 * • Aging (Recebíveis/Pagáveis): Atrasado, 0–7, 8–15, 16–30, 31–60, 61+
 * • Orçamento vs Real (por Obra/Categoria) + desvio %
 * • Previsão (M+1..M+3) com regressão linear simples sobre histórico mensal
 * • Exportar CSV + PDF (logo: /public/Green Modern Marketing Logo.png + QR)
 * • Integração Supabase tolerante a esquema:
 *    - receitas:  "receitas" | "entradas" | "faturamento" | "lancamentos_financeiros{tipo='R'}"
 *    - despesas:  "despesas" | "saidas" | "custos_obra" | "lancamentos_financeiros{tipo='D'}"
 *    - venc.:     tenta colunas data_vencimento | vencimento | due_date
 *    - datas:     tenta data_recebimento | data_gasto | data | competencia
 *    - orçamentos: "orcamentos" | "orcamentos_obra"
 * ------------------------------------------------------------------------------------------
 * Observações:
 *  - Não falha se tabelas não existirem: faz fallback para arrays vazios.
 *  - Todos os valores convertidos com Number(); NaN vira 0.
 *  - Internacionalização: pt-PT (EUR).
 * ========================================================================================== */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, Transition } from "@headlessui/react";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";

import {
  ResponsiveContainer,
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart,
} from "recharts";

import {
  Filter, Download, FileDown, Calendar, Building2, RefreshCcw, Search, X,
  ArrowUpDown, Info, TrendingUp, TrendingDown, Wallet, Receipt, Banknote,
  Layers, Sigma, Percent, DollarSign, LineChart as LineIcon, PieChart as PieIcon,
  BarChart2, ArrowRightLeft, Files, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2
} from "lucide-react";

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║                                   Tipos                                  ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
type Obra = { id: string; nome: string };

type Lanc = {
  id?: string;
  obra_id?: string | null;
  obra_nome?: string | null;
  tipo: "R" | "D"; // Receita / Despesa
  data: string;    // YYYY-MM-DD
  vencimento?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  status?: string | null; // "pago"/"recebido"/"aberto" etc.
  valor: number;   // sempre positivo
};

type Orcamento = {
  obra_id: string;
  categoria?: string | null;
  ano: number;
  mes: number;
  valor: number;
};

type SortState = { key: string; dir: "asc" | "desc" };

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║                             Constantes/Helpers                           ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const CURRENCY = (n: number) => Intl.NumberFormat("pt-PT",{ style:"currency", currency:"EUR" }).format(isFinite(n)?n:0);
const NUM = (n: number, d=2) => Intl.NumberFormat("pt-PT",{ minimumFractionDigits:d, maximumFractionDigits:d }).format(isFinite(n)?n:0);
const clamp = (n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

const COLORS = ["#2563EB","#16A34A","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#22C55E","#F97316","#EC4899","#64748B"];

// mapeamento heurístico de categorias → DRE
const CATEGORIA_DRE = (cat?: string | null): "RECEITA" | "CUSTO_DIRETO" | "DESP_OPER" | "IMPOSTO" | "OUTROS" => {
  const c = (cat||"").toLowerCase();
  if (!c) return "OUTROS";
  if (/(fatur|receita|servi|nota|venda|contrato)/.test(c)) return "RECEITA";
  if (/(mao de obra|mão de obra|materia|material|concreto|aluguel equipamento|subcontrat|obra|custo direto|terraplan|armação|forma|acabamento)/.test(c)) return "CUSTO_DIRETO";
  if (/(admin|escritorio|combust|transporte|telefone|internet|aluguel|energia|despesa|comercial|marketing|financeira|bancária|bancaria|juridica|contabil)/.test(c)) return "DESP_OPER";
  if (/(imposto|iss|ir|csll|pis|cofins|taxa|licença|alvará|alvara)/.test(c)) return "IMPOSTO";
  return "OUTROS";
};

// aging buckets (em dias)
const BUCKETS = [
  { label: "Atrasado", min: Number.NEGATIVE_INFINITY, max: -1 },
  { label: "0–7", min: 0, max: 7 },
  { label: "8–15", min: 8, max: 15 },
  { label: "16–30", min: 16, max: 30 },
  { label: "31–60", min: 31, max: 60 },
  { label: "61+", min: 61, max: Number.POSITIVE_INFINITY },
];

/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║                           Componente Principal                           ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
export default function FinanceiroAvancado() {
  /* ───────────── Estado base ───────────── */
  const today = dayjs();
  const [ano, setAno] = useState(today.year());
  const [mes, setMes] = useState(today.month()+1);

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<string>("todas");

  const [lancs, setLancs] = useState<Lanc[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros avançados
  const [openFilters, setOpenFilters] = useState(false);
  const [dateOverride, setDateOverride] = useState<{ from?: string; to?: string }>({});
  const [fTipo, setFTipo] = useState<"todos" | "R" | "D">("todos");
  const [fStatus, setFStatus] = useState<"todos" | "aberto" | "pago" | "recebido">("todos");
  const [fCategoria, setFCategoria] = useState<string>("todas");
  const [fQuery, setFQuery] = useState("");

  // Tabela
  const [sort, setSort] = useState<SortState>({ key: "data", dir: "desc" });
  const [page, setPage] = useState(1);
  const [rpp, setRpp] = useState(12);

  // Drilldown modals
  const [modalObra, setModalObra] = useState<{ open: boolean; obraId?: string; obraNome?: string }>({ open:false });
  const [modalCategoria, setModalCategoria] = useState<{ open: boolean; categoria?: string }>({ open:false });

  // PDF
  const pdfRef = useRef<HTMLDivElement>(null);

  /* ───────────── Datas do período ───────────── */
  const startISO = dateOverride.from || dayjs(`${ano}-${String(mes).padStart(2,"0")}-01`).format("YYYY-MM-DD");
  const endISO   = dateOverride.to   || dayjs(startISO).endOf("month").format("YYYY-MM-DD");

  /* ───────────── Carregar Obras ───────────── */
  useEffect(() => {
    (async ()=>{
      const { data } = await supabase.from("obras").select("id, nome").order("nome");
      setObras((data||[]) as Obra[]);
    })();
  }, []);

  /* ───────────── Carregar Lançamentos Financeiros (tolerante) ───────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);

      const rows: Lanc[] = [];

      // helper para normalizar um registro
      const norm = (r:any, tipo:"R"|"D", colDate:string, colValor:string, obraCol?:string, catCol?:string, descCol?:string, statusCol?:string, vencCol?:string): Lanc => {
        const v = Number(r[colValor]) || 0;
        const d = (r[colDate] && String(r[colDate]).slice(0,10)) || dayjs().format("YYYY-MM-DD");
        return {
          id: String(r.id ?? `${tipo}-${colDate}-${Math.random()}`),
          tipo,
          data: d,
          vencimento: r[vencCol||""] ? String(r[vencCol||""]).slice(0,10) : null,
          valor: Math.abs(v),
          obra_id: r[obraCol||"obra_id"] ?? null,
          categoria: (r[catCol||"categoria"] ?? r.centro_custo ?? r.tipo ?? null),
          descricao: r[descCol||"descricao"] ?? r.memo ?? r.obs ?? null,
          status: r[statusCol||"status"] ?? null,
        };
      };

      // RECEITAS: tenta diversas tabelas/colunas
      const tryReceitas = async () => {
        // 1) receitas
        const r1 = await supabase.from("receitas").select("*").gte("data_recebimento", startISO).lte("data_recebimento", endISO);
        if (!r1.error && r1.data && r1.data.length) {
          rows.push(...r1.data.map(r=>norm(r,"R","data_recebimento","valor","obra_id","categoria","descricao","status","data_vencimento")));
          return;
        }
        // 2) entradas
        const r2 = await supabase.from("entradas").select("*").gte("data", startISO).lte("data", endISO);
        if (!r2.error && r2.data && r2.data.length) {
          rows.push(...r2.data.map(r=>norm(r,"R","data","valor","obra_id","categoria","descricao","status","vencimento")));
          return;
        }
        // 3) faturamento
        const r3 = await supabase.from("faturamento").select("*").gte("data", startISO).lte("data", endISO);
        if (!r3.error && r3.data && r3.data.length) {
          rows.push(...r3.data.map(r=>norm(r,"R","data","valor","obra_id","categoria","descricao","status","vencimento")));
          return;
        }
        // 4) lancamentos_financeiros (tipo='R')
        const r4 = await supabase.from("lancamentos_financeiros").select("*").gte("data", startISO).lte("data", endISO).eq("tipo","R");
        if (!r4.error && r4.data) {
          rows.push(...r4.data.map(r=>norm(r,"R","data","valor","obra_id","categoria","descricao","status","vencimento")));
        }
      };

      // DESPESAS
      const tryDespesas = async () => {
        // 1) despesas
        const d1 = await supabase.from("despesas").select("*").gte("data_gasto", startISO).lte("data_gasto", endISO);
        if (!d1.error && d1.data && d1.data.length) {
          rows.push(...d1.data.map(r=>norm(r,"D","data_gasto","valor","obra_id","categoria","descricao","status","data_vencimento")));
          return;
        }
        // 2) saidas
        const d2 = await supabase.from("saidas").select("*").gte("data", startISO).lte("data", endISO);
        if (!d2.error && d2.data && d2.data.length) {
          rows.push(...d2.data.map(r=>norm(r,"D","data","valor","obra_id","categoria","descricao","status","vencimento")));
          return;
        }
        // 3) custos_obra
        const d3 = await supabase.from("custos_obra").select("*").gte("data_gasto", startISO).lte("data_gasto", endISO);
        if (!d3.error && d3.data && d3.data.length) {
          rows.push(...d3.data.map(r=>norm(r,"D","data_gasto","valor","obra_id","categoria","descricao","status","data_vencimento")));
          return;
        }
        // 4) lancamentos_financeiros (tipo='D')
        const d4 = await supabase.from("lancamentos_financeiros").select("*").gte("data", startISO).lte("data", endISO).eq("tipo","D");
        if (!d4.error && d4.data) {
          rows.push(...d4.data.map(r=>norm(r,"D","data","valor","obra_id","categoria","descricao","status","vencimento")));
        }
      };

      await tryReceitas();
      await tryDespesas();

      // Enriquecer com nome da obra (map local)
      let mapObra = new Map<string, string>();
      obras.forEach(o=>mapObra.set(o.id, o.nome));
      const rows2 = rows.map(r => ({ ...r, obra_nome: r.obra_id ? (mapObra.get(r.obra_id) || null) : null }));

      // ORÇAMENTOS (opcional)
      let orcs: Orcamento[] = [];
      const tryOrc = async (table:string) => {
        const { data } = await supabase.from(table).select("*").gte("ano", ano-1).lte("ano", ano+1);
        if (data && data.length) {
          orcs = data.map((r:any)=>({
            obra_id: r.obra_id ?? r.obra ?? "",
            categoria: r.categoria ?? r.centro_custo ?? null,
            ano: Number(r.ano || 0),
            mes: Number(r.mes || 0),
            valor: Number(r.valor) || 0,
          }));
          return true;
        }
        return false;
      };
      const ok1 = await tryOrc("orcamentos");
      if (!ok1) await tryOrc("orcamentos_obra");

      setLancs(rows2);
      setOrcamentos(orcs);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId, startISO, endISO, obras.length]);

  /* ╔═══════════════════════════════════════ Filtros e Linhas ══════════════════════════════╗ */
  const lancsFiltrados = useMemo(() => {
    let arr = lancs.slice();

    // obra
    if (obraId !== "todas") arr = arr.filter(l => (l.obra_id || "") === obraId);

    // tipo
    if (fTipo !== "todos") arr = arr.filter(l => l.tipo === fTipo);

    // status
    if (fStatus !== "todos") {
      const s = fStatus.toLowerCase();
      arr = arr.filter(l => (l.status || "").toLowerCase().includes(s));
    }

    // categoria
    if (fCategoria !== "todas") {
      arr = arr.filter(l => (l.categoria || "").toLowerCase() === fCategoria.toLowerCase());
    }

    // busca
    const q = fQuery.trim().toLowerCase();
    if (q) {
      arr = arr.filter(l => {
        return (
          (l.obra_nome || "").toLowerCase().includes(q) ||
          (l.categoria || "").toLowerCase().includes(q) ||
          (l.descricao || "").toLowerCase().includes(q)
        );
      });
    }

    // ordenação
    arr.sort((a:any,b:any)=>{
      const dir = sort.dir === "asc" ? 1 : -1;
      const av = a[sort.key]; const bv = b[sort.key];
      if (sort.key === "valor") return (Number(av)-Number(bv))*dir;
      return String(av||"").localeCompare(String(bv||""))*dir;
    });

    return arr;
  }, [lancs, obraId, fTipo, fStatus, fCategoria, fQuery, sort]);

  const categoriasDisponiveis = useMemo(()=>{
    return [...new Set(lancs.map(l=>(l.categoria||"—").toLowerCase()))].filter(Boolean);
  }, [lancs]);

  const totalPages = Math.max(1, Math.ceil(lancsFiltrados.length / rpp));
  const pageRows = useMemo(()=>lancsFiltrados.slice((page-1)*rpp, (page-1)*rpp + rpp), [lancsFiltrados, page, rpp]);
  useEffect(()=>{ setPage(1); }, [obraId, fTipo, fStatus, fCategoria, fQuery, rpp]);

  /* ╔══════════════════════════════════════ KPIs e DRE ═════════════════════════════════════╗ */
  const kpis = useMemo(() => {
    let receita = 0, despesa = 0;
    for (const l of lancsFiltrados) {
      if (l.tipo === "R") receita += l.valor;
      else despesa += l.valor;
    }

    // DRE heurístico
    let receitaDre = 0, custoDireto = 0, despOper = 0, imposto = 0, outros = 0;
    for (const l of lancsFiltrados) {
      const cls = CATEGORIA_DRE(l.categoria);
      if (l.tipo === "R") {
        receitaDre += l.valor;
      } else {
        if (cls === "CUSTO_DIRETO") custoDireto += l.valor;
        else if (cls === "DESP_OPER") despOper += l.valor;
        else if (cls === "IMPOSTO") imposto += l.valor;
        else outros += l.valor;
      }
    }

    const margemBruta = receitaDre - custoDireto;
    const margemOper = receitaDre - custoDireto - despOper;
    const impostos = imposto; // já mapeado
    const resultado = margemOper - impostos - outros;

    // Caixa projetado até o fim do período (receitas "abertas" - despesas "abertas" com vencimento <= endISO)
    const abertoReceber = lancs.filter(l => l.tipo==="R" && ((l.status||"").toLowerCase().includes("abert") || (l.status||"").toLowerCase().includes("em aberto")))
      .filter(l => !l.vencimento || dayjs(l.vencimento).isBefore(endISO) || dayjs(l.vencimento).isSame(endISO, "day"))
      .reduce((s,l)=>s+l.valor,0);
    const abertoPagar = lancs.filter(l => l.tipo==="D" && ((l.status||"").toLowerCase().includes("abert") || (l.status||"").toLowerCase().includes("pendente")))
      .filter(l => !l.vencimento || dayjs(l.vencimento).isBefore(endISO) || dayjs(l.vencimento).isSame(endISO, "day"))
      .reduce((s,l)=>s+l.valor,0);
    const saldoProjetado = (receita - despesa) + (abertoReceber - abertoPagar);

    return {
      receita, despesa, margemBruta, margemOper, impostos, resultado, saldoProjetado,
      breakdown: { receitaDre, custoDireto, despOper, imposto, outros }
    };
  }, [lancsFiltrados, lancs, endISO]);

  /* ╔══════════════════════════════════════ Séries p/ Gráficos ═════════════════════════════╗ */
  const diasPeriodo = useMemo(()=>{
    const out:string[]=[]; let d=dayjs(startISO), end=dayjs(endISO);
    while (d.isBefore(end) || d.isSame(end,"day")) { out.push(d.format("YYYY-MM-DD")); d=d.add(1,"day"); }
    return out;
  }, [startISO, endISO]);

  // Fluxo acumulado por dia
  const serieFluxo = useMemo(()=>{
    const map = new Map<string, { r:number; d:number }>();
    diasPeriodo.forEach((dia)=>map.set(dia,{r:0,d:0}));
    for (const l of lancsFiltrados) {
      if (!map.has(l.data)) continue;
      const m = map.get(l.data)!;
      if (l.tipo==="R") m.r += l.valor; else m.d += l.valor;
    }
    let acum=0;
    return diasPeriodo.map((dia)=>{
      const m = map.get(dia)!;
      acum += (m.r - m.d);
      return { dia: dayjs(dia).format("DD/MM"), receita:m.r, despesa:m.d, acumulado: acum };
    });
  }, [lancsFiltrados, diasPeriodo]);

  // Barras por obra (resultado líquido)
  const barrasObra = useMemo(()=>{
    const map = new Map<string,{obra:string; receita:number; despesa:number; resultado:number}>();
    for (const l of lancsFiltrados) {
      const key = l.obra_id || "—";
      if (!map.has(key)) map.set(key, { obra: l.obra_nome || "—", receita:0, despesa:0, resultado:0 });
      const m = map.get(key)!;
      if (l.tipo==="R") m.receita += l.valor; else m.despesa += l.valor;
      m.resultado = m.receita - m.despesa;
    }
    return [...map.values()].sort((a,b)=>b.resultado - a.resultado).slice(0,12);
  }, [lancsFiltrados]);

  // Pizza despesas por centro de custo
  const pizzaDesp = useMemo(()=>{
    const map = new Map<string, number>();
    for (const l of lancsFiltrados) {
      if (l.tipo!=="D") continue;
      const k = (l.categoria || "Outros");
      map.set(k, (map.get(k)||0) + l.valor);
    }
    const arr = [...map.entries()].map(([name, value])=>({ name, value }));
    const total = arr.reduce((s,a)=>s+a.value,0) || 1;
    return arr
      .map((a,i)=>({ ...a, fill: COLORS[i%COLORS.length], perc: (a.value/total)*100 }))
      .sort((a,b)=>b.value - a.value);
  }, [lancsFiltrados]);

  // Waterfall DRE
  const serieWaterfall = useMemo(()=>{
    const { receitaDre, custoDireto, despOper, imposto, outros } = kpis.breakdown;
    const EBITDA = receitaDre - custoDireto - despOper;
    const Resultado = EBITDA - imposto - outros;

    // construir barras "waterfall": cada etapa mostra delta
    return [
      { name:"Receita", value: receitaDre, tipo:"pos" },
      { name:"Custo Direto", value: -custoDireto, tipo:"neg" },
      { name:"Desp. Oper.", value: -despOper, tipo:"neg" },
      { name:"EBITDA", value: EBITDA, tipo:"pos" },
      { name:"Impostos", value: -imposto, tipo:"neg" },
      { name:"Outros", value: -outros, tipo:"neg" },
      { name:"Resultado", value: Resultado, tipo: Resultado>=0?"pos":"neg" },
    ];
  }, [kpis.breakdown]);

  /* ╔══════════════════════════════════════ Aging ══════════════════════════════════════════╗ */
  const aging = useMemo(()=>{
    const recAberto = lancs.filter(l => l.tipo==="R" && ((l.status||"").toLowerCase().includes("abert") || (l.status||"").toLowerCase().includes("pendente")));
    const pagAberto = lancs.filter(l => l.tipo==="D" && ((l.status||"").toLowerCase().includes("abert") || (l.status||"").toLowerCase().includes("pendente")));

    const bucketize = (arr:Lanc[])=>{
      const map = new Map<string, number>();
      BUCKETS.forEach(b=>map.set(b.label,0));
      for (const l of arr) {
        const base = dayjs().startOf("day");
        const due  = l.vencimento ? dayjs(l.vencimento) : dayjs(l.data);
        const diff = due.diff(base, "day"); // negativo = atrasado
        const b = BUCKETS.find(b => diff>=b.min && diff<=b.max) || BUCKETS[BUCKETS.length-1];
        map.set(b.label, (map.get(b.label)||0) + l.valor);
      }
      return BUCKETS.map(b=>({ faixa:b.label, valor: map.get(b.label)||0 }));
    };

    return {
      receber: bucketize(recAberto),
      pagar: bucketize(pagAberto),
    };
  }, [lancs]);

  /* ╔══════════════════════════════════════ Orçamento vs Real ══════════════════════════════╗ */
  const ovsr = useMemo(()=>{
    // por obra/categoria (mês corrente)
    const mm = mes, aa = ano;
    const key = (obra_id:string, cat:string)=>`${obra_id||"—"}|${(cat||"—").toLowerCase()}|${aa}-${mm}`;

    const real = new Map<string, number>();
    for (const l of lancs) {
      const y = dayjs(l.data).year(), m = dayjs(l.data).month()+1;
      if (y!==aa || m!==mm) continue;
      const obra = (obraId==="todas" ? (l.obra_id||"—") : obraId);
      if (obraId!=="todas" && obra !== obraId) continue;
      const k = key(obra, l.categoria||"—");
      real.set(k, (real.get(k)||0) + (l.tipo==="D" ? l.valor : -l.valor)); // despesa positiva; receita negativa para "custo"
    }

    const orc = new Map<string, number>();
    for (const o of orcamentos) {
      if (o.ano===aa && o.mes===mm) {
        const obra = obraId==="todas" ? o.obra_id : obraId;
        if (obraId!=="todas" && obra !== obraId) continue;
        const k = key(obra, o.categoria||"—");
        orc.set(k, (orc.get(k)||0) + o.valor);
      }
    }

    // gerar linhas: Categoria | Obra | Orçado | Real | Desvio (%)
    const linhas: { obra:string; categoria:string; orcado:number; real:number; desvio:number }[] = [];
    const obrasSet = new Set<string>();
    const catsSet = new Set<string>();
    for (const k of new Set([...real.keys(), ...orc.keys()])) {
      const [obra, cat] = k.split("|");
      obrasSet.add(obra); catsSet.add(cat);
      const r = real.get(k)||0;
      const o = orc.get(k)||0;
      const desvio = o ? ((r - o)/o) * 100 : (r===0 ? 0 : 100);
      const obraNome = (obras.find(x=>x.id===obra)?.nome) || (obra==="—" ? "—" : (lancs.find(l=>l.obra_id===obra)?.obra_nome || obra));
      linhas.push({ obra: obraNome, categoria: cat, orcado:o, real:r, desvio });
    }

    // ordenar por maior desvio absoluto
    linhas.sort((a,b)=>Math.abs(b.desvio) - Math.abs(a.desvio));
    return linhas.slice(0, 24); // top 24 linhas
  }, [orcamentos, lancs, obraId, mes, ano, obras]);

  /* ╔══════════════════════════════════════ Previsão (M+1..M+3) ════════════════════════════╗ */
  const previsao = useMemo(()=>{
    // constrói histórico mensal (12 meses anteriores)
    const baseFrom = dayjs(startISO).subtract(12, "month").startOf("month");
    const hist: { ym:string; receita:number; despesa:number; resultado:number }[] = [];
    const sum = (tipo:"R"|"D", y:number, m:number)=>lancs.filter(l=>l.tipo===tipo && dayjs(l.data).year()===y && (dayjs(l.data).month()+1)===m).reduce((s,l)=>s+l.valor,0);
    for (let i=0;i<12;i++){
      const d = baseFrom.add(i,"month");
      const y=d.year(), m=d.month()+1, ym = `${y}-${String(m).padStart(2,"0")}`;
      const r = sum("R",y,m), g = sum("D",y,m);
      hist.push({ ym, receita:r, despesa:g, resultado:r-g });
    }

    // regressão linear simples em resultado mensal
    const xs = hist.map((_,i)=>i);
    const ys = hist.map(h=>h.resultado);
    const n = xs.length || 1;
    const meanX = xs.reduce((s,a)=>s+a,0)/n;
    const meanY = ys.reduce((s,a)=>s+a,0)/n;
    const num = xs.reduce((s,x,i)=>s + (x-meanX)*(ys[i]-meanY),0);
    const den = xs.reduce((s,x)=>s + Math.pow(x-meanX,2),0) || 1;
    const b1 = num/den;
    const b0 = meanY - b1*meanX;

    const proj = (k:number)=>b0 + b1*k;

    const m1 = dayjs(endISO).add(1,"month").startOf("month");
    const out = [0,1,2].map((off)=> {
      const d = m1.add(off,"month");
      const k = 12+off; // após último índice
      const res = proj(k);
      // heurística: manter proporção média de receita/despesa dos últimos 3 meses
      const last3 = hist.slice(-3);
      const propR = last3.reduce((s,h)=>s+(h.receita/(Math.abs(h.resultado)||1)),0)/last3.length;
      const propD = last3.reduce((s,h)=>s+(h.despesa/(Math.abs(h.resultado)||1)),0)/last3.length;
      // Se resultado projetado positivo, reparte próx. de forma proporcional
      let r = Math.max(0, res * (propR/(propR+propD || 1)));
      let g = Math.max(0, r - res); // tal que r - g = res
      if (res<0) { g = -res * (propD/(propR+propD || 1)); r = g + res; r = Math.max(0,r); }
      return { mes: `${MESES[d.month()]} ${d.year()}`, receita: r, despesa: g, resultado: res };
    });

    return out;
  }, [lancs, startISO, endISO]);

  /* ╔══════════════════════════════════════ Insights ════════════════════════════════════════╗ */
  const insights = useMemo(()=>{
    const out:string[]=[];
    const { receita, despesa, margemOper, resultado } = kpis;
    if (receita===0 && despesa===0) return out;

    out.push(`Receita no período: **${CURRENCY(receita)}**; Despesa: **${CURRENCY(despesa)}**.`);

    if (margemOper >= 0) out.push(`Margem operacional **positiva**: **${CURRENCY(margemOper)}**.`);
    else out.push(`Margem operacional **negativa**: **${CURRENCY(margemOper)}** — revisar custos e despesas.`);

    if (resultado >= 0) out.push(`Resultado final **superavitário**: **${CURRENCY(resultado)}**.`);
    else out.push(`Resultado final **deficitário**: **${CURRENCY(resultado)}**.`);

    if (barrasObra.length) {
      const best = barrasObra[0];
      const worst = barrasObra[barrasObra.length-1];
      out.push(`Obra destaque: **${best.obra}** (${CURRENCY(best.resultado)}).`);
      if (worst.resultado < 0) out.push(`Atenção à obra **${worst.obra}** (${CURRENCY(worst.resultado)}).`);
    }

    // despesas mais pesadas
    if (pizzaDesp.length) {
      const top = pizzaDesp[0];
      out.push(`Centro de custo mais pesado: **${top.name}** (${CURRENCY(top.value)}; ${NUM(top.perc,1)}%).`);
    }

    // aging
    const vencRecAtraso = aging.receber.find(a=>a.faixa==="Atrasado")?.valor||0;
    const vencPagAtraso = aging.pagar.find(a=>a.faixa==="Atrasado")?.valor||0;
    if (vencRecAtraso>0) out.push(`Recebíveis **atrasados**: **${CURRENCY(vencRecAtraso)}**.`);
    if (vencPagAtraso>0) out.push(`Pagáveis **atrasados**: **${CURRENCY(vencPagAtraso)}**.`);

    // previsão
    const prev = previsao[0]?.resultado ?? 0;
    out.push(`Projeção **M+1**: resultado de **${CURRENCY(prev)}** (linear simples).`);

    return out;
  }, [kpis, barrasObra, pizzaDesp, aging, previsao]);

  /* ╔══════════════════════════════════════ Exportações ════════════════════════════════════╗ */
  const exportCSV = () => {
    const header = ["Tipo","Data","Vencimento","Obra","Categoria","Descrição","Status","Valor"];
    const rows = lancsFiltrados.map(l=>[
      l.tipo==="R" ? "Receita":"Despesa",
      l.data,
      l.vencimento||"",
      l.obra_nome||"—",
      l.categoria||"—",
      (l.descricao||"").replace(/;/g,","),
      l.status||"—",
      NUM(l.valor,2).replace(".",",")
    ]);
    const preface = `# Obra: ${obraId==="todas" ? "Todas as obras" : (obras.find(o=>o.id===obraId)?.nome||"Obra") } | Período: ${MESES[mes-1]}/${ano}\n`;
    const csv = preface + [header, ...rows].map(r=>r.join(";")).join("\n");
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`Financeiro_${MESES[mes-1]}_${ano}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current,{scale:2});
    const img = canvas.toDataURL("image/png");
    const doc = new jsPDF("p","mm","a4");
    try { doc.addImage("/Green Modern Marketing Logo.png","PNG",12,8,28,28); } catch {}
    doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text("Relatório Financeiro — Acrobatas Platform",44,16);
    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    const obraText = obraId==="todas" ? "Todas as obras" : (obras.find(o=>o.id===obraId)?.nome || "Obra");
    doc.text(`Período: ${MESES[mes-1]} / ${ano}`,44,23);
    doc.text(`Obra: ${obraText}`,44,30);
    doc.addImage(img,"PNG",10,40,190,0);
    try {
      const c=document.createElement("canvas");
      await QRCode.toCanvas(c,`https://acrobatas/relatorio/financeiro?m=${mes}&a=${ano}&o=${obraId}`,{width:96});
      doc.addImage(c.toDataURL("image/png"),"PNG",172,8,28,28);
    } catch {}
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text("Gerado automaticamente por Acrobatas Platform",105,292,{align:"center"});
    doc.save(`Financeiro_${MESES[mes-1]}_${ano}.pdf`);
  };

  /* ╔══════════════════════════════════════ UI ═════════════════════════════════════════════╗ */
  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-800">Relatórios ▸ Financeiro</h1>
          <p className="text-sm text-zinc-500">Fluxo de caixa, DRE resumido, centros de custo, aging e previsões.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setOpenFilters(true)} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white bg-gray-100 px-3 py-2 text-sm hover:bg-zinc-50">
            <Filter size={16}/> Filtros Avançados
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white bg-white px-3 py-2 text-sm hover:bg-zinc-50">
            <Download size={16}/> Exportar CSV
          </button>
          <button onClick={exportPDF} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700">
            <FileDown size={16}/> Exportar PDF
          </button>
        </div>
      </div>

      {/* FILTROS RÁPIDOS */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-zinc-500"/>
          <select className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" value={mes} onChange={(e)=>setMes(Number(e.target.value))}>
            {MESES.map((m,i)=>(<option key={m} value={i+1}>{m}</option>))}
          </select>
          <select className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" value={ano} onChange={(e)=>setAno(Number(e.target.value))}>
            {[ano-1,ano,ano+1].map(y=>(<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-zinc-500"/>
          <select className="min-w-[200px] rounded-lg border border-zinc-200 px-3 py-2 text-sm" value={obraId} onChange={(e)=>setObraId(e.target.value)}>
            <option value="todas">Todas as obras</option>
            {obras.map(o=>(<option key={o.id} value={o.id}>{o.nome}</option>))}
          </select>
        </div>

        <button onClick={()=>{
          setDateOverride({}); setFTipo("todos"); setFStatus("todos"); setFCategoria("todas"); setFQuery("");
          setSort({key:"data", dir:"desc"}); setPage(1);
        }} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2 text-sm hover:bg-zinc-50">
          <RefreshCcw size={16}/> Limpar filtros
        </button>
      </div>

      {/* KPIs */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">Carregando…</div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-6">
            <Kpi title="Receita" value={CURRENCY(kpis.receita)} hint="Total de entradas" icon={<Wallet className="text-green-600" size={18}/>}/>
            <Kpi title="Despesa" value={CURRENCY(kpis.despesa)} hint="Total de saídas" icon={<Receipt className="text-red-500" size={18}/>}/>
            <Kpi title="Margem Bruta" value={CURRENCY(kpis.margemBruta)} hint="Receita - Custo Direto" icon={<Layers className="text-blue-600" size={18}/>}/>
            <Kpi title="Margem Oper." value={CURRENCY(kpis.margemOper)} hint="Bruta - Desp. Oper." icon={<Sigma className="text-amber-600" size={18}/>}/>
            <Kpi title="Impostos" value={CURRENCY(kpis.impostos)} hint="ISS/IR/CSLL etc." icon={<Percent className="text-fuchsia-600" size={18}/>}/>
            <Kpi title="Saldo Caixa (proj.)" value={CURRENCY(kpis.saldoProjetado)} hint="Inclui abertos até o fim do período" icon={<Banknote className="text-emerald-700" size={18}/>}/>
          </div>

          {/* BLOCO EXPORTÁVEL */}
          <div ref={pdfRef} className="space-y-6">
            {/* FLUXO & BARRAS OBRA */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card title="Fluxo de Caixa (Acumulado)">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={serieFluxo}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="dia"/>
                      <YAxis tickFormatter={(v)=>CURRENCY(Number(v))}/>
                      <Legend/>
                      <ReTooltip formatter={(v:any)=>CURRENCY(Number(v))}/>
                      <Area type="monotone" dataKey="acumulado" fill="#93C5FD" stroke="#2563EB" strokeWidth={2}/>
                      <Line type="monotone" dataKey="receita" stroke="#16A34A" strokeWidth={2}/>
                      <Line type="monotone" dataKey="despesa" stroke="#EF4444" strokeWidth={2}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Resultado por Obra (Top 12)">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barrasObra}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="obra"/>
                      <YAxis tickFormatter={(v)=>CURRENCY(Number(v))}/>
                      <ReTooltip formatter={(v:any)=>CURRENCY(Number(v))}/>
                      <Bar dataKey="resultado" onClick={(d:any)=>{
                        setModalObra({ open:true, obraId: (lancsFiltrados.find(l=>l.obra_nome===d.obra)?.obra_id)||"", obraNome: d.obra });
                      }}>
                        {barrasObra.map((entry, index) => (
                          <Cell key={`c-${index}`} fill={entry.resultado>=0 ? "#16A34A" : "#EF4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* DRE & PIZZA DESPESAS */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card title="DRE Resumido (Waterfall)">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serieWaterfall}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="name"/>
                      <YAxis tickFormatter={(v)=>CURRENCY(Number(v))}/>
                      <ReTooltip formatter={(v:any)=>CURRENCY(Number(v))}/>
                      <Bar dataKey="value">
                        {serieWaterfall.map((s,i)=>(
                          <Cell key={i} fill={s.tipo==="pos" ? "#16A34A" : "#EF4444"}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Despesas por Centro de Custo">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pizzaDesp} dataKey="value" nameKey="name" outerRadius={110}
                           onClick={(d:any)=>setModalCategoria({open:true, categoria:d.name})}>
                        {pizzaDesp.map((p,i)=>(<Cell key={i} fill={p.fill}/>))}
                      </Pie>
                      <ReTooltip formatter={(v:any,_,p:any)=>[`${CURRENCY(Number(v))} (${NUM(p.payload.perc,1)}%)`, p.payload.name]}/>
                      <Legend/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* AGING */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card title="Aging — Receber">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging.receber}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="faixa"/>
                      <YAxis tickFormatter={(v)=>CURRENCY(Number(v))}/>
                      <ReTooltip formatter={(v:any)=>CURRENCY(Number(v))}/>
                      <Bar dataKey="valor" fill="#16A34A"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Aging — Pagar">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aging.pagar}>
                      <CartesianGrid strokeDasharray="3 3"/>
                      <XAxis dataKey="faixa"/>
                      <YAxis tickFormatter={(v)=>CURRENCY(Number(v))}/>
                      <ReTooltip formatter={(v:any)=>CURRENCY(Number(v))}/>
                      <Bar dataKey="valor" fill="#EF4444"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ORÇAMENTO VS REAL */}
            <Card title="Orçamento vs Real (Top desvios do mês)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-zinc-50 text-left text-[13px] text-zinc-600">
                      <th className="px-3 py-2">Obra</th>
                      <th className="px-3 py-2">Categoria</th>
                      <th className="px-3 py-2">Orçado</th>
                      <th className="px-3 py-2">Real</th>
                      <th className="px-3 py-2">Desvio</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ovsr.length===0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-zinc-500">Sem dados de orçamento para o mês.</td></tr>
                    )}
                    {ovsr.map((r,i)=>(
                      <tr key={i} className="border-b hover:bg-zinc-50">
                        <td className="px-3 py-2">{r.obra}</td>
                        <td className="px-3 py-2">{r.categoria}</td>
                        <td className="px-3 py-2">{CURRENCY(r.orcado)}</td>
                        <td className="px-3 py-2">{CURRENCY(r.real)}</td>
                        <td className="px-3 py-2">{NUM(r.desvio,1)}%</td>
                        <td className="px-3 py-2">
                          {Math.abs(r.desvio) < 10 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                              <CheckCircle2 size={12}/> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                              <AlertTriangle size={12}/> Atenção
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* PREVISÃO TRIMESTRAL */}
            <Card title="Previsão Próximos 3 Meses (Resultado)">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={previsao}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="mes"/>
                    <YAxis tickFormatter={(v)=>CURRENCY(Number(v))}/>
                    <ReTooltip formatter={(v:any)=>CURRENCY(Number(v))}/>
                    <Bar dataKey="resultado">
                      {previsao.map((p,i)=>(<Cell key={i} fill={p.resultado>=0?"#16A34A":"#EF4444"}/>))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* INSIGHTS */}
            <Card title="Insights Automáticos">
              {insights.length===0 ? <p className="text-sm text-zinc-500">Sem insights suficientes.</p> : (
                <ul className="space-y-2 text-sm">
                  {insights.map((s,i)=>(
                    <li key={i} className="flex items-start gap-2">
                      <Info size={16} className="mt-0.5 text-blue-600"/><span>{s.replace(/\*\*(.*?)\*\*/g,"$1")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* TABELA DE LANÇAMENTOS */}
            <Card title="Lançamentos">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400"/>
                  <input value={fQuery} onChange={(e)=>setFQuery(e.target.value)} placeholder="Buscar em obra/categoria/descrição…"
                         className="rounded-lg border border-zinc-200 pl-8 pr-3 py-2 text-sm"/>
                </div>
                <select value={fTipo} onChange={(e)=>setFTipo(e.target.value as any)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                  <option value="todos">Receita + Despesa</option>
                  <option value="R">Apenas Receitas</option>
                  <option value="D">Apenas Despesas</option>
                </select>
                <select value={fStatus} onChange={(e)=>setFStatus(e.target.value as any)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                  <option value="todos">Todos status</option>
                  <option value="aberto">Em aberto</option>
                  <option value="pago">Pago</option>
                  <option value="recebido">Recebido</option>
                </select>
                <select value={fCategoria} onChange={(e)=>setFCategoria(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                  <option value="todas">Todas as categorias</option>
                  {categoriasDisponiveis.map((c)=>(<option key={c} value={c}>{c}</option>))}
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Linhas:</span>
                  <select value={rpp} onChange={(e)=>setRpp(Number(e.target.value))}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-sm">
                    {[12,20,50,100].map(n=>(<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-zinc-50 text-left text-[13px] text-zinc-600">
                      <Th label="Tipo" sortKey="tipo" sort={sort} onSort={setSort}/>
                      <Th label="Data" sortKey="data" sort={sort} onSort={setSort}/>
                      <Th label="Venc." sortKey="vencimento" sort={sort} onSort={setSort}/>
                      <Th label="Obra" sortKey="obra_nome" sort={sort} onSort={setSort}/>
                      <Th label="Categoria" sortKey="categoria" sort={sort} onSort={setSort}/>
                      <Th label="Descrição" sortKey="descricao" sort={sort} onSort={setSort}/>
                      <Th label="Status" sortKey="status" sort={sort} onSort={setSort}/>
                      <Th label="Valor" sortKey="valor" sort={sort} onSort={setSort}/>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length===0 && (
                      <tr><td colSpan={8} className="py-10 text-center text-zinc-500">Sem lançamentos.</td></tr>
                    )}
                    {pageRows.map((l)=>(
                      <tr key={l.id} className="border-b hover:bg-zinc-50">
                        <td className="px-3 py-2">{l.tipo==="R" ? "Receita" : "Despesa"}</td>
                        <td className="px-3 py-2">{dayjs(l.data).format("DD/MM/YYYY")}</td>
                        <td className="px-3 py-2">{l.vencimento ? dayjs(l.vencimento).format("DD/MM"):"—"}</td>
                        <td className="px-3 py-2">{l.obra_nome || "—"}</td>
                        <td className="px-3 py-2">{l.categoria || "—"}</td>
                        <td className="px-3 py-2">{l.descricao || "—"}</td>
                        <td className="px-3 py-2">{l.status || "—"}</td>
                        <td className="px-3 py-2">{CURRENCY(l.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-zinc-500">{lancsFiltrados.length} registro(s) • Página {page} de {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 p-1 disabled:opacity-50">
                    <ChevronLeft size={16}/>
                  </button>
                  <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
                    className="inline-flex items-center rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 p-1 disabled:opacity-50">
                    <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* MODAL: DRILL POR OBRA */}
      <Transition show={modalObra.open} as={React.Fragment}>
        <Dialog onClose={()=>setModalObra({open:false})} className="relative z-40">
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30"/>
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2">
                <Dialog.Panel className="w-full max-w-3xl rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold">
                      Detalhes da Obra{modalObra.obraNome ? `: ${modalObra.obraNome}` : ""}
                    </Dialog.Title>
                    <button onClick={()=>setModalObra({open:false})} className="rounded-lg border border-zinc-200 p-1 hover:bg-zinc-50">
                      <X size={16}/>
                    </button>
                  </div>

                  <DrillTable
                    rows={lancs.filter(l=> (modalObra.obraId ? (l.obra_id===modalObra.obraId) : l.obra_nome===modalObra.obraNome))}
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* MODAL: DRILL POR CATEGORIA (DESPESAS) */}
      <Transition show={modalCategoria.open} as={React.Fragment}>
        <Dialog onClose={()=>setModalCategoria({open:false})} className="relative z-40">
          <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30"/>
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={React.Fragment} enter="ease-out duration-200" enterFrom="opacity-0 translate-y-2" enterTo="opacity-100 translate-y-0" leave="ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-2">
                <Dialog.Panel className="w-full max-w-3xl rounded-xl bg-white dark:bg-zinc-900 p-5 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold">
                      Centro de Custo: {modalCategoria.categoria || "—"}
                    </Dialog.Title>
                    <button onClick={()=>setModalCategoria({open:false})} className="rounded-lg border border-zinc-200 p-1 hover:bg-zinc-50">
                      <X size={16}/>
                    </button>
                  </div>

                  <DrillTable rows={lancs.filter(l=> (l.tipo==="D") && ((l.categoria||"").toLowerCase()===(modalCategoria.categoria||"").toLowerCase()))}/>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

/* ╔════════════════════════════════════ Subcomponentes ═════════════════════════════════════╗ */
function Kpi({ title, value, hint, icon }:{ title:string; value:string; hint?:string; icon?:React.ReactNode }) {
  return (
    <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}
      className="rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="mt-1 text-xl font-semibold text-zinc-800">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
        </div>
        <div className="rounded-lg bg-zinc-50 p-2">{icon}</div>
      </div>
    </motion.div>
  );
}

function Card({ title, children }:{ title:string; children:React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-700">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Th({ label, sortKey, sort, onSort }:{
  label:string; sortKey:string; sort:{key:string; dir:"asc"|"desc"}; onSort:(s:any)=>void;
}) {
  const active = sort.key===sortKey;
  return (
    <th className="select-none px-3 py-2" onClick={()=>onSort({ key:sortKey, dir: active?(sort.dir==="asc"?"desc":"asc"):"asc" })}>
      <div className="inline-flex cursor-pointer items-center gap-1">
        <span>{label}</span> <ArrowUpDown size={14} className={active?"text-zinc-800":"text-zinc-400"}/>
      </div>
    </th>
  );
}

function DrillTable({ rows }:{ rows: Lanc[] }) {
  const [sort, setSort] = useState<SortState>({ key:"data", dir:"desc" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rpp, setRpp] = useState(12);

  const filtered = useMemo(()=>{
    let arr = rows.slice();
    const t = q.trim().toLowerCase();
    if (t) arr = arr.filter(l =>
      (l.obra_nome||"").toLowerCase().includes(t) ||
      (l.descricao||"").toLowerCase().includes(t)
    );
    arr.sort((a:any,b:any)=>{
      const dir=sort.dir==="asc"?1:-1; const av=a[sort.key]; const bv=b[sort.key];
      if (sort.key==="valor") return (Number(av)-Number(bv))*dir;
      return String(av||"").localeCompare(String(bv||""))*dir;
    });
    return arr;
  }, [rows, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/rpp));
  const pageRows = useMemo(()=>filtered.slice((page-1)*rpp, (page-1)*rpp + rpp), [filtered, page, rpp]);

  useEffect(()=>{ setPage(1); }, [q, rpp]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400"/>
          <input className="rounded-lg border border-zinc-200 pl-8 pr-3 py-2 text-sm" placeholder="Buscar…" value={q} onChange={(e)=>setQ(e.target.value)}/>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500">Linhas:</span>
          <select value={rpp} onChange={(e)=>setRpp(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm">
            {[12,20,50,100].map(n=>(<option key={n} value={n}>{n}</option>))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-[13px] text-zinc-600">
              <Th label="Tipo" sortKey="tipo" sort={sort} onSort={setSort}/>
              <Th label="Data" sortKey="data" sort={sort} onSort={setSort}/>
              <Th label="Venc." sortKey="vencimento" sort={sort} onSort={setSort}/>
              <Th label="Obra" sortKey="obra_nome" sort={sort} onSort={setSort}/>
              <Th label="Categoria" sortKey="categoria" sort={sort} onSort={setSort}/>
              <Th label="Descrição" sortKey="descricao" sort={sort} onSort={setSort}/>
              <Th label="Status" sortKey="status" sort={sort} onSort={setSort}/>
              <Th label="Valor" sortKey="valor" sort={sort} onSort={setSort}/>
            </tr>
          </thead>
          <tbody>
            {pageRows.length===0 && <tr><td colSpan={8} className="py-8 text-center text-zinc-500">Sem registros.</td></tr>}
            {pageRows.map((l)=>(
              <tr key={`${l.id}`} className="border-b hover:bg-zinc-50">
                <td className="px-3 py-2">{l.tipo==="R" ? "Receita" : "Despesa"}</td>
                <td className="px-3 py-2">{dayjs(l.data).format("DD/MM/YYYY")}</td>
                <td className="px-3 py-2">{l.vencimento ? dayjs(l.vencimento).format("DD/MM") : "—"}</td>
                <td className="px-3 py-2">{l.obra_nome || "—"}</td>
                <td className="px-3 py-2">{l.categoria || "—"}</td>
                <td className="px-3 py-2">{l.descricao || "—"}</td>
                <td className="px-3 py-2">{l.status || "—"}</td>
                <td className="px-3 py-2">{CURRENCY(l.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">{filtered.length} registro(s) • Página {page} de {totalPages}</span>
        <div className="flex items-center gap-1">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 p-1 disabled:opacity-50">
            <ChevronLeft size={16}/>
          </button>
          <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 p-1 disabled:opacity-50">
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}
