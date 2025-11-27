export default function ObraDetalhe() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold">Detalhe da Obra</h2>

      <p className="text-sm text-slate-500 mt-3">
        Aqui você monta painel completo da obra:
      </p>

      <ul className="list-disc ml-6 mt-3 text-sm text-slate-400">
        <li>Informações gerais</li>
        <li>Equipe alocada</li>
        <li>Presenças do dia</li>
        <li>Relatórios de obra</li>
        <li>Localização / mapa</li>
      </ul>
    </div>
  );
}
