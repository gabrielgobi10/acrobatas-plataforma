// src/components/company/CentralDeNavegacaoEmpresa/Outros/PerfilEmpresa.tsx
import { useState } from "react";
import {
  Building2,
  User,
  FileText,
  CreditCard,
  Activity,
  Shield,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";

export default function PerfilEmpresa() {
  const [empresa, setEmpresa] = useState({
    nome: "Casais Engenharia S.A.",
    nif: "509999999",
    responsavel: "João Silva",
    cargo: "Diretor Técnico",
    email: "joao@casais.pt",
    telefone: "+351 912 345 678",
    endereco: "Av. da Liberdade, 250 — Lisboa",
    logo: "",
    status: "Ativa",
    dataAdesao: "15/09/2025",
    iban: "PT50 0002 0123 1234 5678 9015 4",
    banco: "Millennium BCP",
  });

  const documentos = [
    { nome: "Certidão Permanente", status: "Aprovado" },
    { nome: "Declaração Não Dívida AT", status: "Em análise" },
    { nome: "Declaração Não Dívida SS", status: "Pendente" },
    { nome: "Contrato Acrobatas", status: "Aprovado" },
  ];

  const statusColor = {
    Aprovado: "text-green-500",
    "Em análise": "text-yellow-400",
    Pendente: "text-gray-400",
    Rejeitado: "text-red-500",
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
        <Building2 className="text-blue-600" /> Perfil da Empresa
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Informações gerais, documentação e status da sua empresa dentro da
        plataforma Acrobatas.
      </p>

      {/* Cabeçalho da Empresa */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          {empresa.logo ? (
            <img
              src={empresa.logo}
              alt="Logo"
              className="w-20 h-20 rounded-xl object-contain border border-gray-300 dark:border-slate-700"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold">
              LOGO
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {empresa.nome}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              NIF {empresa.nif}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium mt-1 ${
                empresa.status === "Ativa"
                  ? "text-green-500"
                  : "text-yellow-400"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {empresa.status}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>
            <strong>Adesão:</strong> {empresa.dataAdesao}
          </p>
          <p>
            <strong>Banco:</strong> {empresa.banco}
          </p>
          <p>
            <strong>IBAN:</strong>{" "}
            {empresa.iban.replace(/.(?=.{4})/g, "*")} {/* máscara */}
          </p>
        </div>
      </motion.div>

      {/* Dados do Responsável */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md p-6 mb-6"
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          <User className="text-blue-500 w-5 h-5" /> Responsável e Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Responsável
            </p>
            <p className="text-base font-medium text-gray-800 dark:text-gray-200">
              {empresa.responsavel}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargo</p>
            <p className="text-base font-medium text-gray-800 dark:text-gray-200">
              {empresa.cargo}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
            <p className="text-base font-medium text-gray-800 dark:text-gray-200">
              {empresa.email}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Telefone / WhatsApp
            </p>
            <p className="text-base font-medium text-gray-800 dark:text-gray-200">
              {empresa.telefone}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Endereço Fiscal
            </p>
            <p className="text-base font-medium text-gray-800 dark:text-gray-200">
              {empresa.endereco}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Documentação */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md p-6 mb-6"
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          <FileText className="text-blue-500 w-5 h-5" /> Documentação
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentos.map((doc) => (
            <div
              key={doc.nome}
              className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-white/5"
            >
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {doc.nome}
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    statusColor[doc.status as keyof typeof statusColor]
                  }`}
                >
                  {doc.status}
                </p>
              </div>
              <button className="text-sm text-blue-600 hover:underline">
                Ver documento
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Atividade */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md p-6 mb-6"
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          <Activity className="text-blue-500 w-5 h-5" /> Atividade na Plataforma
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-500">5</p>
            <p className="text-sm text-gray-500">Obras ativas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">48</p>
            <p className="text-sm text-gray-500">Profissionais cedidos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">4.8⭐</p>
            <p className="text-sm text-gray-500">Avaliação média</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-400">12</p>
            <p className="text-sm text-gray-500">Pedidos totais</p>
          </div>
        </div>
      </motion.div>

      {/* Segurança e Acesso */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md p-6"
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          <Shield className="text-blue-500 w-5 h-5" /> Segurança e Acesso
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Controle de acesso da conta e informações de login.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">E-mail</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {empresa.email}
            </p>
          </div>
          <button className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Alterar palavra-passe
          </button>
        </div>
      </motion.div>
    </div>
  );
}
