import { BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function Certificacoes() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <BadgeCheck className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold">Certificações</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed p-8 text-center border-gray-300 dark:border-slate-700"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Nenhuma certificação cadastrada.
        </p>
      </motion.div>
    </section>
  );
}
