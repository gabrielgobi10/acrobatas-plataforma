import { useState } from "react";
import { Euro, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

type Props = {
  valorHora: number | null;
  valorDia: number | null;
  custoTotal: number | null;
};

export function EstimativaValor({ valorHora, valorDia, custoTotal }: Props) {
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);
  const { t } = useTranslation();

  if (!valorHora || !valorDia) return null;

  return (
    <div className="mt-6 space-y-3 relative">
      {/* Valor estimado */}
      <div className="flex items-center justify-between border border-blue-100 bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 shadow-sm relative">
        <div className="flex items-center gap-3 text-blue-700">
          <Euro size={20} className="text-blue-600" />
          <span className="font-semibold">
            {t("empresaPedidos.estimativa.valorEstimado")}:{" "}
            <span className="font-normal text-blue-800">
              €{valorHora.toFixed(2)}/h | €{valorDia.toFixed(2)}/
              {t("empresaPedidos.estimativa.dia")}
            </span>
          </span>
        </div>

        <button
          onClick={() => setMostrarDetalhes(!mostrarDetalhes)}
          className="text-blue-500 text-sm flex items-center gap-1 hover:underline"
        >
          <Info size={14} /> {t("empresaPedidos.estimativa.baseAutomatica")}
        </button>

        {/* Card explicativo flutuante */}
        <AnimatePresence>
          {mostrarDetalhes && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="absolute right-0 top-full mt-2 w-[420px] bg-white border border-blue-100 shadow-lg rounded-xl p-4 text-sm text-gray-700 z-30"
            >
              <p className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
                💡 {t("empresaPedidos.estimativa.comoFunciona")}
              </p>
              <ul className="list-disc ml-5 space-y-1 text-gray-600">
                <li>{t("empresaPedidos.estimativa.item1")}</li>
                <li>{t("empresaPedidos.estimativa.item2")}</li>
                <li>{t("empresaPedidos.estimativa.item3")}</li>
              </ul>

              <div className="mt-3 flex justify-between items-center">
                <span className="text-xs text-gray-400 italic">
                  {t("empresaPedidos.estimativa.ultimaAtualizacao")}
                </span>
                <button
                  onClick={() => setMostrarDetalhes(false)}
                  className="text-blue-500 text-xs hover:underline"
                >
                  {t("empresaPedidos.estimativa.fechar")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custo total */}
      {custoTotal && (
        <div className="flex items-center justify-between border border-gray-100 bg-gray-50 rounded-xl p-4 text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-semibold">
              {t("empresaPedidos.estimativa.custoTotal")}:
            </span>
          </div>
          <span className="text-gray-900 font-bold">
            {custoTotal.toLocaleString("pt-PT", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
