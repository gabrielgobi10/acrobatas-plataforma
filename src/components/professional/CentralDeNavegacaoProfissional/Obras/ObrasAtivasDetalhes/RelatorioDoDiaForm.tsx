
// ============================================================================
// 📘 Relatório do Dia – Atualizado (modo claro e escuro otimizados)
// Layout idêntico no PC, responsivo no mobile, visual coerente em ambos temas
// ============================================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Paintbrush,
  Zap,
  Droplet,
  Construction,
  Wrench,
  CheckCircle2,
  Loader2,
  Send,
  Calendar,
  Clock4,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Relatorio = {
  id: string;
  data_relatorio: string;
  atividades: string[];
  materiais?: string | null;
  ocorrencias?: string | null;
  descricao?: string | null;
  progresso_diario?: number | null;
};

type Presenca = {
  data: string;
  hora_entrada: string | null;
  hora_saida: string | null;
};

const opcoesAtividades = [
  { id: "canalizacao", nome: "Canalização", icone: <Droplet size={22} /> },
  { id: "eletricidade", nome: "Eletricidade", icone: <Zap size={22} /> },
  { id: "pintura", nome: "Pintura", icone: <Paintbrush size={22} /> },
  { id: "reboco", nome: "Reboco", icone: <Construction size={22} /> },
  { id: "montagem", nome: "Montagem", icone: <Wrench size={22} /> },
  { id: "outro", nome: "Outro", icone: <Hammer size={22} /> },
];

