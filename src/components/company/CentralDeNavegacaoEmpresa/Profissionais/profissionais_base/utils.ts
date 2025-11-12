export const classBadge = (status?: string) => {
  switch (status) {
    case "em_obra":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    case "disponivel":
      return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
    default:
      return "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200";
  }
};

export const statusLabel = (status?: string) =>
  status === "em_obra" ? "Em obra" : status === "disponivel" ? "Disponível" : "Indisponível";

export const formatMoney = (v?: number | null) =>
  typeof v === "number" ? v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" }) : "—";

export const debounce = (fn: (...args: any[]) => void, ms = 400) => {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};
