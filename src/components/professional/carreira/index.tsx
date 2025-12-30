// src/components/professional/CentralDeNavegacaoProfissional/Carreira/CarreiraPageVisual.tsx

import { useState } from "react";
import { createPortal } from "react-dom";
import { Award, ClipboardList, Info, Sparkles } from "lucide-react";

import Card from "./ui/Card";
import AciGauge from "./ui/AciGauge";
import KPIGroup from "./ui/KPIGroup";
import ChartsTabs from "./ui/ChartsTabs";
import Diagnostics from "./ui/Diagnostics";
import ProfitBand from "./ui/ProfitBand";
import Recommendations from "./ui/Recommendations";
import TimelineReviews from "./ui/TimelineReviews";
import { DetailsAccordion, MiniStat } from "./ui/DetailsAccordion";
import EvolutionTrail from "./ui/EvolutionTrail";
import ModalCriteriosPromocao from "./ui/ModalCriteriosPromocao";

import {
  KPIS,
  SERIES_XP,
  SERIES_RATING,
  SERIES_HORAS,
  DIAGNOSTICOS,
  FAIXA,
  RECOMENDACOES,
  TIMELINE,
  AVALIACOES,
  MOCK,
} from "./mock";

type Props = {
  onVoltar?: () => void;
};

export default function CarreiraPageVisual({ onVoltar }: Props) {
  const progressoPct = Math.round((MOCK.xpAtual / MOCK.xpProximo) * 100);

  // 🔹 Simula o ID do nível atual (em produção virá do Supabase)
  const MOCK_LEVELS: Record<number, string> = {
    1: "a1-id-falso",
    2: "a2-id-falso",
    3: "a3-id-falso",
    4: "b1-id-falso",
    5: "b2-id-falso",
    6: "b3-id-falso",
  };
  const currentLevelId = MOCK_LEVELS[MOCK.nivel] || "a1-id-falso";

  // 🔹 Controle do modal
  const [mostrarCriterios, setMostrarCriterios] = useState(false);

  // ✅ Voltar: usa callback do Dashboard; se não existir, tenta histórico; senão /profissional
  const handleVoltar = () => {
    if (typeof onVoltar === "function") {
      onVoltar();
      return;
    }

    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = "/profissional";
    }
  };

  // =========================================================
  // ✅ MODO "EM DESENVOLVIMENTO" (não renderiza o conteúdo abaixo)
  // =========================================================
  return (
    <div className="p-3 sm:p-4 md:p-8 text-slate-900 dark:text-slate-100 relative">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <Info className="w-5 h-5 text-blue-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-semibold">
                    Área em desenvolvimento
                  </h1>
                  <span className="text-[11px] sm:text-xs px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/25 dark:text-blue-200 dark:border-blue-900/40">
                    Disponível em breve
                  </span>
                </div>

                <p className="mt-2 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                  Estamos a finalizar a página de <b>Progresso de Carreira</b>.
                  Em breve você vai conseguir acompanhar sua evolução com nível,
                  XP, metas e recomendações personalizadas.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-950/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-semibold">O que vai ter aqui</p>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Critérios de promoção e progresso por nível.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Indicadores (obras, avaliações, pontualidade e relatórios).
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Gráficos de evolução e histórico.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Alertas de compliance e recomendações automáticas.
                    </li>
                  </ul>
                </div>

                <div className="mt-5">
                  <button
                    onClick={handleVoltar}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition text-sm font-medium"
                  >
                    Voltar
                  </button>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Esta área está temporariamente indisponível enquanto
                  finalizamos a implementação e a integração com os seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          Conteúdo completo já está abaixo (mantido no arquivo),
          mas NÃO aparece porque retornamos acima.
         ========================================================= */}
    </div>
  );

  /* ======================================================================
     ✅ CÓDIGO ORIGINAL (mantido) — não aparece agora, mas fica pronto
     ======================================================================

  return (
    <div className="p-3 sm:p-4 md:p-8 text-slate-900 dark:text-slate-100 relative">
      <div
        className="
          flex flex-col sm:flex-row sm:items-center sm:justify-between 
          gap-3 sm:gap-4 mb-5 sm:mb-6
        "
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Award className="text-yellow-400 w-5 h-5 sm:w-6 sm:h-6" />
            Progresso de Carreira
          </h1>
          <p className="text-[13px] sm:text-sm text-slate-500 dark:text-slate-400">
            Veja sua evolução, diagnósticos e recomendações.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <button className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition">
            Atualizar perfil
          </button>
          <button className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <AciGauge value={MOCK.aci} />
          <div className="flex-1 text-center sm:text-left">
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1">
              Acrobatas Career Index
            </div>
            <div className="text-sm sm:text-lg leading-snug">
              Seu desempenho geral está{" "}
              <b className="text-blue-500">acima da média</b> para a sua função.
            </div>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
              {["Qualidade alta", "Confiável", "Compliance quase completo"].map(
                (t, i) => (
                  <span
                    key={i}
                    className="text-[11px] sm:text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/70"
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="text-yellow-400 shrink-0"
              >
                <path
                  fill="currentColor"
                  d="M6 3h12v3h3v3a5 5 0 0 1-5 5h-1a5 5 0 0 1-10 0H4a4 4 0 0 1-4-4V6h3V3Zm-3 6a2 2 0 0 0 2 2h1V6H3Zm18 0V6h-3v5a3 3 0 0 0 3-2Z"
                />
              </svg>
              <h3 className="font-semibold text-sm sm:text-base">
                Nível {MOCK.nivel} —{" "}
                <span className="text-blue-500">{MOCK.nivelTitulo}</span>
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-400">
              XP: {MOCK.xpAtual}/{MOCK.xpProximo}
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressoPct}%` }}
            />
          </div>
          <div className="text-[11px] sm:text-xs text-slate-500 mt-2">
            Faltam <b>{MOCK.xpProximo - MOCK.xpAtual} XP</b> para o próximo
            nível.
          </div>

          <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
            {[
              "+10 XP Presença diária",
              "+30 XP 5★ Avaliação",
              "+40 XP Certificação",
              "+15 XP Relatório enviado",
            ].map((tag, i) => (
              <span
                key={i}
                className="text-[11px] sm:text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/70"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={() => setMostrarCriterios(true)}
            className="mt-4 text-sm text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"
          >
            <ClipboardList className="w-4 h-4" /> Ver critérios de promoção
          </button>

          {mostrarCriterios &&
            createPortal(
              <div className="fixed inset-0 z-[999]">
                <ModalCriteriosPromocao
                  currentLevelId={currentLevelId}
                  profession={MOCK.profissao || "Global"}
                  xpTotal={MOCK.xpAtual}
                  diasAtivos={MOCK.diasAtivos || 0}
                  rating={MOCK.rating || 0}
                  noShow={MOCK.noShow || 0}
                  onClose={() => setMostrarCriterios(false)}
                />
              </div>,
              document.body
            )}
        </Card>
      </div>

      <div className="mt-5 sm:mt-6">
        <KPIGroup kpis={KPIS} />
      </div>

      <div className="mt-5 sm:mt-6">
        <ChartsTabs xp={SERIES_XP} rating={SERIES_RATING} horas={SERIES_HORAS} />
      </div>

      <div className="mt-5 sm:mt-6">
        <Diagnostics items={DIAGNOSTICOS} />
      </div>

      <div className="mt-5 sm:mt-6">
        <ProfitBand
          mercado={FAIXA.mercado as [number, number]}
          sugerida={FAIXA.sugerida}
          margem={FAIXA.margem}
        />
      </div>

      <div className="mt-5 sm:mt-6">
        <Recommendations items={RECOMENDACOES} />
      </div>

      <div className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <TimelineReviews timeline={TIMELINE} avaliacoes={AVALIACOES} />
      </div>

      <div className="mt-5 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <DetailsAccordion
          title="Detalhe • Qualidade & Habilidade"
          icon={() => <span>⭐</span>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <MiniStat title="Média (90d)" value="4.7★" icon={() => <span>⭐</span>} />
            <MiniStat title="Retrabalho" value="1.8%" icon={() => <span>📊</span>} />
          </div>
        </DetailsAccordion>

        <DetailsAccordion title="Detalhe • Confiabilidade" icon={() => <span>🟢</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <MiniStat title="Pontualidade" value="96%" icon={() => <span>⏱️</span>} />
            <MiniStat title="No-show (30d)" value="0" icon={() => <span>🔔</span>} />
          </div>
        </DetailsAccordion>

        <DetailsAccordion title="Detalhe • Eficiência" icon={() => <span>📈</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <MiniStat title="Cumprimento de plano" value="99%" icon={() => <span>✅</span>} />
            <MiniStat title="Velocidade de execução" value="↑ estável" icon={() => <span>🚀</span>} />
          </div>
        </DetailsAccordion>

        <DetailsAccordion title="Detalhe • Compliance" icon={() => <span>🛡️</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <MiniStat title="Docs válidos" value="92%" icon={() => <span>🛡️</span>} />
            <MiniStat title="Vencimentos próximos" value="1" icon={() => <span>📅</span>} />
          </div>
          <div className="mt-2 sm:mt-3 text-[12px] sm:text-sm">
            <span className="text-[11px] sm:text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/70">
              Seguro RC — vence em 12 dias
            </span>
          </div>
        </DetailsAccordion>
      </div>

      <div className="mt-5 sm:mt-6">
        <EvolutionTrail />
      </div>
    </div>
  );

  ====================================================================== */
}
