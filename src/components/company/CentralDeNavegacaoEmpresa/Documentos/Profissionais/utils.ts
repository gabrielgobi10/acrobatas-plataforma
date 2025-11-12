import type { DocStatus, Documento } from "./types";

export const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export const statusClasses: Record<DocStatus, string> = {
  "válido":   "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 border-green-300/60",
  "pendente": "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300/60",
  "vencido":  "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 border-red-300/60",
};

export const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("pt-PT", { timeZone: "UTC" }) : "—";

export function criticidadeFromDocs(docs: Documento[]) {
  if (!docs.length) return 0;
  let s = 0;
  for (const d of docs) {
    if (d.status === "vencido") s += 70;
    else if (d.status === "pendente") s += 30;
    else s -= 5;
  }
  return Math.max(0, Math.min(100, Math.round(s / docs.length)));
}
