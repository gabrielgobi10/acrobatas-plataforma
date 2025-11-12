// src/pages/Empresa/DocumentosEmpresaPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Info,
  Pencil,
  Save,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase"; // ajuste o caminho conforme o seu projeto

/** ============================
 * Tipos do domínio
 * ============================ */
type DocStatus = "nao_enviado" | "pendente" | "aprovado" | "vencido";
type Categoria = "Financeiro" | "Legal";
type CadastroKey = "nif" | "representante" | "email_financeiro" | "telefone" | "iban";

type Documento = {
  id: string;
  nome: string;
  tipo: string;
  categoria: Categoria;
  status: DocStatus;
  validade?: string | null; // ISO string
  enviado_em?: string | null; // ISO string
  arquivo_url?: string | null;
};

type CadastroEmpresa = {
  nif: string;
  representante: string;
  email_financeiro: string;
  telefone: string;
  iban: string;
};

/** ============================
 * Config – o que é documento x o que é cadastro
 * ============================ */
const DOCS_TEMPLATE: Documento[] = [
  {
    id: "doc_at",
    nome: "Declaração de Não Dívida AT",
    tipo: "Fiscal",
    categoria: "Financeiro",
    status: "nao_enviado",
  },
  {
    id: "doc_ss",
    nome: "Declaração de Não Dívida SS",
    tipo: "Contributiva",
    categoria: "Financeiro",
    status: "nao_enviado",
  },
  {
    id: "doc_certidao",
    nome: "Certidão Permanente da Empresa",
    tipo: "Legal",
    categoria: "Legal",
    status: "nao_enviado",
  },
  {
    id: "doc_contrato",
    nome: "Contrato com a Acrobatas",
    tipo: "Contratual",
    categoria: "Legal",
    status: "pendente", // quando assinado digitalmente no admin, vira "aprovado"
  },
];

const CADASTRO_TEMPLATE: CadastroEmpresa = {
  nif: "",
  representante: "",
  email_financeiro: "",
  telefone: "",
  iban: "",
};

/** ============================
 * Helpers visuais
 * ============================ */
function Badge({ status }: { status: DocStatus }) {
  const base =
    "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1";
  if (status === "aprovado")
    return (
      <span className={`${base} bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300`}>
        <CheckCircle2 size={14} /> Aprovado
      </span>
    );
  if (status === "pendente")
    return (
      <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300`}>
        <Clock size={14} /> Em análise
      </span>
    );
  if (status === "vencido")
    return (
      <span className={`${base} bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300`}>
        <AlertTriangle size={14} /> Vencido
      </span>
    );
  return (
    <span className={`${base} bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300`}>
      <XCircle size={14} /> Não enviado
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm dark:bg-[#0B1736] dark:border-white/10 ${className}`} >
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-white/10 pb-3">
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </Card>
  );
}

/** ============================
 * Página
 * ============================ */
