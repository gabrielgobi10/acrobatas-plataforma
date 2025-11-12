import { motion } from "framer-motion";
import { MessageSquare, HardHat } from "lucide-react";

export default function ChatObra() {
  return (
    <div className="p-6 sm:p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-16 rounded-2xl border border-blue-800/20 bg-white dark:bg-[#0B1736]/60 shadow-md"
      >
        <MessageSquare className="w-12 h-12 text-blue-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Chat da Obra
        </h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
          💬 Esta funcionalidade ainda está em desenvolvimento. <br />
          Em breve, você poderá conversar diretamente com o engenheiro responsável,
          enviar fotos e acompanhar respostas aqui mesmo.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <HardHat size={16} className="text-yellow-500" />
          Equipa Acrobatas
        </div>
      </motion.div>
    </div>
  );
}
