import { MessageSquare, ThumbsUp, Eye } from "lucide-react";

export default function AtividadeTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Metric icon={<ThumbsUp className="w-4 h-4" />} label="Recomendações" value="0" />
      <Metric icon={<Eye className="w-4 h-4" />} label="Visualizações do perfil" value="0" />
      <Metric icon={<MessageSquare className="w-4 h-4" />} label="Mensagens recentes" value="0" />
    </div>
  );
}
function Metric({ icon, label, value }: any) {
  return (
    <div className="rounded-xl border border-slate-800/50 bg-slate-900/40 p-4">
      <div className="text-slate-400 flex items-center gap-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
