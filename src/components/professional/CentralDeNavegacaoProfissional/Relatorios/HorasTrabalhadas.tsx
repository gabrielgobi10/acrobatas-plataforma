// src/components/professional/CentralDeNavegacaoProfissional/Relatorios/HorasTrabalhadas.tsx
// ============================================================================
// ⏱️ HORAS TRABALHADAS – dados reais + estado vazio
// - Usa o AUTH UID real (auth.users.id) como profissional_id (igual Presença)
// - View esperada: public.horas_trabalhadas_profissional_view
// ============================================================================

import { useEffect, useState } from "react";
import {
  Clock4,
  CalendarDays,
  Building2,
  TrendingUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

type LinhaViewHoras = {
  obra_nome: string | null;
  obra_status: string | null;
  data: string; // date (YYYY-MM-DD)
  horas: string | number | null;
};

type RegistroHoras = {
  obra_nome: string;
  total_horas: number;
  ultimo_dia: string;
  status: string;
};

type ResumoHoras = {
  total_mes: number;
  meta_mes: number;
  percentual: number;
  obra_destaque: string;
  media_dia: number;
};

// Formata 1.9283333333333332 -> "1h56m"
function formatHorasHumanas(valor: number) {
  const totalMin = Math.round((Number(valor) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  if (h <= 0) return `${m}m`;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

export default function HorasTrabalhadas() {
  const { user } = useAuth();
  const [resumo, setResumo] = useState<ResumoHoras | null>(null);
  const [detalhes, setDetalhes] = useState<RegistroHoras[]>([]);
  const [grafico, setGrafico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  function setResumoZero() {
    const resumoZerado: ResumoHoras = {
      total_mes: 0,
      meta_mes: 180,
      percentual: 0,
      obra_destaque: "—",
      media_dia: 0,
    };
    setResumo(resumoZerado);
    setDetalhes([]);
    setGrafico([]);
  }

  async function resolveAuthUid(): Promise<string | null> {
    // 1) Fonte mais confiável: JWT atual
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user?.id) return data.user.id;

    // 2) Fallback: teu AuthContext às vezes expõe auth_id
    const fallback = (user as any)?.auth_id || user?.id || null;
    return fallback ? String(fallback) : null;
  }

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const authUid = await resolveAuthUid();
      if (!authUid) {
        console.error("[HORAS TRABALHADAS] authUid não resolvido:", { user });
        setResumoZero();
        setLoading(false);
        return;
      }

      // limites do mês atual (YYYY-MM-DD)
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      console.log("[HORAS TRABALHADAS] authUid:", authUid);
      console.log("[HORAS TRABALHADAS] range:", { inicioMes, fimMes });

      const { data, error } = await supabase
        .from("horas_trabalhadas_profissional_view")
        .select("obra_nome, obra_status, data, horas")
        .eq("profissional_id", authUid)
        .gte("data", inicioMes)
        .lte("data", fimMes);

      if (error) {
        console.error("[HORAS TRABALHADAS] erro ao buscar horas:", error);
        setResumoZero();
        setLoading(false);
        return;
      }

      const linhas = (data as LinhaViewHoras[]) || [];
      console.log("[HORAS TRABALHADAS] linhas:", linhas.length, linhas);

      if (!linhas.length) {
        setResumoZero();
        setLoading(false);
        return;
      }

      const getHoras = (l: LinhaViewHoras) => Number(l.horas ?? 0) || 0;

      // ---------- 1) Resumo do mês ----------
      const total_mes = linhas.reduce((sum, l) => sum + getHoras(l), 0);

      const meta_mes = 180;
      const percentual = meta_mes > 0 ? (total_mes / meta_mes) * 100 : 0;

      // média por dia trabalhado (dias com registro)
      const horasPorDia = new Map<string, number>();
      linhas.forEach((l) => {
        const dia = l.data;
        const horas = getHoras(l);
        horasPorDia.set(dia, (horasPorDia.get(dia) || 0) + horas);
      });
      const diasComHoras = horasPorDia.size || 1;
      const media_dia = total_mes / diasComHoras;

      // obra destaque (mais horas no mês)
      type AgrObra = {
        obra_nome: string;
        total_horas: number;
        ultimo_dia: string;
        status: string;
      };
      const mapaObras = new Map<string, AgrObra>();

      linhas.forEach((l) => {
        const key = l.obra_nome || "Obra sem nome";
        const horas = getHoras(l);
        const status = l.obra_status || "Em andamento";

        const existente = mapaObras.get(key);
        if (!existente) {
          mapaObras.set(key, {
            obra_nome: key,
            total_horas: horas,
            ultimo_dia: l.data,
            status,
          });
        } else {
          existente.total_horas += horas;
          if (new Date(l.data) > new Date(existente.ultimo_dia)) {
            existente.ultimo_dia = l.data;
          }
          mapaObras.set(key, existente);
        }
      });

      const listaObras = Array.from(mapaObras.values()).sort(
        (a, b) => b.total_horas - a.total_horas
      );

      const obra_destaque =
        listaObras.length > 0 ? listaObras[0].obra_nome : "—";

      setResumo({
        total_mes,
        meta_mes,
        percentual,
        obra_destaque,
        media_dia,
      });

      // ---------- 2) Detalhes por obra ----------
      setDetalhes(
        listaObras.map((o) => ({
          obra_nome: o.obra_nome,
          total_horas: o.total_horas,
          ultimo_dia: new Date(o.ultimo_dia).toLocaleDateString("pt-PT"),
          status: o.status,
        }))
      );

      // ---------- 3) Gráfico semanal ----------
      const horasPorSemana = new Map<number, number>();

      linhas.forEach((l) => {
        const d = new Date(l.data);
        const diaDoMes = d.getDate();
        const semana = Math.floor((diaDoMes - 1) / 7) + 1;
        const horas = getHoras(l);
        horasPorSemana.set(semana, (horasPorSemana.get(semana) || 0) + horas);
      });

      setGrafico(
        Array.from(horasPorSemana.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([semana, horas]) => ({
            semana: `Semana ${semana}`,
            horas,
          }))
      );

      setLoading(false);
    }

    carregar();
  }, [user]);

  const bgCard = "bg-white dark:bg-slate-800";
  const borderCard = "border border-slate-200 dark:border-slate-700";
  const textMuted = "text-gray-600 dark:text-gray-400";
  const textPrimary = "text-gray-900 dark:text-gray-100";

  if (loading)
    return (
      <div className="flex justify-center mt-20">
        <Loader2
          className="animate-spin text-blue-500 dark:text-blue-400"
          size={28}
        />
      </div>
    );

  if (!resumo) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <AlertCircle size={32} className="mx-auto mb-3 opacity-60" />
        Nenhum registro de horas encontrado. <br />
        Comece a marcar presenças para acompanhar seu progresso diário.
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 ${textPrimary}`}>
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <Clock4 className="text-blue-500 dark:text-blue-400" size={26} />
        <h1 className="text-xl md:text-2xl font-semibold">Horas Trabalhadas</h1>
      </div>

      <p className={`${textMuted} mb-6 md:mb-8 text-sm md:text-base`}>
        Veja abaixo o total de horas trabalhadas por obra, semana e mês.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8 md:mb-10">
        <Card
          titulo="Total do mês"
          valor={formatHorasHumanas(resumo.total_mes)}
          icone={<Clock4 />}
        />
        <Card
          titulo="Meta mensal"
          valor={`${resumo.meta_mes}h`}
          icone={<CalendarDays />}
        />
        <Card
          titulo="Atingido"
          valor={`${Math.round(resumo.percentual)}%`}
          icone={<TrendingUp />}
          cor={
            resumo.percentual >= 80
              ? "text-green-500"
              : resumo.percentual >= 50
              ? "text-yellow-500"
              : "text-red-500"
          }
        />
        <Card
          titulo="Obra destaque"
          valor={resumo.obra_destaque}
          icone={<Building2 />}
        />
        <Card
          titulo="Média por dia"
          valor={formatHorasHumanas(resumo.media_dia)}
          icone={<Clock4 />}
          className="col-span-2 sm:col-span-3 lg:col-span-1"
        />
      </div>

      <div className={`${bgCard} ${borderCard} rounded-2xl p-4 md:p-6 mb-8 md:mb-10`}>
        <h2 className="text-base md:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <TrendingUp size={18} /> Evolução semanal
        </h2>

        {grafico.length > 0 ? (
          <div className="h-52 md:h-64">
            <ResponsiveContainer>
              <BarChart data={grafico}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "#1e293b" : "#e2e8f0"}
                />
                <XAxis
                  dataKey="semana"
                  stroke={isDark ? "#94a3b8" : "#475569"}
                />
                <YAxis
                  stroke={isDark ? "#94a3b8" : "#475569"}
                  tickFormatter={(v) => formatHorasHumanas(Number(v))}
                />
                <Tooltip
                  formatter={(value: any) => {
                    const n = Number(value ?? 0);
                    return [formatHorasHumanas(n), "Horas"];
                  }}
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    borderRadius: 8,
                    border: "none",
                  }}
                />
                <Bar
                  dataKey="horas"
                  fill={isDark ? "#3B82F6" : "#2563EB"}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
            <AlertCircle className="mb-2 opacity-70" />
            <p className="text-sm">Nenhum registro de horas neste mês ainda.</p>
            <p className="text-xs opacity-80">
              Assim que você marcar presenças, sua evolução semanal aparecerá
              aqui.
            </p>
          </div>
        )}
      </div>

      <div className={`${bgCard} ${borderCard} rounded-2xl p-4 md:p-6`}>
        <h2 className="text-base md:text-lg font-medium mb-4 text-blue-500 dark:text-blue-400">
          Detalhes por obra
        </h2>

        {detalhes.length > 0 ? (
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 px-2">Obra</th>
                  <th className="py-2 px-2">Horas</th>
                  <th className="py-2 px-2">Último dia</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {detalhes.map((obra, i) => (
                  <motion.tr
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-700/40 transition"
                  >
                    <td className="py-2 px-2 font-medium">{obra.obra_nome}</td>
                    <td className="py-2 px-2">
                      {formatHorasHumanas(obra.total_horas)}
                    </td>
                    <td className="py-2 px-2 text-gray-500 dark:text-gray-400">
                      {obra.ultimo_dia}
                    </td>
                    <td
                      className={`py-2 px-2 font-medium ${
                        obra.status.toLowerCase().includes("conclu")
                          ? "text-green-500"
                          : "text-blue-500"
                      }`}
                    >
                      {obra.status}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            Nenhuma obra com horas registradas neste mês ainda.
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  icone,
  cor,
  className,
}: {
  titulo: string;
  valor: string | number;
  icone: any;
  cor?: string;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      className={`rounded-xl p-3 md:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${
        className || ""
      }`}
    >
      <div
        className={`flex justify-center mb-1 md:mb-2 ${
          cor || "text-blue-500 dark:text-blue-400"
        }`}
      >
        {icone}
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">
        {titulo}
      </p>
      <p className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
        {valor}
      </p>
    </motion.div>
  );
}
