// src/components/professional/relatorios/DesempenhoGeral.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Loader2,
  Building2,
  Star,
  CheckCircle2,
  Clock4,
  Award,
  TrendingUp,
  Trophy,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

/* =========================
   Tipos
========================= */
type LinhaHorasView = {
  obra_nome: string | null;
  obra_status: string | null;
  data: string; // YYYY-MM-DD
  horas: string | number | null; // numeric pode vir string
};

type AvalRaw = {
  id: string;
  profissional_id: string;
  nota: number | null;
  tipo: string | null;
  mes: number | null;
  ano: number | null;
  criado_em: string | null;
};

type Desempenho = {
  total_obras: number;
  total_horas: number;
  total_presencas: number;
  avaliacao_media: number | null;
  indice_acrobatas: number | null;
};

type Evolucao = { mes: string; horas: number; avaliacao: number };

type RankingRow = {
  profissional_id: string; // auth uid
  nome: string | null;
  foto_url: string | null;
  horas_90d: number | string | null;
  avaliacao_media: number | string | null;
  score: number | string | null;
  posicao: number | string | null;
  total_profissionais: number | string | null;
};

/* =========================
   Helpers
========================= */
function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mesLabelPT(m: number) {
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return nomes[m - 1] ?? "-";
}

function mesAnoLabelPT(m: number, a: number) {
  return `${mesLabelPT(m)}/${a}`;
}

