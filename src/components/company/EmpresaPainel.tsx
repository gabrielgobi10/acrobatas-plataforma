// src/components/company/EmpresaPainel.tsx
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Building2, Users, DollarSign, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import GraficosPainel from "./GraficosPainel";
import { useTranslation } from "react-i18next";

export type QuickSection =
  | "novos-pedidos"
  | "obras-ativas"
  | "documentos-profissionais"
  | "equipes-em-campo";

type Props = { onQuickAction?: (section: QuickSection) => void };

type ObraBase = {
  id: string;
  nome?: string | null;
  local?: string | null;
  empresa_id?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  created_at?: string | null;
};

type Relatorio = { obra_id: string; progresso?: number | null };
type Vinculo = { obra_id: string; status?: string | null };
type CustoObra = {
  obra_id: string;
  valor?: number | null;
  data?: string | null;
  mes?: string | null;
};

// ===== Helpers =====
function formatEUR(v: number) {
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function ym(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toISOString().slice(0, 7);
  } catch {
    return "—";
  }
}

function serieMinima(base: Record<string, number>, meses = 3) {
  const map = new Map(Object.entries(base));
  const now = new Date();
  for (let i = 0; i < meses; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    if (!map.has(key)) map.set(key, 0);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes, obras: valor as number, custo: valor as number }));
}

// mesma regra de status usada em CentralDeNavegacaoEmpresa/Obras/ObrasAtivas.tsx
function derivarStatus(
  data_inicio?: string | null,
  data_fim?: string | null,
  progresso: number = 0
): "A iniciar" | "Em andamento" | "Concluída" | "Atrasada" {
  const hoje = new Date();
  const ini = data_inicio ? new Date(data_inicio) : null;
  const fim = data_fim ? new Date(data_fim) : null;

  if (fim && fim < hoje && progresso < 90) return "Atrasada";
  if (progresso >= 100 || (fim && fim < hoje)) return "Concluída";
  if (ini && ini <= hoje) return "Em andamento";
  return "A iniciar";
}

