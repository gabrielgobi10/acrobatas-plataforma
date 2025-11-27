import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Building2,
  Search,
  CalendarRange,
  PlusCircle,
  CheckCircle2,
  Clock4,
  BadgeDollarSign,
  ArrowDownToLine,
  ReceiptText,
  Download,
  Upload,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Filter as FilterIcon,
} from "lucide-react";

// =============================================
// Tipos (visual apenas)
// =============================================

type StatusPagamento = "a_pagar" | "pendente" | "pago";

type Pagamento = {
  id: string;
  profissionalId: string;
  profissional: string;
  empresa: string;
  funcao: string;
  referencia: string; // ex: FEV/2025-OBRA-123
  obra?: string | null;
  competencia: string; // YYYY-MM
  dataVencimento: string; // ISO
  dataPagamento?: string | null; // ISO
  horas?: number | null;
  valorHora?: number | null;
  valor: number; // total
  status: StatusPagamento;
  observacao?: string | null;
};

type Profissional = {
  id: string;
  nome: string;
  email: string;
  empresa: string;
  funcao: string;
};

// =============================================
// Mock (substituir por Supabase depois)
// =============================================
const MOCK_PROFISSIONAIS: Profissional[] = [
  { id: "p1", nome: "Gabriel Silva", email: "gabriel@acrobatas.com", empresa: "Diâmetro Canalizações", funcao: "Canalizador" },
  { id: "p2", nome: "Ângelo Matos", email: "angelo@acrobatas.com", empresa: "ConstruFácil SA", funcao: "Eletricista" },
  { id: "p3", nome: "Bruna Torres", email: "bruna@acrobatas.com", empresa: "Diâmetro Canalizações", funcao: "Servente" },
];

const MOCK_PAGAMENTOS: Pagamento[] = [
  {
    id: "pg1",
    profissionalId: "p1",
    profissional: "Gabriel Silva",
    empresa: "Diâmetro Canalizações",
    funcao: "Canalizador",
    referencia: "2025-10_OBRA-114",
    obra: "Cascais — Fase 2",
    competencia: "2025-10",
    dataVencimento: "2025-11-05",
    dataPagamento: null,
    horas: 168,
    valorHora: 10,
    valor: 1680,
    status: "a_pagar",
    observacao: null,
  },
  {
    id: "pg2",
    profissionalId: "p2",
    profissional: "Ângelo Matos",
    empresa: "ConstruFácil SA",
    funcao: "Eletricista",
    referencia: "2025-10_OBRA-220",
    obra: "Lisboa — Retrofit",
    competencia: "2025-10",
    dataVencimento: "2025-11-07",
    dataPagamento: null,
    horas: 150,
    valorHora: 11,
    valor: 1650,
    status: "pendente",
  },
  {
    id: "pg3",
    profissionalId: "p3",
    profissional: "Bruna Torres",
    empresa: "Diâmetro Canalizações",
    funcao: "Servente",
    referencia: "2025-09_OBRA-114",
    obra: "Cascais — Fase 1",
    competencia: "2025-09",
    dataVencimento: "2025-10-05",
    dataPagamento: "2025-10-06",
    horas: 160,
    valorHora: 7.5,
    valor: 1200,
    status: "pago",
  },
];

// =============================================
// Helpers visuais
// =============================================
function classNames(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}
function money(n: number) {
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}
function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(); } catch { return iso as string; }
}

function Card({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={classNames("rounded-2xl border border-white/5 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 backdrop-blur", className)}>
      {children}
    </div>
  );
}

function StatCard({ title, value, sub, tone, icon }: { title: string; value: string; sub?: string; tone: "emerald" | "amber" | "indigo"; icon: React.ReactNode; }) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20",
  };
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={classNames("rounded-xl p-3", tones[tone])}>{icon}</div>
      </div>
    </Card>
  );
}