function formatHorasHumanas(valor: number) {
  const totalMin = Math.round((toNum(valor) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

async function resolveAuthUid(user: any): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data?.user?.id) return data.user.id;

  const fallback = user?.auth_id || user?.id || null;
  return fallback ? String(fallback) : null;
}

function getInitials(nome?: string | null) {
  const s = (nome || "").trim();
  if (!s) return "—";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || (a || "—").toUpperCase();
}

/* =========================
   Componente
========================= */
export default function DesempenhoGeral() {
  const { user } = useAuth();

  const [dados, setDados] = useState<Desempenho | null>(null);
  const [evolucao, setEvolucao] = useState<Evolucao[]>([]);
  const [loading, setLoading] = useState(true);

  // Ranking
  const [rankingTop, setRankingTop] = useState<RankingRow[]>([]);
  const [meuRanking, setMeuRanking] = useState<RankingRow | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);

  // Evita “isDark” travado: recalcula por render
  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setRankingLoading(true);

      const authUid = await resolveAuthUid(user);
      if (!authUid) {
        setDados(null);
        setEvolucao([]);
        setRankingTop([]);
        setMeuRanking(null);
        setLoading(false);
        setRankingLoading(false);
        return;
      }

      try {
        /* =========================================================
           1) HORAS + PRESENÇAS + OBRAS (últimos 12 meses)
        ========================================================== */
        const hoje = new Date();
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
          .toISOString()
          .slice(0, 10);

        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        const { data: horasData, error: errHoras } = await supabase
          .from("horas_trabalhadas_profissional_view")
          .select("obra_nome, obra_status, data, horas")
          .eq("profissional_id", authUid)
          .gte("data", inicio)
          .lte("data", fim);

        if (errHoras) throw errHoras;

        const linhasHoras = (horasData as LinhaHorasView[]) || [];

        const total_horas = linhasHoras.reduce((acc, l) => acc + toNum(l.horas), 0);

        const diasSet = new Set(linhasHoras.map((l) => l.data).filter(Boolean));
        const total_presencas = diasSet.size;

        const obrasSet = new Set(linhasHoras.map((l) => (l.obra_nome || "Obra sem nome").trim()));
        const total_obras = obrasSet.size;

        /* =========================================================
           2) AVALIAÇÕES (ID interno)
        ========================================================== */
        async function resolveProfissionalIdInterno(authUidLocal: string, authEmail?: string | null) {
          const tries: Array<{ col: "user_id" | "usuario_id" | "auth_id" }> = [
            { col: "user_id" },
            { col: "usuario_id" },
            { col: "auth_id" },
          ];

          for (const t of tries) {
            const { data, error } = await supabase
              .from("profissionais")
              .select("id")
              .eq(t.col, authUidLocal)
              .maybeSingle();

            if (!error && data?.id) return data.id as string;
          }

          if (authEmail) {
            const { data, error } = await supabase
              .from("profissionais")
              .select("id")
              .ilike("email", authEmail)
              .maybeSingle();

            if (!error && data?.id) return data.id as string;
          }

          return null;
        }

        const authEmail = (user as any)?.email ?? null;
        const profissionalInternoId = await resolveProfissionalIdInterno(authUid, authEmail);

        let avaliacao_media: number | null = null;
        let avalRows: AvalRaw[] = [];

        if (profissionalInternoId) {
          const { data: avs, error: errAv } = await supabase
            .from("avaliacoes_profissionais")
            .select("id, nota, tipo, mes, ano, criado_em, profissional_id")
            .eq("profissional_id", profissionalInternoId)
            .order("criado_em", { ascending: false });

          if (errAv) throw errAv;

          avalRows = ((avs as any) || []) as AvalRaw[];

          const finais = avalRows.filter((r) => (r.tipo || "final").toLowerCase() === "final");
          const base = finais.length ? finais : avalRows;

          const notas = base
            .map((r) => (r.nota == null ? null : Number(r.nota)))
            .filter((n): n is number => n != null && Number.isFinite(n));

          avaliacao_media = notas.length
            ? notas.reduce((a, b) => a + b, 0) / notas.length
            : null;
        }

        /* =========================================================
           3) EVOLUÇÃO MENSAL
        ========================================================== */
        const horasBucket = new Map<string, { sum: number }>();
        for (const l of linhasHoras) {
          if (!l.data) continue;
          const dt = new Date(l.data);
          if (Number.isNaN(dt.getTime())) continue;

          const m = dt.getMonth() + 1;
          const a = dt.getFullYear();
          const key = `${a}-${String(m).padStart(2, "0")}`;

          const cur = horasBucket.get(key) ?? { sum: 0 };
          cur.sum += toNum(l.horas);
          horasBucket.set(key, cur);
        }

        const avBucket = new Map<string, { sum: number; count: number }>();
        for (const r of avalRows) {
          const nota = r.nota == null ? null : Number(r.nota);
          if (nota == null || !Number.isFinite(nota)) continue;

          let m: number | null = r.mes ?? null;
          let a: number | null = r.ano ?? null;

          if ((!m || !a) && r.criado_em) {
            const dt = new Date(r.criado_em);
            if (!Number.isNaN(dt.getTime())) {
              m = dt.getMonth() + 1;
              a = dt.getFullYear();
            }
          }
          if (!m || !a) continue;

          const key = `${a}-${String(m).padStart(2, "0")}`;
          const cur = avBucket.get(key) ?? { sum: 0, count: 0 };
          cur.sum += nota;
          cur.count += 1;
          avBucket.set(key, cur);
        }

        const keys = new Set<string>([
          ...Array.from(horasBucket.keys()),
          ...Array.from(avBucket.keys()),
        ]);

        const evolucaoFinal: Evolucao[] = Array.from(keys)
          .sort((a, b) => a.localeCompare(b))
          .map((key) => {
            const [anoStr, mesStr] = key.split("-");
            const a = Number(anoStr);
            const m = Number(mesStr);
            const label = mesAnoLabelPT(m, a);

            const horas = horasBucket.get(key)?.sum ?? 0;
            const av = avBucket.get(key);
            const avaliacao = av && av.count ? av.sum / av.count : 0;

            return { mes: label, horas, avaliacao };
          });

        /* =========================================================
           4) Índice (determinístico)
        ========================================================== */
        const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        const horasMesAtual = linhasHoras
          .filter((l) => l.data >= inicioMesAtual && l.data <= fimMesAtual)
          .reduce((acc, l) => acc + toNum(l.horas), 0);

        const metaMes = 180;
        const scoreHoras = Math.min(100, (horasMesAtual / metaMes) * 100);
        const scoreAvaliacao =
          avaliacao_media == null ? 0 : Math.min(100, (avaliacao_media / 5) * 100);

        const indice_acrobatas =
          avaliacao_media == null && horasMesAtual <= 0
            ? null
            : Math.round(scoreHoras * 0.7 + scoreAvaliacao * 0.3);

        setDados({
          total_obras,
          total_horas,
          total_presencas,
          avaliacao_media,
          indice_acrobatas,
        });

        setEvolucao(evolucaoFinal);
        setLoading(false);

        /* =========================================================
           5) RANKING (REAL)
        ========================================================== */
        const { data: top, error: errTop } = await supabase
          .from("ranking_profissionais_view")
          .select(
            "profissional_id, nome, foto_url, horas_90d, avaliacao_media, score, posicao, total_profissionais"
          )
          .order("posicao", { ascending: true })
          .limit(10);

        if (errTop) throw errTop;
        setRankingTop(((top as any) || []) as RankingRow[]);

        const { data: me, error: errMe } = await supabase
          .from("ranking_profissionais_view")
          .select(
            "profissional_id, nome, foto_url, horas_90d, avaliacao_media, score, posicao, total_profissionais"
          )
          .eq("profissional_id", authUid)
          .maybeSingle();

        if (errMe) throw errMe;
        setMeuRanking((me as any) || null);

        setRankingLoading(false);
      } catch (e) {
        console.error("[DesempenhoGeral] erro geral:", e);
        setDados(null);
        setEvolucao([]);
        setRankingTop([]);
        setMeuRanking(null);
        setLoading(false);
        setRankingLoading(false);
      }
    }

    carregar();
  }, [user]);

  const hasChart = useMemo(() => evolucao.length > 0, [evolucao]);

  const top3 = useMemo(() => {
    const arr = (rankingTop || []).slice().sort((a, b) => toNum(a.posicao) - toNum(b.posicao));
    return arr.slice(0, 3);
  }, [rankingTop]);

  const restoRanking = useMemo(() => {
    const arr = (rankingTop || []).slice().sort((a, b) => toNum(a.posicao) - toNum(b.posicao));
    return arr.slice(3);
  }, [rankingTop]);

  const meuPos = toNum(meuRanking?.posicao);
  const isInTop3 = meuPos > 0 && meuPos <= 3;

  if (loading)
    return (
      <div className="flex justify-center mt-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <BarChart3 className="text-blue-500 dark:text-blue-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Desempenho Geral</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-8">
        Acompanhe seu progresso, produtividade e reputação dentro da Acrobatas.
      </p>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <Card titulo="Obras" valor={dados?.total_obras ?? 0} icone={<Building2 />} />
        <Card titulo="Horas" valor={dados ? formatHorasHumanas(dados.total_horas) : "—"} icone={<Clock4 />} />
        <Card titulo="Presenças" valor={dados?.total_presencas ?? 0} icone={<CheckCircle2 />} />
        <Card
          titulo="Avaliação"
          valor={dados?.avaliacao_media != null ? `${dados.avaliacao_media.toFixed(1)} / 5` : "—"}
          icone={<Star />}
        />
        <Card
          titulo="Índice"
          valor={dados?.indice_acrobatas != null ? `${dados.indice_acrobatas}%` : "—"}
          icone={<Award />}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-8 sm:mb-10 shadow-sm flex flex-col justify-center items-center">
        {hasChart ? (
          <div className="w-full h-56 sm:h-72">
            <ResponsiveContainer>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#cbd5e1"} />
                <XAxis dataKey="mes" stroke={isDark ? "#94a3b8" : "#334155"} />
                <YAxis stroke={isDark ? "#94a3b8" : "#334155"} />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === "horas") return [formatHorasHumanas(toNum(value)), "Horas"];
                    if (name === "avaliacao") return [`${toNum(value).toFixed(1)} / 5`, "Avaliação"];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: isDark ? "#1e293b" : "#ffffff",
                    borderRadius: 8,
                    border: "none",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="horas"
                  stroke={isDark ? "#3B82F6" : "#2563EB"}
                  strokeWidth={2.5}
                  name="horas"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avaliacao"
                  stroke={isDark ? "#EAB308" : "#CA8A04"}
                  strokeWidth={2.5}
                  name="avaliacao"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center">
            <TrendingUp className="mx-auto mb-3 text-slate-400 opacity-50" size={36} />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Nenhum dado de desempenho disponível ainda
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Continue registrando presenças e avaliações — seu progresso aparecerá aqui automaticamente.
            </p>
          </div>
        )}
      </div>

      {/* RANKING */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ranking Acrobatas
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              Posição baseada no score (horas 90 dias + avaliação).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-600 dark:text-yellow-400" size={18} />
            <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
              {rankingLoading ? (
                "Carregando..."
              ) : meuRanking?.posicao ? (
                <>
                  #{toNum(meuRanking.posicao)}{" "}
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    / {toNum(meuRanking.total_profissionais)}
                  </span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* Meu resumo (sem duplicar quando estiver no Top 3) */}
        <div className="mb-4">
          {rankingLoading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm">Carregando seu ranking...</span>
            </div>
          ) : meuRanking ? (
            isInTop3 ? (
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1b2332] p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar nome={meuRanking.nome} fotoUrl={meuRanking.foto_url} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                      {meuRanking.nome || "Sem nome"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Score: {toNum(meuRanking.score).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">#{meuPos}</div>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar nome={meuRanking.nome} fotoUrl={meuRanking.foto_url} />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold truncate">
                        {meuRanking.nome || "Sem nome"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Score: {toNum(meuRanking.score).toFixed(2)} • Horas(90d):{" "}
                        {formatHorasHumanas(toNum(meuRanking.horas_90d))} • Avaliação:{" "}
                        {toNum(meuRanking.avaliacao_media).toFixed(1)} / 5
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sua posição</div>
                    <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                      #{toNum(meuRanking.posicao)}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Ainda sem ranking (necessário ter pelo menos algum dado de horas/avaliação).
            </div>
          )}
        </div>

        {/* Top 3 — Mobile carousel + Desktop podium */}
        {!rankingLoading && top3.length > 0 ? (
          <>
            <div className="sm:hidden">
              <Top3CarouselMobile top3={top3} meuId={meuRanking?.profissional_id || null} />
            </div>
            <div className="hidden sm:block">
              <Top3PodiumDesktop top3={top3} meuId={meuRanking?.profissional_id || null} />
            </div>
          </>
        ) : null}

        {/* Mobile Top 10 compacto */}
        {!rankingLoading ? (
          <div className="sm:hidden mt-3">
            <RankingListMobileCompact rows={restoRanking} meuId={meuRanking?.profissional_id || null} />
          </div>
        ) : null}

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Profissional</th>
                <th className="py-2 pr-2">Horas (90d)</th>
                <th className="py-2 pr-2">Avaliação</th>
                <th className="py-2 pr-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {rankingLoading ? (
                <tr>
                  <td className="py-3 text-gray-500 dark:text-gray-400" colSpan={5}>
                    Carregando top 10...
                  </td>
                </tr>
              ) : restoRanking.length ? (
                restoRanking.map((r) => {
                  const isMe =
                    meuRanking?.profissional_id &&
                    r.profissional_id === meuRanking.profissional_id;

                  return (
                    <tr
                      key={r.profissional_id}
                      className={`border-b border-zinc-100 dark:border-zinc-800 ${
                        isMe ? "bg-blue-50/60 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <td className="py-2 pr-2 font-semibold">{toNum(r.posicao)}</td>

                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar nome={r.nome} fotoUrl={r.foto_url} size="sm" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {r.nome || "Sem nome"}
                              {isMe ? (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                  (você)
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 pr-2">{formatHorasHumanas(toNum(r.horas_90d))}</td>
                      <td className="py-2 pr-2">{toNum(r.avaliacao_media).toFixed(1)} / 5</td>
                      <td className="py-2 pr-2 font-semibold">{toNum(r.score).toFixed(2)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-3 text-gray-500 dark:text-gray-400" colSpan={5}>
                    Nenhum profissional no ranking ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-8 sm:mt-12 text-center">
        <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
          Comece a construir seu histórico
        </p>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-500 max-w-sm mx-auto">
          Cada presença e avaliação conta pontos no seu desempenho geral dentro da Acrobatas.
        </p>
      </div>
    </div>
  );
}

/* =========================
   Card
========================= */
function Card({
  titulo,
  valor,
  icone,
  className,
}: {
  titulo: string;
  valor: string | number;
  icone: any;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={`rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 ${
        className || ""
      }`}
    >
      <div className="flex justify-center mb-1 sm:mb-2 text-blue-600 dark:text-blue-400">
        {icone}
      </div>
      <p className="text-[11px] sm:text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{valor}</p>
    </motion.div>
  );
}

/* =========================
   Avatar
========================= */
function Avatar({
  nome,
  fotoUrl,
  size = "md",
}: {
  nome?: string | null;
  fotoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const [broken, setBroken] = useState(false);

  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const text = size === "sm" ? "text-[11px]" : "text-sm";

  const canShowImage = !!fotoUrl && !broken;

  if (canShowImage) {
    return (
      <img
        src={fotoUrl as string}
        alt={nome || "avatar"}
        className={`${dim} rounded-full object-cover border border-zinc-200 dark:border-zinc-700`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 ${text} font-semibold text-zinc-700 dark:text-zinc-200`}
      title={nome || ""}
    >
      {getInitials(nome)}
    </div>
  );
}

/* =========================
   TOP 3 — Mobile carousel (snap)
========================= */
function Top3CarouselMobile({
  top3,
  meuId,
}: {
  top3: RankingRow[];
  meuId: string | null;
}) {
  const sorted = top3.slice().sort((a, b) => toNum(a.posicao) - toNum(b.posicao));

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top 3</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Deslize</div>
      </div>

      {/* PATCH: pb-2 + py-1 pra não “cortar” o badge */}
      <div className="-mx-4 px-4 overflow-x-auto pb-2">
        <div className="flex gap-3 snap-x snap-mandatory py-1">
          {sorted.map((row) => {
            const place = toNum(row.posicao) as 1 | 2 | 3;
            const isFirst = place === 1;
            const destaque = !!meuId && row.profissional_id === meuId;

            return (
              <div
                key={row.profissional_id}
                className={["snap-start shrink-0", isFirst ? "w-[86%]" : "w-[78%]"].join(" ")}
              >
                <PodiumCard
                  place={place}
                  row={row}
                  destaque={destaque}
                  variant={place === 1 ? "gold" : place === 2 ? "silver" : "bronze"}
                  isFirst={isFirst}
                  mobileHero
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================
   TOP 3 — Desktop podium
========================= */
function Top3PodiumDesktop({
  top3,
  meuId,
}: {
  top3: RankingRow[];
  meuId: string | null;
}) {
  const sorted = top3.slice().sort((a, b) => toNum(a.posicao) - toNum(b.posicao));
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-3 sm:gap-4 items-stretch">
        {second ? (
          <PodiumCard
            place={2}
            row={second}
            destaque={meuId && second.profissional_id === meuId}
            variant="silver"
          />
        ) : (
          <div />
        )}

        {first ? (
          <PodiumCard
            place={1}
            row={first}
            destaque={meuId && first.profissional_id === meuId}
            variant="gold"
            isFirst
          />
        ) : (
          <div />
        )}

        {third ? (
          <PodiumCard
            place={3}
            row={third}
            destaque={meuId && third.profissional_id === meuId}
            variant="bronze"
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

/* =========================
   Podium Card (badge fix mobile)
========================= */
function PodiumCard({
  place,
  row,
  destaque,
  variant,
  isFirst,
  mobileHero,
}: {
  place: 1 | 2 | 3;
  row: RankingRow;
  destaque: boolean | null;
  variant: "gold" | "silver" | "bronze";
  isFirst?: boolean;
  mobileHero?: boolean;
}) {
  const ring =
    variant === "gold"
      ? "ring-yellow-400 dark:ring-yellow-400/70"
      : variant === "silver"
      ? "ring-zinc-400 dark:ring-zinc-300/70"
      : "ring-amber-600 dark:ring-amber-700/50";

  const badge =
    variant === "gold"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-200 dark:border-yellow-400/30"
      : variant === "silver"
      ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-200/10 dark:text-zinc-200 dark:border-zinc-200/20"
      : "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/20";

  const baseBg = isFirst
    ? "bg-gradient-to-b from-white via-white to-zinc-50 dark:from-[#1f2a3d] dark:via-[#1b2332] dark:to-[#1b2332]"
    : "bg-gradient-to-b from-white to-white dark:from-[#1f2a3d] dark:to-[#1b2332]";

  const height = isFirst ? "min-h-[170px] sm:min-h-[175px]" : "min-h-[150px] sm:min-h-[155px]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        "relative rounded-2xl border border-zinc-200 dark:border-zinc-700",
        baseBg,
        "shadow-sm px-3 py-3 sm:px-4 sm:py-4",
        height,
        destaque ? "ring-2 ring-blue-500/35" : "",
        mobileHero ? "overflow-hidden" : "",
      ].join(" ")}
    >
      {/* PATCH: badge dentro no mobileHero, flutuante no desktop */}
      <div
        className={[
          "absolute z-10 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
          mobileHero ? "top-2 left-2" : "-top-3 left-3 sm:left-4",
          badge,
        ].join(" ")}
      >
        #{place}
      </div>

      {/* Hero visual do #1 no mobile */}
      {mobileHero && isFirst ? (
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-yellow-200/30 dark:bg-yellow-500/10 blur-2xl" />
      ) : null}

      <div className="flex items-center gap-3 mt-2">
        <div className={["rounded-full ring-2", ring, "p-0.5"].join(" ")}>
          <Avatar nome={row.nome} fotoUrl={row.foto_url} size={isFirst ? "md" : "sm"} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold truncate text-gray-900 dark:text-gray-100">
              {row.nome || "Sem nome"}
              {destaque ? (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(você)</span>
              ) : null}
            </div>
            {isFirst ? (
              <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
                <Trophy size={16} />
              </div>
            ) : null}
          </div>

          <div className="text-xs text-gray-700 dark:text-gray-400">
            Score: <span className="font-semibold">{toNum(row.score).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Chips */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1 bg-white/70 dark:bg-transparent">
          <span className="text-gray-600 dark:text-gray-400">Horas</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatHorasHumanas(toNum(row.horas_90d))}
          </span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1 bg-white/70 dark:bg-transparent">
          <span className="text-gray-600 dark:text-gray-400">Avaliação</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {toNum(row.avaliacao_media).toFixed(1)} / 5
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* =========================
   Ranking mobile compacto (Top 10)
========================= */
function RankingListMobileCompact({
  rows,
  meuId,
}: {
  rows: RankingRow[];
  meuId: string | null;
}) {
  if (!rows?.length) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Nenhum profissional no ranking ainda.
      </div>
    );
  }

  const firstChunk = rows.slice(0, 2);
  const rest = rows.slice(2);

  return (
    <div className="mt-2">
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Top 10
      </div>

      <div className="space-y-2">
        {firstChunk.map((r) => (
          <RankingRowMobileLine
            key={r.profissional_id}
            row={r}
            isMe={!!meuId && r.profissional_id === meuId}
          />
        ))}
      </div>

      {rest.length ? (
        <details className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1b2332]">
          <summary className="list-none cursor-pointer select-none p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Ver mais</span>
            <ChevronDown className="text-gray-500 dark:text-gray-400" size={18} />
          </summary>

          <div className="px-3 pb-3 space-y-2">
            {rest.map((r) => (
              <RankingRowMobileLine
                key={r.profissional_id}
                row={r}
                isMe={!!meuId && r.profissional_id === meuId}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function RankingRowMobileLine({
  row,
  isMe,
}: {
  row: RankingRow;
  isMe: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1b2332] p-3",
        isMe ? "ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-900/10" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 shrink-0 text-sm font-semibold text-gray-900 dark:text-gray-100">
            #{toNum(row.posicao)}
          </div>
          <Avatar nome={row.nome} fotoUrl={row.foto_url} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
              {row.nome || "Sem nome"}
              {isMe ? (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(você)</span>
              ) : null}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Score: {toNum(row.score).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] text-gray-500 dark:text-gray-400">90d</div>
          <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {formatHorasHumanas(toNum(row.horas_90d))}
          </div>
        </div>
      </div>
    </div>
  );
}
