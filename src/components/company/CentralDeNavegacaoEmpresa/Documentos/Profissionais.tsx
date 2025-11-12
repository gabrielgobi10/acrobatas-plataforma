// src/components/company/CentralDeNavegacaoEmpresa/Documentos/Profissionais.tsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

// ✅ caminho correto (sem "components" no meio)
import ListPage from "./Profissionais/ListPage";
import DetailsPage from "./Profissionais/DetailsPage";

export default function ProfissionaisRoute() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const pageKey = selectedId ? `detalhes-${selectedId}` : "lista";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
        className="min-h-[calc(100vh-64px)]"
      >
        {selectedId ? (
          <DetailsPage profId={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <ListPage onOpenDetails={(id) => setSelectedId(id)} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

