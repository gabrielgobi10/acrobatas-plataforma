// src/components/professional/Carreira/ui/ModalCriteriosPromocao.tsx
// ============================================================================
// 🎯 Modal de Critérios de Promoção – versão refinada
// - Busca do Supabase (career_level + career_criterion)
// - Cache leve em sessionStorage por (nextLevelId + profession)
// - Barra de progresso, "quase lá", UX robusta (ESC, backdrop, loading, erros)
// ============================================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock4,
  Zap,
  X,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  currentLevelId: string;
  profession: string; // "Global" | "Eletricista" | "Canalizador" | ...
  xpTotal: number;
  diasAtivos: number;
  rating: number;
  noShow: number;
  onClose: () => void;
};

type Criterio = {
  id: string;
  level_id: string;
  kind: "xp_total" | "dias_ativos" | "rating" | "no_show";
  operator: ">=" | "<=";
  value: string;
  required: boolean;
  meta: any; // { window_days?: number }
  profession: string;
};

type LevelRow = { id: string; name: string; sort_order: number };

const KIND_LABEL: Record<Criterio["kind"], string> = {
  xp_total: "XP Total",
  dias_ativos: "Dias Ativos",
  rating: "Avaliação Média",
  no_show: "Faltas (No-show)",
};

function getAtualForKind(
  kind: Criterio["kind"],
  ctx: { xpTotal: number; diasAtivos: number; rating: number; noShow: number }
) {
  switch (kind) {
    case "xp_total":
      return ctx.xpTotal;
    case "dias_ativos":
      return ctx.diasAtivos;
    case "rating":
      return ctx.rating;
    case "no_show":
      return ctx.noShow;
  }
}

function isCumprido(c: Criterio, atual: number) {
  const alvo = Number(c.value);
  if (c.operator === ">=") return atual >= alvo;
  if (c.operator === "<=") return atual <= alvo;
  return false;
}

function isQuaseLa(c: Criterio, atual: number) {
  // "Quase lá": dentro de 10% do alvo (para >=) ou acima de 90% do alvo (para <= 0, usa tolerância 0)
  const alvo = Number(c.value);
  if (c.kind === "no_show" && c.operator === "<=") {
    // Para faltas, "quase lá" se atual for 1 e alvo 0, por exemplo
    return atual <= alvo + 1 && !isCumprido(c, atual);
  }
  if (c.operator === ">=") {
    if (alvo === 0) return atual > 0 && !isCumprido(c, atual);
    return atual >= alvo * 0.9 && atual < alvo;
  }
  if (c.operator === "<=") {
    // Se alvo > 0: considera quase lá quando atual <= alvo * 1.1
    return atual <= alvo * 1.1 && !isCumprido(c, atual);
  }
  return false;
}