export default function DocumentosEmpresaPage() {
  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<Documento[]>(DOCS_TEMPLATE);
  const [cadastro, setCadastro] = useState<CadastroEmpresa>(CADASTRO_TEMPLATE);
  const [editKey, setEditKey] = useState<CadastroKey | null>(null);
  const [savingCadastro, setSavingCadastro] = useState(false);

  // TODO: substituir pelos IDs reais (user/empresa) do teu contexto
  const empresaId = "empresa_demo_id";

  /** ============================
   * Carregar dados do Supabase
   * ============================ */
  useEffect(() => {
    (async () => {
      try {
        // 1) Documentos
        const { data: docs } = await supabase
          .from("documentos_empresa")
          .select("id,nome,tipo,categoria,status,validade,enviado_em,arquivo_url")
          .eq("empresa_id", empresaId);

        if (docs && docs.length) {
          // mescla com o template para manter ordem e possíveis novos itens
          const merged = DOCS_TEMPLATE.map((tpl) => {
            const found = docs.find((d: any) => d.id === tpl.id);
            return found ? { ...tpl, ...found } : tpl;
          });
          setDocumentos(merged);
        }

        // 2) Cadastro
        const { data: cad } = await supabase
          .from("empresa_cadastro")
          .select("nif,representante,email_financeiro,telefone,iban")
          .eq("empresa_id", empresaId)
          .single();

        if (cad) setCadastro({ ...CADASTRO_TEMPLATE, ...cad });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** ============================
   * Métricas / progresso
   * ============================ */
  const resumo = useMemo(() => {
    const total = documentos.length;
    const aprov = documentos.filter((d) => d.status === "aprovado").length;
    const pend = documentos.filter((d) => d.status === "pendente").length;
    const venc = documentos.filter((d) => d.status === "vencido").length;
    const nao = documentos.filter((d) => d.status === "nao_enviado").length;
    const progresso = Math.round((aprov / total) * 100);
    return { total, aprov, pend, venc, nao, progresso };
  }, [documentos]);

  /** ============================
   * Upload
   * ============================ */
  async function handleUpload(doc: Documento, file: File) {
    const path = `${empresaId}/${doc.id}/${Date.now()}_${file.name}`;
    const up = await supabase.storage.from("documentos_empresa").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (up.error) {
      alert("Falha no upload: " + up.error.message);
      return;
    }
    const publicUrl = supabase.storage
      .from("documentos_empresa")
      .getPublicUrl(path).data.publicUrl;

    // upsert na tabela
    await supabase.from("documentos_empresa").upsert({
      empresa_id: empresaId,
      id: doc.id,
      nome: doc.nome,
      tipo: doc.tipo,
      categoria: doc.categoria,
      arquivo_url: publicUrl,
      status: "pendente",
      enviado_em: new Date().toISOString(),
    });

    setDocumentos((prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? { ...d, arquivo_url: publicUrl, status: "pendente", enviado_em: new Date().toISOString() }
          : d
      )
    );
  }

  /** ============================
   * Cadastro – salvar campo isolado
   * ============================ */
  async function saveCadastroField(key: CadastroKey, value: string) {
    setSavingCadastro(true);
    const payload = { empresa_id: empresaId, [key]: value };
    const { error } = await supabase.from("empresa_cadastro").upsert(payload);
    setSavingCadastro(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    setCadastro((c) => ({ ...c, [key]: value }));
    setEditKey(null);
  }

  /** ============================
   * UI
   * ============================ */
  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <Loader2 className="animate-spin" /> Carregando…
      </div>
    );
  }

  const docsPorCategoria = (cat: Categoria) => documentos.filter((d) => d.categoria === cat);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="text-blue-600" /> Documentos da Empresa
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Envie os documentos obrigatórios e complete o cadastro para validação pela Acrobatas.
        </p>
      </div>

      {/* Resumo / Progresso */}
      <Card className="p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Progresso geral</p>
            <div className="mt-2 h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{ width: `${resumo.progresso}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {resumo.aprov} aprovados • {resumo.pend} em análise • {resumo.venc} vencidos • {resumo.nao} não enviados
            </p>
          </div>
          <ResumoChip label="Aprovados" value={resumo.aprov} tone="green" />
          <ResumoChip label="Em análise" value={resumo.pend} tone="yellow" />
          <ResumoChip label="Pendentes" value={resumo.nao + resumo.venc} tone="gray" />
        </div>
      </Card>

      {/* Financeiro */}
      <Section title="Financeiro">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docsPorCategoria("Financeiro").map((doc) => (
            <DocCard key={doc.id} doc={doc} onUpload={handleUpload} />
          ))}
        </div>
      </Section>

      {/* Legal */}
      <div className="mt-6">
        <Section title="Legal">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docsPorCategoria("Legal").map((doc) => (
              <DocCard key={doc.id} doc={doc} onUpload={handleUpload} />
            ))}
          </div>
        </Section>
      </div>

      {/* Cadastro (informação estruturada – sem PDF) */}
      <div className="mt-6">
        <Section title="Cadastro">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CadastroItem
              label="NIF da Empresa"
              value={cadastro.nif}
              placeholder="Ex.: 509 999 999"
              editing={editKey === "nif"}
              onEdit={() => setEditKey("nif")}
              onCancel={() => setEditKey(null)}
              onSave={(val) => saveCadastroField("nif", val)}
              saving={savingCadastro}
            />
            <CadastroItem
              label="Representante Legal"
              value={cadastro.representante}
              placeholder="Nome completo"
              editing={editKey === "representante"}
              onEdit={() => setEditKey("representante")}
              onCancel={() => setEditKey(null)}
              onSave={(val) => saveCadastroField("representante", val)}
              saving={savingCadastro}
            />
            <CadastroItem
              label="E-mail Financeiro"
              value={cadastro.email_financeiro}
              placeholder="financeiro@empresa.com"
              editing={editKey === "email_financeiro"}
              onEdit={() => setEditKey("email_financeiro")}
              onCancel={() => setEditKey(null)}
              onSave={(val) => saveCadastroField("email_financeiro", val)}
              saving={savingCadastro}
            />
            <CadastroItem
              label="Telefone"
              value={cadastro.telefone}
              placeholder="+351 9xx xxx xxx"
              editing={editKey === "telefone"}
              onEdit={() => setEditKey("telefone")}
              onCancel={() => setEditKey(null)}
              onSave={(val) => saveCadastroField("telefone", val)}
              saving={savingCadastro}
            />
            <CadastroItem
              label="IBAN"
              value={cadastro.iban}
              placeholder="PT50 0002 0123 1234 5678 9015 4"
              editing={editKey === "iban"}
              onEdit={() => setEditKey("iban")}
              onCancel={() => setEditKey(null)}
              onSave={(val) => saveCadastroField("iban", val)}
              saving={savingCadastro}
            />
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
            <Info size={14} className="mt-0.5" />
            <span>
              Dados de cadastro não exigem upload de documento. São usados para faturação e comunicação.
            </span>
          </div>
        </Section>
      </div>
    </div>
  );
}

/** ============================
 * Subcomponentes
 * ============================ */
function ResumoChip({ label, value, tone }: { label: string; value: number; tone: "green" | "yellow" | "gray" }) {
  const tones: Record<string, string> = {
    green: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
    yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300",
    gray: "bg-gray-50 text-gray-700 dark:bg-white/10 dark:text-gray-300",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function DocCard({
  doc,
  onUpload,
}: {
  doc: Documento;
  onUpload: (doc: Documento, file: File) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-gray-50/70 dark:bg-white/5 dark:border-white/10 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-800 dark:text-white">{doc.nome}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{doc.tipo}</p>
        </div>
        <Badge status={doc.status} />
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        {doc.validade && <p>Validade: {new Date(doc.validade).toLocaleDateString()}</p>}
        {doc.enviado_em && <p>Enviado em: {new Date(doc.enviado_em).toLocaleDateString()}</p>}
      </div>

      <div className="mt-3">
        {doc.arquivo_url ? (
          <div className="flex items-center justify-between">
            <a
              href={doc.arquivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              <FileText className="inline-block mr-1" size={16} />
              Ver documento
            </a>
            <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-2">
              <Upload size={16} />
              Enviar nova versão
              <input
                className="hidden"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => e.target.files?.[0] && onUpload(doc, e.target.files[0])}
              />
            </label>
          </div>
        ) : (
          <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-2">
            <Upload size={16} />
            Enviar arquivo
            <input
              className="hidden"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files?.[0] && onUpload(doc, e.target.files[0])}
            />
          </label>
        )}
      </div>
    </motion.div>
  );
}

function CadastroItem({
  label,
  value,
  placeholder,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
}: {
  label: string;
  value: string;
  placeholder?: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (val: string) => void;
  saving?: boolean;
}) {
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => setLocal(value ?? ""), [value]);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 dark:bg-white/5 dark:border-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>

          <AnimatePresence initial={false} mode="wait">
            {editing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-1 flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg bg-white dark:bg-[#0B1736] border border-gray-300 dark:border-white/10 px-3 py-2 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-600/30"
                />
                <button
                  onClick={() => onSave(local)}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-2 text-xs font-medium"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Salvar
                </button>
                <button
                  onClick={onCancel}
                  className="inline-flex items-center gap-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 px-3 py-2 text-xs font-medium"
                >
                  Cancelar
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-1 flex items-center justify-between gap-3"
              >
                <p className={`text-sm ${value ? "text-gray-800 dark:text-white" : "text-gray-400 dark:text-gray-500 italic"}`}>
                  {value || placeholder || "—"}
                </p>
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 px-3 py-2 text-xs font-medium"
                >
                  <Pencil size={14} /> Editar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

