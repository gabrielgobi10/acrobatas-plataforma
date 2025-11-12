import { useState } from "react";
import Card from "./Card";

// 🔹 Accordion de detalhes (melhorado para mobile)
export function DetailsAccordion({ title, icon: Icon, children }: any) {
  const [open, setOpen] = useState(false);

  return (
    <Card
      className={`
        overflow-hidden 
        transition-all duration-200
        ${open ? "ring-1 ring-blue-500/20" : ""}
      `}
    >
      <button
        onClick={() => setOpen((p) => !p)}
        className={`
          w-full flex items-center justify-between 
          px-3 sm:px-5 py-3 sm:py-4
          text-left
          hover:bg-slate-50 dark:hover:bg-slate-800/40
          transition-colors duration-150
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          <h3 className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200">
            {title}
          </h3>
        </div>
        <span className="text-lg sm:text-xl leading-none text-slate-400 dark:text-slate-500">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="px-3 sm:px-5 pb-4 sm:pb-5 text-sm text-slate-600 dark:text-slate-300 animate-fadeIn">
          {children}
        </div>
      )}
    </Card>
  );
}

// 🔹 Mini estatísticas — compactas e responsivas
export const MiniStat = ({ title, value, icon: Icon }: any) => (
  <div
    className={`
      flex flex-col justify-center
      rounded-xl border border-slate-200 dark:border-slate-700
      bg-white/70 dark:bg-slate-900/40
      p-3 sm:p-4 
      min-w-[110px] sm:min-w-[130px]
      shadow-sm transition-all
    `}
  >
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
      <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
        {title}
      </div>
    </div>

    <div className="mt-1 sm:mt-2 font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">
      {value}
    </div>
  </div>
);
