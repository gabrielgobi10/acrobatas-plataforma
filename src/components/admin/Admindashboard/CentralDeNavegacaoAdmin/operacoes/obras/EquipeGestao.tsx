export default function EquipeGestao() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold">Gestão de Equipa</h2>

      <p className="text-slate-500 text-sm mt-3">
        Aqui você vai montar:
      </p>

      <ul className="list-disc ml-6 mt-3 text-sm text-slate-400">
        <li>Adicionar/remover profissionais</li>
        <li>Função do profissional na obra</li>
        <li>Horários da equipa</li>
        <li>Progresso do trabalho</li>
      </ul>
    </div>
  );
}
