// src/components/company/perfil/tabs/AvaliacoesTab.tsx
"use client";

import { Star } from "lucide-react";

export default function AvaliacoesTab({ usuarioId, media }: { usuarioId: string; media: number }) {
  // Mantemos simples: apenas cabeçalho e média (lista pode ser feita depois)
  return (
    <section className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-slate-100 font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Avaliações
        </h3>
        <div className="text-sm text-slate-300 flex items-center gap-1">
          Média: <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="font-semibold">{(Number.isFinite(media) ? media : 0).toFixed(1)}</span>
          <span className="text-slate-500">/ 5</span>
        </div>
      </div>
      <div className="mt-3 text-slate-400 text-sm">
        (Em breve: lista de avaliações do usuário {usuarioId})
      </div>
    </section>
  );
}
