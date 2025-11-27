// src/components/company/perfil/tabs/HistoricoTab.tsx
"use client";

type Item = { id: string; titulo: string; subtitulo: string; inicio: string; fim?: string; descricao?: string };

export default function HistoricoTab({ timeline }: { timeline: Item[] }) {
  return (
    <section className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
      <h3 className="text-slate-100 font-semibold mb-4">Histórico de Empresas & Obras</h3>
      {timeline.length === 0 ? (
        <div className="text-slate-400 text-sm">Sem histórico disponível.</div>
      ) : (
        <ul className="space-y-3 text-sm">
          {timeline.map((t) => (
            <li key={t.id} className="rounded-lg border border-slate-800 p-3 bg-slate-900/30">
              <div className="text-slate-100 font-medium">{t.titulo}</div>
              <div className="text-slate-400">{t.subtitulo}</div>
              <div className="text-xs text-slate-500">{t.inicio}</div>
              {t.descricao && <div className="text-xs text-slate-500">{t.descricao}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