export default function ModalCriteriosPromocao({
  currentLevelId,
  profession,
  xpTotal,
  diasAtivos,
  rating,
  noShow,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [proximoNivel, setProximoNivel] = useState<LevelRow | null>(null);

  const ctx = { xpTotal, diasAtivos, rating, noShow };

  // Handlers de UX: fechar por ESC e clique no backdrop
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const loadData = useCallback(async () => {
    try {
      setErro(null);
      setLoading(true);

      if (!currentLevelId) {
        setErro("Nível atual não informado.");
        setLoading(false);
        return;
      }

      // 1) Níveis (ordenados)
      const { data: levels, error: errLevels } = await supabase
        .from("career_level")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true });

      if (errLevels) throw errLevels;
      if (!levels || levels.length === 0) {
        setErro("Nenhum nível configurado.");
        setLoading(false);
        return;
      }

      // 2) Próximo nível
      const idxAtual = levels.findIndex((l) => l.id === currentLevelId);
      const prox = idxAtual >= 0 ? (levels[idxAtual + 1] as LevelRow | undefined) : undefined;

      if (!prox) {
        setProximoNivel(null);
        setCriterios([]);
        setLoading(false);
        return;
      }

      setProximoNivel(prox);

      // 3) Cache leve
      const cacheKey = `promo_criteria:${prox.id}:${profession || "Global"}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Criterio[];
        setCriterios(parsed);
        setLoading(false);
        return;
      }

      // 4) Busca critérios do próximo nível
      const { data: criteriosData, error: errCrit } = await supabase
        .from("career_criterion")
        .select("*")
        .eq("level_id", prox.id)
        .in("profession", ["Global", profession]);

      if (errCrit) throw errCrit;

      const list = (criteriosData || []) as Criterio[];
      setCriterios(list);
      sessionStorage.setItem(cacheKey, JSON.stringify(list));
    } catch (e: any) {
      console.error("[ModalCriteriosPromocao] erro:", e?.message || e);
      setErro("Não foi possível carregar os critérios agora. Tente novamente mais tarde.");
      setCriterios([]);
    } finally {
      setLoading(false);
    }
  }, [currentLevelId, profession]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Progresso (x de y)
  const { cumpridos, total } = useMemo(() => {
    const t = criterios.length;
    const c = criterios.reduce((acc, crit) => {
      const atual = getAtualForKind(crit.kind, ctx);
      return acc + (isCumprido(crit, atual) ? 1 : 0);
    }, 0);
    return { cumpridos: c, total: t };
  }, [criterios, ctx]);

  const progressoPct = total > 0 ? Math.round((cumpridos / total) * 100) : 0;

  const statusText =
    total === 0
      ? "Nenhum critério definido para este nível."
      : progressoPct === 100
      ? "🎉 Tudo pronto para sua promoção!"
      : progressoPct >= 75
      ? "Você está quase lá — falta pouco!"
      : progressoPct >= 50
      ? "Bom progresso, continue assim!"
      : "Continue evoluindo para desbloquear a promoção.";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          // Fecha clicando no backdrop (mas não no conteúdo)
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-criterios"
        >
          {/* Cabeçalho */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
            <div>
              <h2 id="titulo-criterios" className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Critérios de Promoção
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {proximoNivel ? (
                  <>
                    Para alcançar o nível{" "}
                    <span className="font-medium text-blue-500">{proximoNivel.name}</span>, cumpra os
                    requisitos abaixo.
                  </>
                ) : (
                  "Você já está no nível máximo."
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de progresso */}
          <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {cumpridos} de {total || 0} critérios cumpridos
            </div>
            <div className="w-full mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-2 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                style={{ width: `${progressoPct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{statusText}</p>
          </div>

          {/* Corpo */}
          <div className="max-h-[60vh] overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : erro ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-300">{erro}</div>
              </div>
            ) : criterios.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Nenhum critério definido para este nível.
              </p>
            ) : (
              <div className="space-y-3">
                {criterios.map((c) => {
                  const atual = getAtualForKind(c.kind, ctx);
                  const cumprido = isCumprido(c, atual);
                  const quase = !cumprido && isQuaseLa(c, atual);

                  // Cores por estado
                  const border = cumprido
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : quase
                    ? "border-amber-400/40 bg-amber-500/10"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40";

                  const iconClass = cumprido
                    ? "text-emerald-500"
                    : quase
                    ? "text-amber-400"
                    : "text-slate-400";

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${border}`}
                    >
                      <div className="flex items-start gap-3">
                        {cumprido ? (
                          <CheckCircle2 className={`w-5 h-5 ${iconClass} mt-0.5`} />
                        ) : (
                          <Clock4 className={`w-5 h-5 ${iconClass} mt-0.5`} />
                        )}

                        <div>
                          <p
                            className={`text-sm font-medium ${
                              cumprido
                                ? "text-emerald-600 dark:text-emerald-300"
                                : quase
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {KIND_LABEL[c.kind]} {c.operator} {c.value}
                          </p>

                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Atual:{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {c.kind === "rating" ? atual.toFixed(1) : atual}
                            </span>
                            {c.meta?.window_days && (
                              <>
                                {" "}
                                • Últimos {c.meta.window_days} dias
                              </>
                            )}
                          </div>

                          {!cumprido && quase && (
                            <div className="text-xs mt-1 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <ArrowUpRight className="w-4 h-4" />
                              Quase lá — mantenha o ritmo!
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Fechar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
