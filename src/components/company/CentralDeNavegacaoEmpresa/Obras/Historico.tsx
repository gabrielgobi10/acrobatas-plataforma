import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import toast from "react-hot-toast";

/**
 * Histórico de Obras — Desktop melhorado, Mobile compacto
 */
export default function Historico() {
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function fetchObrasConcluidas() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("obras")
          .select("*")
          .eq("status", "Concluída")
          .order("data_inicio", { ascending: false });

        if (error) throw error;
        setObras(data || []);
      } catch (err) {
        console.error("Erro ao carregar histórico de obras:", err);
        toast.error("Erro ao carregar histórico de obras.");
      } finally {
        setLoading(false);
      }
    }
    fetchObrasConcluidas();
  }, []);

  const filtradas = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return obras;
    return obras.filter((o) => {
      const nome = (o?.nome || "").toLowerCase();
      const local = (o?.local || "").toLowerCase();
      return nome.includes(text) || local.includes(text);
    });
  }, [q, obras]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* ====== Container central limitado ====== */}
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ====== Cabeçalho ====== */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/10 dark:bg-blue-500/10">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              Histórico de Obras
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registo de todas as obras concluídas pela empresa.
            </p>
          </div>
        </div>

        {/* ====== Barra de busca (discreta) ====== */}
        <div className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por nome ou local..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white dark:bg-[#141b26] border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ====== Card Principal ====== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white dark:bg-[#1b2332] border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-sm"
        >
          {/* Estados */}
          {loading ? (
            <div className="flex justify-center items-center py-14 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando obras…
            </div>
          ) : filtradas.length === 0 ? (
            <div className="px-4 sm:px-6 py-10">
              <div className="mx-auto max-w-xl">
                <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50/70 dark:bg-[#0f1623] p-6 sm:p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma obra concluída até o momento.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tabela (desktop) / Lista (mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-zinc-700">
                      <th className="py-3 px-4 font-medium text-sm">Obra</th>
                      <th className="py-3 px-4 font-medium text-sm">Local</th>
                      <th className="py-3 px-4 font-medium text-sm">
                        Profissionais
                      </th>
                      <th className="py-3 px-4 font-medium text-sm">
                        Data de Início
                      </th>
                      <th className="py-3 px-4 font-medium text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtradas.map((obra, i) => (
                      <motion.tr
                        key={obra.id || i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-[#232d3d] transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-100">
                          {obra.nome || "—"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {obra.local || "—"}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {obra.profissionais_total || 0} profissionais
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-blue-500" />
                            {obra.data_inicio
                              ? new Date(obra.data_inicio).toLocaleDateString(
                                  "pt-PT"
                                )
                              : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            {obra.status || "Concluída"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lista compacta (mobile) */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-zinc-700">
                {filtradas.map((obra, i) => (
                  <motion.div
                    key={obra.id || i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {obra.nome || "—"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {obra.local || "—"}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Concluída
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {(obra.profissionais_total || 0) + ""} profissionais
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                        {obra.data_inicio
                          ? new Date(obra.data_inicio).toLocaleDateString(
                              "pt-PT"
                            )
                          : "—"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
