// src/components/admin/documentacao/GestaoDocumentacaoProfissionais.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserSearch,
  FileText,
  Search,
  ChevronDown,
  Filter as FilterIcon,
  RefreshCcw,
  SortAsc,
  SortDesc,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  Star,
  Eye,
  Upload,
  CheckCircle,
  X,
  Lock,
  Unlock,
  MessageCircle,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

/* ======================
   Config
====================== */

// 👇 mesmo bucket que já usas no resto do projeto
const STORAGE_BUCKET = "public";

/* ======================
   Tipos
====================== */

type ProfResumo = {
  profissional_id: string;
  profissional_nome: string;
  profissional_email: string | null;
  profissional_cidade: string | null;
  profissional_nivel: string | null;
  validos: number;
  pendentes: number;
  vencidos: number;
  reprovados: number;
  obrigatorios_totais: number;
  obrigatorios_validos: number;
  total_docs: number;
  completion: number;
};

type StatusDoc = "Válido" | "Pendente" | "Vencido" | "Reprovado";

type DocAdmin = {
  doc_id: string;
  profissional_id: string;
  profissional_nome: string;
  profissional_email: string | null;
  profissional_cidade: string | null;
  profissional_nivel: string | null;

  tipo_id: string;
  documento_nome: string;
  categoria: string | null;
  obrigatorio: boolean | null;
  responsavel: string | null;

  // flags do tipo
  fixo: boolean | null;
  prof_pode_enviar: boolean | null;
  prof_pode_alterar: boolean | null;

  status: StatusDoc;
  validade: string | null; // ISO date
  arquivo_url: string | null;
  comentario_admin: string | null;
  bloqueado: boolean | null;
  criado_em: string | null;
  atualizado_em: string | null;
};

type SortKey =
  | "documento_nome"
  | "categoria"
  | "status"
  | "validade"
  | "atualizado_em";

/* ======================
   Helpers
====================== */

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT");
}

