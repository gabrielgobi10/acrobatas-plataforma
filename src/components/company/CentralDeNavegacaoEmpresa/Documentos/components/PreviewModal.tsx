import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "../../../../../lib/supabase";
import { Download, ExternalLink, X } from "lucide-react";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  arquivo: {
    nome: string;
    path: string;
    tipo_nome: string;
  };
}

export function PreviewModal({ open, onClose, arquivo }: PreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function gerarLink() {
      if (!arquivo?.path) return;
      setLoading(true);

      // 🔗 Gera link público
      const { data } = supabase.storage
        .from("documentos_acrobatas")
        .getPublicUrl(arquivo.path);

      if (data?.publicUrl) {
        setFileUrl(data.publicUrl);
      }

      setLoading(false);
    }

    gerarLink();
  }, [arquivo]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="flex justify-between items-center px-5 py-3 border-b bg-gray-50">
          <DialogTitle className="text-sm font-medium text-gray-700 truncate">
            Documento
          </DialogTitle>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-200 transition"
            title="Fechar"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="p-6 text-center text-gray-600">
          {loading ? (
            <p className="text-sm">Gerando link do documento...</p>
          ) : fileUrl ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-800">{arquivo?.tipo_nome}</p>
              <div className="flex justify-center gap-3">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir no navegador
                </a>
                <a
                  href={fileUrl}
                  download
                  className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300 transition"
                >
                  <Download className="w-4 h-4" />
                  Baixar agora
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-500">Erro ao gerar link do documento.</p>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 py-2 border-t bg-gray-50">
          Sistema de Documentação • Acrobatas © {new Date().getFullYear()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
