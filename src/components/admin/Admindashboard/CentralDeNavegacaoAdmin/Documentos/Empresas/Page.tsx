import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  BadgeCheck,
  AlertTriangle,
  XCircle,
  FilePlus,
  Pencil,
  Trash2,
  Eye,
  Upload,
  MessageSquare,
  X,
  Search,
  ChevronDown,
} from "lucide-react";

// =============================================
// Tipos (visual apenas)
// =============================================

type StatusDoc = "valido" | "pendente" | "vencido";

type Documento = {
  id: string;
  nome: string;
  categoria:
    | "Fiscal"
    | "Segurança Social"
    | "Seguros"
    | "Alvará"
    | "Certidões"
    | "Outro";
  status: StatusDoc;
  validade?: string | null; // ISO
  atualizadoEm?: string | null; // ISO
  observacao?: string | null;
};

type Empresa = {
  id: string;
  nome: string;
  nif: string;
  contato: string; // email ou telefone
  setor?: string;
  documentos: Documento[];
};

// =============================================
// Mock — dados de exemplo (substituir por Supabase depois)
// =============================================
const MOCK_EMPRESAS: Empresa[] = [
  {
    id: "e1",
    nome: "Diâmetro Canalizações",
    nif: "516 123 456",
    contato: "comercial@diametro.pt",
    setor: "Construção / Canalizações",
    documentos: [
      {
        id: "d1",
        nome: "Certidão Permanente",
        categoria: "Certidões",
        status: "valido",
        validade: "2025-10-01",
        atualizadoEm: "2024-09-10",
      },
      {
        id: "d2",
        nome: "Segurança Social — Situação Regularizada",
        categoria: "Segurança Social",
        status: "pendente",
        validade: null,
        atualizadoEm: null,
        observacao: "Aguardando comprovativo.",
      },
      {
        id: "d3",
        nome: "Seguro Responsabilidade Civil",
        categoria: "Seguros",
        status: "vencido",
        validade: "2024-03-22",
        atualizadoEm: "2024-03-10",
        observacao: "Renovar apólice.",
      },
    ],
  },
  {
    id: "e2",
    nome: "ConstruFácil SA",
    nif: "505 987 321",
    contato: "financeiro@construfacil.pt",
    setor: "Elétricas e Civil",
    documentos: [
      {
        id: "d4",
        nome: "Alvará de Construção",
        categoria: "Alvará",
        status: "valido",
        validade: "2026-05-30",
        atualizadoEm: "2024-11-01",
      },
      {
        id: "d5",
        nome: "Autoridade Tributária — Situação Regularizada",
        categoria: "Fiscal",
        status: "pendente",
        validade: null,
        atualizadoEm: null,
      },
    ],
  },
  {
    id: "e3",
    nome: "Atlas Obras Lda",
    nif: "514 222 999",
    contato: "contacto@atlas.pt",
    setor: "Obras Públicas",
    documentos: [
      {
        id: "d6",
        nome: "Apólice Acidentes de Trabalho",
        categoria: "Seguros",
        status: "valido",
        validade: "2025-01-12",
        atualizadoEm: "2024-10-04",
      },
    ],
  },
];

// =============================================
// Helpers visuais
// =============================================
function classNames(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

const statusLabel: Record<StatusDoc, string> = {
  valido: "Válido",
  pendente: "Pendente",
  vencido: "Vencido",
};

const statusColors: Record<StatusDoc, string> = {
  valido: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  pendente: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  vencido: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
};

function StatusBadge({ status }: { status: StatusDoc }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        statusColors[status]
      )}
    >
      {status === "valido" && <BadgeCheck className="h-3.5 w-3.5" />}
      {status === "pendente" && <AlertTriangle className="h-3.5 w-3.5" />}
      {status === "vencido" && <XCircle className="h-3.5 w-3.5" />}
      {statusLabel[status]}
    </span>
  );
}

