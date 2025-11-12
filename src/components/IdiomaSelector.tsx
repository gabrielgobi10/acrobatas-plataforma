import { useEffect, useRef, useState } from "react";
import { Globe2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

const LANGUAGES = [
  { code: "pt", name: "Português", native: "Português", flag: "🇵🇹" },
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", native: "Français", flag: "🇫🇷" },
  { code: "hi", name: "हिन्दी", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", native: "العربية", flag: "🇸🇦" },
];

export default function IdiomaSelector({ mobile = false }: { mobile?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang =
    LANGUAGES.find((l) => (i18n.language || "").startsWith(l.code)) || LANGUAGES[0];

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setOpen(false);
  };

  // ✅ Detecta se é mobile
  useEffect(() => {
    const check = () => {
      const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(window.innerWidth < 768 && touch);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ✅ Fecha ao clicar fora (apenas desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, isMobile]);

// ✅ Reage ao evento global "toggle-idioma" (vindo do MobileDock)
useEffect(() => {
  const handleToggle = (e: Event) => {
    e.preventDefault();
    setTimeout(() => setOpen(true), 30);
  };

  // escuta em window e document (iOS e Android compatível)
  window.addEventListener("toggle-idioma", handleToggle as EventListener);
  document.addEventListener("toggle-idioma", handleToggle as EventListener);

  return () => {
    window.removeEventListener("toggle-idioma", handleToggle as EventListener);
    document.removeEventListener("toggle-idioma", handleToggle as EventListener);
  };
}, []);


  const handleOpenClick = () => setOpen((o) => !o);

  // ✅ Modal mobile tipo cortina central
  const mobileModal =
    open && isMobile
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="idioma-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center"
              onClick={() => setOpen(false)}
            >
              <motion.div
                key="idioma-modal"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="
                  bg-white rounded-2xl shadow-2xl w-[88%] max-w-sm
                  p-5 text-gray-800 border border-gray-200 relative
                  z-[9999]
                "
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold mb-4 text-center">
                  🌍 Selecione o idioma
                </h2>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleChange(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        (i18n.language || "").startsWith(lang.code)
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.native}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      <div ref={ref} className="relative select-none z-[9999]">
        {/* 🌐 Botão principal (só desktop) */}
        {!mobile && (
          <button
            onClick={handleOpenClick}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-md hover:bg-white/20 active:scale-95 transition-all"
          >
            <Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base font-medium">{currentLang.flag}</span>
            <span className="text-xs sm:text-sm font-semibold uppercase">
              {currentLang.code}
            </span>
          </button>
        )}

        {/* 💻 Dropdown desktop (mantido igual) */}
        <AnimatePresence>
          {open && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-2 z-[999]"
            >
              {LANGUAGES.map((lang) => (
                <motion.button
                  key={lang.code}
                  onClick={() => handleChange(lang.code)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    (i18n.language || "").startsWith(lang.code)
                      ? "bg-blue-600/70 text-white font-semibold"
                      : "text-white/90 hover:bg-white/20"
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm">{lang.native}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal mobile via portal */}
      {mobileModal}
    </>
  );
}
