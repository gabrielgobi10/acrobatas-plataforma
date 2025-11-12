import Card from "./Card";
import { Target } from "lucide-react";
import { Recomendacao } from "../types";

export default function Recommendations({ items }: { items: Recomendacao[] }) {
  return (
    <Card className="p-4 sm:p-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Target className="w-4 h-4 sm:w-5 sm:h-5 text-pink-500" />
        <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
          Recomendações
        </h3>
      </div>

      {/* Lista de recomendações */}
      <div
        className="
          grid 
          grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 
          gap-2.5 sm:gap-3
        "
      >
        {items.map((r, i) => (
          <div
            key={i}
            className="
              rounded-xl border border-slate-200 dark:border-slate-700 
              p-3 sm:p-4 
              bg-slate-50/60 dark:bg-slate-900/40
              transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
            "
          >
            {/* Título + impacto */}
            <div className="flex items-center justify-between">
              <div className="text-[13px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                {r.titulo}
              </div>
              <span className="text-[11px] sm:text-xs text-slate-400">
                {r.impacto}
              </span>
            </div>

            {/* Mensagem */}
            <p className="text-[12px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-snug">
              {r.msg}
            </p>

            {/* Ações */}
            <div
              className="
                flex flex-wrap sm:flex-nowrap items-center gap-2 mt-3
              "
            >
              <button
                className="
                  flex-1 sm:flex-none 
                  text-[12px] sm:text-xs 
                  px-3 py-1.5 rounded-lg 
                  bg-blue-600 text-white 
                  hover:bg-blue-700 transition
                "
              >
                Fazer agora
              </button>
              <button
                className="
                  flex-1 sm:flex-none 
                  text-[12px] sm:text-xs 
                  px-3 py-1.5 rounded-lg 
                  border border-slate-300 dark:border-slate-700 
                  hover:bg-slate-100 dark:hover:bg-slate-800 transition
                "
              >
                Adiar
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