function Card({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={classNames(
        "rounded-2xl border border-white/5 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: number | string;
  tone: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
  };
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-sm">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={classNames("rounded-xl p-3", tones[tone])}>{icon}</div>
      </div>
    </Card>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className={classNames(
              "relative z-10 w-[95%] max-w-xl rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl",
              wide && "max-w-2xl"
            )}
          >
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
// Seletor + filtros + paginação leve
// =============================================
function CompanyPicker({
  empresas,
  selecionada,
  onSelecionar,
}: {
  empresas: Empresa[];
  selecionada?: string | null;
  onSelecionar: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return empresas.filter(
      (e) =>
        !q ||
        e.nome.toLowerCase().includes(q) ||
        e.nif.replace(/\s/g, "").includes(q) ||
        e.setor?.toLowerCase().includes(q)
    );
  }, [empresas, query]);

  useEffect(() => setPage(1), [query]);

  const total = filtradas.length;
  const paginadas = filtradas.slice(0, page * pageSize);
  const hasMore = paginadas.length < total;

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-zinc-300">
          <Building2 className="h-5 w-5" />
          <div>
            <p className="text-sm text-zinc-400">Selecionar empresa</p>
            <p className="text-xs text-zinc-500">Pesquise por nome, NIF ou setor</p>
          </div>
        </div>
        <div className="relative w-full md:max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar empresa..."
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-9 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {paginadas.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelecionar(e.id)}
            className={classNames(
              "group flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-left hover:border-indigo-400/30 hover:bg-zinc-900",
              selecionada === e.id && "ring-2 ring-indigo-500/40"
            )}
          >
            <div>
              <p className="font-medium text-white">{e.nome}</p>
              <p className="text-xs text-zinc-400">NIF {e.nif}</p>
              <p className="mt-1 text-xs text-zinc-500">{e.setor}</p>
            </div>
            <ChevronDown className="h-4 w-4 rotate-270 text-zinc-500 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{total} resultado{total === 1 ? "" : "s"}</span>
        {hasMore ? (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-200 hover:bg-white/10"
          >
            Carregar mais
          </button>
        ) : (
          <span>Fim da lista</span>
        )}
      </div>
    </Card>
  );
}

// =============================================
// Página principal — Documentação das Empresas (visual)
// =============================================
export default function AdminDocumentacaoEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>(MOCK_EMPRESAS);
  const [selecionada, setSelecionada] = useState<string | null>(MOCK_EMPRESAS[0]?.id ?? null);

  // Modais
  const [modalAdd, setModalAdd] = useState(false);
  const [modalEdit, setModalEdit] = useState<Documento | null>(null);
  const [modalObs, setModalObs] = useState<Documento | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Documento | null>(null);

  const emp = useMemo(() => empresas.find((e) => e.id === selecionada) || null, [empresas, selecionada]);

  const stats = useMemo(() => {
    const docs = emp?.documentos || [];
    return {
      valido: docs.filter((d) => d.status === "valido").length,
      pendente: docs.filter((d) => d.status === "pendente").length,
      vencido: docs.filter((d) => d.status === "vencido").length,
    };
  }, [emp]);

  // in-memory handlers
  function addDoc(doc: Documento) {
    if (!emp) return;
    setEmpresas((prev) => prev.map((e) => (e.id === emp.id ? { ...e, documentos: [doc, ...e.documentos] } : e)));
  }
  function editDoc(doc: Documento) {
    if (!emp) return;
    setEmpresas((prev) =>
      prev.map((e) =>
        e.id === emp.id ? { ...e, documentos: e.documentos.map((d) => (d.id === doc.id ? doc : d)) } : e
      )
    );
  }
  function removeDoc(id: string) {
    if (!emp) return;
    setEmpresas((prev) => prev.map((e) => (e.id === emp.id ? { ...e, documentos: e.documentos.filter((d) => d.id !== id) } : e)));
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Documentação das Empresas</h1>
          <p className="text-sm text-zinc-400">Validação e acompanhamento dos documentos enviados pelas empresas.</p>
        </div>
        <button onClick={() => setModalAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500">
          <FilePlus className="h-4 w-4" /> Adicionar novo documento
        </button>
      </div>

      <CompanyPicker empresas={empresas} selecionada={selecionada} onSelecionar={setSelecionada} />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Válidos" value={stats.valido} tone="emerald" icon={<BadgeCheck className="h-6 w-6" />} />
        <StatCard title="Pendentes" value={stats.pendente} tone="amber" icon={<AlertTriangle className="h-6 w-6" />} />
        <StatCard title="Vencidos" value={stats.vencido} tone="rose" icon={<XCircle className="h-6 w-6" />} />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Lista de documentos</h2>
            {emp && (
              <p className="text-xs text-zinc-500">{emp.nome} • NIF {emp.nif} • {emp.setor}</p>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-400">
                <th className="py-2 pr-4">Documento</th>
                <th className="py-2 pr-4">Categoria</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Validade</th>
                <th className="py-2 pr-4">Atualizado em</th>
                <th className="py-2 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {emp?.documentos.map((d) => (
                <tr key={d.id} className="border-b border-white/5 text-zinc-200 hover:bg-white/5">
                  <td className="py-3 pr-4 font-medium text-white">{d.nome}</td>
                  <td className="py-3 pr-4">{d.categoria}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3 pr-4">{formatDate(d.validade)}</td>
                  <td className="py-3 pr-4">{formatDate(d.atualizadoEm)}</td>
                  <td className="py-3 pr-0">
                    <div className="flex items-center justify-end gap-2">
                      <button title="Ver" className="rounded-lg border border-white/10 p-2 hover:bg-white/10">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button title="Carregar arquivo" className="rounded-lg border border-white/10 p-2 hover:bg-white/10">
                        <Upload className="h-4 w-4" />
                      </button>
                      <button title="Observação" onClick={() => setModalObs(d)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10">
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button title="Editar" onClick={() => setModalEdit(d)} className="rounded-lg border border-white/10 p-2 hover:bg-white/10">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button title="Apagar" onClick={() => setConfirmDelete(d)} className="rounded-lg border border-rose-500/30 p-2 text-rose-400 hover:bg-rose-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!emp?.documentos?.length && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">Nenhum documento cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
          Os documentos enviados são analisados pela equipe da Acrobatas para garantir conformidade com os requisitos legais e de segurança.
        </p>
      </Card>

      {/* Modal Adicionar */}
      <Modal
        open={modalAdd}
        onClose={() => setModalAdd(false)}
        title="Adicionar documento"
        wide
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalAdd(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Cancelar</button>
            <button
              onClick={() => {
                if (!emp) return;
                const novo: Documento = {
                  id: `${Date.now()}`,
                  nome: (document.getElementById("f_nome") as HTMLInputElement)?.value?.trim() || "Novo Documento",
                  categoria: ((document.getElementById("f_categoria") as HTMLSelectElement)?.value || "Outro") as Documento["categoria"],
                  status: ((document.getElementById("f_status") as HTMLSelectElement)?.value || "pendente") as StatusDoc,
                  validade: (document.getElementById("f_validade") as HTMLInputElement)?.value || null,
                  atualizadoEm: new Date().toISOString(),
                  observacao: (document.getElementById("f_obs") as HTMLTextAreaElement)?.value || null,
                };
                addDoc(novo);
                setModalAdd(false);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Salvar
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Nome do documento</label>
            <input id="f_nome" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Categoria</label>
            <select id="f_categoria" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
              <option>Fiscal</option>
              <option>Segurança Social</option>
              <option>Seguros</option>
              <option>Alvará</option>
              <option>Certidões</option>
              <option>Outro</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Status</label>
            <select id="f_status" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
              <option value="valido">Válido</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Validade</label>
            <input id="f_validade" type="date" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-zinc-400">Observação</label>
            <textarea id="f_obs" rows={3} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-zinc-950 p-4 text-sm text-zinc-400">
              <Upload className="h-5 w-5" /> Área para upload (somente visual)
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={!!modalEdit}
        onClose={() => setModalEdit(null)}
        title="Editar documento"
        wide
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalEdit(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Fechar</button>
            <button
              onClick={() => {
                if (!emp || !modalEdit) return;
                const editado: Documento = {
                  ...modalEdit,
                  nome: (document.getElementById("e_nome") as HTMLInputElement)?.value || modalEdit.nome,
                  categoria: ((document.getElementById("e_categoria") as HTMLSelectElement)?.value || modalEdit.categoria) as Documento["categoria"],
                  status: ((document.getElementById("e_status") as HTMLSelectElement)?.value || modalEdit.status) as StatusDoc,
                  validade: (document.getElementById("e_validade") as HTMLInputElement)?.value || null,
                  observacao: (document.getElementById("e_obs") as HTMLTextAreaElement)?.value || null,
                  atualizadoEm: new Date().toISOString(),
                };
                editDoc(editado);
                setModalEdit(null);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Salvar alterações
            </button>
          </div>
        }
      >
        {modalEdit && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Nome do documento</label>
              <input id="e_nome" defaultValue={modalEdit.nome} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Categoria</label>
              <select id="e_categoria" defaultValue={modalEdit.categoria} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
                <option>Fiscal</option>
                <option>Segurança Social</option>
                <option>Seguros</option>
                <option>Alvará</option>
                <option>Certidões</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Status</label>
              <select id="e_status" defaultValue={modalEdit.status} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white">
                <option value="valido">Válido</option>
                <option value="pendente">Pendente</option>
                <option value="vencido">Vencido</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Validade</label>
              <input id="e_validade" type="date" defaultValue={modalEdit.validade ?? undefined} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-zinc-400">Observação</label>
              <textarea id="e_obs" defaultValue={modalEdit.observacao ?? ""} rows={3} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white" />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Observação */}
      <Modal
        open={!!modalObs}
        onClose={() => setModalObs(null)}
        title="Observação"
        footer={
          <div className="flex justify-end">
            <button onClick={() => setModalObs(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Fechar</button>
          </div>
        }
      >
        <p className="text-sm text-zinc-300">{modalObs?.observacao || "Sem observações."}</p>
      </Modal>

      {/* Confirmar apagar */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Apagar documento"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Cancelar</button>
            <button
              onClick={() => {
                if (confirmDelete) removeDoc(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
            >
              Apagar
            </button>
          </div>
        }
      >
        <p className="text-sm text-zinc-300">Tem certeza de que deseja apagar <span className="font-medium text-white">{confirmDelete?.nome}</span>?</p>
      </Modal>
    </div>
  );
}
