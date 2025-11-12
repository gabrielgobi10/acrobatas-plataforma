import Card from "./Card";
import { TrendingUp } from "lucide-react";

export default function ProfitBand({
  mercado,
  sugerida,
  margem,
}: {
  mercado: [number, number];
  sugerida: number;
  margem: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      {/* Cabeçalho */}
      <div
        className="
          flex flex-col sm:flex-row sm:items-center sm:justify-between 
          gap-2 sm:gap-3
          text-slate-800 dark:text-slate-200
        "
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0" />
          <h3 className="font-semibold text-sm sm:text-base">
            Rentabilidade & Faixa de hora
          </h3>
        </div>

        <div className="text-[13px] sm:text-sm text-slate-600 dark:text-slate-400">
          Mercado:&nbsp;
          <span className="font-medium">
            €{mercado[0]}–{mercado[1]}
          </span>{" "}
          •{" "}
          <span className="text-emerald-500 font-medium">{margem}</span>
        </div>
      </div>

      {/* Faixa gráfica */}
      <div className="mt-3 sm:mt-4">
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
          {/* Faixa de mercado */}
          <div className="absolute inset-y-0 left-[10%] w-[55%] bg-slate-400/30" />
          {/* Indicador da taxa sugerida */}
          <div
            className="absolute inset-y-0 left-[55%] w-[3px] bg-blue-500"
            title={`Sugerida: €${sugerida}`}
          />
        </div>

        {/* Escala */}
        <div
          className="
            flex justify-between 
            text-[11px] sm:text-xs text-slate-500 
            mt-1 sm:mt-2
          "
        >
          <span>€5</span>
          <span>€10</span>
          <span>€15</span>
        </div>

        {/* Valor sugerido */}
        <div className="mt-2 text-[13px] sm:text-sm text-slate-700 dark:text-slate-300">
          Faixa sugerida:{" "}
          <b className="text-blue-600 dark:text-blue-400">
            €{sugerida.toFixed(2)}/h
          </b>
        </div>
      </div>
    </Card>
  );
}
