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
  FolderOpen,
  MessageSquare,
  Loader2,
  FileText, // 👈 adiciona este aqui
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
    .list(tipoId, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

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
  const [modalEdit, setModalEdit] = useState<{ open: boolean; tipo?: TipoDocumento }>({ open: false });
  const [modalAdd, setModalAdd] = useState<{ open: boolean; grupoId?: string }>({ open: false });
  const [form, setForm] = useState({ nome: "", data_vencimento: "", observacao: "" });

  // ==========================
  // Carregar grupos, tipos e arquivos persistidos
  // ==========================
  useEffect(() => {
    (async () => {
      const { data: gruposData } = await supabase.from("grupos_documentos").select("*").order("nome");
      const { data: tiposData } = await supabase.from("tipos_documentos").select("*").order("nome");
      setGrupos(gruposData || []);
      setTipos(tiposData || []);

      // Buscar arquivos persistidos no bucket
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
    if (!confirm("Tem certeza que deseja excluir este tipo de documento?")) return;
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
        cor: "text-gray-400",
        bg: "bg-gray-100",
        icon: <Clock size={14} />,
      };

    const diasRestantes = dayjs(tipo.data_vencimento).diff(dayjs(), "day");

    if (diasRestantes < 0)
      return {
        texto: `Expirado há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) > 1 ? "s" : ""}`,
        cor: "text-red-600",
        bg: "bg-red-100",
        icon: <AlertTriangle size={14} />,
      };

    if (diasRestantes <= 30)
      return {
        texto: `Vence em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`,
        cor: "text-yellow-600",
        bg: "bg-yellow-100",
        icon: <Clock size={14} />,
      };

    return {
      texto: `Válido até ${dayjs(tipo.data_vencimento).format("DD/MM/YYYY")}`,
      cor: "text-green-600",
      bg: "bg-green-100",
      icon: <CheckCircle size={14} />,
    };
  };

  // ==========================
  // Render
  // ==========================
  return (
    <div className="p-10">
   
{/* ===== HEADER ===== */}
<div className="flex items-center gap-3 mb-10">
  <FileText className="w-8 h-8 text-blue-600" />
  <div>
    <h1 className="text-2xl font-semibold text-gray-900">
      Documentação da Acrobatas
    </h1>
    <p className="text-sm text-gray-500">
      Documentos institucionais da Acrobatas — disponíveis para consulta e download.
    </p>
  </div>
</div>

      {/* ===== GRUPOS ===== */}
      <div className="space-y-10">
        {grupos.map((grupo) => (
          <motion.div
            key={grupo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-700">{grupo.nome}</h3>
              <button
                onClick={() => {
                  setForm({ nome: "", data_vencimento: "", observacao: "" });
                  setModalAdd({ open: true, grupoId: grupo.id });
                }}
                className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-700"
              >
                <PlusCircle size={16} /> Novo tipo
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tipos
                .filter((t) => t.grupo_id === grupo.id)
                .map((tipo) => {
                  const status = getStatus(tipo);
                  return (
                    <motion.div
                      key={tipo.id}
                      whileHover={{ scale: 1.02 }}
                      className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:shadow-md transition-all relative"
                    >
{/* ✅ selo “Enviado” (reposicionado ao lado do título, antes dos ícones) */}
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
    <h4 className="font-medium text-gray-800">{tipo.nome}</h4>
    {arquivos[tipo.id] && (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
        <CheckCircle size={12} /> Enviado
      </span>
    )}
  </div>

  <div className="flex gap-2">
    <button
      onClick={() => {
        setForm({
          nome: tipo.nome,
          data_vencimento: tipo.data_vencimento || "",
          observacao: tipo.observacao || "",
        });
        setModalEdit({ open: true, tipo });
      }}
      className="text-blue-500 hover:text-blue-700"
    >
      <Edit3 size={15} />
    </button>
    <button
      onClick={() => handleDelete(tipo.id)}
      className="text-red-500 hover:text-red-700"
    >
      <Trash2 size={15} />
    </button>
  </div>
</div>


                      <div className="flex items-center gap-1 mb-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-md flex items-center gap-1 ${status.bg} ${status.cor}`}
                        >
                          {status.icon} {status.texto}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mb-2">
                        {tipo.data_vencimento
                          ? `Vencimento: ${dayjs(tipo.data_vencimento).format("DD/MM/YYYY")}`
                          : "Sem data de vencimento"}
                      </p>

                      {tipo.observacao && (
                        <div className="bg-gray-100 rounded-md p-2 text-xs text-gray-600 flex gap-1 items-start mb-2">
                          <MessageSquare size={12} className="mt-[2px]" />
                          <span>{tipo.observacao}</span>
                        </div>
                      )}

                      {/* botão com texto dinâmico */}
                      <label className="inline-flex items-center justify-center w-full text-sm text-blue-600 border border-blue-100 rounded-lg py-2 cursor-pointer hover:bg-blue-50 transition-all">
                        {uploading[tipo.id] ? (
                          <>
                            <Loader2 size={16} className="mr-1 animate-spin" /> Enviando...
                          </>
                        ) : (
                          <>
                            <FileUp size={16} className="mr-1" />{" "}
                            {arquivos[tipo.id] ? "Substituir ficheiro" : "Escolher ficheiro"}
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

                      {/* info do arquivo */}
                      {arquivos[tipo.id] && (
                        <p className="text-xs text-gray-500 mt-2">
                          📄 {arquivos[tipo.id].nome_arquivo} <br />
                          <span className="text-gray-400">
                            Enviado em{" "}
                            {dayjs(arquivos[tipo.id].data_envio).format("DD/MM/YYYY")}
                          </span>
                        </p>
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ===== MODAIS (Editar / Adicionar) ===== */}
      <AnimatePresence>
        {(modalEdit.open || modalAdd.open) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg border border-blue-100"
            >
              <h3 className="text-lg font-semibold mb-4 text-gray-700">
                {modalEdit.open ? "Editar Documento" : "Novo Tipo de Documento"}
              </h3>

              <div className="space-y-3">
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Nome do documento"
                />

                <input
                  type="date"
                  value={form.data_vencimento || ""}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Data de vencimento"
                />

                <textarea
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Observação (opcional)"
                />
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => {
                    setModalEdit({ open: false });
                    setModalAdd({ open: false });
                  }}
                  className="text-gray-500 text-sm flex items-center gap-1"
                >
                  <X size={14} /> Cancelar
                </button>

                <button
                  onClick={modalEdit.open ? handleSave : handleAdd}
                  className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-1 rounded-md"
                >
                  <Save size={14} /> {modalEdit.open ? "Salvar" : "Criar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
