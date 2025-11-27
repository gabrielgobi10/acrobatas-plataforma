// src/components/admin/CentralDeNavegacaoAdmin/operacoes/profissionais/ProfissionalPerfil.tsx

import { ArrowLeft } from "lucide-react";

export default function ProfissionalPerfil({ profissional, onVoltar }) {

  // Se não recebeu os dados = não tenta renderizar nada
  if (!profissional) {
    return (
      <div className="text-center text-slate-400 p-8">
        Carregando perfil do profissional...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-800 space-y-6">

      {/* Voltar */}
      <button
        onClick={onVoltar}
        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Título */}
      <h2 className="text-2xl font-semibold">Perfil do Profissional</h2>

      <p className="text-slate-500 text-sm">
        Visão completa 360° do profissional.
      </p>

      {/* =======================
            FOTO + INFO PRINCIPAL
      ======================== */}
      <div className="flex items-center gap-6 mt-4">
        <img
          src={profissional.foto_url || "/user-default.png"}
          alt={profissional.nome}
          className="w-24 h-24 rounded-full object-cover border border-slate-300 dark:border-slate-700"
        />

        <div>
          <h3 className="text-xl font-semibold">{profissional.nome}</h3>
          <p className="text-slate-400 text-sm">{profissional.funcao || "Função não definida"}</p>
          <p className="text-xs text-slate-500">Nível: {profissional.nivel || "Não definido"}</p>
        </div>
      </div>

      {/* =======================
            SEÇÕES DO PERFIL
      ======================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">

        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <h4 className="font-semibold mb-2">Informações pessoais</h4>
          <p className="text-sm text-slate-400">Telefone: {profissional.telefone || "-"}</p>
          <p className="text-sm text-slate-400">Email: {profissional.email || "-"}</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <h4 className="font-semibold mb-2">Documentos</h4>
          <p className="text-sm text-slate-400">Status: {profissional.docs_status || "Não informado"}</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <h4 className="font-semibold mb-2">Obra atual</h4>
          <p className="text-sm text-slate-400">
            {profissional.obra_atual || "Nenhuma obra ativa"}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <h4 className="font-semibold mb-2">Presenças</h4>
          <p className="text-sm text-slate-400">Clique para ver presenças</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <h4 className="font-semibold mb-2">Histórico</h4>
          <p className="text-sm text-slate-400">Obras anteriores, datas, horas trabalhadas</p>
        </div>

        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <h4 className="font-semibold mb-2">Candidaturas</h4>
          <p className="text-sm text-slate-400">Candidaturas enviadas e status</p>
        </div>

      </div>
    </div>
  );
}
