import { Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function Configuracoes() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold">Configurações</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border p-6 border-gray-200 dark:border-slate-700 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span>Notificações por email</span>
          <input type="checkbox" className="toggle toggle-primary" />
        </div>
        <div className="flex items-center justify-between">
          <span>Idioma</span>
          <select className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
            <option>Português</option>
            <option>English</option>
          </select>
        </div>
      </motion.div>
    </section>
  );
}
