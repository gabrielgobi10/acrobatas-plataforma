import { ReactNode } from "react";

export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        rounded-2xl 
        border border-slate-200/60 dark:border-slate-700/70 
        bg-white/80 dark:bg-slate-800/70 
        shadow-sm 
        transition-all duration-200
        backdrop-blur-sm
        ${className}

        /* 🔹 Ajustes responsivos */
        p-3 sm:p-5
        mx-auto w-full
      `}
    >
      {children}
    </div>
  );
}
