import React, { useState } from "react";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Props = {
  email: string;
};

const DocumentUpload: React.FC<Props> = ({ email }) => {
  const [uploading, setUploading] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setMensagem("");
      setUploading(true);

      const file = e.target.files?.[0];
      if (!file) return;

      const nomeArquivo = `${email}/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage
        .from("documentos")
        .upload(nomeArquivo, file);

      if (error) throw error;

      setMensagem("Documento enviado com sucesso!");
    } catch (error: any) {
      console.error(error?.message || error);
      setMensagem("Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg cursor-pointer transition">
        <Upload size={16} />
        {uploading ? "Enviando..." : "Anexar documento"}
        <input
          type="file"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>

      {mensagem && (
        <p
          className={`text-sm flex items-center gap-1 ${
            mensagem.includes("sucesso") ? "text-green-600" : "text-red-500"
          }`}
        >
          {mensagem.includes("sucesso") ? (
            <CheckCircle size={14} />
          ) : (
            <XCircle size={14} />
          )}
          {mensagem}
        </p>
      )}
    </div>
  );
};

export default DocumentUpload;
