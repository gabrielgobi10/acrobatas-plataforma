// src/components/professional/TutorialOnboarding.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Briefcase, Rocket } from "lucide-react";

export default function TutorialOnboarding({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      icon: <Sparkles className="w-10 h-10 text-blue-400 mb-3 animate-pulse" />,
      title: "🎉 Parabéns, perfil completo!",
      text: "Seu perfil está pronto! Agora você já pode visualizar vagas e começar a trabalhar com a Acrobatas.",
      button: "Ver como funciona",
    },
    {
      icon: <Briefcase className="w-10 h-10 text-cyan-400 mb-3 animate-bounce" />,
      title: "💼 Vagas Disponíveis",
      text: "Aqui você encontra todas as obras abertas. É só clicar em 'Ver Detalhes' e se candidatar com 1 clique.",
      button: "Continuar",
    },
    {
      icon: <Rocket className="w-10 h-10 text-emerald-400 mb-3 animate-pulse" />,
      title: "🚀 Tudo pronto!",
      text: "Agora você pode se candidatar e acompanhar seu progresso nas obras. Boa sorte e bem-vindo à equipe Acrobatas!",
      button: "Começar agora",
    },
  ];

  const current = steps[step - 1];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center px-4"
      >
        <motion.div
          key={step}
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl border border-slate-200 dark:border-slate-700"
        >
          <div className="relative z-10 flex flex-col items-center">
            {current.icon}
            <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {current.text}
            </p>

            <button
              onClick={() => {
                if (step < steps.length) {
                  setStep(step + 1);
                } else {
                  localStorage.setItem("tutorial_visto", "true");
                  onFinish();
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.03] transition-all"
            >
              {current.button}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
