import { Medal } from "lucide-react";
import { motion } from "framer-motion";

export default function Conquistas() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Medal className="w-6 h-6 text-emerald-600" />
        <h1 className="text-xl font-semibold">Conquistas</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed p-8 text-center border-emerald-200 dark:border-emerald-900/40"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Você ainda não desbloqueou conquistas.
        </p>
      </motion.div>
    </section>
  );
}
