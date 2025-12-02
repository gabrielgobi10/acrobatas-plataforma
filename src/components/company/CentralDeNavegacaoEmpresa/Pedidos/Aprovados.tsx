// src/components/company/CentralDeNavegacaoEmpresa/Pedidos/Aprovados.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardCheck,
  Search,
  Loader2,
  MapPin,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

function tt(t: any, key: string, fallback: string) {
  const v = t(key);
  return typeof v === "string" && v !== key ? v : fallback;
}

type Pedido = {
  id: string;
  id_empresa?: string | null;
  nome_empresa?: string | null;
  tipo_profissional?: string | null;
  quantidade?: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  local?: string | null;
  status?: string | null;
  criado_em?: string | null; // coluna válida na view
};

export default function Aprovados() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const L = useMemo(
    () => ({
      titulo: tt(t, "empresaPedidos.aprovados.titulo", "Pedidos Aprovados"),
      desc: tt(
        t,
        "empresaPedidos.aprovados.desc",
        "Visualize todos os pedidos já aprovados e prontos para execução."
      ),
      buscar: tt(
        t,
        "empresaPedidos.buscarPlaceholder",
        "Buscar por local, tipo ou ID..."
      ),
      empresa: tt(t, "empresaPedidos.col.empresa", "Empresa"),
      tipo: tt(t, "empresaPedidos.col.tipo", "Tipo"),
      profissionais: tt(
        t,
        "empresaPedidos.col.profissionais",
        "Profissionais"
      ),
      periodo: tt(t, "empresaPedidos.col.periodo", "Período"),
      status: tt(t, "empresaPedidos.col.status", "Status"),
      nenhumTitulo: tt(
        t,
        "empresaPedidos.aprovados.nenhumTitulo",
        "Nenhum pedido aprovado."
      ),
      nenhumDica: tt(
        t,
        "empresaPedidos.aprovados.nenhumDica",
        "Dica: tente pesquisar pela cidade, tipo (“Eletricista”) ou pelo ID."
      ),
      aprovado: tt(t, "empresaPedidos.status.aprovado", "Aprovado"),
    }),
    [t]
  );

  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState("");
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // 1) Descobrir o ID da empresa vinculada ao usuário (RPC security definer)
  useEffect(() => {
    let cancel = false;
    async function loadEmpresa() {
      if (!user?.id) return;
      const { data, error } = await supabase.rpc("minha_empresa_id");
      if (cancel) return;
      if (error) {
        console.error("[Aprovados] minha_empresa_id ->", error);
        setEmpresaId(null);
      } else {
        setEmpresaId(data ?? null);
      }
    }
    loadEmpresa();
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  // fetch util (ordena por 'criado_em' e filtra por empresa)
  async function fetchAprovados(empId: string) {
    setLoading(true);

    const { data, error } = await supabase
      .from("pedidos_empresa_v2")
      .select("*")
      .eq("status", "aprovado")
      .eq("id_empresa", empId)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("[Aprovados] fetch ->", error);
      setPedidos([]);
      setLoading(false);
      return;
    }

    setPedidos((data ?? []) as Pedido[]);
    setLoading(false);
  }

  // 2) Fetch + realtime
  useEffect(() => {
    if (!empresaId) {
      setPedidos([]);
      setLoading(false);
      return;
    }

    fetchAprovados(empresaId);

    const ch = supabase
      .channel("pedidos_aprovados_changes_v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_empresa_v2" },
        (payload: any) => {
          const row = payload.new as Pedido | undefined;
          if (!row) return;
          if (row.id_empresa !== empresaId) return;

          // sempre que um pedido da empresa mudar para aprovado, recarrega
          if (row.status === "aprovado") {
            fetchAprovados(empresaId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [empresaId]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return pedidos;
    return pedidos.filter(
      (p) =>
        p.tipo_profissional?.toLowerCase().includes(q) ||
        p.local?.toLowerCase().includes(q) ||
        String(p.id).includes(q)
    );
  }, [filtro, pedidos]);

  const total = pedidos.length;
  const count = filtrados.length;

  const fmtData = (s?: string | null) =>
    s
      ? new Date(s).toLocaleDateString("pt-PT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

  return (
    <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 w-full">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-green-100 dark:bg-green-900/30 p-2">
            <ClipboardCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
              {L.titulo}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {L.desc}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Total aprovados
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {total}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Filtrados
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {count}
            </div>
          </div>
          <div className="hidden sm:block rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Estado
            </div>
            <div className="inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300/60">
              <CheckCircle2 className="w-3.5 h-3.5" /> {L.aprovado}
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5">
          <div className="flex items-center border rounded-xl px-3 sm:px-4 py-2 w-full sm:w-[420px] bg-white dark:bg-[#1e2a3a] shadow-sm">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              className="w-full outline-none text-sm bg-transparent text-gray-700 dark:text-gray-100"
              placeholder={L.buscar}
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {count} {count === 1 ? "registo" : "registos"} encontrados
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : count === 0 ? (
          <div className="mx-auto max-w-[720px]">
            <div className="text-center text-sm sm:text-base text-gray-600 dark:text-gray-300 py-8 sm:py-10 bg-white dark:bg-[#1e2a3a] border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm">
              <p className="font-semibold">{L.nenhumTitulo}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <Info className="w-4 h-4" />
                <span>{L.nenhumDica}</span>
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="grid sm:hidden grid-cols-1 gap-3">
              {filtrados.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      #{p.id}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {L.aprovado}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-100 font-medium">
                    {p.tipo_profissional}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {p.quantidade || 0} {L.profissionais.toLowerCase()}
                  </div>
                  {p.local && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {p.local}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-400 mt-1">
                    {fmtData(p.data_inicio)} → {fmtData(p.data_fim)}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop: tabela */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="hidden sm:block bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl rounded-2xl"
            >
              <div className="overflow-auto max-h-[65vh] rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50/80 dark:bg-slate-800/70 backdrop-blur z-10">
                    <tr className="text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700">
                      <th className="py-3 pl-6 pr-3 font-medium">ID</th>
                      <th className="py-3 px-3 font-medium">{L.empresa}</th>
                      <th className="py-3 px-3 font-medium">{L.tipo}</th>
                      <th className="py-3 px-3 font-medium">
                        {L.profissionais}
                      </th>
                      <th className="py-3 px-3 font-medium">{L.periodo}</th>
                      <th className="py-3 pr-6 pl-3 font-medium">{L.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p, idx) => (
                      <tr
                        key={p.id}
                        className={`border-b last:border-0 dark:border-slate-800 ${
                          idx % 2 === 0
                            ? "bg-white dark:bg-slate-900"
                            : "bg-gray-50/60 dark:bg-slate-900/60"
                        }`}
                      >
                        <td className="py-3 pl-6 pr-3 font-semibold text-gray-800 dark:text-gray-100">
                          #{p.id}
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                          {p.nome_empresa || "—"}
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                          {p.tipo_profissional}
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                          {p.quantidade || 0}
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                          {fmtData(p.data_inicio)} → {fmtData(p.data_fim)}
                        </td>
                        <td className="py-3 pr-6 pl-3">
                          <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full text-[12px] font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> {L.aprovado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
