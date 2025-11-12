import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Eye,
  X,
  ArrowUpRight,
  Award,
  Star,
  TrendingUp,
} from "lucide-react";

export default function ProfissionaisProgresso() {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<any>(null);

  // 🔹 Mock de dados
  const profissionais = [
    {
      id: 1,
      nome: "João Silva",
      profissao: "Eletricista",
      pontuacao: 420,
      nivel: "Profissional",
      status: "Ativo",
    },
    {
      id: 2,
      nome: "Carlos Mendes",
      profissao: "Pintor",
      pontuacao: 180,
      nivel: "Auxiliar",
      status: "Ativo",
    },
    {
      id: 3,
      nome: "Marcos Rocha",
      profissao: "Canalizador",
      pontuacao: 980,
      nivel: "Oficial",
      status: "Ativo",
    },
  ];

  const filtrados = profissionais.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.profissao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Profissionais & Progresso
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Acompanhe o nível e a evolução dos profissionais na plataforma.
          </p>
        </div>

        {/* Campo de busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar profissional..."
            className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela de profissionais */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {["Nome", "Profissão", "Pontuação", "Nível", "Status", "Ações"].map(
                (col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtrados.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
              >
                <td className="px-6 py-4 font-medium">{p.nome}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                  {p.profissao}
                </td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                  {p.pontuacao}
                </td>
                <td className="px-6 py-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  {p.nivel}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      p.status === "Ativo"
                        ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelecionado(p)}
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Eye className="w-4 h-4" /> Ver Carreira
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Modal de progresso */}
      <AnimatePresence>
        {selecionado && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              {/* Cabeçalho */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Carreira de {selecionado.nome}
                </h3>
                <button
                  onClick={() => setSelecionado(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Informações básicas */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Profissão:</span>
                  <span className="font-medium">{selecionado.profissao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nível atual:</span>
                  <span className="font-medium">{selecionado.nivel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pontuação total:</span>
                  <span className="font-semibold text-blue-600">
                    {selecionado.pontuacao} pts
                  </span>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>0</span>
                  <span>1500+</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    style={{
                      width: `${Math.min(
                        (selecionado.pontuacao / 1500) * 100,
                        100
                      )}%`,
                    }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>

              {/* Histórico visual (mock) */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Histórico recente
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                    <span className="text-gray-500">
                      Relatório completo do dia
                    </span>
                    <span className="text-green-600 font-medium">+10</span>
                  </li>
                  <li className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                    <span className="text-gray-500">Avaliação 5★</span>
                    <span className="text-green-600 font-medium">+20</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-500">Presença em obra</span>
                    <span className="text-green-600 font-medium">+5</span>
                  </li>
                </ul>
              </div>

              {/* Botão fechar */}
              <div className="mt-6 text-right">
                <button
                  onClick={() => setSelecionado(null)}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center gap-2 ml-auto"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
