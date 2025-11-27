// src/components/company/perfil/tabs/DocumentosTab.tsx
"use client";

type Documento = { nome: string; status: "validado" | "pendente" | "expirado" };

export default function DocumentosTab({ documentos }: { documentos: Documento[] }) {
  const list = documentos?.length
    ? documentos
    : [{ nome: "Identificação", status: "pendente" as const }];

  const badge = (s: Documento["status"]) =>
    s === "validado"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : s === "expirado"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <section className="rounded-2xl bg-slate-900/40 border border-slate-800 p-4">
      <h3 className="text-slate-100 font-semibold mb-3">Documentos</h3>
      <div className="flex flex-wrap gap-2">
        {list.map((d) => (
          <span key={d.nome} className={`px-3 py-1 rounded-full text-xs font-medium ${badge(d.status)}`}>
            {d.nome} — {d.status}
          </span>
        ))}
      </div>
    </section>
  );
}
