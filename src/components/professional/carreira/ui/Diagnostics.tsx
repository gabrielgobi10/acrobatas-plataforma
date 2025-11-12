import Card from "./Card";
import { CircleDot } from "lucide-react";
import { Diagnostico } from "../types";

export default function Diagnostics({ items }: { items: Diagnostico[] }) {
  return (
    <div
      className="
        grid 
        grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 
        gap-3 sm:gap-4
      "
    >
      {items.map((d, i) => {
        const color =
          d.status === "bom"
            ? "text-emerald-400 bg-emerald-500/10"
            : d.status === "medio"
            ? "text-amber-400 bg-amber-500/10"
            : "text-rose-400 bg-rose-500/10";

        return (
          <Card
            key={i}
            className="
              p-3 sm:p-5 
              flex flex-col justify-between
              transition-all duration-200
              hover:shadow-md hover:-translate-y-0.5
            "
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <d.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                  {d.titulo}
                </h3>
              </div>
              <span
                className={`
                  text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-medium 
                  ${color}
                `}
              >
                {d.status === "bom"
                  ? "Bom"
                  : d.status === "medio"
                  ? "Médio"
                  : "Atenção"}
              </span>
            </div>

            {/* Lista de pontos */}
            <ul
              className="
                text-[13px] sm:text-sm space-y-1.5 
                text-slate-600 dark:text-slate-300
              "
            >
              {d.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2">
                  <CircleDot className="w-3 h-3 text-slate-400 mt-1 shrink-0" />
                  <span className="leading-snug">{b}</span>
                </li>
              ))}
            </ul>

            {/* Ação */}
            <button
              className="
                mt-3 sm:mt-4 
                text-[12px] sm:text-xs text-blue-500 
                hover:text-blue-400 font-medium self-start
              "
            >
              Ver detalhes
            </button>
          </Card>
        );
      })}
    </div>
  );
}

