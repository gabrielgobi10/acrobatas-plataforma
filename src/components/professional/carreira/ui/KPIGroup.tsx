import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Card from "./Card";
import { KPI } from "../types";

export default function KPIGroup({ kpis }: { kpis: KPI[] }) {
  return (
    <div
      className="
        grid 
        grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 
        gap-2.5 sm:gap-4
      "
    >
      {kpis.map((k, i) => (
        <Card
          key={i}
          className="
            p-3 sm:p-4 
            flex flex-col justify-between
            hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
          "
        >
          {/* Cabeçalho KPI */}
          <div className="flex items-center justify-between">
            <k.icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            {typeof k.delta === "number" && (
              <span
                className={`
                  inline-flex items-center gap-1 
                  px-1.5 sm:px-2 py-0.5 rounded-full 
                  text-[10px] sm:text-xs font-medium
                  ${
                    k.delta >= 0
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-rose-500/15 text-rose-500"
                  }
                `}
              >
                {k.delta >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {k.delta >= 0 ? "+" : ""}
                {k.delta}
              </span>
            )}
          </div>

          {/* Valor e rótulo */}
          <div className="mt-2 sm:mt-3">
            <div
              className="
                text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100
              "
            >
              {k.value}
            </div>
            <div
              className="
                text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1
              "
            >
              {k.label}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
