import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Loader2,
  Eye,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Documento = {
  id: string;
  nome: string;
  categoria: string;
  validade?: string | null;
  status: "Válido" | "Pendente" | "Vencido";
  atualizado_em?: string | null;
  url?: string | null;
};

export default function MeusDocumentos() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      const dados: Documento[] = [
        {
          id: "1",
          nome: "Cartão de Cidadão",
          categoria: "Identificação",
          validade: "12/12/2025",
          status: "Válido",
          atualizado_em: "10/09/2024",
        },
        {
          id: "2",
          nome: "Certidão Contributiva",
          categoria: "Fiscal",
          validade: null,
          status: "Pendente",
          atualizado_em: null,
        },
        {
          id: "3",
          nome: "Seguro de Responsabilidade Civil",
          categoria: "Segurança",
          validade: "22/03/2024",
          status: "Vencido",
          atualizado_em: "10/03/2024",
        },
      ];
      setDocumentos(dados);
      setLoading(false);
    }
    carregar();
  }, [user]);

  const resumo = {
    validos: documentos.filter((d) => d.status === "Válido").length,
    pendentes: documentos.filter((d) => d.status === "Pendente").length,
    vencidos: documentos.filter((d) => d.status === "Vencido").length,
  };

  if (loading)
    return (
      <div className="flex justify-center mt-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* 🔹 Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <FileText className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Meus Documentos</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-8">
        Envie e acompanhe aqui seus documentos pessoais, fiscais e de segurança exigidos pela plataforma Acrobatas.
      </p>

      {/* 🔹 Cards resumo */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-10">
        <ResumoCard titulo="Válidos" valor={resumo.validos} cor="text-green-500" icone={<CheckCircle2 size={18} />} />
        <ResumoCard titulo="Pendentes" valor={resumo.pendentes} cor="text-yellow-500" icone={<AlertTriangle size={18} />} />
        <ResumoCard titulo="Vencidos" valor={resumo.vencidos} cor="text-red-500" icone={<XCircle size={18} />} />
      </div>

      {/* 🔹 Botão de upload */}
      <div className="flex justify-center sm:justify-end mb-6">
        <button className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base">
          <Plus size={18} />
          Adicionar novo documento
        </button>
      </div>

      {/* 🔹 Lista de documentos */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <FileText size={18} /> Lista de documentos
        </h2>

        {/* MOBILE – Cards */}
        <div className="space-y-3 sm:hidden">
          {documentos.map((doc) => (
            <motion.div
              key={doc.id}
              whileHover={{ scale: 1.02 }}
              className="rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 bg-gray-50 dark:bg-[#232c3d]"
            >
              <div className="flex justify-between items-center mb-2">
                <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                  {doc.nome}
                </p>
                <StatusBadge status={doc.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Categoria: <span className="font-medium">{doc.categoria}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Validade: {doc.validade || "—"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Atualizado em: {doc.atualizado_em || "—"}
              </p>
              <div className="flex gap-3 mt-3">
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-blue-600/90 text-white text-xs hover:bg-blue-700 transition">
                  <Eye size={14} /> Ver
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-green-600/90 text-white text-xs hover:bg-green-700 transition">
                  <Upload size={14} /> Enviar
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* DESKTOP – Tabela */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-300 dark:border-zinc-700">
                <th className="py-3 px-2">Documento</th>
                <th className="py-3 px-2">Categoria</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Validade</th>
                <th className="py-3 px-2">Atualizado em</th>
                <th className="py-3 px-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => (
                <motion.tr
                  key={doc.id}
                  whileHover={{ scale: 1.01 }}
                  className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#243043] transition"
                >
                  <td className="py-3 px-2 font-medium">{doc.nome}</td>
                  <td className="py-3 px-2">{doc.categoria}</td>
                  <td className="py-3 px-2">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3 px-2">{doc.validade || "—"}</td>
                  <td className="py-3 px-2">{doc.atualizado_em || "—"}</td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        title="Ver documento"
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <Eye size={18} className="text-blue-500" />
                      </button>
                      <button
                        title="Enviar novo arquivo"
                        className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <Upload size={18} className="text-green-500" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔹 Rodapé */}
      <div className="mt-8 sm:mt-10 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        Os documentos enviados são analisados pela equipe da Acrobatas para garantir a conformidade com os requisitos legais e de segurança. 🔒
      </div>
    </div>
  );
}

// 🔹 Card pequeno de resumo
function ResumoCard({
  titulo,
  valor,
  cor,
  icone,
}: {
  titulo: string;
  valor: number;
  cor: string;
  icone: any;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className="rounded-xl p-2 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700"
    >
      <div className={`flex justify-center mb-1 sm:mb-2 ${cor}`}>{icone}</div>
      <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </motion.div>
  );
}

// 🔹 Badge de status
function StatusBadge({ status }: { status: Documento["status"] }) {
  const cores = {
    Válido: "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-400",
    Pendente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-400",
    Vencido: "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-400",
  }[status];

  return (
    <span className={`px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full ${cores}`}>
      {status}
    </span>
  );
}
