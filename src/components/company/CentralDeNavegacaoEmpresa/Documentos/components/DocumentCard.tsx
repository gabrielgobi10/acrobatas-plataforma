import { FileText, Download } from "lucide-react";
import { motion } from "framer-motion";
import { DocumentoAcrobatas } from "../types/documentTypes";

interface Props {
  doc: DocumentoAcrobatas;
}

export default function DocumentCard({ doc }: Props) {
  const tamanhoMB = (doc.tamanho / 1024 / 1024).toFixed(2);

  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg border border-gray-100 transition"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <FileText className="w-6 h-6 text-blue-500" />
        <h3 className="font-medium text-gray-800 truncate">{doc.nome}</h3>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        Tamanho: {tamanhoMB} MB
      </div>
      <div className="text-xs text-gray-400">
        Adicionado em: {doc.criadoEm.toLocaleDateString()}
      </div>

      <a
        href={doc.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        <Download className="w-4 h-4" />
        Baixar
      </a>
    </motion.div>
  );
}
