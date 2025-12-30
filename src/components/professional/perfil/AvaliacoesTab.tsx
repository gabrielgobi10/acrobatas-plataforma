import { useEffect, useState } from "react";
import {
  Star,
  ClipboardList,
  CalendarDays,
  Trophy,
  Clock4,
  Loader2,
  MessageSquareText,
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

// Tipagens
type AvaliacaoResumo = {
  nota_media: number;
  total_avaliacoes: number;
  melhor_mes: string;
  ultima_data: string;
  ranking: string;
};

type EvolucaoNota = {
  mes: string; // "Jan/2025"
  nota: number;
};

type AvaliacaoDetalhe = {
  data: string; // "dd/mm/aaaa"
  avaliador: string; // hoje: "—" (avaliado_por está órfão no seu banco)
  obra: string; // nome da obra ou "Obra não informada"
  nota: number;
  comentario: string;
};

type AvalRaw = {
  id: string;
  obra_id: string | null;
  profissional_id: string;
  avaliado_por: string | null;
  nota: number | null;
  comentario: string | null;
  tipo: string | null; // "final" | "mensal" | null
  mes: number | null;
  ano: number | null;
  criado_em: string | null;

  pontualidade?: number | null;
  produtividade?: number | null;
  comportamento?: number | null;
  seguranca?: number | null;
};

type ProfRow = { id: string };
type ObraRow = { id: string; nome: string | null };

function formatDatePT(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("pt-PT");
}

function mesLabelPT(m: number) {
  const nomes = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return nomes[m - 1] ?? "-";
}

function mesAnoLabelPT(m: number, a: number) {
  return `${mesLabelPT(m)}/${a}`;
}

export default function Avaliacoes() {
  const { user } = useAuth();

  const [resumo, setResumo] = useState<AvaliacaoResumo | null>(null);
  const [evolucao, setEvolucao] = useState<EvolucaoNota[]>([]);
  const [feedbacks, setFeedbacks] = useState<AvaliacaoDetalhe[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  async function resolveProfissionalId(
    authUid: string,
    authEmail?: string | null
  ): Promise<string | null> {
    // Ordem correta baseada no seu print do Flávio:
    // profissionais.user_id = auth.users.id (e usuario_id também existe)
    const tries: Array<{
      col: "user_id" | "usuario_id" | "auth_id";
      label: string;
    }> = [
      { col: "user_id", label: "user_id" },
      { col: "usuario_id", label: "usuario_id" },
      { col: "auth_id", label: "auth_id" },
    ];

    for (const t of tries) {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id")
        .eq(t.col, authUid);

      if (error) {
        console.error("[Avaliacoes] erro ao buscar profissional por", t.label, error);
        continue;
      }

      const rows = (data as ProfRow[]) || [];
      if (rows.length === 1) return rows[0].id;

      if (rows.length > 1) {
        console.error(
          `[Avaliacoes] inconsistência: ${rows.length} profissionais encontrados para ${t.label}=${authUid}`
        );
        return null;
      }
    }

    // Fallback por email (robustez quando IDs estiverem inconsistentes)
    if (authEmail) {
      const { data, error } = await supabase
        .from("profissionais")
        .select("id")
        .ilike("email", authEmail)
        .maybeSingle();

      if (error) {
        console.error("[Avaliacoes] erro ao buscar profissional por email:", error);
        return null;
      }

      return data?.id ?? null;
    }

    return null;
  }

  useEffect(() => {
    (async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const authEmail = (user as any)?.email ?? null;

        const profissionalId = await resolveProfissionalId(user.id, authEmail);

        // Debug útil (pode remover depois)
        console.log("[Avaliacoes] auth user.id:", user.id);
        console.log("[Avaliacoes] auth user.email:", authEmail);
        console.log("[Avaliacoes] profissionalId resolvido:", profissionalId);

        if (!profissionalId) {
          setResumo(null);
          setEvolucao([]);
          setFeedbacks([]);
          setLoading(false);
          return;
        }

        // 1) Buscar avaliações do profissional
        const { data: avs, error: errAv } = await supabase
          .from("avaliacoes_profissionais")
          .select(
            "id, obra_id, profissional_id, avaliado_por, nota, comentario, tipo, mes, ano, criado_em, pontualidade, produtividade, comportamento, seguranca"
          )
          .eq("profissional_id", profissionalId)
          .order("criado_em", { ascending: false });

        if (errAv) throw errAv;

        const rows: AvalRaw[] = (avs as any) || [];

        // Debug útil (pode remover depois)
        console.log("[Avaliacoes] avaliações retornadas:", rows.length);

        if (!rows.length) {
          setResumo(null);
          setEvolucao([]);
          setFeedbacks([]);
          setLoading(false);
          return;
        }

        // 2) Buscar nomes das obras
        const obraIds = Array.from(
          new Set(rows.map((r) => r.obra_id).filter(Boolean) as string[])
        );

        const mapaObras = new Map<string, string | null>();
        if (obraIds.length) {
          const { data: obras, error: errObras } = await supabase
            .from("obras")
            .select("id,nome")
            .in("id", obraIds);

          if (errObras) {
            console.error("[Avaliacoes] erro ao buscar obras:", errObras);
          } else {
            (obras as ObraRow[] | null)?.forEach((o) => {
              mapaObras.set(o.id, o.nome);
            });
          }
        }

        // 3) Calcular resumo + evolução (média mensal) + feedbacks
        const notasValidas = (arr: AvalRaw[]) =>
          arr
            .map((a) => (a.nota == null ? null : Number(a.nota)))
            .filter((n): n is number => n != null && !Number.isNaN(n));

        // Preferir tipo final, se existir; senão, usa tudo (igual seu tab)
        const finais = rows.filter(
          (r) => (r.tipo || "final").toLowerCase() === "final"
        );
        const baseResumo = finais.length ? finais : rows;

        const notasResumo = notasValidas(baseResumo);
        const media = notasResumo.length
          ? notasResumo.reduce((acc, n) => acc + n, 0) / notasResumo.length
          : 0;

        const ultimaData = rows[0]?.criado_em ?? null;

        // Evolução mensal
        type Bucket = { key: string; sum: number; count: number; mesLabel: string };
        const buckets = new Map<string, Bucket>();

        for (const r of rows) {
          const nota = r.nota == null ? null : Number(r.nota);
          if (nota == null || Number.isNaN(nota)) continue;

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
          const label = mesAnoLabelPT(m, a);

          const cur = buckets.get(key) ?? { key, sum: 0, count: 0, mesLabel: label };
          cur.sum += nota;
          cur.count += 1;
          buckets.set(key, cur);
        }

        const evol = Array.from(buckets.values())
          .sort((x, y) => x.key.localeCompare(y.key))
          .map((b) => ({
            mes: b.mesLabel,
            nota: b.count ? b.sum / b.count : 0,
          }));

        // Melhor mês = maior média mensal
        let melhorMes = "-";
        if (evol.length) {
          const best = evol.reduce((acc, cur) => (cur.nota > acc.nota ? cur : acc), evol[0]);
          melhorMes = best.mes;
        }

        const resumoReal: AvaliacaoResumo = {
          nota_media: media,
          total_avaliacoes: rows.length,
          melhor_mes: melhorMes,
          ultima_data: ultimaData ? formatDatePT(ultimaData) : "-",
          ranking: "—",
        };

        // Feedbacks (últimos 20)
        const det: AvaliacaoDetalhe[] = rows.slice(0, 20).map((r) => {
          const obraNome = r.obra_id ? mapaObras.get(r.obra_id) : null;

          return {
            data: r.criado_em ? formatDatePT(r.criado_em) : "-",
            avaliador: "—", // avaliador_id está órfão no seu banco (não existe em public.* nem auth.users)
            obra: obraNome || "Obra não informada",
            nota: r.nota == null ? 0 : Number(r.nota),
            comentario: r.comentario || "",
          };
        });

        setResumo(resumoReal);
        setEvolucao(evol);
        setFeedbacks(det);
      } catch (e) {
        console.error("[Avaliacoes] erro geral:", e);
        setResumo(null);
        setEvolucao([]);
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading)
    return (
      <div className="flex justify-center mt-20">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );

  if (!resumo)
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <Star size={32} className="mx-auto mb-3 text-yellow-400 opacity-70" />
        Nenhuma avaliação encontrada ainda.
        <br />
        Assim que suas obras forem avaliadas, elas aparecerão aqui.
      </div>
    );

  return (
    <div className="p-4 sm:p-8 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <Star className="text-yellow-500 dark:text-yellow-400 w-6 h-6 sm:w-7 sm:h-7" />
        <h1 className="text-lg sm:text-2xl font-semibold">Avaliações</h1>
      </div>

      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-8">
        Acompanhe suas notas, evolução e comentários deixados por empresas e encarregados dentro da Acrobatas.
      </p>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-10">
        <Card
          titulo="Nota média"
          valor={`${resumo.nota_media.toFixed(1)} / 5`}
          icone={<Star />}
          cor="text-yellow-500"
        />
        <Card
          titulo="Avaliações"
          valor={resumo.total_avaliacoes}
          icone={<ClipboardList />}
        />
        <Card titulo="Melhor mês" valor={resumo.melhor_mes} icone={<CalendarDays />} />
        <Card titulo="Última" valor={resumo.ultima_data} icone={<Clock4 />} />
        <Card titulo="Ranking" valor={resumo.ranking} icone={<Trophy />} cor="text-blue-500" />
      </div>

      {/* Gráfico de evolução */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 mb-8 sm:mb-10 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-yellow-500 dark:text-yellow-400">
          <TrendingLine /> Evolução das notas
        </h2>

        {!evolucao.length ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sem dados suficientes para gerar evolução mensal.
          </div>
        ) : (
          <div className="h-52 sm:h-64">
            <ResponsiveContainer>
              <LineChart data={evolucao}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "#1e293b" : "#cbd5e1"}
                />
                <XAxis dataKey="mes" stroke={isDark ? "#94a3b8" : "#334155"} />
                <YAxis
                  domain={[0, 5]}
                  stroke={isDark ? "#94a3b8" : "#334155"}
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="nota"
                  stroke={isDark ? "#FACC15" : "#CA8A04"}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Feedbacks */}
      <div className="bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-lg font-medium mb-4 flex items-center gap-2 text-blue-500 dark:text-blue-400">
          <MessageSquareText size={18} /> Últimos feedbacks recebidos
        </h2>

        {/* MOBILE - cards */}
        <div className="space-y-3 sm:hidden">
          {feedbacks.map((f, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-[#232c3d] rounded-xl border border-zinc-200 dark:border-zinc-700 p-3"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-500">{f.data}</p>
                <span
                  className={`text-sm font-semibold ${
                    f.nota >= 4.5
                      ? "text-green-500"
                      : f.nota >= 4
                      ? "text-yellow-500"
                      : "text-red-500"
                  }`}
                >
                  {Number.isFinite(f.nota) ? f.nota.toFixed(1) : "0.0"}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {f.obra}
              </p>
              <p className="text-xs text-gray-400">{f.avaliador}</p>
              {f.comentario ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  “{f.comentario}”
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                  Sem comentário.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* DESKTOP - tabela */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-zinc-300 dark:border-zinc-700">
                <th className="py-3 px-2">Data</th>
                <th className="py-3 px-2">Avaliador</th>
                <th className="py-3 px-2">Obra</th>
                <th className="py-3 px-2">Nota</th>
                <th className="py-3 px-2">Comentário</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f, i) => (
                <motion.tr
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-[#243043] transition"
                >
                  <td className="py-3 px-2">{f.data}</td>
                  <td className="py-3 px-2 font-medium">{f.avaliador}</td>
                  <td className="py-3 px-2">{f.obra}</td>
                  <td
                    className={`py-3 px-2 font-semibold ${
                      f.nota >= 4.5
                        ? "text-green-500"
                        : f.nota >= 4
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  >
                    {Number.isFinite(f.nota) ? f.nota.toFixed(1) : "0.0"}
                  </td>
                  <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                    {f.comentario || "—"}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Card reutilizável
function Card({
  titulo,
  valor,
  icone,
  cor,
}: {
  titulo: string;
  valor: string | number;
  icone: any;
  cor?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition bg-white dark:bg-[#1b2332] border border-zinc-200 dark:border-zinc-700"
    >
      <div
        className={`flex justify-center mb-1 sm:mb-2 ${
          cor || "text-blue-500 dark:text-blue-400"
        }`}
      >
        {icone}
      </div>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{titulo}</p>
      <p className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
        {valor}
      </p>
    </motion.div>
  );
}

// Ícone customizado
function TrendingLine() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
    </svg>
  );
}
