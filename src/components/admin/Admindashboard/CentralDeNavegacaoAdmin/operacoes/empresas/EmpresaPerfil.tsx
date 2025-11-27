export default function EmpresaPerfil() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold">Perfil da Empresa</h2>

      <p className="text-slate-500 mt-3 text-sm">
        Aqui você monta a visão completa sobre a empresa:
      </p>

      <ul className="list-disc ml-6 mt-3 text-sm text-slate-400">
        <li>Dados gerais</li>
        <li>Obras da empresa</li>
        <li>Financeiro</li>
        <li>Documentação</li>
        <li>Equipe vinculada</li>
      </ul>
    </div>
  );
}
