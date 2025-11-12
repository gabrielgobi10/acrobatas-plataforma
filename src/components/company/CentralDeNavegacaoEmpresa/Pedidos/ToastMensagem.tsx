import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  tipo: "sucesso" | "erro" | "aviso" | "";
  texto?: string;
  visivel: boolean;
  onFechar: () => void;
  onNovoPedido?: () => void;
  onVerPedidos?: () => void;
};

const estilos: Record<Props["tipo"], string> = {
  sucesso:
    "bg-green-50 border border-green-300 text-green-800 shadow-2xl backdrop-blur-xl",
  erro: "bg-red-50 border border-red-300 text-red-900 shadow-2xl backdrop-blur-xl",
  aviso:
    "bg-amber-50 border border-amber-300 text-amber-900 shadow-2xl backdrop-blur-xl",
  "": "bg-gray-50 border border-gray-300 text-gray-800 shadow-2xl backdrop-blur-xl",
};

export function ToastMensagem({
  tipo,
  texto,
  visivel,
  onFechar,
  onNovoPedido,
  onVerPedidos,
}: Props) {
  const { t } = useTranslation();

  // fechamento automático para aviso/erro
  useEffect(() => {
    if (visivel && (tipo === "erro" || tipo === "aviso")) {
      const timer = setTimeout(() => onFechar(), 5000);
      return () => clearTimeout(timer);
    }
  }, [visivel, tipo, onFechar]);

  const getIcon = () => {
    switch (tipo) {
      case "sucesso":
        return "✅";
      case "erro":
        return "❌";
      case "aviso":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed left-1/2 top-1/2 z-[9999] flex flex-col items-center text-center w-[95%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl px-8 py-6 ${estilos[tipo]}`}
        >
          <div className="text-5xl mb-3">{getIcon()}</div>

          <div className="text-base font-medium leading-relaxed">
            {texto || t("empresaPedidos.toast.operacaoConcluida")}
          </div>

          {tipo === "sucesso" ? (
            <div className="flex gap-3 mt-6">
              <button
                onClick={onNovoPedido}
                className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
              >
                {t("empresaPedidos.toast.criarNovoPedido")}
              </button>
              <button
                onClick={onVerPedidos}
                className="px-5 py-2 rounded-lg bg-gray-100 text-green-700 border border-green-400 hover:bg-green-50 transition text-sm font-semibold"
              >
                {t("empresaPedidos.toast.verPedidos")}
              </button>
            </div>
          ) : (
            <button
              onClick={onFechar}
              className="absolute top-3 right-3 rounded p-1 text-gray-500 hover:text-gray-800"
            >
              <X size={18} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
