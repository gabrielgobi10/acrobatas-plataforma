import {
  CalendarDays,
  CheckCircle2,
  FileBarChart2,
  FileText,
  Layers,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  KPI,
  Diagnostico,
  SeriePoint,
  Recomendacao,
  TimelineItem,
  Avaliacao,
} from "./types";

/* =========================================================
 🧱 MOCK DATA — “Progresso de Carreira”
 ========================================================= */

export const MOCK = {
  aci: 78, // Índice principal de performance (Acrobatas Career Index)
  aciTrend: +4, // Tendência percentual em relação ao mês anterior
  nivel: 3,
  nivelTitulo: "Profissional",
  xpAtual: 1200,
  xpProximo: 2000,
};

/* =========================================================
 📊 KPI — Indicadores principais
 ========================================================= */
export const KPIS: KPI[] = [
  { icon: Layers, label: "Obras", value: 18, delta: +2 },
  { icon: Star, label: "Avaliação", value: 4.7, delta: +0.1 },
  { icon: CalendarDays, label: "Dias ativos", value: 124, delta: +12 },
  { icon: CheckCircle2, label: "Pontualidade", value: "96%", delta: +3 },
  { icon: FileText, label: "Relatórios", value: 78, delta: +9 },
];

/* =========================================================
 📈 Séries temporais (para gráficos)
 ========================================================= */
export const SERIES_XP: SeriePoint[] = [
  { mes: "Jun", xp: 420 },
  { mes: "Jul", xp: 860 },
  { mes: "Ago", xp: 1120 },
  { mes: "Set", xp: 1260 },
  { mes: "Out", xp: 1620 },
];

export const SERIES_RATING: SeriePoint[] = [
  { mes: "Jun", nota: 4.4 },
  { mes: "Jul", nota: 4.6 },
  { mes: "Ago", nota: 4.7 },
  { mes: "Set", nota: 4.6 },
  { mes: "Out", nota: 4.8 },
];

export const SERIES_HORAS: SeriePoint[] = [
  { mes: "Jun", planejadas: 160, realizadas: 148 },
  { mes: "Jul", planejadas: 168, realizadas: 162 },
  { mes: "Ago", planejadas: 176, realizadas: 170 },
  { mes: "Set", planejadas: 168, realizadas: 165 },
  { mes: "Out", planejadas: 176, realizadas: 174 },
];

/* =========================================================
 🩺 Diagnóstico — visão geral de performance
 ========================================================= */
export const DIAGNOSTICOS: Diagnostico[] = [
  {
    titulo: "Qualidade & Habilidade",
    status: "bom",
    bullets: [
      "Média 4.7★ (peso alto nas últimas 6 semanas)",
      "Retrabalho baixo (<2%)",
      "2 elogios recentes sobre acabamento",
    ],
    icon: Star,
  },
  {
    titulo: "Confiabilidade",
    status: "medio",
    bullets: [
      "Pontualidade 96%",
      "0 no-show no último mês",
      "1 atraso >30min (corrigido)",
    ],
    icon: CheckCircle2,
  },
  {
    titulo: "Eficiência",
    status: "bom",
    bullets: [
      "Realizadas 99% das horas planejadas",
      "Boa velocidade de execução",
      "Relatórios diários em dia",
    ],
    icon: FileBarChart2,
  },
  {
    titulo: "Compliance",
    status: "alerta",
    bullets: [
      "Seguro RC vence em 12 dias",
      "EPI atualizado",
      "Sem incidentes de segurança",
    ],
    icon: ShieldCheck,
  },
];

/* =========================================================
 💶 Faixa de hora & margem de rentabilidade
 ========================================================= */
export const FAIXA = {
  mercado: [8, 13] as [number, number],
  sugerida: 11.2,
  margem: "Rentável",
};

/* =========================================================
 🎯 Recomendações
 ========================================================= */
export const RECOMENDACOES: Recomendacao[] = [
  {
    titulo: "Renovar Seguro RC",
    msg: "Vence em 12 dias — evita bloqueio de promoções.",
    impacto: "+0,6 ACI",
    tipo: "alerta",
  },
  {
    titulo: "Completar 2 obras",
    msg: "Meta para liberar Nível 3.",
    impacto: "+300 XP",
    tipo: "acao",
  },
  {
    titulo: "Curso rápido: Segurança em Altura",
    msg: "Aumenta elegibilidade para obras premium.",
    impacto: "+0,4 ACI",
    tipo: "treinamento",
  },
];

/* =========================================================
 ⏳ Linha do tempo e avaliações
 ========================================================= */
export const TIMELINE: TimelineItem[] = [
  { data: "01/2024", titulo: "Primeira obra concluída" },
  { data: "03/2024", titulo: "Avaliação 5 estrelas" },
  { data: "06/2024", titulo: "Certificação EPI válida" },
  { data: "10/2024", titulo: "Promoção a Encarregado" },
];

export const AVALIACOES: Avaliacao[] = [
  {
    empresa: "Casais Engenharia",
    nota: 5.0,
    comentario: "Trabalhador pontual e dedicado.",
    data: "04/2025",
  },
  {
    empresa: "Mota-Engil",
    nota: 4.8,
    comentario: "Cumpre prazos e trabalha bem em equipe.",
    data: "01/2025",
  },
];
