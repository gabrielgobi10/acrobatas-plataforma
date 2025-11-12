import Card from "./Card";
import { CheckCircle2, CircleDot, BookOpen } from "lucide-react";

// 🔹 Item de tarefa (responsivo)
function Todo({ text, done }: { text: string; done: boolean }) {
  return (
    <div
      className={`
        flex items-center gap-2
        rounded-xl border 
        p-2.5 sm:p-3 text-[13px] sm:text-sm
        transition-all duration-200
        ${
          done
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40"
        }
      `}
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
      ) : (
        <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
      )}
      <span
        className={`
          leading-snug
          ${done ? "line-through opacity-70" : ""}
        `}
      >
        {text}
      </span>
    </div>
  );
}

// 🔹 Componente principal — trilha de evolução
export default function EvolutionTrail() {
  return (
    <Card className="p-4 sm:p-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <BookOpen className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">
          Minha trilha de evolução
        </h3>
      </div>

      {/* Lista de tarefas */}
      <div
        className="
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 
          gap-2.5 sm:gap-4
        "
      >
        <Todo text="Concluir mais 2 obras" done={false} />
        <Todo text="Manter média ≥ 4.7 por 4 semanas" done={true} />
        <Todo text="Atualizar Seguro RC" done={false} />
        <Todo text="Curso de Segurança em Altura" done={false} />
        <Todo text="Relatórios diários por 30 dias" done={true} />
        <Todo text="Zero no-show por 60 dias" done={true} />
      </div>
    </Card>
  );
}