export default function EmpresaPainel({ onQuickAction }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    obrasAtivas: 0,
    profissionais: 0,
    custoTotal: 0,
    entregasPrazo: 0,
    obrasAtrasadas: 0,
  });

  const [obrasMes, setObrasMes] = useState<{ mes: string; obras: number }[]>([]);
  const [custosMes, setCustosMes] = useState<{ mes: string; custo: number }[]>([]);
  const [obrasAtivas, setObrasAtivas] = useState<
    (ObraBase & {
      profissionais: number;
      custo: number;
      progresso: number;
      status: string;
    })[]
  >([]);

  const [graficoIndex, setGraficoIndex] = useState(0);
  const graficosMobile = ["Ações", "Obras", "Custos"];

  // navegação rápida
  const handleQuick = useCallback(
    (section: QuickSection) => {
      switch (section) {
        case "novos-pedidos":
          navigate("/empresa/pedidos/novos");
          break;
        case "obras-ativas":
          navigate("/empresa/obras/ativas");
          break;
        case "documentos-profissionais":
          navigate("/empresa/documentos/profissionais");
          break;
        case "equipes-em-campo":
          navigate("/empresa/profissionais/equipes");
          break;
        default:
          break;
      }
      onQuickAction?.(section);
    },
    [navigate, onQuickAction]
  );

  useEffect(() => {
    (async () => {
      // 1) Descobrir empresa via RPC
      let empresaId: string | null = null;
      const rpc = await supabase.rpc("minha_empresa_id");
      if (!rpc.error) empresaId = (rpc.data as string) ?? null;
      if (!empresaId) empresaId = (user?.user_metadata?.empresa_id as string) || null;

      if (!empresaId) {
        setStats({
          obrasAtivas: 0,
          profissionais: 0,
          custoTotal: 0,
          entregasPrazo: 0,
          obrasAtrasadas: 0,
        });
        setObrasAtivas([]);
        setObrasMes([]);
        setCustosMes([]);
        return;
      }

      // 2) Obras da empresa
      const { data: obrasRaw } = await supabase
        .from<ObraBase>("obras")
        .select("id,nome,local,empresa_id,data_inicio,data_fim,created_at:criado_em")
        .eq("empresa_id", empresaId);

      const obras = (obrasRaw || []).sort((a, b) => {
        const aa = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
        const bb = b.data_inicio ? new Date(b.data_inicio).getTime() : 0;
        return bb - aa;
      });

      const obraIds = obras.map((o) => o.id);

      // 3) Progresso médio por obra
      const progressoPorObra = new Map<string, number>();
      if (obraIds.length) {
        const { data: rels } = (await supabase
          .from("relatorios_obras")
          .select("obra_id,progresso")
          .in("obra_id", obraIds)) as { data: Relatorio[] | null; error: any };

        const sum = new Map<string, number>();
        const cnt = new Map<string, number>();
        (rels || []).forEach((r) => {
          const v = Number(r.progresso || 0);
          sum.set(r.obra_id, (sum.get(r.obra_id) || 0) + v);
          cnt.set(r.obra_id, (cnt.get(r.obra_id) || 0) + 1);
        });
        obraIds.forEach((id) => {
          const media = (sum.get(id) || 0) / Math.max(1, cnt.get(id) || 0);
          progressoPorObra.set(id, Math.round(media));
        });
      }

      // 4) Profissionais por obra (apenas vínculos ativos)
      const profsPorObra = new Map<string, number>();
      if (obraIds.length) {
        const { data: vincs } = await supabase
          .from<Vinculo>("profissionais_obras")
          .select("obra_id,status")
          .in("obra_id", obraIds);

        (vincs || []).forEach((v) => {
          if (v.status && v.status.toLowerCase() !== "ativo") return;
          profsPorObra.set(v.obra_id, (profsPorObra.get(v.obra_id) || 0) + 1);
        });
      }

      // 5) Custos
      const somaCustoPorObra = new Map<string, number>();
      let custoMesAtualTotal = 0;
      const agoraYM = new Date().toISOString().slice(0, 7);

      if (obraIds.length) {
        const { data: custos } = await supabase
          .from<CustoObra>("custos_obra")
          .select("obra_id, valor:valor_total, data:data_custo, mes")
          .in("obra_id", obraIds);

        const mapaCustoMes = new Map<string, number>();
        (custos || []).forEach((c) => {
          const v = Number(c.valor || 0);
          const chaveMes = c.mes && /^\d{4}-\d{2}$/.test(c.mes) ? c.mes : ym(c.data);
          somaCustoPorObra.set(c.obra_id, (somaCustoPorObra.get(c.obra_id) || 0) + v);
          mapaCustoMes.set(chaveMes, (mapaCustoMes.get(chaveMes) || 0) + v);
          if (chaveMes === agoraYM) custoMesAtualTotal += v;
        });

        const base: Record<string, number> = {};
        mapaCustoMes.forEach((v, k) => (base[k] = v));
        const serie = serieMinima(base, 3).map(({ mes }) => ({
          mes,
          custo: base[mes] ?? 0,
        }));
        setCustosMes(serie);
      } else {
        setCustosMes([]);
      }

      // 6) Linhas + KPIs
      const linhas = obras.map((o) => {
        const prog = progressoPorObra.get(o.id) || 0;
        const status = derivarStatus(o.data_inicio, o.data_fim, prog);
        return {
          ...o,
          progresso: prog,
          status,
          profissionais: profsPorObra.get(o.id) || 0,
          custo: somaCustoPorObra.get(o.id) || 0,
        };
      });

      const ativas = linhas.filter((l) => l.status !== "Concluída");
      setObrasAtivas(ativas);

      const totalProfsAtivos = ativas.reduce((a, o) => a + (o.profissionais || 0), 0);
      const totalObras = linhas.length;
      const atrasadas = linhas.filter((l) => l.status === "Atrasada").length;
      const eficiencia = totalObras ? Math.round(((totalObras - atrasadas) / totalObras) * 100) : 0;

      setStats({
        obrasAtivas: ativas.length,
        profissionais: totalProfsAtivos,
        custoTotal: custoMesAtualTotal,
        entregasPrazo: eficiencia,
        obrasAtrasadas: atrasadas,
      });

      // série de obras/mês (com fallback)
      const mapaObrasMes = new Map<string, number>();
      obras.forEach((o) => {
        const chave = o.data_inicio ? ym(o.data_inicio) : ym(o.created_at);
        mapaObrasMes.set(chave, (mapaObrasMes.get(chave) || 0) + 1);
      });
      const baseObras: Record<string, number> = {};
      mapaObrasMes.forEach((v, k) => (baseObras[k] = v));
      const serieObras = serieMinima(baseObras, 3).map(({ mes }) => ({
        mes,
        obras: baseObras[mes] ?? 0,
      }));
      setObrasMes(serieObras);
    })();
  }, [user?.id, navigate, onQuickAction]);

  const nomeEmpresa =
    user?.user_metadata?.nome ||
    user?.email?.split("@")[0] ||
    t("empresaPainel.nomePadrao");

  const KPIs = [
    {
      label: "Obras Ativas",
      value: stats.obrasAtivas,
      icon: Building2,
      color: "from-blue-500 to-cyan-500",
      sub: "Total em execução",
      link: "/empresa/obras",
    },
    {
      label: "Equipe em Campo",
      value: stats.profissionais,
      icon: Users,
      color: "from-emerald-500 to-green-400",
      sub: "Profissionais ativos",
      link: "/empresa/profissionais",
    },
    {
      label: "Custos Totais",
      value: formatEUR(stats.custoTotal),
      icon: DollarSign,
      color: "from-indigo-500 to-purple-500",
      sub: "Mês atual",
      link: "/empresa/relatorios",
    },
    {
      label: "Eficiência",
      value: `${stats.entregasPrazo}%`,
      icon: CheckCircle2,
      color: "from-amber-400 to-orange-500",
      sub: "Entregas no prazo",
      link: "/empresa/relatorios",
    },
  ];

  const MAX_OBRAS = 5;
  const obrasVisiveis = obrasAtivas.slice(0, MAX_OBRAS);
  const temMaisQueMax = obrasAtivas.length > MAX_OBRAS;

  return (
    <div className="w-full min-w-0 flex flex-col gap-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#020617] rounded-2xl p-4 sm:p-6 shadow border border-gray-100 dark:border-slate-800/80">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
          👋 Bem-vindo, {nomeEmpresa}.
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          {t("empresaPainel.mensagemIntro") ||
            "Acompanhe o desempenho da sua empresa em tempo real."}
        </p>
      </div>

      {/* KPIs: grid único (melhor em monitores menores/zoom) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 min-w-0">
        {KPIs.map((kpi, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate(kpi.link)}
            className={`cursor-pointer rounded-2xl p-4 sm:p-6 text-white shadow-md bg-gradient-to-br ${kpi.color} relative overflow-hidden hover:shadow-lg transition-all min-w-0`}
          >
            <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-[1px]" />
            <div className="relative z-10 flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm opacity-90 truncate">{kpi.label}</p>
                <h2 className="mt-1 text-xl sm:text-3xl font-bold leading-tight truncate">
                  {kpi.value}
                </h2>
                <p className="mt-1 text-[11px] sm:text-xs opacity-80 truncate">
                  {kpi.sub}
                </p>
              </div>
              <kpi.icon className="w-5 h-5 sm:w-8 sm:h-8 opacity-90 shrink-0" />
            </div>
          </motion.div>
        ))}
      </section>

      {/* GRÁFICOS DESKTOP */}
      <div className="hidden sm:block min-w-0">
        <GraficosPainel
          obrasMes={obrasMes}
          custosMes={custosMes}
          onQuickAction={handleQuick}
        />
      </div>

      {/* GRÁFICOS MOBILE */}
      <div className="sm:hidden w-full min-w-0 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
          Painel de Ações e Indicadores
        </h3>

        <div className="w-full min-w-0">
          {graficoIndex === 0 && (
            <GraficosPainel
              obrasMes={obrasMes}
              custosMes={[]}
              onQuickAction={handleQuick}
            />
          )}
          {graficoIndex === 1 && (
            <GraficosPainel
              obrasMes={[]}
              custosMes={custosMes}
              onQuickAction={handleQuick}
            />
          )}
          {graficoIndex === 2 && (
            <GraficosPainel
              obrasMes={[]}
              custosMes={[]}
              onQuickAction={handleQuick}
            />
          )}
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {graficosMobile.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setGraficoIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                graficoIndex === idx
                  ? "bg-blue-500 scale-110"
                  : "bg-gray-300 dark:bg-gray-600 hover:bg-blue-400"
              }`}
            />
          ))}
        </div>
      </div>

      {/* OBRAS ATIVAS */}
      <div className="bg-white dark:bg-[#020617] rounded-2xl p-4 sm:p-6 shadow border border-gray-100 dark:border-slate-800/80 min-w-0">
        <h3 className="font-semibold mb-4 text-gray-700 dark:text-gray-200 flex items-center gap-2 text-base sm:text-lg">
          <Building2 className="w-5 h-5 text-blue-500" /> Obras Ativas
        </h3>

        {/* Mobile: cards (máx. 5) */}
        <div className="sm:hidden space-y-3">
          {obrasVisiveis.map((obra) => (
            <div
              key={obra.id}
              className="rounded-xl border border-gray-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0f1520] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {obra.nome || "—"}
                </p>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                  {obra.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {obra.local || "—"} · {obra.profissionais} prof ·{" "}
                {formatEUR(obra.custo || 0)}
              </p>
              <div className="mt-2 w-full bg-gray-200 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500"
                  style={{ width: `${obra.progresso || 0}%` }}
                />
              </div>
              <button
                onClick={() => navigate(`/empresa/obras/${obra.id}`)}
                className="mt-3 w-full text-xs py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300"
              >
                Ver detalhes
              </button>
            </div>
          ))}
        </div>

        {/* Desktop: tabela com scroll horizontal quando necessário */}
        {obrasAtivas.length > 0 && (
          <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-[980px] w-full text-sm border-b mb-2">
              <thead className="bg-white dark:bg-[#020617]">
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-slate-800/80">
                  <th className="pb-2 font-medium">Obra</th>
                  <th className="pb-2 font-medium">Local</th>
                  <th className="pb-2 font-medium">Profissionais</th>
                  <th className="pb-2 font-medium">Custo</th>
                  <th className="pb-2 font-medium">Progresso</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {obrasVisiveis.map((obra) => (
                  <motion.tr
                    key={obra.id}
                    whileHover={{ backgroundColor: "rgba(59,130,246,0.05)" }}
                    className="border-b last:border-none dark:border-slate-800/80"
                  >
                    <td className="py-3 font-medium text-gray-800 dark:text-gray-100">
                      {obra.nome || "—"}
                    </td>
                    <td className="text-gray-700 dark:text-gray-300">
                      {obra.local || "—"}
                    </td>
                    <td className="text-gray-700 dark:text-gray-300">
                      {obra.profissionais}
                    </td>
                    <td className="text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatEUR(obra.custo || 0)}
                    </td>
                    <td>
                      <div className="w-28 lg:w-36 bg-gray-200 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-2 bg-blue-500"
                          style={{ width: `${obra.progresso || 0}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        {obra.status}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => navigate(`/empresa/obras/${obra.id}`)}
                        className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md transition-all"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {obrasAtivas.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-2">
            Nenhuma obra ativa no momento.
          </p>
        )}

        {temMaisQueMax && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => navigate("/empresa/obras")}
              className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Ver todas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