function diasPara(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return null;
  const hoje = new Date();
  const ms = dt.setHours(0, 0, 0, 0) - hoje.setHours(0, 0, 0, 0);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Status para exibir na UI:
 * - se estiver com validade vencida, mostra "Vencido"
 * - senão, mostra o status que vem da BD
 */
function getDisplayStatus(doc: DocAdmin): StatusDoc {
  const d = diasPara(doc.validade);
  if (d !== null && d < 0) {
    return "Vencido";
  }
  return doc.status;
}

function StatusBadge({ status }: { status: StatusDoc }) {
  const base =
    status === "Válido"
      ? "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300"
      : status === "Pendente"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300"
      : status === "Vencido"
      ? "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-300";

  return (
    <span className={`px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full ${base}`}>
      {status}
    </span>
  );
}

function VencimentoBadge({ validade }: { validade?: string | null }) {
  const d = diasPara(validade);
  if (d === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        <Calendar size={14} /> Sem validade
      </span>
    );
  }
  if (d < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
        <Calendar size={14} /> Vencido há {Math.abs(d)}d
      </span>
    );
  }

  const near10 = d <= 10;
  const near5 = d <= 5;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        near5
          ? "text-red-600 dark:text-red-400"
          : near10
          ? "text-yellow-600 dark:text-yellow-300"
          : "text-zinc-600 dark:text-zinc-200"
      }`}
    >
      <Calendar size={14} /> Vence em {d}d
    </span>
  );
}

function ResumoCard({
  titulo,
  valor,
  icon,
  colorClass,
}: {
  titulo: string;
  valor: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="rounded-2xl p-4 text-center bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 shadow-sm"
    >
      <div className={`flex justify-center mb-1 ${colorClass}`}>{icon}</div>
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{titulo}</p>
      <p className="text-lg sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{valor}</p>
    </motion.div>
  );
}

function labelResponsavel(value: string | null): string {
  if (!value) return "Não definido";
  const v = value.toLowerCase();
  if (v === "profissional") return "Profissional";
  if (v === "empresa") return "Empresa";
  if (v === "acrobatas" || v === "admin") return "Acrobatas";
  return value;
}

/* ======================
   Modais base
====================== */

type BaseModalProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
};

function BaseModal({ title, description, children, onClose }: BaseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative z-10 w-[95%] max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 shadow-2xl p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              {description && (
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---- Modal: Aprovar / Reprovar ---- */

type StatusModalProps = {
  doc: DocAdmin;
  newStatus: StatusDoc;
  onConfirm: (comentario: string | null) => void;
  onClose: () => void;
};

function StatusModal({ doc, newStatus, onConfirm, onClose }: StatusModalProps) {
  const [comentario, setComentario] = useState<string>(doc.comentario_admin ?? "");
  const aprovando = newStatus === "Válido";

  return (
    <BaseModal
      title={aprovando ? "Aprovar documento" : "Reprovar documento"}
      description={doc.documento_nome}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-zinc-50 dark:bg-slate-800/80 border border-zinc-200 dark:border-slate-700 px-3 py-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
          <p>
            O documento será marcado como{" "}
            <span
              className={
                aprovando
                  ? "font-semibold text-emerald-600 dark:text-emerald-400"
                  : "font-semibold text-rose-600 dark:text-rose-400"
              }
            >
              {newStatus}
            </span>{" "}
            para o profissional{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-100">
              {doc.profissional_nome}
            </span>
            .
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Observação (opcional)
          </label>
          <textarea
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/70"
            placeholder="Ex.: Documento validado, tudo em conformidade."
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(comentario.trim() === "" ? null : comentario.trim())}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm text-white flex items-center gap-2 ${
              aprovando ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {aprovando ? <CheckCircle size={16} /> : <X size={16} />}
            {aprovando ? "Marcar como válido" : "Marcar como reprovado"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

/* ---- Modal: Observação ---- */

type CommentModalProps = {
  doc: DocAdmin;
  onConfirm: (comentario: string | null) => void;
  onClose: () => void;
};

function CommentModal({ doc, onConfirm, onClose }: CommentModalProps) {
  const [comentario, setComentario] = useState<string>(doc.comentario_admin ?? "");

  return (
    <BaseModal
      title="Observação do administrador"
      description={doc.documento_nome}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Observação
          </label>
          <textarea
            rows={4}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/70"
            placeholder="Escreva aqui orientações ou pendências sobre este documento."
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(comentario.trim() === "" ? null : comentario.trim())}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <MessageCircle size={16} />
            Guardar observação
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

/* ---- Modal: Editar meta ---- */

type EditDocModalProps = {
  doc: DocAdmin;
  onConfirm: (payload: {
    tipo_documento: string | null;
    categoria: string | null;
    validade: string | null;
  }) => void;
  onClose: () => void;
};

function EditDocModal({ doc, onConfirm, onClose }: EditDocModalProps) {
  const [nome, setNome] = useState<string>(doc.documento_nome);
  const [categoria, setCategoria] = useState<string>(doc.categoria || "");
  const [validade, setValidade] = useState<string>(
    doc.validade ? doc.validade.substring(0, 10) : ""
  );

  return (
    <BaseModal
      title="Editar documento"
      description={doc.profissional_nome}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Nome do documento
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Categoria
            </label>
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Validade (opcional)
            </label>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/70"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onConfirm({
                tipo_documento: nome.trim() === "" ? null : nome.trim(),
                categoria: categoria.trim() === "" ? null : categoria.trim(),
                validade: validade.trim() === "" ? null : validade.trim(),
              })
            }
            className="px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-amber-500 hover:bg-amber-600 flex items-center gap-2"
          >
            <Pencil size={16} />
            Guardar alterações
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

/* ---- Modal: Apagar ---- */

type DeleteModalProps = {
  doc: DocAdmin;
  onConfirm: () => void;
  onClose: () => void;
};

function DeleteModal({ doc, onConfirm, onClose }: DeleteModalProps) {
  return (
    <BaseModal
      title="Apagar documento"
      description={doc.documento_nome}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
          Esta ação irá remover o registo do documento para o profissional{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">
            {doc.profissional_nome}
          </span>
          . Esta operação não pode ser desfeita.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Apagar definitivamente
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

/* ======================
   Componente principal
====================== */

type ModalState =
  | { kind: "status"; doc: DocAdmin; newStatus: StatusDoc }
  | { kind: "comment"; doc: DocAdmin }
  | { kind: "edit"; doc: DocAdmin }
  | { kind: "delete"; doc: DocAdmin }
  | null;

export default function GestaoDocumentacaoProfissionais() {
  /* ---- Profissionais (cards superiores) ---- */
  const [profs, setProfs] = useState<ProfResumo[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);
  const [profQuery, setProfQuery] = useState("");
  const [selectedProf, setSelectedProf] = useState<ProfResumo | null>(null);

  /* ---- Documentos do profissional selecionado ---- */
  const [docs, setDocs] = useState<DocAdmin[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  /* ---- Filtros da lista de documentos ---- */
  const [docSearch, setDocSearch] = useState("");
  const [categoria, setCategoria] = useState<string>("Todos categorias");
  const [status, setStatus] = useState<"Todos status" | StatusDoc>("Todos status");
  const [sortKey, setSortKey] = useState<SortKey>("validade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /* ---- Modais ---- */
  const [modal, setModal] = useState<ModalState>(null);

  /* ---- Upload state ---- */
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  /* ======================
     Fetch – Profissionais
  ====================== */
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setLoadingProfs(true);

      let query = supabase
        .from("admin_docs_prof_counts_v")
        .select("*")
        .order("profissional_nome", {
          ascending: true,
        });

      if (profQuery.trim()) {
        const q = profQuery.trim();
        query = query.or(
          `profissional_nome.ilike.%${q}%,profissional_email.ilike.%${q}%,profissional_cidade.ilike.%${q}%`,
        );
      }

      const { data, error } = await query;
      if (!ativo) return;
      if (error) {
        console.error("Erro ao carregar profissionais:", error);
        setProfs([]);
      } else {
        setProfs(data || []);
        if (data && data.length > 0) {
          const atualAindaExiste = selectedProf
            ? data.some((p) => p.profissional_id === selectedProf.profissional_id)
            : false;
          setSelectedProf(atualAindaExiste ? selectedProf : data[0]);
        } else {
          setSelectedProf(null);
        }
      }
      setLoadingProfs(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profQuery]);

  /* ======================
     Fetch – Documentos do profissional
  ====================== */
  useEffect(() => {
    if (!selectedProf) {
      setDocs([]);
      return;
    }
    let ativo = true;
    async function carregarDocs() {
      setLoadingDocs(true);
      const { data, error } = await supabase
        .from("admin_docs_prof_v")
        .select("*")
        .eq("profissional_id", selectedProf.profissional_id);

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar documentos do profissional:", error);
        setDocs([]);
      } else {
        setDocs(data || []);
      }

      setLoadingDocs(false);
    }

    carregarDocs();
    return () => {
      ativo = false;
    };
  }, [selectedProf]);

  /* ======================
     Filtros em memória
  ====================== */

  const categoriasDisponiveis = useMemo(() => {
    const setCat = new Set<string>();
    docs.forEach((d) => {
      if (d.categoria) setCat.add(d.categoria);
    });
    return Array.from(setCat).sort((a, b) => a.localeCompare(b));
  }, [docs]);

  const docsFiltrados = useMemo(() => {
    let arr = [...docs];

    if (docSearch.trim()) {
      const q = docSearch.toLowerCase();
      arr = arr.filter((d) => {
        const statusDisplay = getDisplayStatus(d);
        return (
          d.documento_nome.toLowerCase().includes(q) ||
          (d.categoria || "").toLowerCase().includes(q) ||
          statusDisplay.toLowerCase().includes(q)
        );
      });
    }

    if (categoria !== "Todos categorias") {
      arr = arr.filter((d) => d.categoria === categoria);
    }

    if (status !== "Todos status") {
      arr = arr.filter((d) => getDisplayStatus(d) === status);
    }

    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortKey === "validade" || sortKey === "atualizado_em") {
        const da = a[sortKey]
          ? new Date(a[sortKey] as string).getTime()
          : sortDir === "asc"
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY;
        const db = b[sortKey]
          ? new Date(b[sortKey] as string).getTime()
          : sortDir === "asc"
          ? Number.POSITIVE_INFINITY
          : Number.NEGATIVE_INFINITY;
        if (da > db) return dir;
        if (da < db) return -dir;
        return 0;
      }

      if (sortKey === "status") {
        const va = getDisplayStatus(a).toLowerCase();
        const vb = getDisplayStatus(b).toLowerCase();
        if (va > vb) return dir;
        if (va < vb) return -dir;
        return 0;
      }

      const va = String(a[sortKey] ?? "").toLowerCase();
      const vb = String(b[sortKey] ?? "").toLowerCase();
      if (va > vb) return dir;
      if (va < vb) return -dir;
      return 0;
    });

    return arr;
  }, [docs, docSearch, categoria, status, sortKey, sortDir]);

  const handleResetFiltros = () => {
    setDocSearch("");
    setCategoria("Todos categorias");
    setStatus("Todos status");
    setSortKey("validade");
    setSortDir("asc");
  };

  /* ======================
     Ações (Admin)
  ====================== */

  async function refreshDocs() {
    if (!selectedProf) return;
    const { data, error } = await supabase
      .from("admin_docs_prof_v")
      .select("*")
      .eq("profissional_id", selectedProf.profissional_id);
    if (error) {
      console.error("Erro ao recarregar docs:", error);
      return;
    }
    setDocs(data || []);
  }

  async function updateDocumento(
    doc: DocAdmin,
    payload: Partial<{
      status: StatusDoc;
      bloqueado: boolean;
      validade: string | null;
      comentario_admin: string | null;
      tipo_documento: string | null;
      categoria: string | null;
      arquivo_url: string | null;
    }>,
  ) {
    const { error } = await supabase
      .from("documentos_acrobatas")
      .update(payload)
      .eq("id", doc.doc_id);

    if (error) {
      console.error("Erro ao atualizar documento:", error);
      alert("Não foi possível atualizar o documento.");
      return;
    }
    await refreshDocs();
  }

  async function deleteDocumento(doc: DocAdmin) {
    const { error } = await supabase
      .from("documentos_acrobatas")
      .delete()
      .eq("id", doc.doc_id);

    if (error) {
      console.error("Erro ao apagar documento:", error);
      alert("Não foi possível apagar o documento.");
      return;
    }
    if (expandedDocId === doc.doc_id) setExpandedDocId(null);
    await refreshDocs();
  }

  function abrirArquivo(url?: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleUploadClick(doc: DocAdmin) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setUploadingDocId(doc.doc_id);

        // 1) separar baseName e extensao
        const originalName = file.name;
        const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = (extMatch?.[1] || "bin").toLowerCase();

        const baseName = originalName.replace(/\.[^.]+$/, "");

        // 2) normalizar nome (sem acentos e sem caracteres estranhos)
        const safeBase = baseName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // tira acentos
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, "-"); // troca qualquer coisa estranha por -

        // 3) path final
        const path = `${doc.profissional_id}/${doc.tipo_id}-${Date.now()}-${safeBase}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, {
            upsert: true,
          });

        if (uploadError || !uploadData) {
          console.error("Erro no upload:", uploadError);
          alert("Não foi possível carregar o ficheiro.");
          return;
        }

        const { data: publicData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadData.path);

        const publicUrl = publicData.publicUrl;

        // 4) grava URL pública no registo do documento
        await updateDocumento(doc, { arquivo_url: publicUrl });
      } finally {
        setUploadingDocId(null);
        input.value = "";
      }
    };

    input.click();
  }

  async function onToggleBloqueio(doc: DocAdmin) {
    const novo = !doc.bloqueado;
    await updateDocumento(doc, { bloqueado: novo });
  }

  /* ======================
     Render
  ====================== */

  return (
    <div className="p-4 sm:p-8 text-zinc-900 dark:text-zinc-50">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-2">
        <UserSearch className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">
          Gestão de Documentação — Profissionais
        </h1>
      </div>
      <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mb-6">
        Encontre profissionais, valide documentos e garanta conformidade legal em tempo real.
      </p>

      {/* Search de profissionais + cards */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              value={profQuery}
              onChange={(e) => setProfQuery(e.target.value)}
              placeholder="Pesquisar profissional por nome, e-mail ou cidade..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/70"
            />
          </div>
          <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            {loadingProfs ? "Carregando..." : `${profs.length} resultado(s)`}
          </span>
        </div>

        {/* Cards de profissionais */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {loadingProfs && profs.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
              A carregar profissionais…
            </div>
          ) : profs.length === 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 py-3">
              Nenhum profissional encontrado com este filtro.
            </div>
          ) : (
            profs.map((p) => {
              const ativo = selectedProf?.profissional_id === p.profissional_id;
              return (
                <motion.button
                  key={p.profissional_id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedProf(p)}
                  className={`min-w-[260px] rounded-2xl border px-4 py-3 text-left transition shadow-sm ${
                    ativo
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500"
                      : "bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-700 hover:border-blue-400/70"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div>
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        {p.profissional_nome || "Sem nome"}
                        {p.profissional_nivel && (
                          <span className="text-[10px] px-2 py-[2px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-800/60 dark:text-blue-100">
                            {p.profissional_nivel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {p.profissional_email}
                      </p>
                      {p.profissional_cidade && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-[2px]">
                          <MapPin size={12} /> {p.profissional_cidade}
                        </p>
                      )}
                    </div>
                    <Star size={16} className="text-yellow-400 shrink-0" />
                  </div>

                  <div className="flex gap-1 flex-wrap text-[10px]">
                    <span className="px-2 py-[2px] rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                      Válidos {p.validos}
                    </span>
                    <span className="px-2 py-[2px] rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                      Pendentes {p.pendentes}
                    </span>
                    <span className="px-2 py-[2px] rounded-full bg-rose-50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                      Vencidos {p.vencidos}
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Resumo do profissional selecionado */}
      {selectedProf && (
        <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Profissional selecionado
              </p>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {selectedProf.profissional_nome}
                </h2>
                {selectedProf.profissional_nivel && (
                  <span className="text-[11px] px-2 py-[2px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-800/60 dark:text-blue-100">
                    {selectedProf.profissional_nivel}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedProf.profissional_email || "Sem e-mail"}{" "}
                {selectedProf.profissional_cidade && `• ${selectedProf.profissional_cidade}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            <ResumoCard
              titulo="Válidos"
              valor={selectedProf.validos}
              icon={<CheckCircle2 size={18} />}
              colorClass="text-emerald-500"
            />
            <ResumoCard
              titulo="Pendentes"
              valor={selectedProf.pendentes}
              icon={<AlertTriangle size={18} />}
              colorClass="text-amber-500"
            />
            <ResumoCard
              titulo="Vencidos"
              valor={selectedProf.vencidos}
              icon={<XCircle size={18} />}
              colorClass="text-rose-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                Completude de documentos obrigatórios
              </span>
              <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {selectedProf.completion}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-zinc-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${selectedProf.completion}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Barra de filtros de documentos */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Pesquisar documento..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500/70"
            />
          </div>

          {/* filtros desktop */}
          <div className="hidden sm:flex items-center gap-2">
            {/* categoria */}
            <div className="relative">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option>Todos categorias</option>
                {categoriasDisponiveis.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>

            {/* status */}
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="Todos status">Todos status</option>
                <option value="Válido">Válidos</option>
                <option value="Pendente">Pendentes</option>
                <option value="Vencido">Vencidos</option>
                <option value="Reprovado">Reprovados</option>
              </select>
              <FilterIcon
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>

            {/* sort key */}
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="validade">Ordenar por validade</option>
                <option value="status">Ordenar por status</option>
                <option value="documento_nome">Ordenar por nome</option>
                <option value="categoria">Ordenar por categoria</option>
                <option value="atualizado_em">Ordenar por atualização</option>
              </select>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                {sortDir === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
              </div>
            </div>

            {/* inverte ordem */}
            <button
              onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
              className="px-2 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800"
              title="Inverter ordem"
            >
              {sortDir === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
            </button>

            {/* reset */}
            <button
              onClick={handleResetFiltros}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 text-sm flex items-center gap-1"
            >
              <RefreshCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-100 dark:border-slate-700/80">
          <h2 className="flex items-center gap-2 text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
            <FileText size={18} className="text-blue-500" />
            Documentos do profissional
          </h2>
        </div>

        {loadingDocs ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">A carregar documentos…</div>
        ) : !selectedProf ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            Selecione um profissional para ver a documentação.
          </div>
        ) : docsFiltrados.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum documento encontrado para este profissional com os filtros atuais.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-zinc-100 dark:border-slate-700/80 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-2">Categoria</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Validade</th>
                    <th className="py-3 px-2">Atualizado</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {docsFiltrados.map((doc) => {
                    const isExpanded = expandedDocId === doc.doc_id;
                    const isUploading = uploadingDocId === doc.doc_id;
                    const displayStatus = getDisplayStatus(doc);

                    return (
                      <React.Fragment key={doc.doc_id}>
                        <tr className="border-b border-zinc-100 dark:border-slate-800/80 hover:bg-zinc-50 dark:hover:bg-slate-800/60 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() =>
                                  setExpandedDocId(isExpanded ? null : doc.doc_id)
                                }
                                className="mt-1 p-1 rounded-full border border-transparent hover:border-zinc-300 dark:hover:border-slate-600 hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-500"
                                aria-label={
                                  isExpanded ? "Recolher detalhes" : "Ver detalhes do documento"
                                }
                              >
                                <ChevronDown
                                  size={16}
                                  className={`transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`font-medium ${
                                      doc.arquivo_url
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-zinc-900 dark:text-zinc-50"
                                    }`}
                                  >
                                    {doc.documento_nome}
                                  </span>
                                  {doc.obrigatorio && (
                                    <span className="text-[10px] px-2 py-[2px] rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-800/60 dark:text-emerald-100">
                                      Obrigatório
                                    </span>
                                  )}
                                  {doc.fixo && (
                                    <span className="text-[10px] px-2 py-[2px] rounded-full bg-sky-100 text-sky-700 dark:bg-sky-800/60 dark:text-sky-100">
                                      Fixo
                                    </span>
                                  )}
                                </div>
                                {doc.comentario_admin && (
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Obs.: {doc.comentario_admin}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2">{doc.categoria || "—"}</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={displayStatus} />
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col gap-1">
                              <span>{formatDate(doc.validade)}</span>
                              <VencimentoBadge validade={doc.validade} />
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {doc.atualizado_em ? formatDate(doc.atualizado_em) : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                              {/* ver */}
                              <button
                                title={doc.arquivo_url ? "Ver documento" : "Sem ficheiro"}
                                disabled={!doc.arquivo_url}
                                onClick={() => abrirArquivo(doc.arquivo_url)}
                                className={`p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700 ${
                                  !doc.arquivo_url ? "opacity-40 cursor-not-allowed" : ""
                                }`}
                              >
                                <Eye size={18} className="text-blue-500" />
                              </button>

                              {/* upload */}
                              <button
                                title="Enviar / atualizar ficheiro"
                                onClick={() => handleUploadClick(doc)}
                                disabled={isUploading}
                                className={`p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700 ${
                                  isUploading ? "opacity-60 cursor-wait" : ""
                                }`}
                              >
                                <Upload size={18} className="text-emerald-500" />
                              </button>

                              {/* aprovar */}
                              <button
                                title="Marcar como aprovado"
                                onClick={() =>
                                  setModal({ kind: "status", doc, newStatus: "Válido" })
                                }
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700"
                              >
                                <CheckCircle size={18} className="text-emerald-500" />
                              </button>

                              {/* reprovar */}
                              <button
                                title="Marcar como reprovado"
                                onClick={() =>
                                  setModal({ kind: "status", doc, newStatus: "Reprovado" })
                                }
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700"
                              >
                                <X size={18} className="text-rose-500" />
                              </button>

                              {/* bloqueio */}
                              <button
                                title={doc.bloqueado ? "Documento bloqueado" : "Bloquear documento"}
                                onClick={() => onToggleBloqueio(doc)}
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700"
                              >
                                {doc.bloqueado ? (
                                  <Lock size={18} className="text-zinc-500" />
                                ) : (
                                  <Unlock size={18} className="text-zinc-500" />
                                )}
                              </button>

                              {/* comentário */}
                              <button
                                title="Observação do administrador"
                                onClick={() => setModal({ kind: "comment", doc })}
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700"
                              >
                                <MessageCircle size={18} className="text-blue-500" />
                              </button>

                              {/* editar meta */}
                              <button
                                title="Editar metadados"
                                onClick={() => setModal({ kind: "edit", doc })}
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700"
                              >
                                <Pencil size={18} className="text-amber-500" />
                              </button>

                              {/* apagar */}
                              <button
                                title="Apagar documento"
                                onClick={() => setModal({ kind: "delete", doc })}
                                className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-slate-700"
                              >
                                <Trash2 size={18} className="text-rose-500" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Linha expandida */}
                        {isExpanded && (
                          <tr className="border-b border-zinc-100 dark:border-slate-800/80">
                            <td colSpan={6} className="px-6 pb-4">
                              <div className="mt-2 rounded-2xl border border-zinc-200 dark:border-slate-700 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 shadow-inner px-4 py-4">
                                <div className="grid gap-4 md:grid-cols-4 text-xs sm:text-sm">
                                  {/* Documento atual */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      Documento atual
                                    </p>
                                    {doc.arquivo_url ? (
                                      <button
                                        onClick={() => abrirArquivo(doc.arquivo_url)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                      >
                                        <FileText size={14} />
                                        Abrir ficheiro enviado
                                      </button>
                                    ) : (
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Nenhum ficheiro enviado ainda para este tipo de documento.
                                      </p>
                                    )}
                                  </div>

                                  {/* Responsável */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      Responsável
                                    </p>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-200">
                                      O responsável por este documento é{" "}
                                      <span className="font-medium">
                                        {labelResponsavel(doc.responsavel)}
                                      </span>
                                      .
                                    </p>
                                    {doc.obrigatorio && (
                                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                        Este documento é obrigatório para este profissional.
                                      </p>
                                    )}
                                  </div>

                                  {/* Permissões */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      Permissões do profissional
                                    </p>
                                    <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-200">
                                      <li>
                                        • Pode enviar:{" "}
                                        <span className="font-medium">
                                          {doc.prof_pode_enviar ? "Sim" : "Não"}
                                        </span>
                                      </li>
                                      <li>
                                        • Pode alterar depois de enviado:{" "}
                                        <span className="font-medium">
                                          {doc.prof_pode_alterar ? "Sim" : "Não"}
                                        </span>
                                      </li>
                                      <li>
                                        • Documento fixo:{" "}
                                        <span className="font-medium">
                                          {doc.fixo ? "Sim" : "Não"}
                                        </span>
                                      </li>
                                    </ul>
                                  </div>

                                  {/* Observação */}
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                      Observação do administrador
                                    </p>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-200 min-h-[2.5rem]">
                                      {doc.comentario_admin
                                        ? doc.comentario_admin
                                        : "Nenhuma observação adicionada ainda."}
                                    </p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      <button
                                        onClick={() => setModal({ kind: "comment", doc })}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] border border-zinc-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 hover:bg-zinc-100 dark:hover:bg-slate-800"
                                      >
                                        <MessageCircle size={13} />
                                        Editar observação
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile – cards */}
            <div className="sm:hidden divide-y divide-zinc-100 dark:divide-slate-800">
              {docsFiltrados.map((doc) => {
                const displayStatus = getDisplayStatus(doc);
                return (
                  <div key={doc.doc_id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <p
                          className={`font-medium text-sm ${
                            doc.arquivo_url
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-zinc-900 dark:text-zinc-50"
                          }`}
                        >
                          {doc.documento_nome}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {doc.categoria || "Sem categoria"}
                        </p>
                        {doc.comentario_admin && (
                          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                            Obs.: {doc.comentario_admin}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={displayStatus} />
                    </div>

                    <div className="mt-2 text-xs flex justify-between">
                      <VencimentoBadge validade={doc.validade} />
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Atualizado: {doc.atualizado_em ? formatDate(doc.atualizado_em) : "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-blue-600 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!doc.arquivo_url}
                        onClick={() => abrirArquivo(doc.arquivo_url)}
                      >
                        <Eye size={14} /> Ver
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-emerald-600 text-white text-xs"
                        onClick={() => handleUploadClick(doc)}
                      >
                        <Upload size={14} /> Enviar
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-emerald-700 text-white text-xs"
                        onClick={() => setModal({ kind: "status", doc, newStatus: "Válido" })}
                      >
                        <CheckCircle size={14} /> Aprovar
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-rose-600 text-white text-xs"
                        onClick={() => setModal({ kind: "status", doc, newStatus: "Reprovado" })}
                      >
                        <X size={14} /> Reprovar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Render dos modais */}
      {modal && modal.kind === "status" && (
        <StatusModal
          doc={modal.doc}
          newStatus={modal.newStatus}
          onConfirm={async (comentario) => {
            await updateDocumento(modal.doc, {
              status: modal.newStatus,
              comentario_admin: comentario ?? null,
            });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal && modal.kind === "comment" && (
        <CommentModal
          doc={modal.doc}
          onConfirm={async (comentario) => {
            await updateDocumento(modal.doc, { comentario_admin: comentario ?? null });
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal && modal.kind === "edit" && (
        <EditDocModal
          doc={modal.doc}
          onConfirm={async (payload) => {
            await updateDocumento(modal.doc, payload);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal && modal.kind === "delete" && (
        <DeleteModal
          doc={modal.doc}
          onConfirm={async () => {
            await deleteDocumento(modal.doc);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
