import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  Calendar,
  CheckCircle2,
  Clock4,
  AlertCircle,
  Download,
  Eye,
  Building2,
  Euro,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type Recibo = {
  id: string;
  numero_recibo: string;
  valor_total: number;
  data_emissao: string;
  status_pagamento: string;
  tipo_documento: string;
  pdf_url?: string | null;
  obra?: { nome?: string | null } | null;
};

export default function RecibosEFaturas() {
  const { user } = useAuth();
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // 🔹 Carregar dados
  useEffect(() => {
    async function carregar() {
      if (!user) return;
      setLoading(true);

      let query = supabase
        .from("recibos_profissionais")
        .select(
          `id, numero_recibo, valor_total, data_emissao, status_pagamento, tipo_documento, pdf_url, obras ( nome )`
        )
        .eq("profissional_id", user.id)
        .order("data_emissao", { ascending: false });

      if (filtroStatus !== "todos") query = query.eq("status_pagamento", filtroStatus);

      if (filtroMes !== "todos") {
        const [ano, mes] = filtroMes.split("-");
        const inicio = `${ano}-${mes}-01`;
        const fim = new Date(parseInt(ano), parseInt(mes), 0)
          .toISOString()
          .slice(0, 10);
        query = query.gte("data_emissao", inicio).lte("data_emissao", fim);
      }

      const { data, error } = await query;
      if (!error && data) setRecibos(data);
      setLoading(false);
    }
    carregar();
  }, [user, filtroMes, filtroStatus]);

  // 🔹 Estatísticas
  const totalRecibos = recibos.length;
  const totalPagos = recibos.filter((r) => r.status_pagamento === "pago").length;
  const totalPendentes = recibos.filter((r) => r.status_pagamento !== "pago").length;
  const ultimoRecibo = recibos[0]?.data_emissao;

  // ========================================================================
  // 🔹 UI Responsiva + Light/Dark Mode
  // ========================================================================
  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <FileText className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Recibos e Faturas</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Veja todos os seus recibos e faturas emitidos pela Acrobatas, com valores e status de pagamento.
      </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total de Recibos</p>
          <p className="text-base sm:text-xl font-semibold text-blue-500">{totalRecibos}</p>
        </div>
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pagos</p>
          <p className="text-base sm:text-xl font-semibold text-green-500">{totalPagos}</p>
        </div>
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
          <p className="text-base sm:text-xl font-semibold text-yellow-500">{totalPendentes}</p>
        </div>
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Último Recibo</p>
          <p className="text-base sm:text-xl font-semibold text-purple-500">
            {ultimoRecibo
              ? new Date(ultimoRecibo).toLocaleDateString("pt-PT")
              : "—"}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todos">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="processando">Em processamento</option>
        </select>

        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm sm:text-base"
        >
          <option value="todos">Todos os meses</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const ano = new Date().getFullYear();
            const mes = (i + 1).toString().padStart(2, "0");
            const label = new Date(`${ano}-${mes}-01`).toLocaleDateString("pt-PT", {
              month: "long",
            });
            return (
              <option key={mes} value={`${ano}-${mes}`}>
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </option>
            );
          })}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : recibos.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-16 text-sm sm:text-base">
          Nenhum recibo encontrado ainda.
        </p>
      ) : (
        <motion.div layout className="space-y-3 sm:space-y-4">
          <AnimatePresence>
            {recibos.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-3 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 sm:gap-0">
                  <div className="flex-1">
                    <p className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {r.tipo_documento === "fatura" ? "📑 Fatura" : "🧾 Recibo"} #{r.numero_recibo}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Building2 size={13} /> {r.obra?.nome || "Sem obra vinculada"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Euro size={13} /> Valor: € {r.valor_total.toFixed(2)}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                      <Calendar size={11} /> Emitido em:{" "}
                      {new Date(r.data_emissao).toLocaleDateString("pt-PT")}
                    </p>
                  </div>

                  {/* Status */}
                  {r.status_pagamento === "pago" ? (
                    <span className="bg-green-500/10 dark:bg-green-600/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                      <CheckCircle2 size={13} /> Pago
                    </span>
                  ) : r.status_pagamento === "processando" ? (
                    <span className="bg-yellow-500/10 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                      <Clock4 size={13} /> Processando
                    </span>
                  ) : (
                    <span className="bg-red-500/10 dark:bg-red-600/20 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                      <AlertCircle size={13} /> Pendente
                    </span>
                  )}
                </div>

                {/* Ações */}
                <div className="flex justify-end gap-2 sm:gap-3 mt-3 sm:mt-4">
                  {r.pdf_url ? (
                    <a
                      href={r.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm transition"
                    >
                      <Download size={13} /> Baixar PDF
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex items-center gap-1 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg text-xs sm:text-sm cursor-not-allowed"
                    >
                      <Clock4 size={13} /> Aguardando
                    </button>
                  )}
                  <button className="flex items-center gap-1 text-blue-500 hover:text-blue-400 text-xs sm:text-sm">
                    <Eye size={13} /> Ver detalhes
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
