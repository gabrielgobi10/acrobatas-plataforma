import { ClipboardList, Briefcase, Clock, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  stats: {
    applications: number;
    newJobs: number;
    pending: number;
    accepted: number;
  };
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    {
      title: "Total de Candidaturas",
      value: stats.applications,
      icon: <ClipboardList className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      title: "Vagas Novas",
      value: stats.newJobs,
      icon: <Briefcase className="w-6 h-6 text-green-600" />,
      bg: "bg-green-50",
    },
    {
      title: "Pendentes",
      value: stats.pending,
      icon: <Clock className="w-6 h-6 text-yellow-600" />,
      bg: "bg-yellow-50",
    },
    {
      title: "Aceitas",
      value: stats.accepted,
      icon: <CheckCircle className="w-6 h-6 text-purple-600" />,
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 p-4 rounded-2xl shadow-sm hover:shadow-md transition border border-gray-100 border-gray-100 ${card.bg}`}
        >
          <div className="p-3 bg-white bg-gray-100 rounded-xl shadow-inner">{card.icon}</div>
          <div>
            <h3 className="text-sm text-gray-600 text-gray-600">{card.title}</h3>
            <p className="text-2xl font-semibold text-gray-800">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
