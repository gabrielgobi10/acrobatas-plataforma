// src/components/company/CentralDeNavegacaoEmpresa/Documentos/components/StatsHeader.tsx
import type { StatsResumo } from "../types/documentTypes";

interface Props {
  resumo: StatsResumo;
}

export default function StatsHeader({ resumo }: Props) {
  const Item = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-800">{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Item label="Total" value={resumo.total} />
      <Item label="Válidos" value={resumo.validos} />
      <Item label="Vencendo" value={resumo.vencendo} />
      <Item label="Vencidos" value={resumo.vencidos} />
      <Item label="Pendentes" value={resumo.pendentes} />
    </div>
  );
}