function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean; }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} className={classNames("relative z-10 w-[95%] max-w-xl rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl", wide && "max-w-2xl")}> 
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10" aria-label="Fechar">
                <X className="h-5 w-5 text-zinc-300" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto pr-1 text-zinc-200">{children}</div>
            {footer && <div className="mt-5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================
// Seletor de profissional (busca + filtros + paginação leve)
// =============================================
function ProfessionalPicker({ profissionais, selecionado, onSelecionar }: { profissionais: Profissional[]; selecionado?: string | null; onSelecionar: (id: string) => void; }) {
  const [query, setQuery] = useState("");
  const [empresa, setEmpresa] = useState<string>("todas");
  const [funcao, setFuncao] = useState<string>("todas");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const empresas = useMemo(() => Array.from(new Set(profissionais.map(p => p.empresa))), [profissionais]);
  const funcoes = useMemo(() => Array.from(new Set(profissionais.map(p => p.funcao))), [profissionais]);

  const filtrados = useMemo(() => profissionais.filter((p) => {
    const q = query.trim().toLowerCase();
    const byNome = !q || p.nome.toLowerCase().includes(q);
    const byEmpresa = empresa === "todas" || p.empresa === empresa;
    const byFuncao = funcao === "todas" || p.funcao === funcao;
    return byNome && byEmpresa && byFuncao;
  }), [profissionais, query, empresa, funcao]);

  useEffect(() => setPage(1), [query, empresa, funcao]);

  const total = filtrados.length;
  const paginados = filtrados.slice(0, page * pageSize);
  const hasMore = paginados.length < total;

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-zinc-300">
          <User className="h-5 w-5" />
          <div>
            <p className="text-sm text-zinc-400">Selecionar profissional</p>
            <p className="text-xs text-zinc-500">Pesquise por nome e filtre por empresa/função</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 md:max-w-3xl md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar por nome..." className="w-full rounded-xl border border-white/10 bg-zinc-950 px-9 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>
          <div className="relative">
            <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
              <option value="todas">Todas as empresas</option>
              {empresas.map((e) => (<option key={e} value={e}>{e}</option>))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-zinc-500" />
          </div>
          <div className="relative">
            <select value={funcao} onChange={(e) => setFuncao(e.target.value)} className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
              <option value="todas">Todas as funções</option>
              {funcoes.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {paginados.map((p) => (
          <button key={p.id} onClick={() => onSelecionar(p.id)} className={classNames("group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-left hover:border-indigo-400/30 hover:bg-zinc-900", selecionado === p.id && "ring-2 ring-indigo-500/40")}>
            <div>
              <p className="font-medium text-white">{p.nome}</p>
              <p className="text-xs text-zinc-400">{p.email}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{p.empresa}</span>
                <span>•</span>
                <span>{p.funcao}</span>
              </div>
            </div>
            <FilterIcon className="h-4 w-4 text-zinc-500 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{total} resultado{total === 1 ? "" : "s"}</span>
        {hasMore ? (
          <button onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-200 hover:bg-white/10">Carregar mais</button>
        ) : (
          <span>Fim da lista</span>
        )}
      </div>
    </Card>
  );
}

// =============================================
// Página principal — Pagamentos Profissionais (visual)
// =============================================
export default function AdminPagamentosProfissionais() {
  const [profissionais] = useState<Profissional[]>(MOCK_PROFISSIONAIS);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(MOCK_PAGAMENTOS);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  // Filtros
  const [status, setStatus] = useState<"todos" | StatusPagamento>("todos");
  const [competencia, setCompetencia] = useState<string>(""); // YYYY-MM
  const [q, setQ] = useState("");

  // Seleção em massa
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(checked).filter((k) => checked[k]), [checked]);
  const hasSelection = selectedIds.length > 0;

  // Modais
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEdit, setModalEdit] = useState<Pagamento | null>(null);

  // Dataset filtrado
  const dataset = useMemo(() => {
    return pagamentos.filter((p) => {
      const byProf = !selecionado || p.profissionalId === selecionado;
      const byStatus = status === "todos" || p.status === status;
      const byComp = !competencia || p.competencia === competencia;
      const s = q.trim().toLowerCase();
      const bySearch = !s ||
        p.profissional.toLowerCase().includes(s) ||
        (p.obra || "").toLowerCase().includes(s) ||
        p.referencia.toLowerCase().includes(s);
      return byProf && byStatus && byComp && bySearch;
    });
  }, [pagamentos, selecionado, status, competencia, q]);

  const totals = useMemo(() => {
    const sum = (st: StatusPagamento | "all") => dataset
      .filter((p) => (st === "all" ? true : p.status === st))
      .reduce((acc, p) => acc + p.valor, 0);
    return {
      aPagar: sum("a_pagar"),
      pendente: sum("pendente"),
      pago: sum("pago"),
      total: sum("all"),
    };
  }, [dataset]);

  function toggleCheck(id: string, v?: boolean) {
    setChecked((prev) => ({ ...prev, [id]: v ?? !prev[id] }));
  }
  function toggleAll(v: boolean) {
    const next: Record<string, boolean> = {};
    dataset.forEach((p) => (next[p.id] = v));
    setChecked(next);
  }

  function marcarPago(ids: string[]) {
    setPagamentos((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, status: "pago", dataPagamento: new Date().toISOString() } : p));
    setChecked({});
  }

  function remover(ids: string[]) {
    setPagamentos((prev) => prev.filter((p) => !ids.includes(p.id)));
    setChecked({});
  }

  function adicionarPagamentoFromModal() {
    const nomeProf = (document.getElementById("f_prof") as HTMLSelectElement).value;
    const prof = profissionais.find((x) => x.id === nomeProf) || profissionais[0];
    const comp = (document.getElementById("f_comp") as HTMLInputElement).value || "2025-10";
    const valor = parseFloat((document.getElementById("f_valor") as HTMLInputElement).value || "0");
    const ref = (document.getElementById("f_ref") as HTMLInputElement).value || `${comp}_GERAL`;
    const novo: Pagamento = {
      id: `${Date.now()}`,
      profissionalId: prof.id,
      profissional: prof.nome,
      empresa: prof.empresa,
      funcao: prof.funcao,
      referencia: ref,
      obra: (document.getElementById("f_obra") as HTMLInputElement).value || null,
      competencia: comp,
      dataVencimento: (document.getElementById("f_venc") as HTMLInputElement).value || new Date().toISOString(),
      dataPagamento: null,
      horas: parseFloat((document.getElementById("f_horas") as HTMLInputElement).value || "0"),
      valorHora: parseFloat((document.getElementById("f_vh") as HTMLInputElement).value || "0"),
      valor,
      status: (document.getElementById("f_status") as HTMLSelectElement).value as StatusPagamento,
      observacao: (document.getElementById("f_obs") as HTMLTextAreaElement).value || null,
    };
    setPagamentos((prev) => [novo, ...prev]);
    setModalNovo(false);
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pagamentos — Profissionais</h1>
          <p className="text-sm text-zinc-400">Gerenciamento dos pagamentos realizados aos profissionais.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <div className="mr-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200">
              {selectedIds.length} selecionado(s)
            </div>
          )}
          <button onClick={() => setModalNovo(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500">
            <PlusCircle className="h-4 w-4" /> Novo pagamento
          </button>
        </div>
      </div>

      {/* Seletor de profissional + filtros */}
      <ProfessionalPicker profissionais={profissionais} selecionado={selecionado} onSelecionar={setSelecionado} />

      {/* Filtros de status/competência/busca */}
      <Card className="mt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row">
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por referência, obra ou nome" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-9 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <div className="relative w-full md:w-52">
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                <option value="todos">Todos os status</option>
                <option value="a_pagar">A pagar</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-zinc-500" />
            </div>
            <div className="relative w-full md:w-48">
              <input value={competencia} onChange={(e) => setCompetencia(e.target.value)} type="month" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
          </div>

          {hasSelection ? (
            <div className="flex items-center gap-2">
              <button onClick={() => marcarPago(selectedIds)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500">
                <CheckCircle2 className="h-4 w-4" /> Marcar como pago
              </button>
              <button onClick={() => remover(selectedIds)} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-500">
                <Trash2 className="h-4 w-4" /> Remover
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10">
                <Download className="h-4 w-4" /> Exportar CSV
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CalendarRange className="h-4 w-4" /> Filtre por competência para ver lotes de pagamento
            </div>
          )}
        </div>
      </Card>

      {/* Cards de totais */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="A pagar" value={money(totals.aPagar)} sub="Pendentes de execução" tone="indigo" icon={<ArrowDownToLine className="h-6 w-6" />} />
        <StatCard title="Pendente" value={money(totals.pendente)} sub="Aguardando confirmação" tone="amber" icon={<Clock4 className="h-6 w-6" />} />
        <StatCard title="Pago" value={money(totals.pago)} sub="Total liquidado" tone="emerald" icon={<BadgeDollarSign className="h-6 w-6" />} />
      </div>

      {/* Tabela de pagamentos */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Lista de pagamentos</h2>
            <p className="text-xs text-zinc-500">{dataset.length} registo(s) • Total filtrado: <span className="text-white font-medium">{money(totals.total)}</span></p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-400">
                <th className="py-2 pr-3"><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th className="py-2 pr-4">Profissional</th>
                <th className="py-2 pr-4">Empresa</th>
                <th className="py-2 pr-4">Referência</th>
                <th className="py-2 pr-4">Obra</th>
                <th className="py-2 pr-4">Competência</th>
                <th className="py-2 pr-4">Vencimento</th>
                <th className="py-2 pr-4 text-right">Valor</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-0 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dataset.map((p) => (
                <tr key={p.id} className="border-b border-white/5 text-zinc-200 hover:bg-white/5">
                  <td className="py-2 pr-3"><input type="checkbox" checked={!!checked[p.id]} onChange={() => toggleCheck(p.id)} /></td>
                  <td className="py-2 pr-4 font-medium text-white">{p.profissional}</td>
                  <td className="py-2 pr-4">{p.empresa}</td>
                  <td className="py-2 pr-4">{p.referencia}</td>
                  <td className="py-2 pr-4">{p.obra || "—"}</td>
                  <td className="py-2 pr-4">{p.competencia}</td>
                  <td className="py-2 pr-4">{formatDate(p.dataVencimento)}</td>
                  <td className="py-2 pr-4 text-right">{money(p.valor)}</td>
                  <td className="py-2 pr-4">
                    <span className={
                      p.status === "pago"
                        ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20"
                        : p.status === "pendente"
                        ? "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20"
                        : "rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/20"
                    }>
                      {p.status === "pago" ? "Pago" : p.status === "pendente" ? "Pendente" : "A pagar"}
                    </span>
                  </td>
                  <td className="py-2 pr-0">
                    <div className="flex items-center justify-end gap-2">
                      <button title="Recibo" className="rounded-lg border border-white/10 p-2 hover:bg-white/10"><ReceiptText className="h-4 w-4" /></button>
                      <button title="Comprovativo" className="rounded-lg border border-white/10 p-2 hover:bg-white/10"><Upload className="h-4 w-4" /></button>
                      <button title="Editar" onClick={() => setModalEdit(p)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                      <button title="Marcar pago" onClick={() => marcarPago([p.id])} className="rounded-lg border border-emerald-500/30 p-2 text-emerald-400 hover:bg-emerald-500/10"><CheckCircle2 className="h-4 w-4" /></button>
                      <button title="Apagar" onClick={() => remover([p.id])} className="rounded-lg border border-rose-500/30 p-2 text-rose-400 hover:bg-rose-500/10"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!dataset.length && (
                <tr><td colSpan={10} className="py-8 text-center text-zinc-500">Nenhum pagamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Pagamento */}
      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo pagamento" wide footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setModalNovo(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Cancelar</button>
          <button onClick={adicionarPagamentoFromModal} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Salvar</button>
        </div>
      }>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Profissional</label>
            <select id="f_prof" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
              {profissionais.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Competência (YYYY-MM)</label>
            <input id="f_comp" type="month" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Obra (opcional)</label>
            <input id="f_obra" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Vencimento</label>
            <input id="f_venc" type="date" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Horas (opcional)</label>
            <input id="f_horas" type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Valor hora (opcional)</label>
            <input id="f_vh" type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Valor total</label>
            <input id="f_valor" type="number" min="0" step="0.01" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Status</label>
            <select id="f_status" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
              <option value="a_pagar">A pagar</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-zinc-400">Referência</label>
            <input id="f_ref" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-zinc-400">Observação</label>
            <textarea id="f_obs" rows={3} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal open={!!modalEdit} onClose={() => setModalEdit(null)} title="Editar pagamento" wide footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setModalEdit(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Fechar</button>
          <button onClick={() => {
            if (!modalEdit) return;
            const editado: Pagamento = {
              ...modalEdit,
              competencia: (document.getElementById("e_comp") as HTMLInputElement).value || modalEdit.competencia,
              dataVencimento: (document.getElementById("e_venc") as HTMLInputElement).value || modalEdit.dataVencimento,
              valor: parseFloat((document.getElementById("e_valor") as HTMLInputElement).value || `${modalEdit.valor}`),
              status: ((document.getElementById("e_status") as HTMLSelectElement).value as StatusPagamento) || modalEdit.status,
              observacao: (document.getElementById("e_obs") as HTMLTextAreaElement).value || modalEdit.observacao || null,
            };
            setPagamentos((prev) => prev.map((p) => (p.id === editado.id ? editado : p)));
            setModalEdit(null);
          }} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Salvar alterações</button>
        </div>
      }>
        {modalEdit && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Profissional</label>
              <input disabled defaultValue={modalEdit.profissional} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Competência</label>
              <input id="e_comp" type="month" defaultValue={modalEdit.competencia} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Vencimento</label>
              <input id="e_venc" type="date" defaultValue={modalEdit.dataVencimento} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Valor total</label>
              <input id="e_valor" type="number" min="0" step="0.01" defaultValue={modalEdit.valor} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Status</label>
              <select id="e_status" defaultValue={modalEdit.status} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
                <option value="a_pagar">A pagar</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-zinc-400">Observação</label>
              <textarea id="e_obs" defaultValue={modalEdit.observacao ?? ""} rows={3} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
