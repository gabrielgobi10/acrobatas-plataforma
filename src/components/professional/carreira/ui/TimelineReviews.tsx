import Card from "./Card";
import { BadgeCheck, Star } from "lucide-react";
import { TimelineItem, Avaliacao } from "../types";

export default function TimelineReviews({
  timeline,
  avaliacoes,
}: {
  timeline: TimelineItem[];
  avaliacoes: Avaliacao[];
}) {
  return (
    <>
      {/* 🏆 Conquistas e marcos */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
          <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
            Conquistas e marcos
          </h3>
        </div>

        <div className="relative ml-2 sm:ml-3">
          {/* Linha vertical */}
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500/40" />

          <div className="space-y-4 sm:space-y-5 pl-4 sm:pl-5">
            {timeline.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[7px] sm:-left-[9px] top-[6px] w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500" />
                <div className="text-[13px] sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                  {t.titulo}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400">
                  {t.data}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ⭐ Avaliações das empresas */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100">
            Avaliações das empresas
          </h3>
        </div>

        <div className="grid gap-2.5 sm:gap-3">
          {avaliacoes.map((av, i) => (
            <div
              key={i}
              className="
                rounded-xl border border-slate-200 dark:border-slate-700 
                p-3 sm:p-4 
                bg-slate-50/60 dark:bg-slate-900/40
                transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
              "
            >
              {/* Cabeçalho */}
              <div className="flex justify-between flex-wrap sm:flex-nowrap gap-1">
                <div className="font-semibold text-[13px] sm:text-sm text-slate-800 dark:text-slate-100">
                  {av.empresa}
                </div>
                <div className="text-yellow-400 flex items-center gap-1 text-[13px] sm:text-sm">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {av.nota}
                </div>
              </div>

              {/* Comentário */}
              <p className="text-[12px] sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-snug">
                {av.comentario}
              </p>

              {/* Data */}
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1">
                {av.data}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
