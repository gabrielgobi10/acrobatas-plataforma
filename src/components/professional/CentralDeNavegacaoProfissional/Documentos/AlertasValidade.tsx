// src/components/professional/CentralDeNavegacaoProfissional/Documentos/AlertasValidade.tsx
// ============================================================================
// ⏰ Alertas de Validade – Documentos próximos do vencimento ou vencidos
// ============================================================================

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock4,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Documento = {
  id: string;
  nome: string;
  categoria: string;
  validade: string;
  status: "Válido" | "Perto do vencimento" | "Vencido";
  dias_restantes: number;
};

export default function AlertasValidade() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const hoje = new Date();

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      // 🔹 Simulado – substituir futuramente por SELECT Supabase
      const dados: Documento[] = [
        {
          id: "1",
          nome: "Seguro RC Profissional",
          categoria: "Segurança",
          validade: "2025-11-20",
          status: "Perto do vencimento",
          dias_restantes: 19,
        },
        {
          id: "2",
          nome: "Cartão de Cidadão",
          categoria: "Identificação",
          validade: "2026-01-15",
          status: "Válido",
          dias_restantes: 75,
        },
        {
          id: "3",
          nome: "Certidão Contributiva",
          categoria: "Fiscal",
          validade: "2025-10-15",
          status: "Vencido",
          dias_restantes: -17,
        },
      ];

      setDocumentos(dados);
      setLoading(false);
    }

    carregar();
  }, [user]);

  const resumo = {
    validos: documentos.filter((d) => d.status === "Válido").length,
    proximos: documentos.filter((d) => d.status === "Perto do vencimento").length,
    vencidos: documentos.filter((d) => d.status === "Vencido").length,
  };

  const bgCard = "bg-slate-100 dark:bg-slate-800";
  const borderCard = "border border-slate-300 dark:border-slate-700";
  const textMuted = "text-gray-600 dark:text-gray-400";
  const textPrimary = "text-gray-900 dark:text-gray-100";

  return (
    <div className={`p-6 ${textPrimary}`}>
      {/* 🔹 Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <Bell className="text-yellow-500 dark:text-yellow-400" size={26} />
        <h1 className="text-2xl font-semibold">Alertas de Validade</h1>
      </div>

      <p className={`${textMuted} mb-8`}>
        Acompanhe aqui seus documentos próximos do vencimento ou já vencidos.
        Mantenha tudo atualizado para continuar ativo na Acrobatas.
      </p>

      {/* 🔹 Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <ResumoCard
          titulo="Válidos"
          valor={resumo.validos}
          cor="text-green-500"
          icone={<CheckCircle2 size={20} />}
        />
        <ResumoCard
          titulo="Perto do vencimento"
          valor={resumo.proximos}
          cor="text-yellow-500"
          icone={<Clock4 size={20} />}
        />
        <ResumoCard
          titulo="Vencidos"
          valor={resumo.vencidos}
          cor="text-red-500"
          icone={<XCircle size={20} />}
        />
      </div>

      {/* 🔹 Tabela de alertas */}
      <div className={`${bgCard} ${borderCard} rounded-2xl p-4`}>
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-yellow-500 dark:text-yellow-400">
          <CalendarDays size={18} /> Documentos com atenção necessária
        </h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-yellow-400" size={28} />
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            🎉 Nenhum alerta no momento — todos os seus documentos estão em dia!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-300 dark:border-slate-700">
                  <th className="py-3 px-2">Documento</th>
                  <th className="py-3 px-2">Categoria</th>
                  <th className="py-3 px-2">Validade</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Dias restantes</th>
                  <th className="py-3 px-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <motion.tr
                    key={doc.id}
                    whileHover={{ scale: 1.01 }}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-700/40 transition"
                  >
                    <td className="py-3 px-2 font-medium">{doc.nome}</td>
                    <td className="py-3 px-2">{doc.categoria}</td>
                    <td className="py-3 px-2">
                      {new Date(doc.validade).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="py-3 px-2">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td
                      className={`py-3 px-2 font-medium ${
                        doc.dias_restantes < 0
                          ? "text-red-500"
                          : doc.dias_restantes < 15
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {doc.dias_restantes < 0
                        ? `${Math.abs(doc.dias_restantes)} dias vencido`
                        : `${doc.dias_restantes} dias`}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        title="Enviar novo documento"
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <Upload size={18} className="text-blue-500" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔹 Rodapé */}
      <div className="mt-10 text-center text-sm text-gray-600 dark:text-gray-400">
        O sistema enviará notificações automáticas quando algum documento estiver
        prestes a vencer. 🚨
      </div>
    </div>
  );
}

// 🔹 Card de resumo
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
      className="rounded-xl p-4 text-center shadow-sm hover:shadow-md transition bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
    >
      <div className={`flex justify-center mb-2 ${cor}`}>{icone}</div>
      <p className="text-gray-700 dark:text-gray-400 text-sm">{titulo}</p>
      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </motion.div>
  );
}

// 🔹 Badge de status
function StatusBadge({ status }: { status: Documento["status"] }) {
  const cores = {
    Válido: "bg-green-100 text-green-600 dark:bg-green-700/30 dark:text-green-400",
    "Perto do vencimento":
      "bg-yellow-100 text-yellow-600 dark:bg-yellow-700/30 dark:text-yellow-400",
    Vencido: "bg-red-100 text-red-600 dark:bg-red-700/30 dark:text-red-400",
  }[status];

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full ${cores}`}
    >
      {status}
    </span>
  );
}
