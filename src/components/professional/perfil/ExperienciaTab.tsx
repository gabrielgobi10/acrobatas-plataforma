"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  BadgeCheck,
  Dumbbell,
  Clock3,
  X,
  Loader2,
  Search,
  Filter,
  FileText,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =========================================================
   Config / Consts
========================================================= */
const BUCKET = "comprovantes"; // bucket privado
const MAX_MB = 10;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/* =========================================================
   Tipos
========================================================= */
type Categoria = "curso" | "certificado" | "treinamento";
type StatusValidacao = "em_analise" | "aprovado" | "reprovado";

type Experiencia = {
  id: string;
  categoria: Categoria;
  nome: string;
  instituicao?: string | null;
  horas?: number | null;
  ano?: number | null;
  validade?: string | null; // ISO (YYYY-MM-01, YYYY-MM, ou YYYY)
  comprovante_url?: string | null; // path do storage (privado) OU URL pública
  status_validacao?: StatusValidacao | null;
  created_at?: string | null;
};

/* =========================================================
   Utilidades
========================================================= */
const CATEGORIAS_LABEL: Record<Categoria, string> = {
  curso: "Curso",
  certificado: "Certificado",
  treinamento: "Treinamento",
};

const CategoriaIcon: Record<Categoria, any> = {
  curso: GraduationCap,
  certificado: BadgeCheck,
  treinamento: Dumbbell,
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function maskValidity(val?: string | null) {
  if (!val) return null;
  const parts = val.split("-");
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function statusValidacaoLabel(s?: StatusValidacao | null) {
  if (!s) return "";
  if (s === "em_analise") return "Em análise";
  if (s === "aprovado") return "Aprovado";
  if (s === "reprovado") return "Reprovado";
  return s;
}

function statusValidacaoClasses(s?: StatusValidacao | null) {
  if (s === "aprovado") {
    return "bg-emerald-500/10 border-emerald-300/60 text-emerald-700 dark:text-emerald-300";
  }
  if (s === "reprovado") {
    return "bg-red-500/10 border-red-300/60 text-red-700 dark:text-red-300";
  }
  // em_analise ou null
  return "bg-amber-500/10 border-amber-300/60 text-amber-700 dark:text-amber-300";
}

/** Upload no Storage (bucket privado). Retorna apenas o PATH salvo */
async function uploadComprovanteAndReturnPath(file: File, userId: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/experiencias/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
  return path; // importante: gravar só o path, pois o bucket é privado
}

/** Abre comprovante: se for URL externa abre direto; se for PATH do bucket, gera URL assinada */
async function openComprovante(comprovante_url: string) {
  try {
    if (/^https?:\/\//i.test(comprovante_url)) {
      window.open(comprovante_url, "_blank");
      return;
    }
    // é path do storage privado
    const { data, error } = await supabase
      .storage
      .from(BUCKET)
      .createSignedUrl(comprovante_url, 600); // 10 minutos

    if (error) throw error;
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  } catch {
    alert("Não foi possível abrir o comprovante.");
  }
}

/* =========================================================
   Modal base
========================================================= */
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      aria-modal
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-t-2xl sm:rounded-2xl shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200/70 dark:border-white/10">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="p-4 border-t border-neutral-200/70 dark:border-white/10 flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Chips de Filtro
========================================================= */
function FiltroChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm transition",
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white"
          : "border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10"
      )}
    >
      <Filter size={14} />
      {children}
    </button>
  );
}

/* =========================================================
   Skeleton
========================================================= */
function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 animate-pulse">
      <div className="h-4 w-56 bg-neutral-200 dark:bg-white/10 rounded mb-2" />
      <div className="h-3 w-72 bg-neutral-200 dark:bg-white/10 rounded" />
    </div>
  );
}

