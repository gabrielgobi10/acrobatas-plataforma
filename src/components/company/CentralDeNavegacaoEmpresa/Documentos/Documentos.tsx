import { motion } from "framer-motion";
import { FileText, Upload, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Documentos() {
  const [documentos, setDocumentos] = useState([
    {
      nome: "Certidão Permanente",
      validade: "15/11/2025",
      status: "Válido",
      tipo: "PDF",
    },
    {
      nome: "Comprovativo Segurança Social",
      validade: "10/12/2025",
      status: "Pendente",
      tipo: "PDF",
    },
    {
      nome: "Apólice de Seguro",
      validade: "25/08/2026",
      status: "Válido",
      tipo: "Imagem",
    },
  ]);

  const handleUpload = () => {
    alert("Função de upload ainda não implementada 😄");
  };

  const handleDelete = (index: number) => {
    const novaLista = documentos.filter((_, i) => i !== index);
    setDocumentos(novaLista);
  };

  return (
    <div className="p-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Documentos</h1>
            <p className="text-gray-500 text-gray-500 text-sm">
              Gerencie os documentos obrigatórios da empresa e acompanhe prazos de validade.
            </p>
          </div>
        </div>

        <button
          onClick={handleUpload}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl shadow hover:bg-blue-700 transition"
        >
          <Upload className="w-5 h-5" />
          Enviar Documento
        </button>
      </div>

      {/* Lista de Documentos */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {documentos.map((doc, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="bg-white bg-gray-100 border border-gray-100 border-gray-100 shadow-md rounded-2xl p-5 relative"
          >
            {/* Botão deletar */}
            <button
              onClick={() => handleDelete(i)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">{doc.nome}</h2>
            </div>

            <p className="text-sm text-gray-500 text-gray-600 mb-2">
              Tipo: <span className="font-medium text-gray-700">{doc.tipo}</span>
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Validade: <span className="font-medium text-gray-700">{doc.validade}</span>
            </p>

            <div className="mt-3">
              {doc.status === "Válido" ? (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium w-fit">
                  <CheckCircle2 className="w-4 h-4" /> Documento válido
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium w-fit">
                  <AlertTriangle className="w-4 h-4" /> Pendente de atualização
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Mensagem caso vazio */}
      {documentos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-500 dark:text-gray-400 mt-16"
        >
          <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p>Nenhum documento cadastrado ainda.</p>
        </motion.div>
      )}
    </div>
  );
}
