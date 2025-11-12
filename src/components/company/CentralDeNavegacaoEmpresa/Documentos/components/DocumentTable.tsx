// =====================================================
// 📋 DocumentTable.tsx - Tabela de Documentos
// =====================================================

import { useEffect, useState } from "react";
import {
  Eye,
  Trash2,
  Download,
  Search,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import {
  listarDocumentos,
  excluirDocumento,
  baixarDocumento,
} from "../utils/supabaseUtils";
import {
  statusCor,
  statusTexto,
  definirStatusDocumento,
} from "../utils/statusUtils";
import { DocumentData, DocumentStatus } from "../types/documentTypes";

interface DocumentTableProps {
  onVisualizar: (doc: DocumentData) => void;
  atualizarLista: boolean;
}

export default function DocumentTable({
  onVisualizar,
  atualizarLista,
}: DocumentTableProps) {
  const [documentos, setDocumentos] = useState<DocumentData[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<DocumentStatus | "todos">(
    "todos"
  );
  const [carregando, setCarregando] = useState(false);

  // ========================================
  // 🔹 Carrega lista de documentos do Supabase
  // ========================================
  async function carregarDocumentos() {
    setCarregando(true);
    const docs = await listarDocumentos();
    // Atualiza status em tempo real (baseado na data)
    const atualizados = docs.map((d) => ({
      ...d,
      status: definirStatusDocumento(d.validade),
    }));
    setDocumentos(atualizados);
    setCarregando(false);
  }

  useEffect(() => {
    carregarDocumentos();
  }, [atualizarLista]);

  // ========================================
  // 🔍 Filtros e Busca
  // ========================================
  const documentosFiltrados = documentos.filter((doc) => {
    const nomeMatch = doc.nome.toLowerCase().includes(busca.toLowerCase());
    const statusMatch =
      filtroStatus === "todos" ? true : doc.status === filtroStatus;
    return nomeMatch && statusMatch;
  });

  // ========================================
  // 🗑️ Excluir Documento
  // ========================================
  async function handleExcluir(id?: string) {
    if (!id) return;
    const confirma = confirm("Deseja realmente excluir este documento?");
    if (!confirma) return;
    const sucesso = await excluirDocumento(id);
    if (sucesso) carregarDocumentos();
  }

  // ========================================
  // 🧱 Renderização
  // ========================================
  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-gray-100 gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar documento..."
            className="border-none outline-none w-full text-sm"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as DocumentStatus | "todos")}
          >
            <option value="todos">Todos</option>
            <option value="valido">Válidos</option>
            <option value="vencendo">Vencendo</option>
            <option value="vencido">Vencidos</option>
            <option value="pendente">Pendentes</option>
          </select>

          <button
            onClick={carregarDocumentos}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corpo da tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="py-3 px-5 text-left font-medium">Nome</th>
              <th className="py-3 px-5 text-left font-medium">Tipo</th>
              <th className="py-3 px-5 text-left font-medium">Validade</th>
              <th className="py-3 px-5 text-left font-medium">Status</th>
              <th className="py-3 px-5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin inline-block" />
                </td>
              </tr>
            ) : documentosFiltrados.length > 0 ? (
              documentosFiltrados.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-5">{doc.nome}</td>
                  <td className="py-3 px-5">{doc.tipo}</td>
                  <td className="py-3 px-5">
                    {doc.validade
                      ? new Date(doc.validade).toLocaleDateString("pt-PT")
                      : "—"}
                  </td>
                  <td className="py-3 px-5">
                    <span
                      className={`text-xs px-2 py-1 rounded-md border ${statusCor(
                        doc.status
                      )}`}
                    >
                      {statusTexto(doc.status)}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right flex justify-end gap-2">
                    <button
                      onClick={() => onVisualizar(doc)}
                      className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                      title="Visualizar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => baixarDocumento(doc.url)}
                      className="p-2 rounded-lg hover:bg-green-50 text-green-600 transition"
                      title="Baixar"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExcluir(doc.id!)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-gray-500 py-10 italic"
                >
                  Nenhum documento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
