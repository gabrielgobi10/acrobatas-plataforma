/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import {
  Plus,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Ocorrencia = {
  id: string;
  obra_id: string;
  profissional_id?: string | null;
  tipo?: string | null;
  titulo: string;
  descricao?: string | null;
  prioridade?: string | null;
  status: string;
  data_criacao: string;
  data_resolucao?: string | null;
  profissionais?: {
    nome?: string | null;
    area?: string | null;
    foto_url?: string | null;
  } | null;
};

type ProfissionalObra = {
  profissional_id: string;
  profissionais: {
    nome: string;
    area?: string | null;
    foto_url?: string | null;
  };
};

export default function Ocorrencias({ obraId }: { obraId: string }) {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalObra[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  // Campos formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("Observação");
  const [prioridade, setPrioridade] = useState("Média");
  const [profissionalId, setProfissionalId] = useState<string | null>(null);

  useEffect(() => {
    carregarOcorrencias();
    carregarProfissionais();
  }, [obraId]);

  async function carregarOcorrencias() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ocorrencias_obras")
      .select(
        `
        id,
        obra_id,
        profissional_id,
        tipo,
        titulo,
        descricao,
        prioridade,
        status,
        data_criacao,
        data_resolucao,
        profissionais:profissional_id (nome, area, foto_url)
      `
      )
      .eq("obra_id", obraId)
      .order("data_criacao", { ascending: false });

    if (!error && data) setOcorrencias(data);
    setLoading(false);
  }

  async function carregarProfissionais() {
    const { data, error } = await supabase
      .from("profissionais_obras")
      .select("profissional_id, profissionais(nome, area, foto_url)")
      .eq("obra_id", obraId);
    if (!error && data) setProfissionais(data);
  }

  async function adicionarOcorrencia() {
    if (!titulo.trim()) return alert("O título é obrigatório.");

    const { error } = await supabase.from("ocorrencias_obras").insert([
      {
        obra_id: obraId,
        profissional_id: profissionalId,
        tipo,
        titulo,
        descricao,
        prioridade,
        status: "Pendente",
        data_criacao: new Date(),
      },
    ]);

    if (error) {
      console.error(error);
      alert("Erro ao adicionar ocorrência.");
    } else {
      setModalAberto(false);
      setTitulo("");
      setDescricao("");
      carregarOcorrencias();
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Ocorrências da Obra
        </h2>
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:brightness-110 transition-all"
        >
          <Plus size={16} /> Nova Ocorrência
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      ) : ocorrencias.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-16">
          Nenhuma ocorrência registrada nesta obra.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {ocorrencias.map((o) => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#161c28] p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {o.tipo === "Segurança" ? (
                      <AlertTriangle className="text-red-500 w-4 h-4" />
                    ) : o.status === "Resolvido" ? (
                      <CheckCircle2 className="text-green-500 w-4 h-4" />
                    ) : (
                      <Clock3 className="text-yellow-500 w-4 h-4" />
                    )}
                    <h3 className="font-medium text-gray-800 dark:text-gray-100">
                      {o.titulo}
                    </h3>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      o.status === "Resolvido"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {o.descricao || "Sem descrição detalhada."}
                </p>

                <div className="flex items-center justify-between text-sm opacity-80">
                  {o.profissionais ? (
                    <div className="flex items-center gap-2">
                      {o.profissionais.foto_url ? (
                        <img
                          src={o.profissionais.foto_url}
                          className="w-6 h-6 rounded-full"
                          alt={o.profissionais.nome || ""}
                        />
                      ) : (
                        <User className="w-5 h-5 opacity-60" />
                      )}
                      <span>
                        {o.profissionais.nome} — {o.profissionais.area}
                      </span>
                    </div>
                  ) : (
                    <span className="italic text-gray-400">
                      Sem profissional vinculado
                    </span>
                  )}

                  <span className="text-xs">
                    {new Date(o.data_criacao).toLocaleDateString("pt-PT")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Fundo escuro */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalAberto(false)}
            />

            {/* Caixa central */}
            <motion.div
              className="relative z-50 w-[90%] max-w-lg bg-white dark:bg-[#1b2332] rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-8"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Nova Ocorrência
                </h3>
                <button
                  onClick={() => setModalAberto(false)}
                  className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título"
                  className="w-full border border-gray-300 dark:border-zinc-700 
                  rounded-lg p-2.5 text-sm bg-transparent focus:ring-2 
                  focus:ring-blue-600 outline-none text-gray-800 dark:text-gray-100"
                />
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição detalhada"
                  className="w-full border border-gray-300 dark:border-zinc-700 
                  rounded-lg p-2.5 text-sm bg-transparent min-h-[90px] 
                  focus:ring-2 focus:ring-blue-600 outline-none 
                  text-gray-800 dark:text-gray-100"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="border border-gray-300 dark:border-zinc-700 rounded-lg 
                    p-2 text-sm bg-white dark:bg-[#0f1625] text-gray-800 dark:text-gray-100
                    focus:ring-2 focus:ring-blue-600 outline-none appearance-none"
                  >
                    <option>Observação</option>
                    <option>Falta/Atraso</option>
                    <option>Comportamento</option>
                    <option>Segurança</option>
                    <option>Desempenho</option>
                    <option>Substituição</option>
                    <option>Saída antecipada</option>
                  </select>

                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value)}
                    className="border border-gray-300 dark:border-zinc-700 rounded-lg 
                    p-2 text-sm bg-white dark:bg-[#0f1625] text-gray-800 dark:text-gray-100
                    focus:ring-2 focus:ring-blue-600 outline-none appearance-none"
                  >
                    <option>Baixa</option>
                    <option>Média</option>
                    <option>Alta</option>
                  </select>
                </div>

                <select
                  value={profissionalId || ""}
                  onChange={(e) => setProfissionalId(e.target.value || null)}
                  className="border border-gray-300 dark:border-zinc-700 rounded-lg 
                  p-2 text-sm bg-white dark:bg-[#0f1625] text-gray-800 dark:text-gray-100
                  focus:ring-2 focus:ring-blue-600 outline-none appearance-none w-full"
                >
                  <option value="">Selecionar profissional</option>
                  {profissionais.map((p) => (
                    <option key={p.profissional_id} value={p.profissional_id}>
                      {p.profissionais.nome} — {p.profissionais.area}
                    </option>
                  ))}
                </select>

                <button
                  onClick={adicionarOcorrencia}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:brightness-110 transition-all shadow-md font-medium"
                >
                  Adicionar Ocorrência
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


