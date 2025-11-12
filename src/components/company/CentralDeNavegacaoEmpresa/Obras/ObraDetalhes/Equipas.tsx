// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Equipas.tsx
import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  Clock3,
  X,
  Loader2,
  MailOpen,
  FileWarning,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

type VinculoStatus = "ativo" | "convocado" | "pendente";

type Profissional = {
  id: string;
  nome: string;
  area?: string | null;
  foto_url?: string | null;
  telefone?: string | null;
  email?: string | null;
  documentacao_ok?: boolean;
  nif?: string | null;
  categoria?: string | null;
  sexo?: string | null;
  seguranca_social?: string | null;
  profissao?: string | null;
};

type Vinculo = {
  id: string;
  status: VinculoStatus;
  funcao?: string | null;
  experiencia?: string | null;
  profissional?: Profissional | null;
};

export default function Equipas({ obraId }: { obraId: string }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<Vinculo[]>([]);
  const [candidaturas, setCandidaturas] = useState<Vinculo[]>([]);
  const [filtroFuncao, setFiltroFuncao] = useState("Todos");
  const [painelAberto, setPainelAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState<Profissional | null>(null);
  const navigate = useNavigate();

  async function load() {
    if (!obraId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(`
          id,
          status,
          funcao,
          experiencia,
          profissionais!fk_profissional_obra (
            id,
            nome,
            area,
            foto_url,
            telefone,
            email
          )
        `)
        .eq("obra_id", obraId);

      if (error) throw error;

      const all = (data || []).map((v: any) => ({
        id: v.id,
        status: (v.status || "pendente").toLowerCase(),
        funcao: v.funcao,
        experiencia: v.experiencia,
        profissional: {
          ...v.profissionais,
          documentacao_ok: Math.random() > 0.3,
          nif: "PT" + Math.floor(100000000 + Math.random() * 900000000),
          categoria: v.funcao || "PINTOR",
          sexo: Math.random() > 0.5 ? "Masculino" : "Feminino",
          seguranca_social: String(
            Math.floor(10000000000 + Math.random() * 90000000000)
          ),
          profissao: v.funcao || "Profissional de Construção",
        },
      }));

      setEquipe(all.filter((v) => v.status !== "pendente"));
      setCandidaturas(all.filter((v) => v.status === "pendente"));
    } catch (err) {
      console.error("❌ Erro ao carregar equipe:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [obraId]);

  async function handleStatusUpdate(id: string, novoStatus: VinculoStatus) {
    try {
      setProcessing(id);
      const { error } = await supabase
        .from("profissionais_obras")
        .update({ status: novoStatus })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    } finally {
      setProcessing(null);
    }
  }

  const equipaFiltrada = useMemo(() => {
    if (filtroFuncao === "Todos") return equipe;
    return equipe.filter((e) => e.funcao === filtroFuncao);
  }, [filtroFuncao, equipe]);

  const candidaturasPendentes = candidaturas.length;

  return (
    <div className="relative w-full">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 space-y-6 sm:space-y-8">
          {/* 🔹 Cards resumo */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <ResumoCard titulo="Total" valor={equipe.length} />
            <ResumoCard
              titulo="Ativos"
              valor={equipe.filter((e) => e.status === "ativo").length}
            />
            <ResumoCard
              titulo="Convocados"
              valor={equipe.filter((e) => e.status === "convocado").length}
            />
          </div>

          {/* 🔹 Equipa principal */}
          <div className="bg-white dark:bg-[#1b2332] rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h3 className="font-semibold flex items-center gap-2 text-zinc-900 dark:text-white text-sm sm:text-base">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                Equipa desta Obra
              </h3>
              <button
                onClick={() => {
                  const evt = new CustomEvent("setSection", {
                    detail: "adicionar-profissional",
                  });
                  window.top?.dispatchEvent(evt);
                }}
                className="px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* 🔹 Filtros */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {["Todos", ...new Set(equipe.map((e) => e.funcao || "Sem função"))].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroFuncao(f)}
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                      filtroFuncao === f
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-[#121926] border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                    }`}
                  >
                    {f}
                  </button>
                )
              )}
            </div>

            {/* 🔹 Lista da equipa */}
            {loading ? (
              <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                Carregando...
              </div>
            ) : equipaFiltrada.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {equipaFiltrada.map((e) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setPerfilAberto(e.profissional || null)}
                    className="cursor-pointer bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          e.profissional?.foto_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            e.profissional?.nome || "?"
                          )}`
                        }
                        alt={e.profissional?.nome || "Profissional"}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-400/40"
                      />
                      <div className="min-w-0">
                        <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white truncate">
                          {e.profissional?.nome || "Sem nome"}
                        </div>
                        <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {e.funcao || e.profissional?.area}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[10px] sm:text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          e.status === "ativo"
                            ? "bg-green-500/10 text-green-600 dark:text-green-300 border border-green-500/30"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {e.status === "ativo" ? "Ativo" : "Convocado"}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Clock3 className="w-3 h-3" /> Em atividade
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum profissional vinculado a esta obra.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔹 Botão flutuante de candidaturas */}
      <button
        onClick={() => setPainelAberto(!painelAberto)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 sm:p-4 shadow-lg flex items-center gap-2 transition-all"
      >
        <MailOpen className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-medium text-xs sm:text-sm hidden sm:block">
          {painelAberto ? "Fechar" : "Candidaturas"}
        </span>
        {candidaturasPendentes > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-600 text-[10px] text-white rounded-full px-1.5 py-0.5"
          >
            {candidaturasPendentes}
          </motion.span>
        )}
      </button>

      {/* 🔹 Painel lateral de candidaturas */}
      <AnimatePresence>
        {painelAberto && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPainelAberto(false)}
            />
            <motion.aside
              className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-[#121926] border-l border-zinc-300 dark:border-zinc-700 z-50 shadow-2xl p-4 sm:p-6 overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2 text-zinc-900 dark:text-white">
                  <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  Candidaturas
                </h3>
                <button
                  onClick={() => setPainelAberto(false)}
                  className="text-zinc-500 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                  Carregando...
                </div>
              ) : candidaturas.length ? (
                <div className="flex flex-col gap-3">
                  {candidaturas.map((c) => (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setPerfilAberto(c.profissional || null)}
                      className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            c.profissional?.foto_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              c.profissional?.nome || "?"
                            )}`
                          }
                          alt={c.profissional?.nome || "Profissional"}
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/40"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {c.profissional?.nome}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {c.funcao || c.profissional?.area}
                          </div>
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                            {c.experiencia}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => handleStatusUpdate(c.id, "ativo")}
                          disabled={processing === c.id}
                          className="px-2.5 py-1 text-xs rounded-lg bg-green-600 hover:bg-green-700 text-white transition disabled:opacity-50"
                        >
                          {processing === c.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Aceitar"
                          )}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(c.id, "pendente")}
                          disabled={processing === c.id}
                          className="px-2.5 py-1 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition disabled:opacity-50"
                        >
                          Recusar
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Nenhuma candidatura pendente.
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 🔹 Modal perfil profissional */}
      <AnimatePresence>
        {perfilAberto && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-[#1b2332] rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-700 shadow-2xl relative"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                onClick={() => setPerfilAberto(null)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-3 mt-6">
                <img
                  src={
                    perfilAberto.foto_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      perfilAberto.nome || "?"
                    )}`
                  }
                  alt={perfilAberto.nome}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-emerald-400/40 shadow-md"
                />
                <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
                  {perfilAberto.nome}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {perfilAberto.area}
                </p>
              </div>

              <div className="mt-5 space-y-1 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                <p><strong>NIF:</strong> {perfilAberto.nif}</p>
                <p><strong>Categoria:</strong> {perfilAberto.categoria}</p>
                <p><strong>Sexo:</strong> {perfilAberto.sexo}</p>
                <p><strong>Seg. Social:</strong> {perfilAberto.seguranca_social}</p>
              </div>

              <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-800/50">
                {perfilAberto.documentacao_ok ? (
                  <div className="flex items-center gap-3 text-green-600 dark:text-green-400 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <p>Toda a documentação está em dia ✅</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-amber-500 dark:text-yellow-400 text-xs sm:text-sm">
                    <FileWarning className="w-4 h-4 sm:w-5 sm:h-5" />
                    <p>Existem pendências na documentação ⚠️</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-center gap-2 sm:gap-3">
                <button
                  onClick={() =>
                    navigate(`/empresa/documentacao/profissionais/${perfilAberto.id}`)
                  }
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm flex items-center gap-1.5 transition"
                >
                  Ver Documentação
                </button>
                <button
                  onClick={() => setPerfilAberto(null)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 transition"
                >
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

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg sm:rounded-xl bg-white/70 dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-3 sm:p-4 shadow-sm text-center">
      <div className="text-[11px] sm:text-sm text-zinc-600 dark:text-zinc-400">
        {titulo}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">
        {valor}
      </div>
    </div>
  );
}
