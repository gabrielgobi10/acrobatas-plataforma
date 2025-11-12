// src/components/professional/CentralDeNavegacaoProfissional/Carreira/CarreiraPageVisual.tsx
// ============================================================================
// 🧭 Painel de Carreira Profissional — versão aprimorada com Modal de Critérios
// ============================================================================

import { useState } from "react";
import { createPortal } from "react-dom";
import { Award, ClipboardList } from "lucide-react";

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

export default function CarreiraPageVisual() {
  const progressoPct = Math.round((MOCK.xpAtual / MOCK.xpProximo) * 100);

  // 🔹 Simula o ID do nível atual (em produção virá do Supabase)
  const MOCK_LEVELS = {
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

  return (
    <div className="p-3 sm:p-4 md:p-8 text-slate-900 dark:text-slate-100 relative">
      {/* ===== HEADER ===== */}
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

      {/* ===== HERO (ACI + Nível/XP) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* ACI */}
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

        {/* Nível & XP */}
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

          {/* 🔹 Botão de Critérios de Promoção */}
          <button
            onClick={() => setMostrarCriterios(true)}
            className="mt-4 text-sm text-blue-500 hover:text-blue-400 inline-flex items-center gap-1"
          >
            <ClipboardList className="w-4 h-4" /> Ver critérios de promoção
          </button>

          {/* 🔹 Modal via Portal */}
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

      {/* ===== KPIs ===== */}
      <div className="mt-5 sm:mt-6">
        <KPIGroup kpis={KPIS} />
      </div>

      {/* ===== Gráficos ===== */}
      <div className="mt-5 sm:mt-6">
        <ChartsTabs
          xp={SERIES_XP}
          rating={SERIES_RATING}
          horas={SERIES_HORAS}
        />
      </div>

      {/* ===== Diagnóstico ===== */}
      <div className="mt-5 sm:mt-6">
        <Diagnostics items={DIAGNOSTICOS} />
      </div>

      {/* ===== Faixa de hora ===== */}
      <div className="mt-5 sm:mt-6">
        <ProfitBand
          mercado={FAIXA.mercado as [number, number]}
          sugerida={FAIXA.sugerida}
          margem={FAIXA.margem}
        />
      </div>

      {/* ===== Recomendações ===== */}
      <div className="mt-5 sm:mt-6">
        <Recommendations items={RECOMENDACOES} />
      </div>

      {/* ===== Timeline + Avaliações ===== */}
      <div className="mt-5 sm:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <TimelineReviews timeline={TIMELINE} avaliacoes={AVALIACOES} />
      </div>

      {/* ===== Accordions ===== */}
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

      {/* ===== Trilha de evolução ===== */}
      <div className="mt-5 sm:mt-6">
        <EvolutionTrail />
      </div>
    </div>
  );
}
