// ===================================================
// 🪟 DocumentModal.tsx - Preview e Detalhes
// ===================================================

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FileText } from "lucide-react";
import { baixarDocumento } from "../utils/supabaseUtils";
import { DocumentData } from "../types/documentTypes";
import { statusTexto, statusCor } from "../utils/statusUtils";

interface DocumentModalProps {
  documento?: DocumentData | null;
  onClose: () => void;
}

export default function DocumentModal({ documento, onClose }: DocumentModalProps) {
  if (!documento) return null;

  const ehPDF = documento.tipo.toLowerCase().includes("pdf");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden relative"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{documento.nome}</h2>
                <p className="text-sm text-gray-500">
                  {statusTexto(documento.status)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => baixarDocumento(documento.url)}
                className="px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 transition flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Baixar
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Corpo */}
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">
                Informações do Documento
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Tipo:</span> {documento.tipo}
                </div>
                <div>
                  <span className="font-semibold">Validade:</span>{" "}
                  {documento.validade
                    ? new Date(documento.validade).toLocaleDateString("pt-PT")
                    : "—"}
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded-md border text-xs ${statusCor(
                      documento.status
                    )}`}
                  >
                    {statusTexto(documento.status)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Categoria:</span>{" "}
                  {documento.categoria || "—"}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              {ehPDF ? (
                <iframe
                  src={documento.url}
                  className="w-full h-[500px]"
                  title="Documento PDF"
                ></iframe>
              ) : (
                <img
                  src={documento.url}
                  alt={documento.nome}
                  className="w-full h-auto object-contain"
                />
              )}
            </div>

            {/* Histórico / OCR (simples) */}
            {documento.reconhecido_por_ocr && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  OCR Reconhecido
                </h3>
                <p className="text-sm text-gray-600">
                  Este documento foi processado automaticamente por OCR.
                  A data de validade e o nome foram identificados durante o upload.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
