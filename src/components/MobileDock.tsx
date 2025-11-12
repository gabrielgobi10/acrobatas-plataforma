import { useEffect, useState } from "react";
import { MessageCircle, Globe2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileDock() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [open, setOpen] = useState(false);

  // Detectar abertura do teclado no mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) return;

      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const keyboardOpened = viewportHeight < window.innerHeight * 0.75;
      setIsKeyboardOpen(keyboardOpened);
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  if (isKeyboardOpen) return null;

  // 🌍 Abrir seletor de idioma (via postMessage)
  const openIdioma = () => {
    window.postMessage({ type: "toggle-idioma" }, "*");
    setOpen(false);
  };

  // 💬 Abrir suporte (via postMessage)
  const openSuporte = () => {
    window.postMessage({ type: "open-suporte" }, "*");
    setOpen(false);
  };

  return (
    <div className="sm:hidden fixed bottom-6 right-5 z-[10000] flex flex-col items-end gap-2 pointer-events-auto">
      <AnimatePresence>
        {open && (
          <motion.div
            key="dock-menu"
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mb-3 p-2 rounded-2xl bg-white/25 backdrop-blur-md border border-white/25 shadow-[0_4px_25px_rgba(0,0,0,0.15)] flex flex-col items-end gap-2"
          >
            <button
              onClick={openIdioma}
              className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/85 text-white text-xs font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.3)] hover:bg-blue-600/95 transition-all duration-200 border border-white/20"
            >
              <Globe2 className="w-4 h-4 text-white" />
              <span className="font-medium">PT</span>
            </button>

            <button
              onClick={openSuporte}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-md hover:bg-blue-700 hover:brightness-110 active:scale-95 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Suporte</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 12 }}
        onClick={() => setOpen(!open)}
        className={`
          w-12 h-12 flex items-center justify-center rounded-full
          shadow-lg transition-all duration-300
          ${open ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"}
          text-white active:scale-95
        `}
      >
        {open ? <X className="w-5 h-5" /> : <Globe2 className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}
