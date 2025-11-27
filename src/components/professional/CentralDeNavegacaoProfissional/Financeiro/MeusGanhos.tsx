import { useEffect, useState } from "react";
import {
  Wallet,
  Loader2,
  Clock4,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Euro,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

type ObraInfo = {
  id: string;
  nome?: string | null;
  endereco?: string | null;
};

type Pagamento = {
  id: string;
  valor_total: number | null;
  valor_hora: number | null;
  horas_trabalhadas: number | null;
  status_pagamento: string;
  data_pagamento?: string | null;
  obra_id?: string | null;
  obra?: {
    nome?: string | null;
    endereco?: string | null;
  } | null;
};

export default function MeusGanhos() {
  const { user, profile } = useAuth();
  const [ganhos, setGanhos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("todos");

  // id do profissional (se existir no contexto)
  const profissionalId = profile?.id || user?.id;

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      console.log("[MEUS GANHOS] profissionalId:", profissionalId);

      // 1) Busca pagamentos (sem travar se não tiver profissionalId)
      let query = supabase
        .from("pagamentos_profissionais")
        .select(
          `
          id,
          valor_total,
          valor_hora,
          horas_trabalhadas,
          status_pagamento,
          data_pagamento,
          obra_id
        `
        )
        .order("data_pagamento", { ascending: false });

      // aplica filtro por profissional só se tiver id
      if (profissionalId) {
        query = query.eq("profissional_id", profissionalId);
      }

      if (filtroStatus !== "todos") {
        query = query.eq("status_pagamento", filtroStatus);
      }

      if (filtroMes !== "todos") {
        const [anoStr, mesStr] = filtroMes.split("-");
        const ano = parseInt(anoStr, 10);
        const mes = parseInt(mesStr, 10);

        const inicio = `${anoStr}-${mesStr}-01`;
        const fim = new Date(ano, mes, 0).toISOString().slice(0, 10);

        query = query.gte("data_pagamento", inicio).lte("data_pagamento", fim);
      }

      const { data, error } = await query;

      console.log("[MEUS GANHOS] data:", data);
      console.log("[MEUS GANHOS] error:", error);

      if (error) {
        console.error("Erro ao carregar pagamentos_profissionais:", error);
        setGanhos([]);
        setLoading(false);
        return;
      }

      const pagamentos = (data || []) as Pagamento[];

      // 2) Busca obras relacionadas em lote
      const obraIds = Array.from(
        new Set(
          pagamentos
            .map((p) => p.obra_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let mapaObras: Record<string, ObraInfo> = {};

      if (obraIds.length > 0) {
        const { data: obrasData, error: obrasError } = await supabase
          .from("obras")
          .select("id, nome, endereco")
          .in("id", obraIds);

        if (obrasError) {
          console.error("Erro ao carregar obras:", obrasError);
        } else if (obrasData) {
          mapaObras = Object.fromEntries(
            obrasData.map((o) => [(o as ObraInfo).id, o as ObraInfo])
          );
        }
      }

      // 3) Enriquecer os pagamentos com os dados da obra
      const pagamentosComObra = pagamentos.map((p) => ({
        ...p,
        obra: p.obra_id ? mapaObras[p.obra_id] || null : null,
      }));

      setGanhos(pagamentosComObra);
      setLoading(false);
    }

    carregar();
  }, [profissionalId, filtroStatus, filtroMes]);

  // 🔹 Estatísticas
  const totalRecebido = ganhos
    .filter((g) => g.status_pagamento === "pago")
    .reduce((acc, g) => acc + (g.valor_total || 0), 0);

  const totalPendente = ganhos
    .filter((g) => g.status_pagamento !== "pago")
    .reduce((acc, g) => acc + (g.valor_total || 0), 0);

  const horasTrabalhadasPeriodo = ganhos.reduce(
    (acc, g) => acc + (g.horas_trabalhadas || 0),
    0
  );

  const ultimaData = ganhos.find((g) => g.status_pagamento === "pago")
    ?.data_pagamento;

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <Wallet className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Meus Ganhos</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">
        Aqui você acompanha seus ganhos, valores pendentes e suas horas
        trabalhadas por período.
      </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Total Recebido */}
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Total Recebido
          </p>
          <p className="text-base sm:text-xl font-semibold text-green-500">
            € {totalRecebido.toFixed(2)}
          </p>
        </div>

        {/* Pendentes */}
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Pendentes
          </p>
          <p className="text-base sm:text-xl font-semibold text-yellow-500">
            € {totalPendente.toFixed(2)}
          </p>
        </div>

        {/* Horas trabalhadas */}
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {filtroMes === "todos"
              ? "Horas trabalhadas (total)"
              : "Horas trabalhadas no mês"}
          </p>
          <p className="text-base sm:text-xl font-semibold text-blue-500">
            {horasTrabalhadasPeriodo.toFixed(1)} h
          </p>
        </div>

        {/* Último pagamento */}
        <div className="bg-white dark:bg-[#1e2a3a] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4 text-center shadow-sm">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Último Pagamento
          </p>
          <p className="text-base sm:text-xl font-semibold text-purple-500">
            {ultimaData
              ? new Date(ultimaData).toLocaleDateString("pt-PT")
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
            const label = new Date(`${ano}-${mes}-01`).toLocaleDateString(
              "pt-PT",
              { month: "long" }
            );
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
      ) : ganhos.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-16 text-sm sm:text-base">
          Nenhum ganho registrado ainda.
        </p>
      ) : (
        <motion.div layout className="space-y-3 sm:space-y-4">
          <AnimatePresence>
            {ganhos.map((g) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 p-3 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-start shadow-sm hover:shadow-md transition gap-3 sm:gap-0"
              >
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-gray-100 font-medium text-sm sm:text-base mb-1">
                    {g.obra?.nome || "Obra não identificada"}
                  </p>

                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <MapPin size={13} /> {g.obra?.endereco || "—"}
                  </p>

                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Euro size={13} /> Valor/hora: €{" "}
                    {g.valor_hora != null ? g.valor_hora.toFixed(2) : "0.00"} |{" "}
                    {g.horas_trabalhadas != null
                      ? g.horas_trabalhadas.toFixed(1)
                      : "0.0"}
                    h
                  </p>

                  <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm sm:text-base">
                    Total: €{" "}
                    {g.valor_total != null
                      ? g.valor_total.toFixed(2)
                      : "0.00"}
                  </p>

                  {g.data_pagamento && (
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                      <Calendar size={11} />{" "}
                      {new Date(g.data_pagamento).toLocaleDateString("pt-PT")}
                    </p>
                  )}
                </div>

                {g.status_pagamento === "pago" ? (
                  <span className="bg-green-500/10 dark:bg-green-600/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                    <CheckCircle2 size={13} /> Pago
                  </span>
                ) : g.status_pagamento === "processando" ? (
                  <span className="bg-yellow-500/10 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                    <Clock4 size={13} /> Processando
                  </span>
                ) : (
                  <span className="bg-red-500/10 dark:bg-red-600/20 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg text-xs sm:text-sm flex items-center gap-1 self-start sm:self-auto">
                    <AlertCircle size={13} /> Pendente
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

