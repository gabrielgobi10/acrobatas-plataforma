import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Suporte() {
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [historico, setHistorico] = useState<{ de: string; texto: string }[]>([
    { de: "sistema", texto: "Olá! 👋 Como posso ajudar você hoje?" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const enviarMensagem = () => {
    if (!mensagem.trim()) return;
    setHistorico((prev) => [...prev, { de: "usuario", texto: mensagem }]);
    setMensagem("");
    setTimeout(() => {
      setHistorico((prev) => [
        ...prev,
        { de: "sistema", texto: "✅ Sua mensagem foi enviada. Em breve um atendente responderá." },
      ]);
    }, 1000);
  };

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  // 🔹 Fechar com ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // ✅ Escutar eventos do MobileDock (postMessage + fallback antigo)
  useEffect(() => {
    const handleEvent = () => setOpen(true);

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "open-suporte") setOpen(true);
    };

    window.addEventListener("open-suporte", handleEvent);
    document.addEventListener("open-suporte", handleEvent);
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("open-suporte", handleEvent);
      document.removeEventListener("open-suporte", handleEvent);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-suporte"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
            className="fixed z-[9998] bottom-[90px] inset-x-4 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-80 bg-white dark:bg-[#1b1b1b] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-sm sm:text-base">Suporte Acrobatas</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-4 h-[55vh] sm:h-64 overflow-y-auto space-y-3 scroll-smooth bg-white dark:bg-[#121212]">
              {historico.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm p-2 rounded-lg max-w-[80%] break-words ${
                    msg.de === "usuario"
                      ? "ml-auto bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {msg.texto}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 items-center bg-white dark:bg-[#1b1b1b]">
              <input
                ref={inputRef}
                type="text"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-[#121212] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 outline-none"
                onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
              />
              <button
                onClick={enviarMensagem}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 active:scale-95 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 bg-blue-600 text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition-all z-[9999]"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline font-medium text-sm">Suporte</span>
      </motion.button>
    </>
  );
}