/* =========================================================
   Formulário de experiência
========================================================= */
function FormExperiencia({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Partial<Experiencia>;
  onSubmit: (
    data: Omit<Experiencia, "id" | "created_at" | "status_validacao"> & {
      __file?: File | null;
    }
  ) => void;
  submitting?: boolean;
}) {
  const [categoria, setCategoria] = useState<Categoria>(
    (initial?.categoria as Categoria) || "curso"
  );
  const [nome, setNome] = useState(initial?.nome || "");
  const [instituicao, setInstituicao] = useState(initial?.instituicao || "");
  const [horas, setHoras] = useState<number | undefined>(
    initial?.horas === null ? undefined : initial?.horas
  );
  const [ano, setAno] = useState<number | undefined>(
    initial?.ano === null ? undefined : initial?.ano
  );
  const [validade, setValidade] = useState(initial?.validade?.slice(0, 7) || ""); // YYYY-MM
  const [comprovanteUrl, setComprovanteUrl] = useState(
    initial?.comprovante_url || ""
  );

  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = nome.trim().length > 2;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          categoria,
          nome: nome.trim(),
          instituicao: instituicao?.trim() || null,
          horas: typeof horas === "number" ? horas : null,
          ano: typeof ano === "number" ? ano : null,
          validade: validade ? `${validade}-01` : null, // salva como YYYY-MM-01
          comprovante_url: comprovanteUrl?.trim() || null,
          __file: file,
        });
      }}
    >
      {/* Categoria */}
      <div className="grid grid-cols-3 gap-2">
        {(["curso", "certificado", "treinamento"] as Categoria[]).map((c) => {
          const Icon = CategoriaIcon[c];
          const active = categoria === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              className={classNames(
                "flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm",
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5"
              )}
            >
              <Icon size={16} />
              {CATEGORIAS_LABEL[c]}
            </button>
          );
        })}
      </div>

      {/* Nome */}
      <div>
        <label className="block text-sm mb-1">Nome</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: NR-35 – Trabalho em Altura"
          className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Instituição */}
      <div>
        <label className="block text-sm mb-1">Instituição</label>
        <input
          value={instituicao || ""}
          onChange={(e) => setInstituicao(e.target.value)}
          placeholder="Ex.: Instituto Técnico de Segurança"
          className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Linha horas/ano/validade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1">Carga horária (h)</label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={typeof horas === "number" ? horas : ""}
            onChange={(e) =>
              setHoras(
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
            placeholder="Ex.: 16"
            className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Ano</label>
          <input
            type="number"
            min={1900}
            max={2100}
            inputMode="numeric"
            value={typeof ano === "number" ? ano : ""}
            onChange={(e) =>
              setAno(
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
            placeholder="Ex.: 2024"
            className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Validade</label>
          <input
            type="month"
            value={validade || ""}
            onChange={(e) => setValidade(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-neutral-500 mt-1">
            Opcional (aplicável a certificados).
          </p>
        </div>
      </div>

      {/* Comprovante (upload OU URL) */}
      <div className="space-y-2">
        <label className="block text-sm">Comprovante (upload ou URL)</label>

        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-white/10 p-3 flex items-center justify-between gap-3 bg-white dark:bg-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-white/10 flex items-center justify-center">
              {file ? (
                file.type === "application/pdf" ? (
                  <FileText size={16} />
                ) : (
                  <ImageIcon size={16} />
                )
              ) : (
                <FileText size={16} className="opacity-60" />
              )}
            </div>
            <div className="truncate">
              <p className="text-sm truncate">
                {file ? (
                  <>
                    <span className="font-medium">{file.name}</span>{" "}
                    <span className="text-neutral-500">
                      ({Math.ceil(file.size / 1024 / 1024)} MB)
                    </span>
                  </>
                ) : (
                  <span className="text-neutral-500">
                    PDF, JPG, PNG, WEBP (até {MAX_MB} MB)
                  </span>
                )}
              </p>
              {uploadError && (
                <p className="text-sm text-red-600 mt-1">{uploadError}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {file && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-neutral-50 dark:hover:bg-white/10"
                onClick={() => setFile(null)}
              >
                Remover
              </button>
            )}
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border text-sm hover:bg-neutral-50 dark:hover:bg-white/10"
              onClick={() => document.getElementById("file-input-exp")?.click()}
            >
              Selecionar
            </button>
            <input
              id="file-input-exp"
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED.join(",")}
              className="hidden"
              onChange={(e) => {
                setUploadError(null);
                const f = e.target.files?.[0];
                if (!f) return;
                if (!ACCEPTED.includes(f.type)) {
                  setUploadError("Formato não suportado.");
                  return;
                }
                if (f.size > MAX_MB * 1024 * 1024) {
                  setUploadError(`Arquivo maior que ${MAX_MB} MB.`);
                  return;
                }
                setFile(f);
              }}
            />
          </div>
        </div>

        <input
          value={comprovanteUrl || ""}
          onChange={(e) => setComprovanteUrl(e.target.value)}
          placeholder="https://… (opcional, se não enviar arquivo)"
          className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-neutral-500">
          Envie um arquivo <b>ou</b> informe uma URL pública.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={!canSubmit || !!submitting}
          className={classNames(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700",
            (!canSubmit || submitting) && "opacity-60 cursor-not-allowed"
          )}
        >
          {submitting && <Loader2 className="animate-spin" size={16} />}
          Salvar
        </button>
      </div>
    </form>
  );
}

/* =========================================================
   Item da lista
========================================================= */
function ItemExperiencia({
  item,
  onEdit,
  onDelete,
}: {
  item: Experiencia;
  onEdit: (exp: Experiencia) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = CategoriaIcon[item.categoria];
  return (
    <div className="rounded-2xl border border-neutral-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 shrink-0">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">{item.nome}</p>

            {/* Categoria */}
            <span
              className={classNames(
                "text-xs px-2 py-0.5 rounded-full border",
                item.categoria === "curso" &&
                  "border-blue-300/60 text-blue-700 dark:text-blue-300",
                item.categoria === "certificado" &&
                  "border-amber-300/60 text-amber-700 dark:text-amber-300",
                item.categoria === "treinamento" &&
                  "border-emerald-300/60 text-emerald-700 dark:text-emerald-300"
              )}
            >
              {CATEGORIAS_LABEL[item.categoria]}
            </span>

            {/* Status de validação */}
            <span
              className={classNames(
                "text-xs px-2 py-0.5 rounded-full border",
                statusValidacaoClasses(item.status_validacao || "em_analise")
              )}
            >
              {statusValidacaoLabel(item.status_validacao || "em_analise")}
            </span>
          </div>

          {item.instituicao && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300 truncate">
              {item.instituicao}
            </p>
          )}
          <div className="text-sm text-neutral-600 dark:text-neutral-300 flex gap-3 flex-wrap">
            {typeof item.horas === "number" && <span>{item.horas}h</span>}
            {item.ano && <span>{item.ano}</span>}
            {item.validade && (
              <span>Válido até {maskValidity(item.validade)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="sm:ml-auto flex items-center gap-1 pl-2 border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-white/10">
        {item.comprovante_url && (
          <button
            onClick={() => openComprovante(item.comprovante_url!)}
            className="px-3 py-1.5 text-sm rounded-xl border border-neutral-200/70 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 mr-1"
          >
            Ver comprovante
          </button>
        )}
        <button
          onClick={() => onEdit(item)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
          aria-label="Editar"
          title="Editar"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-red-500 opacity-80 hover:opacity-100"
          aria-label="Remover"
          title="Remover"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Cards de resumo
========================================================= */
function CardsResumo({
  cursos,
  certificados,
  treinamentos,
  horas,
  onAdd,
}: {
  cursos: number;
  certificados: number;
  treinamentos: number;
  horas: number;
  onAdd: () => void;
}) {
  const items = [
    { label: "Cursos", value: cursos, icon: GraduationCap },
    { label: "Certificados", value: certificados, icon: BadgeCheck },
    { label: "Treinamentos", value: treinamentos, icon: Dumbbell },
    { label: "Horas declaradas", value: `${horas}h`, icon: Clock3 },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="h-full rounded-2xl border border-neutral-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-white/10">
              <it.icon className="text-neutral-700 dark:text-neutral-200" size={18} />
            </div>
            <div className="leading-tight">
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {it.label}
              </p>
              <p className="text-xl font-semibold">{it.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={18} />
          Adicionar
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Página principal
========================================================= */
export default function ExperienciaTab() {
  const { user } = useAuth();
  const userId = user?.id || "";

  const [loading, setLoading] = useState(true);
  const [lista, setLista] = useState<Experiencia[]>([]);
  const [resumo, setResumo] = useState({
    cursos: 0,
    certificados: 0,
    treinamentos: 0,
    horas: 0,
  });

  const [modalAdd, setModalAdd] = useState(false);
  const [editItem, setEditItem] = useState<Experiencia | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Categoria | "todos">("todos");

  // Carregamento inicial (RLS filtra pelo usuário)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Resumo agregado
        const { data: resumoData, error: rErr } = await supabase
          .from("experiencias_resumo")
          .select("*")
          .maybeSingle();
        if (rErr) throw rErr;

        if (mounted && resumoData) {
          setResumo({
            cursos: resumoData.cursos ?? 0,
            certificados: resumoData.certificados ?? 0,
            treinamentos: resumoData.treinamentos ?? 0,
            horas: resumoData.horas ?? 0,
          });
        }

        // Lista (confia no RLS da tabela)
        const { data: expData, error: expErr } = await supabase
          .from("experiencias")
          .select("*")
          .order("created_at", { ascending: false });
        if (expErr) throw expErr;

        if (mounted) setLista(expData ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const filtrados = useMemo(() => {
    let xs = [...lista];
    if (filtro !== "todos") xs = xs.filter((x) => x.categoria === filtro);
    if (q.trim()) {
      const s = q.toLowerCase();
      xs = xs.filter(
        (x) =>
          x.nome.toLowerCase().includes(s) ||
          (x.instituicao || "").toLowerCase().includes(s)
      );
    }
    return xs;
  }, [lista, q, filtro]);

  async function reloadResumo() {
    const { data, error } = await supabase
      .from("experiencias_resumo")
      .select("*")
      .maybeSingle();
    if (!error && data) {
      setResumo({
        cursos: data.cursos ?? 0,
        certificados: data.certificados ?? 0,
        treinamentos: data.treinamentos ?? 0,
        horas: data.horas ?? 0,
      });
    }
  }

  async function addExp(
    form: Omit<Experiencia, "id" | "created_at" | "status_validacao"> & {
      __file?: File | null;
    }
  ) {
    setSubmitting(true);
    try {
      let finalUrl = form.comprovante_url || null;

      // se vier arquivo, faz upload e guarda o PATH
      if (form.__file && userId) {
        finalUrl = await uploadComprovanteAndReturnPath(form.__file, userId);
      }

      // RPC segura (RLS + vínculo em profissionais)
      const { data, error } = await supabase.rpc("experiencia_add", {
        p_categoria: form.categoria,
        p_nome: form.nome,
        p_instituicao: form.instituicao,
        p_horas: form.horas,
        p_ano: form.ano,
        p_validade: form.validade,
        p_comprovante_url: finalUrl,
        p_numero_certificado: null,
      });
      if (error) throw error;

      if (data) {
        setLista((prev) => [data as Experiencia, ...prev]);
      } else {
        const { data: expData } = await supabase
          .from("experiencias")
          .select("*")
          .order("created_at", { ascending: false });
        setLista(expData ?? []);
      }

      await reloadResumo();
      setModalAdd(false);
    } catch (e) {
      console.error(e);
      alert("Falha ao salvar. Verifique os dados e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(
    form: Omit<Experiencia, "id" | "created_at" | "status_validacao"> & {
      __file?: File | null;
    }
  ) {
    if (!editItem) return;
    setSubmitting(true);
    try {
      let finalUrl = form.comprovante_url || editItem.comprovante_url || null;
      if (form.__file && userId) {
        finalUrl = await uploadComprovanteAndReturnPath(form.__file, userId);
      }

      const payload: Omit<
        Experiencia,
        "id" | "created_at" | "status_validacao"
      > = {
        categoria: form.categoria,
        nome: form.nome,
        instituicao: form.instituicao || null,
        horas: form.horas ?? null,
        ano: form.ano ?? null,
        validade: form.validade || null,
        comprovante_url: finalUrl,
      };

      const { data, error } = await supabase
        .from("experiencias")
        .update(payload)
        .eq("id", editItem.id)
        .select()
        .maybeSingle();
      if (error) throw error;

      if (data) {
        setLista((prev) =>
          prev.map((x) => (x.id === editItem.id ? (data as any) : x))
        );
      }
      await reloadResumo();
      setEditItem(null);
    } catch (e) {
      console.error(e);
      alert("Falha ao salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeExp(id: string) {
    if (!window.confirm("Remover este registro?")) return;
    try {
      const { error } = await supabase.from("experiencias").delete().eq("id", id);
      if (error) throw error;
      setLista((prev) => prev.filter((x) => x.id !== id));
      await reloadResumo();
    } catch (e) {
      console.error(e);
      alert("Falha ao remover. Tente novamente.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho + Resumo */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cursos & certificados</h2>
      </div>

      <CardsResumo
        cursos={resumo.cursos}
        certificados={resumo.certificados}
        treinamentos={resumo.treinamentos}
        horas={resumo.horas}
        onAdd={() => setModalAdd(true)}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <FiltroChip active={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos
          </FiltroChip>
          <FiltroChip active={filtro === "curso"} onClick={() => setFiltro("curso")}>
            {CATEGORIAS_LABEL.curso}
          </FiltroChip>
          <FiltroChip
            active={filtro === "certificado"}
            onClick={() => setFiltro("certificado")}
          >
            {CATEGORIAS_LABEL.certificado}
          </FiltroChip>
          <FiltroChip
            active={filtro === "treinamento"}
            onClick={() => setFiltro("treinamento")}
          >
            {CATEGORIAS_LABEL.treinamento}
          </FiltroChip>
        </div>

        <div className="relative" role="search" aria-label="buscar experiência">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou instituição…"
            className="pl-9 pr-3 py-2 rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-96"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-white/10 p-8 text-center text-neutral-600 dark:text-neutral-300">
          Nenhum registro encontrado.{" "}
          <button
            onClick={() => setModalAdd(true)}
            className="underline underline-offset-4"
          >
            Adicionar agora
          </button>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtrados.map((item) => (
            <ItemExperiencia
              key={item.id}
              item={item}
              onEdit={setEditItem}
              onDelete={removeExp}
            />
          ))}
        </div>
      )}

      {/* FAB Mobile */}
      <button
        onClick={() => setModalAdd(true)}
        className="fixed bottom-5 right-5 sm:hidden shadow-xl rounded-full p-4 bg-blue-600 text-white"
        aria-label="Adicionar experiência"
      >
        <Plus size={20} />
      </button>

      {/* Modal Adicionar */}
      <Modal
        open={modalAdd}
        onClose={() => setModalAdd(false)}
        title="Adicionar experiência"
        footer={null}
      >
        <FormExperiencia onSubmit={addExp} submitting={submitting} />
      </Modal>

      {/* Modal Editar */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar experiência"
        footer={null}
      >
        <FormExperiencia
          initial={editItem || undefined}
          onSubmit={saveEdit}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}
