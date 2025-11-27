export default function RelatoriosDiarios() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold">Relatórios do Dia</h2>

      <p className="text-sm text-slate-500 mt-3">
        Aqui você monta:
      </p>

      <ul className="list-disc ml-6 mt-3 text-sm text-slate-400">
        <li>Relatório detalhado</li>
        <li>Fotos da obra</li>
        <li>Observações</li>
        <li>Checklist do dia</li>
      </ul>
    </div>
  );
}