export default function RelatorioDoDia({ obraId }: { obraId: string }) {
  const { user } = useAuth();

  // FORMULÁRIO
  const [passo, setPasso] = useState(1);
  const [atividade, setAtividade] = useState<string | null>(null);
  const [materiais, setMateriais] = useState("");
  const [problema, setProblema] = useState("");
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // HISTÓRICO
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [filtroMes, setFiltroMes] = useState<number | "todos">("todos");

  useEffect(() => {
    carregarRelatorios();
    carregarPresencas();
  }, []);

  async function carregarPresencas() {
    if (!user) return;
    const { data } = await supabase
      .from("presencas_profissionais")
      .select("data, hora_entrada, hora_saida")
      .eq("profissional_id", user.id || user.auth_id)
      .eq("obra_id", obraId)
      .order("data", { ascending: false });
    setPresencas(data || []);
  }

  async function carregarRelatorios() {
    if (!user) return;
    const { data } = await supabase
      .from("relatorios_obras")
      .select("*")
      .eq("profissional_id", user.id || user.auth_id)
      .eq("obra_id", obraId)
      .order("data_relatorio", { ascending: false });
    setRelatorios(data || []);
  }

  async function handleUpload(relatorioId: string) {
    for (const f of fotos) {
      const path = `${relatorioId}/${Date.now()}_${f.name}`;
      await supabase.storage.from("relatorios_fotos").upload(path, f);
    }
  }

  async function enviar() {
    if (!atividade) {
      setErro("Escolha o que fez hoje.");
      return;
    }
    setErro(null);
    setEnviando(true);

    try {
      const payload = {
        obra_id: obraId,
        profissional_id: user.id || user.auth_id,
        data_relatorio: new Date().toISOString().slice(0, 10),
        atividades: [atividade],
        materiais: materiais || null,
        ocorrencias:
          problema === "outro" && descricaoProblema
            ? descricaoProblema
            : problema || null,
        descricao: "Relatório rápido enviado pelo profissional.",
      };

      const { data, error } = await supabase
        .from("relatorios_obras")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (data?.id) await handleUpload(data.id);

      setRelatorios((prev) => [data, ...prev]);
      setFeito(true);
      setPasso(6);
    } catch (e) {
      console.error(e);
      setErro("Erro ao enviar relatório.");
    } finally {
      setEnviando(false);
    }
  }

  function addFotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const novos = Array.from(e.target.files);
    setFotos((prev) => [...prev, ...novos].slice(0, 3));
  }

  function getPresencaPorData(data: string) {
    return presencas.find((p) => p.data === data);
  }

  const relatoriosFiltrados = relatorios.filter((r) => {
    if (filtroMes === "todos") return true;
    const mes = new Date(r.data_relatorio).getMonth();
    return mes === filtroMes;
  });

  return (
    <div className="p-6 sm:p-8 transition-colors duration-300">
      <motion.h1 className="text-2xl font-bold flex items-center gap-2 mb-6 text-gray-900 dark:text-gray-100">
        <Hammer className="text-blue-500" /> Relatório do Dia
      </motion.h1>

      <AnimatePresence mode="wait">
        {passo <= 5 && (
          <motion.div
            key={`passo-${passo}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl border border-gray-200 dark:border-blue-800/30 bg-white/80 dark:bg-[#0B1736]/60 p-6 shadow-sm mb-8"
          >
            {/* PASSO 1 - Atividade */}
            {passo === 1 && (
              <>
                <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  O que você fez hoje?
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {opcoesAtividades.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAtividade(a.nome)}
                      className={`flex flex-col items-center justify-center rounded-xl py-4 border text-sm font-medium transition ${
                        atividade === a.nome
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-transparent border-gray-300 dark:border-blue-700/40 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-700/20"
                      }`}
                    >
                      {a.icone}
                      <span className="mt-1">{a.nome}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 text-right">
                  <button
                    onClick={() => setPasso(2)}
                    disabled={!atividade}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </>
            )}

            {/* PASSO 2 - Materiais */}
            {passo === 2 && (
              <>
                <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Usou algum material?
                </h2>
                <textarea
                  value={materiais}
                  onChange={(e) => setMateriais(e.target.value)}
                  placeholder="Ex: 5 tubos PVC, 2 válvulas..."
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0B1736]/40 border border-gray-300 dark:border-blue-800/40 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  rows={3}
                />
                <div className="mt-5 flex justify-between">
                  <button
                    onClick={() => setPasso(1)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setPasso(3)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold"
                  >
                    Próximo
                  </button>
                </div>
              </>
            )}

            {/* PASSO 3 - Problemas */}
            {passo === 3 && (
              <>
                <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Teve algum problema hoje?
                </h2>
                {!problema || problema !== "outro" ? (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => {
                        setProblema("nenhum");
                        setPasso(4);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
                    >
                      Não, tudo certo ✅
                    </button>
                    <button
                      onClick={() => {
                        setProblema("faltou material");
                        setPasso(4);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl"
                    >
                      Faltou material
                    </button>
                    <button
                      onClick={() => setProblema("outro")}
                      className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl"
                    >
                      Outro problema
                    </button>
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={descricaoProblema}
                      onChange={(e) => setDescricaoProblema(e.target.value)}
                      placeholder="Descreva o problema..."
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#0B1736]/40 border border-gray-300 dark:border-blue-800/40 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      rows={3}
                    />
                    <div className="mt-4 flex justify-between">
                      <button
                        onClick={() => setProblema("")}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => setPasso(4)}
                        disabled={!descricaoProblema.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-50"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PASSO 4 - FOTOS */}
            {passo === 4 && (
              <>
                <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                  Tira 1 ou 2 fotos do serviço
                </h2>
                <label className="block w-full text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Escolher ficheiros
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={addFotos}
                  className="block w-full text-sm bg-gray-50 dark:bg-[#0B1736]/40 border border-gray-300 dark:border-blue-800/40 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400 outline-none"
                />
                {fotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {fotos.map((f, i) => (
                      <img
                        key={i}
                        src={URL.createObjectURL(f)}
                        className="rounded-lg object-cover w-full h-24 border border-gray-300 dark:border-blue-800/40"
                      />
                    ))}
                  </div>
                )}
                <div className="mt-5 text-right">
                  <button
                    onClick={() => setPasso(5)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold"
                  >
                    Continuar
                  </button>
                </div>
              </>
            )}

            {/* PASSO 5 - Enviar */}
            {passo === 5 && (
              <div className="text-center">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Pronto pra enviar o relatório de hoje?
                </p>
                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 shadow-md"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Enviar agora
                    </>
                  )}
                </button>
                {erro && <p className="text-red-500 text-sm mt-2">{erro}</p>}
              </div>
            )}
          </motion.div>
        )}

        {/* Confirmação */}
        {feito && passo === 6 && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600 dark:text-green-400 flex flex-col items-center gap-3 mb-10"
          >
            <CheckCircle2 size={40} />
            <p className="font-semibold text-lg">
              Relatório enviado com sucesso!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HISTÓRICO DE RELATÓRIOS */}
      <div className="rounded-2xl border border-gray-200 dark:border-blue-800/30 bg-white/80 dark:bg-[#0B1736]/60 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <Calendar className="text-blue-500" /> Histórico de Relatórios
          </h2>
          <select
            value={filtroMes}
            onChange={(e) =>
              setFiltroMes(
                e.target.value === "todos" ? "todos" : Number(e.target.value)
              )
            }
            className="bg-gray-50 dark:bg-[#0B1736]/70 border border-gray-300 dark:border-blue-800/40 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="todos">Todos os meses</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(2025, i, 1).toLocaleString("pt-PT", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        {relatoriosFiltrados.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-6">
            Nenhum relatório encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {relatoriosFiltrados.map((r) => {
              const presenca = getPresencaPorData(r.data_relatorio);
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-gray-50 dark:bg-[#0B1736]/50 border border-gray-200 dark:border-blue-800/30"
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">
                      {new Date(r.data_relatorio).toLocaleDateString("pt-PT")}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Clock4 size={14} />{" "}
                      {presenca
                        ? `${presenca.hora_entrada || "--:--"} - ${
                            presenca.hora_saida || "--:--"
                          }`
                        : "sem registro"}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Atividade:</strong> {r.atividades?.join(", ")}
                  </p>
                  {r.materiais && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Materiais:</strong> {r.materiais}
                    </p>
                  )}
                  {r.ocorrencias && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Problema:</strong> {r.ocorrencias}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-6 leading-relaxed pb-10 sm:pb-0">
        Dica: o relatório diário é importante para registrar suas atividades e
        imprevistos de forma transparente. As fotos e horários ficam associados
        à obra e podem ser consultados pela empresa a qualquer momento.
      </div>
    </div>
  );
}
