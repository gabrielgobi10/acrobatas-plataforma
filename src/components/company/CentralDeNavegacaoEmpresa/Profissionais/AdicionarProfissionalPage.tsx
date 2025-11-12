import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  UserPlus,
  Loader2,
  Eye,
  CheckCircle2,
  X,
  Star,
  Award,
  Calendar,
  Briefcase,
  FileCheck2,
  Clock,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ================================
// Tipagem principal
// ================================
type Profissional = {
  id: string;
  nome: string;
  area: string;
  cidade?: string | null;
  pais?: string | null;
  disponibilidade?: boolean | null;
  documentacao_ok?: boolean | null;
  foto_url?: string | null;
  criado_em?: string | null;
  experiencia?: number | null;
  avaliacao?: number | null;
  nivel?: string | null;
  obras_concluidas?: number | null;
};

type Avaliacao = {
  id: string;
  empresa: string;
  nota: number;
  comentario: string;
  data: string;
};

// Função utilitária: calcula tempo de plataforma
function calcTempoPlataforma(data?: string | null) {
  if (!data) return "—";
  const diffMs = Date.now() - new Date(data).getTime();
  const meses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  return meses < 1 ? "menos de 1 mês" : `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

// Função utilitária: cor do nível
function nivelColor(nivel?: string) {
  switch (nivel) {
    case "Aprendiz":
      return "text-gray-400";
    case "Auxiliar":
      return "text-blue-400";
    case "Profissional":
      return "text-green-400";
    case "Oficial":
      return "text-purple-400";
    case "Encarregado":
      return "text-amber-400";
    case "Mestre":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
}

export default function AdicionarProfissionalPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [q, setQ] = useState("");
  const [fProf, setFProf] = useState("Todas as funções");
  const [fLocal, setFLocal] = useState("Todas as localidades");
  const [fDisp, setFDisp] = useState("Disponibilidade");
  const [obraSelecionada, setObraSelecionada] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<Profissional | null>(null);
  const [carregandoAvaliacoes, setCarregandoAvaliacoes] = useState(false);

  // ================================
  // 🔹 Carregar base global
  // ================================
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profissionais")
          .select(
            "id, nome, area, cidade, pais, disponibilidade, documentacao_ok, foto_url, criado_em, experiencia, avaliacao, nivel"
          )
          .order("criado_em", { ascending: false });

        if (error) throw error;
        setProfissionais(
          (data || []).map((p: any) => ({
            ...p,
            obras_concluidas: Math.floor(Math.random() * 10) + 1,
            nivel: p.nivel || "Aprendiz",
          }))
        );
      } catch (err) {
        console.error("Erro ao carregar base:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ================================
  // 🔹 Filtros
  // ================================
  const funcoes = useMemo(
    () => ["Todas as funções", ...new Set(profissionais.map((p) => p.area))],
    [profissionais]
  );

  const locais = useMemo(
    () => [
      "Todas as localidades",
      ...new Set(profissionais.map((p) => p.cidade || "")),
    ],
    [profissionais]
  );

  const filtrados = useMemo(() => {
    let base = profissionais;
    const query = q.toLowerCase();
    if (query)
      base = base.filter(
        (p) =>
          p.nome.toLowerCase().includes(query) ||
          p.area.toLowerCase().includes(query) ||
          (p.cidade || "").toLowerCase().includes(query)
      );
    if (fProf !== "Todas as funções") base = base.filter((p) => p.area === fProf);
    if (fLocal !== "Todas as localidades")
      base = base.filter((p) => (p.cidade || "") === fLocal);
    if (fDisp === "Disponível") base = base.filter((p) => p.disponibilidade === true);
    if (fDisp === "Em obra") base = base.filter((p) => p.disponibilidade === false);
    return base;
  }, [profissionais, q, fProf, fLocal, fDisp]);

  // ================================
  // 🔹 Adicionar à obra
  // ================================
  async function adicionarProfissional(prof: Profissional) {
  if (!obraSelecionada) {
    toast.error("⚠️ Selecione uma obra antes de adicionar um profissional.", {
      style: {
        background: "#1f2937",
        color: "#fff",
      },
    });
    return;
  }
  try {
    setAdicionando(prof.id);
    const { error } = await supabase.from("profissionais_obras").insert({
      obra_id: obraSelecionada,
      profissional_id: prof.id,
      status: "convocado",
    });
    if (error) throw error;

    toast.success(`✅ ${prof.nome} foi adicionado à obra com sucesso.`, {
      style: {
        background: "#16a34a",
        color: "#fff",
      },
    });
  } catch (err) {
    console.error("Erro ao adicionar profissional:", err);
    toast.error("❌ Falha ao adicionar profissional. Tente novamente.", {
      style: {
        background: "#dc2626",
        color: "#fff",
      },
    });
  } finally {
    setAdicionando(null);
  }
}


  // ================================
  // 🔹 Carregar avaliações do profissional
  // ================================
  async function carregarAvaliacoes(profId: string) {
    setCarregandoAvaliacoes(true);
    try {
      const { data, error } = await supabase
        .from("avaliacoes_profissionais")
        .select("id, empresa, nota, comentario, data")
        .eq("profissional_id", profId)
        .order("data", { ascending: false });

      if (error) throw error;
      setAvaliacoes(data || []);
    } catch (err) {
      console.error("Erro ao carregar avaliações:", err);
    } finally {
      setCarregandoAvaliacoes(false);
    }
  }
// ================================
// 🔹 Buscar obras reais do banco
// ================================
const [obras, setObras] = useState<any[]>([]);

useEffect(() => {
  async function carregarObras() {
    const { data, error } = await supabase
      .from("obras")
      .select("id, nome")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar obras:", error);
      return;
    }
    setObras(data || []);
  }
  carregarObras();
}, []);

  // ================================
  // 🔹 UI principal
  // ================================
  return (
    <div className="p-6 sm:p-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Base de Profissionais
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Encontre e adicione profissionais da base da Acrobatas às suas obras.
        </p>
      </header>

   {/* Select de obras */}
<div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
  <span className="text-sm text-gray-700 dark:text-gray-300">Selecionar obra:</span>
  <select
    value={obraSelecionada || ""}
    onChange={(e) => setObraSelecionada(e.target.value || null)}
    className="bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-sm rounded-lg px-3 py-2 text-gray-800 dark:text-white outline-none"
  >
    <option value="">Selecione uma obra</option>
    {obras.map((obra) => (
      <option key={obra.id} value={obra.id}>
        {obra.nome}
      </option>
    ))}
  </select>
</div>



      {/* Filtros */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, função, local..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-sm text-gray-900 dark:text-white outline-none"
          />
        </div>
        {[fProf, fLocal, fDisp].map((filter, idx) => {
          const setters = [setFProf, setFLocal, setFDisp];
          const options =
            idx === 0
              ? funcoes
              : idx === 1
              ? locais
              : ["Disponibilidade", "Disponível", "Em obra"];
          return (
            <select
              key={idx}
              value={filter}
              onChange={(e) => setters[idx](e.target.value)}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-sm rounded-lg px-3 py-2 text-gray-800 dark:text-white outline-none"
            >
              {options.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">Carregando profissionais...</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtrados.length ? (
            filtrados.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">{p.nome}</div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      p.disponibilidade
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"
                        : "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
                    }`}
                  >
                    {p.disponibilidade ? "Disponível" : "Em obra"}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-sm">
                  <div className="text-gray-500 dark:text-gray-400">{p.area}</div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="w-3 h-3" /> {p.cidade || "—"}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3 h-3" /> {p.avaliacao || "—"} ({p.obras_concluidas} obras)
                  </div>
                  <div className={`flex items-center gap-1 ${nivelColor(p.nivel)}`}>
                    <Award className="w-3 h-3" /> {p.nivel}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" /> {calcTempoPlataforma(p.criado_em)}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <FileCheck2
                      className={`w-3 h-3 ${
                        p.documentacao_ok ? "text-green-500" : "text-yellow-500"
                      }`}
                    />
                    {p.documentacao_ok ? "Documentos OK" : "Pendentes"}
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center text-sm">
                  <button
                    onClick={() => {
                      setDetalhe(p);
                      carregarAvaliacoes(p.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" /> Ver Perfil
                  </button>
                  <button
                    onClick={() => adicionarProfissional(p)}
                    disabled={adicionando === p.id}
                    className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    {adicionando === p.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Adicionando
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" /> Adicionar à Obra
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-gray-500 dark:text-gray-400 text-sm">
              Nenhum profissional encontrado com os filtros aplicados.
            </div>
          )}
        </div>
      )}

      {/* Modal Detalhes */}
      <AnimatePresence>
        {detalhe && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center">
                <div className="font-semibold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" /> {detalhe.nome}
                </div>
                <button
                  onClick={() => setDetalhe(null)}
                  className="text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PERFIL */}
              <div className="space-y-3 text-sm text-gray-800 dark:text-gray-300">
                <div className="flex gap-3 items-center">
                  <img
                    src={
                      detalhe.foto_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        detalhe.nome
                      )}`
                    }
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold text-lg">{detalhe.nome}</div>
                    <div className={`flex items-center gap-1 ${nivelColor(detalhe.nivel)}`}>
                      <Award className="w-4 h-4" /> {detalhe.nivel}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {detalhe.area} • {detalhe.experiencia} anos
                    </div>
                  </div>
                </div>

                <hr className="border-gray-200 dark:border-zinc-800" />

                <div>
                  <MapPin className="inline w-4 h-4 text-blue-500" /> {detalhe.cidade},{" "}
                  {detalhe.pais}
                </div>
                <div>
                  <Star className="inline w-4 h-4 text-yellow-500" />{" "}
                  {detalhe.avaliacao || "—"} ({detalhe.obras_concluidas} obras)
                </div>
                <div>
                  <Calendar className="inline w-4 h-4 text-gray-500" /> Tempo na
                  plataforma: {calcTempoPlataforma(detalhe.criado_em)}
                </div>
                <div>
                  <Briefcase className="inline w-4 h-4 text-gray-500" />{" "}
                  Disponibilidade:{" "}
                  {detalhe.disponibilidade ? "Disponível" : "Em obra"}
                </div>
                <div>
                  <FileCheck2
                    className={`inline w-4 h-4 ${
                      detalhe.documentacao_ok ? "text-green-500" : "text-yellow-500"
                    }`}
                  />{" "}
                  Documentação:{" "}
                  {detalhe.documentacao_ok ? "Completa ✅" : "Pendente ⚠️"}
                </div>

                {/* Avaliações */}
                <div className="mt-4">
                  <div className="font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" /> Avaliações
                  </div>
                  {carregandoAvaliacoes ? (
                    <p className="text-gray-400 text-sm">Carregando avaliações...</p>
                  ) : avaliacoes.length ? (
                    <div className="space-y-2">
                      {avaliacoes.map((a) => (
                        <div
                          key={a.id}
                          className="border border-gray-200 dark:border-zinc-800 rounded-lg p-2"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                              <Building2 className="w-4 h-4 text-blue-500" /> {a.empresa}
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500">
                              {Array.from({ length: a.nota }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-yellow-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {a.comentario}
                          </p>
                          <span className="text-[10px] text-gray-400">
                            {new Date(a.data).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">Sem avaliações registradas.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setDetalhe(null)}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
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
