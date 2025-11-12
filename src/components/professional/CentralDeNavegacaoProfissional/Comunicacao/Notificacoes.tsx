import { Bell } from "lucide-react";
import { motion } from "framer-motion";

export default function Notificacoes() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold">Notificações</h1>
      </div>

      <motion.ul
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900"
      >
        <li className="p-4 text-gray-500 dark:text-gray-400">
          Nenhuma notificação no momento.
        </li>
      </motion.ul>
    </div>
  );
}
