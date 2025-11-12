interface Props {
  tipo?: string;
}

export default function MinhasCandidaturas({ tipo }: Props) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-3">📜 Minhas Candidaturas</h2>
      <p>Listagem de vagas às quais você se candidatou ({tipo || "todas"}).</p>
    </div>
  );
}
