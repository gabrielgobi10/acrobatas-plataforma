import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MailCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function RecuperarSenha({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErro("E-mail inválido.");
      return;
    }

    try {
      // Simulação (ou pode integrar ao Supabase Auth)
      setTimeout(() => {
        setEnviado(true);
      }, 1000);
    } catch (err) {
      setErro("Erro ao enviar e-mail. Tente novamente.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white bg-gray-100 rounded-2xl p-8 w-[380px] shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            {!enviado ? (
              <>
                <h2 className="text-xl font-semibold mb-3 text-gray-800">
                  Recuperar Senha
                </h2>
                <p className="text-gray-500 text-gray-500 text-sm mb-4">
                  Informe seu e-mail cadastrado e enviaremos um link para
                  redefinição de senha.
                </p>

                <form onSubmit={handleRecuperar} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                  {erro && (
                    <p className="text-sm text-red-600 font-medium">{erro}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Enviar link
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <MailCheck className="w-12 h-12 text-green-500 mb-3" />
                <h3 className="text-lg font-semibold mb-2 text-gray-800">
                  E-mail enviado!
                </h3>
                <p className="text-gray-500 text-gray-600 text-sm">
                  Verifique sua caixa de entrada e siga as instruções para
                  redefinir sua senha.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
