import { Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function Ranking() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-violet-600" />
        <h1 className="text-xl font-semibold">Ranking</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed p-8 text-center border-violet-200 dark:border-violet-900/40"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Em breve: ranking por área, pontuação e conquistas.
        </p>
      </motion.div>
    </div>
  );
}
