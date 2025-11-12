/* =========================================================
📊 Tipos — Progresso de Carreira (Acrobatas)
========================================================= */

/**
 * 📌 Indicadores principais (KPI)
 * Ex.: Obras concluídas, Avaliação média, Pontualidade, etc.
 */
export type KPI = {
  icon: any; // Ícone (Lucide ou custom)
  label: string; // Nome do indicador
  value: number | string; // Valor exibido
  delta?: number; // Variação em relação ao período anterior (opcional)
};

/**
 * 📈 Pontos de série temporal (para gráficos)
 * Chaves adicionais dinâmicas (XP, notas, horas, etc.)
 */
export type SeriePoint = {
  mes: string; // Mês (ex.: "Out")
  [k: string]: number; // Campos dinâmicos (xp, nota, planejadas, etc.)
};

/**
 * 🩺 Diagnóstico geral da carreira
 * Exibe estado (bom, médio, alerta) e lista de observações
 */
export type Diagnostico = {
  titulo: string; // Nome da categoria
  status: "bom" | "medio" | "alerta"; // Estado geral
  bullets: string[]; // Pontos detalhados
  icon: any; // Ícone ilustrativo (Lucide)
};

/**
 * 🎯 Recomendações automáticas
 * Sugestões ou alertas para evoluir na carreira
 */
export type Recomendacao = {
  titulo: string; // Nome curto da recomendação
  msg: string; // Descrição breve
  impacto: string; // Impacto esperado (+XP, +ACI, etc.)
  tipo: "acao" | "alerta" | "treinamento"; // Tipo da sugestão
};

/**
 * 🕓 Linha do tempo de conquistas
 * Marco histórico do progresso do profissional
 */
export type TimelineItem = {
  data: string; // Data ou mês/ano
  titulo: string; // Evento importante
};

/**
 * ⭐ Avaliações recebidas de empresas
 * Guarda feedbacks qualitativos e notas
 */
export type Avaliacao = {
  empresa: string; // Nome da empresa contratante
  nota: number; // Nota média
  comentario: string; // Comentário breve
  data: string; // Data da avaliação
};
