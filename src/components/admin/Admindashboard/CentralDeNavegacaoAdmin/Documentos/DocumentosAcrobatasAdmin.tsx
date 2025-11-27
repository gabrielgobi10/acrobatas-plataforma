import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../../company/CentralDeNavegacaoEmpresa/Documentos/utils/supabaseClient";
import {
  FileUp,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit3,
  PlusCircle,
  X,
  Save,
  MessageSquare,
  Loader2,
  FileText,
} from "lucide-react";
import dayjs from "dayjs";

// ==========================
// Tipos
// ==========================
type TipoDocumento = {
  id: string;
  nome: string;
  data_vencimento: string | null;
  grupo_id: string;
  observacao?: string | null;
};

type GrupoDocumento = {
  id: string;
  nome: string;
  descricao?: string;
};

// ==========================
// Função auxiliar – pega o arquivo mais recente no bucket
// ==========================
async function _arquivoMaisRecente(tipoId: string) {
  const { data, error } = await supabase.storage
    .from("documentos_acrobatas")
    .list(tipoId, {
      limit: 1,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error || !data?.length) return null;

  const file = data[0];
  const { data: pub } = supabase.storage
    .from("documentos_acrobatas")
    .getPublicUrl(`${tipoId}/${file.name}`);

  return {
    nome_arquivo: file.name,
    url: pub.publicUrl,
    data_envio: (file as any)?.created_at ?? new Date().toISOString(),
  };
}

// ==========================
// Componente principal
// ==========================
export default function DocumentosAcrobatasAdmin() {
  const [grupos, setGrupos] = useState<GrupoDocumento[]>([]);
  const [tipos, setTipos] = useState<TipoDocumento[]>([]);
  const [arquivos, setArquivos] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [modalEdit, setModalEdit] = useState<{ open: boolean; tipo?: TipoDocumento }>({
    open: false,
  });
  const [modalAdd, setModalAdd] = useState<{ open: boolean; grupoId?: string }>({
    open: false,
  });
  const [form, setForm] = useState({
    nome: "",
    data_vencimento: "",
    observacao: "",
  });

  // ==========================
  // Carregar grupos, tipos e arquivos persistidos
  // ==========================
  useEffect(() => {
    (async () => {
      const { data: gruposData } = await supabase
        .from("grupos_documentos")
        .select("*")
        .order("nome");
      const { data: tiposData } = await supabase
        .from("tipos_documentos")
        .select("*")
        .order("nome");

      setGrupos(gruposData || []);
      setTipos(tiposData || []);

      const arquivosTemp: Record<string, any> = {};
      for (const t of tiposData || []) {
        const arq = await _arquivoMaisRecente(t.id);
        if (arq) arquivosTemp[t.id] = arq;
      }
      setArquivos(arquivosTemp);
    })();
  }, []);

  // ==========================
  // Upload de arquivos
  // ==========================
  const handleUpload = async (tipo: TipoDocumento, file: File) => {
    try {
      setUploading((prev) => ({ ...prev, [tipo.id]: true }));

      const cleanName = tipo.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();

      const ext = file.name.split(".").pop();
      const fileName = `${cleanName}_${Date.now()}.${ext}`;
      const filePath = `${tipo.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("documentos_acrobatas")
        .upload(filePath, file, { upsert: true });
      if (error) throw error;

      const { data: signedUrlData } = await supabase.storage
        .from("documentos_acrobatas")
        .createSignedUrl(filePath, 3600);

      setArquivos((prev) => ({
        ...prev,
        [tipo.id]: {
          url: signedUrlData?.signedUrl || "",
          nome_arquivo: fileName,
          data_envio: new Date().toISOString(),
        },
      }));
    } finally {
      setUploading((prev) => ({ ...prev, [tipo.id]: false }));
    }
  };

  // ==========================
  // Criar e Editar Tipos
  // ==========================
  const handleSave = async () => {
    if (!modalEdit.tipo) return;
    const { error } = await supabase
      .from("tipos_documentos")
      .update({
        nome: form.nome,
        data_vencimento: form.data_vencimento || null,
        observacao: form.observacao || null,
      })
      .eq("id", modalEdit.tipo.id);

    if (!error) {
      setTipos((prev) =>
        prev.map((t) =>
          t.id === modalEdit.tipo?.id ? { ...t, ...form } : t
        )
      );
      setModalEdit({ open: false });
    }
  };

  const handleAdd = async () => {
    if (!modalAdd.grupoId) return;
    const { data, error } = await supabase
      .from("tipos_documentos")
      .insert({
        grupo_id: modalAdd.grupoId,
        nome: form.nome,
        data_vencimento: form.data_vencimento || null,
        observacao: form.observacao || null,
      })
      .select();

    if (!error && data) {
      setTipos((prev) => [...prev, data[0]]);
      setModalAdd({ open: false });
    }
  };

  // ==========================
  // Excluir Tipo
  // ==========================
  const handleDelete = async (tipoId: string) => {
    if (!confirm("Tem certeza que deseja excluir este tipo de documento?"))
      return;
    await supabase.from("tipos_documentos").delete().eq("id", tipoId);
    setTipos((prev) => prev.filter((t) => t.id !== tipoId));
  };

  // ==========================
  // Calcular status da validade
  // ==========================
  const getStatus = (tipo: TipoDocumento) => {
    if (!tipo.data_vencimento)
      return {
        texto: "Sem data definida",
        cor: "text-slate-400 dark:text-slate-500",
        bg: "bg-slate-100 dark:bg-slate-800/60",
        icon: <Clock size={14} />,
      };

    const diasRestantes = dayjs(tipo.data_vencimento).diff(dayjs(), "day");

    if (diasRestantes < 0)
      return {
        texto: `Expirado há ${Math.abs(diasRestantes)} dia${
          Math.abs(diasRestantes) > 1 ? "s" : ""
        }`,
        cor: "text-rose-600 dark:text-rose-300",
        bg: "bg-rose-100 dark:bg-rose-500/20",
        icon: <AlertTriangle size={14} />,
      };

    if (diasRestantes <= 30)
      return {
        texto: `Vence em ${diasRestantes} dia${
          diasRestantes > 1 ? "s" : ""
        }`,
        cor: "text-amber-600 dark:text-amber-300",
        bg: "bg-amber-100 dark:bg-amber-500/20",
        icon: <Clock size={14} />,
      };

    return {
      texto: `Válido até ${dayjs(tipo.data_vencimento).format("DD/MM/YYYY")}`,
      cor: "text-emerald-600 dark:text-emerald-300",
      bg: "bg-emerald-100 dark:bg-emerald-500/20",
      icon: <CheckCircle size={14} />,
    };
  };

  // ==========================
  // Render
  // ==========================
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-6">
      <div className="max-w-5xl mx-auto">
        {/* CARD ÚNICO DO MÓDULO */}
        <div className="rounded-3xl bg-slate-950/80 dark:bg-slate-950/80 border border-slate-800 shadow-lg px-4 py-5 sm:px-6 sm:py-6 space-y-6">
          {/* HEADER */}
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-50">
                Documentação da Acrobatas
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Documentos institucionais disponíveis para consulta e download.
              </p>
            </div>
          </div>

          {/* GRUPOS */}
          <div className="space-y-6 sm:space-y-8">
            {grupos.map((grupo) => (
              <div
                key={grupo.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 sm:px-5 sm:py-5"
              >
                {/* Título do grupo */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-50">
                      {grupo.nome}
                    </h3>
                    {grupo.descricao && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        {grupo.descricao}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setForm({
                        nome: "",
                        data_vencimento: "",
                        observacao: "",
                      });
                      setModalAdd({ open: true, grupoId: grupo.id });
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-sky-400 hover:bg-sky-500/15"
                  >
                    <PlusCircle size={14} /> Novo tipo
                  </button>
                </div>

                {/* Tipos dentro do grupo */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {tipos
                    .filter((t) => t.grupo_id === grupo.id)
                    .map((tipo) => {
                      const status = getStatus(tipo);
                      const arquivo = arquivos[tipo.id];

                      return (
                        <motion.div
                          key={tipo.id}
                          whileHover={{ scale: 1.01 }}
                          className="border border-slate-800 rounded-xl p-4 bg-slate-900/80 hover:bg-slate-900 transition-all"
                        >
                          {/* Linha título + selo + ações */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm text-slate-50">
                                  {tipo.nome}
                                </h4>
                                {arquivo && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={12} /> Enviado
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setForm({
                                    nome: tipo.nome,
                                    data_vencimento:
                                      tipo.data_vencimento || "",
                                    observacao: tipo.observacao || "",
                                  });
                                  setModalEdit({ open: true, tipo });
                                }}
                                className="text-sky-400 hover:text-sky-300"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(tipo.id)}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-1 mb-2 text-[11px]">
                            <span
                              className={`px-2 py-1 rounded-md inline-flex items-center gap-1 ${status.bg} ${status.cor}`}
                            >
                              {status.icon} {status.texto}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 mb-2">
                            {tipo.data_vencimento
                              ? `Vencimento: ${dayjs(
                                  tipo.data_vencimento
                                ).format("DD/MM/YYYY")}`
                              : "Sem data de vencimento"}
                          </p>

                          {tipo.observacao && (
                            <div className="bg-slate-900 rounded-md p-2 text-[11px] text-slate-300 flex gap-1 items-start mb-3">
                              <MessageSquare
                                size={12}
                                className="mt-[2px] text-slate-500"
                              />
                              <span>{tipo.observacao}</span>
                            </div>
                          )}

                          {/* Upload */}
                          <label className="inline-flex items-center justify-center w-full text-[11px] sm:text-xs text-sky-400 border border-sky-500/40 rounded-lg py-2 cursor-pointer hover:bg-sky-500/10 transition-all">
                            {uploading[tipo.id] ? (
                              <>
                                <Loader2
                                  size={16}
                                  className="mr-1 animate-spin"
                                />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <FileUp size={16} className="mr-1" />
                                {arquivo
                                  ? "Substituir ficheiro"
                                  : "Escolher ficheiro"}
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.png"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(tipo, file);
                              }}
                            />
                          </label>

                          {/* Info do arquivo */}
                          {arquivo && (
                            <p className="text-[11px] text-slate-400 mt-2 leading-snug">
                              📄 {arquivo.nome_arquivo}
                              <br />
                              <span className="text-slate-500">
                                Enviado em{" "}
                                {dayjs(arquivo.data_envio).format(
                                  "DD/MM/YYYY"
                                )}
                              </span>
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== MODAIS (Editar / Adicionar) ===== */}
      <AnimatePresence>
        {(modalEdit.open || modalAdd.open) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 grid place-items-center px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 rounded-xl p-5 sm:p-6 w-full max-w-md shadow-xl border border-slate-800"
            >
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-slate-50">
                {modalEdit.open
                  ? "Editar documento"
                  : "Novo tipo de documento"}
              </h3>

              <div className="space-y-3">
                <input
                  value={form.nome}
                  onChange={(e) =>
                    setForm({ ...form, nome: e.target.value })
                  }
                  className="w-full border border-slate-700 bg-slate-900 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Nome do documento"
                />

                <input
                  type="date"
                  value={form.data_vencimento || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      data_vencimento: e.target.value,
                    })
                  }
                  className="w-full border border-slate-700 bg-slate-900 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                />

                <textarea
                  value={form.observacao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacao: e.target.value,
                    })
                  }
                  className="w-full border border-slate-700 bg-slate-900 rounded-md px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Observação (opcional)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => {
                    setModalEdit({ open: false });
                    setModalAdd({ open: false });
                  }}
                  className="text-xs sm:text-sm text-slate-400 flex items-center gap-1"
                >
                  <X size={14} /> Cancelar
                </button>

                <button
                  onClick={modalEdit.open ? handleSave : handleAdd}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-sky-700"
                >
                  <Save size={14} />{" "}
                  {modalEdit.open ? "Salvar" : "Criar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
