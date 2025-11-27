// src/components/admin/Admindashboard/PerfilUsuarioAdmin.tsx

import { useEffect, useState } from "react";
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  Building2,
  Clock,
  Award,
  MessageSquare,
  Layers,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";

export default function PerfilUsuarioAdmin({ usuario, onVoltar }: any) {
  const [aba, setAba] = useState("info");
  const [obras, setObras] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [presencas, setPresencas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ======================================================
  // 🔹 Carregar dados reais (obras, docs, presenças)
  // ======================================================
  useEffect(() => {
    async function carregar() {
      setLoading(true);

      // Documentos
      const { data: docs } = await supabase
        .from("documentos")
        .select("*")
        .eq("usuario_id", usuario.id);

      // Obras e presenças
      const { data: pres } = await supabase
        .from("profissionais_obras")
        .select("*, obras(nome)")
        .eq("profissional_id", usuario.id);

      setDocumentos(docs || []);
      setPresencas(pres || []);
      setLoading(false);
    }

    carregar();
  }, [usuario]);

  // ======================================================
  // 🔹 ABAS DO PERFIL ADMINISTRATIVO
  // ======================================================
  const abas = [
    { id: "info", label: "Informações", icon: User },
    { id: "documentos", label: "Documentos", icon: FileText },
    { id: "obras", label: "Obras & Presenças", icon: Building2 },
    { id: "financeiro", label: "Financeiro", icon: TrendingUp },
    { id: "historico", label: "Histórico", icon: Layers },
    { id: "chat", label: "Chat", icon: MessageSquare },
  ];

  // ======================================================
  // 🔹 COMPONENTES DE CADA ABA
  // ======================================================

  const Info = () => (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <InfoCard label="Nome" value={usuario?.nome} icon={User} />
        <InfoCard label="Email" value={usuario?.email} icon={Mail} />
        <InfoCard label="Telefone" value={usuario?.telefone} icon={Phone} />
        <InfoCard label="Localidade" value={usuario?.localidade} icon={MapPin} />
        <InfoCard label="Tipo de Conta" value={usuario?.tipo_usuario} icon={ShieldCheck} />
        <InfoCard
          label="Profissão"
          value={usuario?.profissao || "—"}
          icon={Briefcase}
        />
        <InfoCard
          label="Cadastrado em"
          value={
            usuario?.data_cadastro
              ? new Date(usuario.data_cadastro).toLocaleDateString("pt-PT")
              : "—"
          }
          icon={Calendar}
        />
        <InfoCard
          label="Confiabilidade"
          value={usuario?.confiabilidade || "—"}
          icon={Award}
        />
      </div>
    </div>
  );

  const Documentos = () => (
    <div className="space-y-3">
      {documentos.length === 0 && <p className="text-slate-500">Nenhum documento enviado.</p>}
      {documentos.map((doc) => (
        <div
          key={doc.id}
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 flex justify-between"
        >
          <div>
            <p className="font-medium">{doc.nome}</p>
            <p className="text-xs text-slate-500">Status: {doc.status}</p>
          </div>
          <a
            href={doc.arquivo_url}
            target="_blank"
            className="text-blue-500 text-sm"
          >
            Abrir
          </a>
        </div>
      ))}
    </div>
  );

  const Obras = () => (
    <div className="space-y-3">
      {presencas.length === 0 && (
        <p className="text-slate-500">Nenhuma obra associada.</p>
      )}
      {presencas.map((p) => (
        <div
          key={p.id}
          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70"
        >
          <p className="font-semibold">{p.obras?.nome}</p>
          <p className="text-xs text-slate-500">Horas: {p.horas || "—"}</p>
        </div>
      ))}
    </div>
  );

  const Financeiro = () => (
    <p className="text-slate-500">Integração com pagamentos, recibos e saldo futuro.</p>
  );

  const Historico = () => (
    <p className="text-slate-500">Entradas, alterações, alertas, revisões e auditoria.</p>
  );

  const Chat = () => (
    <p className="text-slate-500">
      Em breve: abrir chat direto com este usuário pelo módulo de suporte.
    </p>
  );

  const ConteudoAba = {
    info: <Info />,
    documentos: <Documentos />,
    obras: <Obras />,
    financeiro: <Financeiro />,
    historico: <Historico />,
    chat: <Chat />,
  }[aba];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* ===================== */}
      {/* 🔙 VOLTAR */}
      {/* ===================== */}
      <button
        onClick={onVoltar}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>

      {/* ===================== */}
      {/* 🧑 FOTO + NOME */}
      {/* ===================== */}
      <div className="rounded-2xl p-6 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <User className="w-8 h-8 text-slate-600 dark:text-slate-300" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {usuario.nome}
            </h2>
            <p className="text-sm text-slate-500">{usuario.email}</p>
          </div>
        </div>
      </div>

      {/* ===================== */}
      {/* 🔵 ABAS */}
      {/* ===================== */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {abas.map((x) => {
          const Icon = x.icon;
          return (
            <button
              key={x.id}
              onClick={() => setAba(x.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                aba === x.id
                  ? "bg-sky-500 text-white shadow"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {x.label}
            </button>
          );
        })}
      </div>

      {/* ===================== */}
      {/* 📄 CONTEÚDO DA ABA */}
      {/* ===================== */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          ConteudoAba
        )}
      </div>
    </motion.div>
  );
}

// ==========================================================
// 🔹 COMPONENTE DE BLOCO DE INFORMAÇÃO
// ==========================================================
function InfoCard({ label, value, icon: Icon }: any) {
  return (
    <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/70">
      <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
        <Icon className="w-4 h-4" />
        {label}
      </p>
      <p className="font-medium text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}
