// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Equipas.tsx
import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  X,
  Loader2,
  MailOpen,
  FileWarning,
  Search,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

/* ========= Tipos ========= */

type VinculoStatus = "ativo" | "convocado" | "pendente";

type Profissional = {
  id: string;

  // ⚠️ no teu banco existem os 2 (pelos prints). A foto pública pode “bater” em um ou em outro
  usuario_id?: string | null;
  user_id?: string | null;

  nome: string;
  area?: string | null;
  funcao?: string | null;
  foto_url?: string | null;
  telefone?: string | null;
  email?: string | null;

  // extras (se existirem)
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

type AvalForm = {
  nota: number;
  pontualidade: number;
  produtividade: number;
  comportamento: number;
  seguranca: number;
  comentario: string;
  tipo: string;
  mes: number;
  ano: number;
};

/* ========= Helpers ========= */

function storagePublicUrlMaybe(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from("public").getPublicUrl(path);
  return data?.publicUrl || null;
}

function initialsFallbackUrl(nome?: string | null) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    nome || "?"
  )}`;
}

export default function Equipas({ obraId }: { obraId: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Tema
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<Vinculo[]>([]);
  const [candidaturas, setCandidaturas] = useState<Vinculo[]>([]);
  const [filtroFuncao, setFiltroFuncao] = useState("Todos");
  const [painelAberto, setPainelAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState<Profissional | null>(null);

  // Modal Adicionar
  const [abrirAdd, setAbrirAdd] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<Profissional | null>(null);
  const [formAdd, setFormAdd] = useState({
    funcao: "",
    status: "convocado" as VinculoStatus,
    experiencia: "",
  });
  const [salvandoAdd, setSalvandoAdd] = useState(false);

  // Avaliação
  const [avaliarDe, setAvaliarDe] = useState<Profissional | null>(null);
  const hoje = new Date();
  const [formAval, setFormAval] = useState<AvalForm>({
    nota: 5,
    pontualidade: 5,
    produtividade: 5,
    comportamento: 5,
    seguranca: 5,
    comentario: "",
    tipo: "final",
    mes: hoje.getMonth() + 1,
    ano: hoje.getFullYear(),
  });
  const [salvandoAval, setSalvandoAval] = useState(false);
  const [carregandoAval, setCarregandoAval] = useState(false);
  const [medias, setMedias] = useState<Record<string, number>>({});

  /* ========= Helper: obter id do usuário avaliador ========= */
  async function getAvaliadorId(): Promise<string | null> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Erro ao obter utilizador autenticado:", authError);
        return null;
      }

      const authId = authData?.user?.id || null;
      if (!authId) return null;

      const { data: usu, error: usuErr } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_id", authId)
        .limit(1)
        .maybeSingle();

      if (usuErr) {
        console.error("Erro ao obter usuário avaliador:", usuErr);
        return null;
      }

      return usu?.id || null;
    } catch (e) {
      console.error("Erro inesperado ao obter usuário avaliador:", e);
      return null;
    }
  }

  /* ============= LOAD ============= */
  async function load() {
    if (!obraId) return;
    setLoading(true);

    try {
      // vínculos da obra
      const { data, error } = await supabase
        .from("profissionais_obras")
        .select(
          `
          id,
          status,
          funcao,
          profissional:profissional_id (
            id,
            usuario_id,
            user_id,
            nome,
            area,
            funcao,
            foto_url,
            telefone,
            email
          )
        `
        )
        .eq("obra_id", obraId);

      if (error) throw error;

      const base: Vinculo[] = (data || []).map((v: any) => {
        const rawProf = v.profissional;

        const fotoFromStorage =
          storagePublicUrlMaybe(rawProf?.foto_url) || rawProf?.foto_url || null;

        const profissional: Profissional | null = rawProf
          ? {
              ...rawProf,
              foto_url: fotoFromStorage,
              documentacao_ok: rawProf?.documentacao_ok ?? undefined,
              nif: rawProf?.nif ?? null,
              categoria: rawProf?.categoria ?? null,
              sexo: rawProf?.sexo ?? null,
              seguranca_social: rawProf?.seguranca_social ?? null,
              profissao: rawProf?.profissao ?? null,
            }
          : null;

        return {
          id: v.id,
          status: (v.status || "pendente").toLowerCase() as VinculoStatus,
          funcao: v.funcao,
          experiencia: (v as any).experiencia ?? null,
          profissional,
        };
      });

      // ================================
      // ENRIQUECER COM FOTO DA VIEW PÚBLICA
      // ✅ No teu print: profissionais.user_id = 7444... (mesmo do path do Storage)
      // ✅ e também existe usuario_id = d8bb...
      // Então: buscamos na view usando os DOIS como chave e aplicamos o que vier.
      // ================================
      const idsParaFoto = Array.from(
        new Set(
          base
            .flatMap((v) => [
              v.profissional?.user_id || null,
              v.profissional?.usuario_id || null,
            ])
            .filter(Boolean) as string[]
        )
      );

      let fotoPorChave: Record<string, string | null> = {};
      if (idsParaFoto.length) {
        const { data: cards, error: cardsErr } = await supabase
          .from("profissionais_publico_cards_final")
          .select("usuario_id, foto_url")
          .in("usuario_id", idsParaFoto);

        if (cardsErr) {
          console.error("Erro ao buscar fotos na view pública:", cardsErr);
        } else {
          (cards || []).forEach((r: any) => {
            const key = r.usuario_id as string | undefined;
            if (!key) return;
            const url =
              storagePublicUrlMaybe(r.foto_url) || (r.foto_url as string) || null;
            fotoPorChave[key] = url;
          });
        }
      }

      const all: Vinculo[] = base.map((v) => {
        const prof = v.profissional;
        if (!prof) return v;

        const key1 = prof.user_id || null;
        const key2 = prof.usuario_id || null;

        const fotoView =
          (key1 ? fotoPorChave[key1] : null) ||
          (key2 ? fotoPorChave[key2] : null) ||
          null;

        if (!fotoView) return v;

        return {
          ...v,
          profissional: { ...prof, foto_url: fotoView },
        };
      });

      const equipeAtivaOuConv = all.filter((v) => v.status !== "pendente");
      const pend = all.filter((v) => v.status === "pendente");

      setEquipe(equipeAtivaOuConv);
      setCandidaturas(pend);

      // médias de avaliação (apenas tipo 'final')
      const ids = equipeAtivaOuConv
        .map((v) => v.profissional?.id)
        .filter(Boolean) as string[];

      if (ids.length) {
        const { data: avals, error: errAvals } = await supabase
          .from("avaliacoes_profissionais")
          .select("profissional_id, nota")
          .in("profissional_id", ids)
          .eq("tipo", "final");

        if (errAvals) {
          console.error("Erro ao buscar avaliações:", errAvals);
          setMedias({});
        } else {
          const soma: Record<string, { s: number; n: number }> = {};
          for (const r of avals || []) {
            if (!soma[r.profissional_id]) soma[r.profissional_id] = { s: 0, n: 0 };
            soma[r.profissional_id].s += Number(r.nota || 0);
            soma[r.profissional_id].n += 1;
          }
          const m: Record<string, number> = {};
          Object.entries(soma).forEach(([k, v]) => {
            m[k] = v.n ? Math.round((v.s / v.n) * 10) / 10 : 0;
          });
          setMedias(m);
        }
      } else {
        setMedias({});
      }
    } catch (err) {
      console.error("❌ Erro ao carregar equipe:", err);
      setEquipe([]);
      setCandidaturas([]);
      setMedias({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return equipe.filter((e) => (e.funcao || "Sem função") === filtroFuncao);
  }, [filtroFuncao, equipe]);

  const candidaturasPendentes = candidaturas.length;

  /* ========= NAVEGAR PARA PERFIL ========= */
  function abrirPerfilProfissional(prof?: Profissional | null) {
    if (!prof?.id) return;
    navigate(`/empresa/profissional/${prof.id}`);
  }

  /* ========= MODAL ADD ========= */
  async function carregarProfissionaisLista(query: string) {
    try {
      setCarregandoLista(true);

      let q = supabase
        .from("profissionais")
        .select(
          "id, usuario_id, user_id, nome, area, funcao, foto_url, telefone, email"
        )
        .limit(50);

      if (query?.trim()) {
        q = q.ilike("nome", `%${query.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const idsVinculados = new Set(
        equipe.map((v) => v.profissional?.id).filter(Boolean) as string[]
      );
      const lista = (data || []).filter((p: any) => !idsVinculados.has(p.id));

      const normalizada: Profissional[] = (lista as any[]).map((p) => ({
        ...p,
        foto_url: storagePublicUrlMaybe(p.foto_url) || p.foto_url || undefined,
      }));

      setProfissionais(normalizada);
    } catch (e) {
      console.error("Erro carregando profissionais:", e);
      setProfissionais([]);
    } finally {
      setCarregandoLista(false);
    }
  }

  useEffect(() => {
    if (abrirAdd) carregarProfissionaisLista(busca);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirAdd]);

  useEffect(() => {
    if (!abrirAdd) return;
    const t = setTimeout(() => carregarProfissionaisLista(busca), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  async function salvarVinculo() {
    if (!selecionado) return;
    try {
      setSalvandoAdd(true);

      const payload: any = {
        obra_id: obraId,
        profissional_id: selecionado.id,
        status: formAdd.status,
        funcao: formAdd.funcao || selecionado.funcao || selecionado.area || null,
      };

      const { error } = await supabase.from("profissionais_obras").insert([payload]);
      if (error) throw error;

      setAbrirAdd(false);
      setSelecionado(null);
      setFormAdd({ funcao: "", status: "convocado", experiencia: "" });
      await load();
    } catch (e) {
      console.error("❌ Erro ao salvar vínculo:", e);
    } finally {
      setSalvandoAdd(false);
    }
  }

  /* ========= HELPERS ========= */
  function renderStars(media?: number) {
    const val = Math.max(0, Math.min(5, Number(media || 0)));
    const full = Math.floor(val);
    const half = val - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    const items: React.ReactNode[] = [];

    for (let i = 0; i < full; i++) {
      items.push(
        <Star key={`f${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }
    if (half) {
      items.push(
        <Star
          key="h"
          className="w-4 h-4 text-yellow-400"
          style={{ fill: "rgba(250,204,21,0.6)" }}
        />
      );
    }
    for (let i = 0; i < empty; i++) {
      items.push(<Star key={`e${i}`} className="w-4 h-4 text-zinc-400" />);
    }

    return <div className="flex items-center gap-1">{items}</div>;
  }

  /* ========= Abrir modal de avaliação (carregar existente se houver) ========= */
  async function abrirModalAvaliacao(prof?: Profissional | null) {
    if (!prof) return;

    setAvaliarDe(prof);

    const agora = new Date();
    setFormAval({
      nota: 5,
      pontualidade: 5,
      produtividade: 5,
      comportamento: 5,
      seguranca: 5,
      comentario: "",
      tipo: "final",
      mes: agora.getMonth() + 1,
      ano: agora.getFullYear(),
    });

    setCarregandoAval(true);
    try {
      const avaliadorId = await getAvaliadorId();
      if (!avaliadorId) return;

      const { data, error } = await supabase
        .from("avaliacoes_profissionais")
        .select("nota, comentario, tipo, mes, ano")
        .eq("obra_id", obraId)
        .eq("profissional_id", prof.id)
        .eq("avaliado_por", avaliadorId)
        .eq("tipo", "final")
        .maybeSingle();

      if (error && (error as any).code !== "PGRST116") {
        console.error("Erro ao carregar avaliação existente:", error);
        return;
      }

      if (data) {
        setFormAval({
          nota: data.nota ?? 5,
          pontualidade: data.nota ?? 5,
          produtividade: data.nota ?? 5,
          comportamento: data.nota ?? 5,
          seguranca: data.nota ?? 5,
          comentario: data.comentario ?? "",
          tipo: data.tipo ?? "final",
          mes: data.mes ?? agora.getMonth() + 1,
          ano: data.ano ?? agora.getFullYear(),
        });
      }
    } catch (e) {
      console.error("Erro inesperado ao carregar avaliação existente:", e);
    } finally {
      setCarregandoAval(false);
    }
  }

  async function handleSalvarAvaliacao() {
    if (!avaliarDe) return;

    const notaBase = formAval.nota || 5;

    if (notaBase <= 3 && !formAval.comentario.trim()) {
      toast.error(
        "Para avaliações de 3 estrelas ou menos, escreva um comentário sobre o desempenho."
      );
      return;
    }

    setSalvandoAval(true);
    try {
      const avaliadorId = await getAvaliadorId();
      if (!avaliadorId) {
        toast.error("Não foi possível identificar o utilizador avaliador.");
        return;
      }

      const agora = new Date();

      const payload = {
        obra_id: obraId,
        profissional_id: avaliarDe.id,
        avaliado_por: avaliadorId,
        nota: notaBase,
        pontualidade: notaBase,
        produtividade: notaBase,
        comportamento: notaBase,
        seguranca: notaBase,
        comentario: formAval.comentario?.trim() || null,
        tipo: "final",
        mes: formAval.mes || agora.getMonth() + 1,
        ano: formAval.ano || agora.getFullYear(),
      };

      const { error } = await supabase
        .from("avaliacoes_profissionais")
        .upsert(payload, {
          onConflict: "obra_id,profissional_id,avaliado_por,tipo",
        });

      if (error) throw error;

      toast.success("Avaliação salva com sucesso.");

      setAvaliarDe(null);
      const novoHoje = new Date();
      setFormAval({
        nota: 5,
        pontualidade: 5,
        produtividade: 5,
        comportamento: 5,
        seguranca: 5,
        comentario: "",
        tipo: "final",
        mes: novoHoje.getMonth() + 1,
        ano: novoHoje.getFullYear(),
      });

      await load();
    } catch (e) {
      console.error("❌ Erro ao salvar avaliação:", e);
      toast.error("Erro ao salvar avaliação.");
    } finally {
      setSalvandoAval(false);
    }
  }

  const cardBase = isDark
    ? "bg-[#151B24] border-[#1E2632]"
    : "bg-white border-gray-200";

  return (
    <div className="relative w-full">
      <style>{`
@media (max-width: 640px){
  .box { border-radius: 14px !important; padding: 14px !important; }
  .stats { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .btn-mobile { width: 100% !important; font-size: 16px !important; padding: 12px !important; }

  .modal-mobile{
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    border-top-left-radius: 18px !important;
    border-top-right-radius: 18px !important;
    overflow: hidden;
    box-shadow: 0 -8px 30px rgba(0,0,0,.35);
  }
  .modal-header{ position: sticky; top:0; z-index:2; padding:14px 16px; }
  .modal-body{ max-height: 72vh; overflow:auto; -webkit-overflow-scrolling:touch; padding: 12px 16px 16px 16px; }
  @supports (height: 1dvh){ .modal-body{ max-height: 72dvh; } }
  .modal-footer{ position: sticky; bottom:0; z-index:2; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px; }
}
@media (min-width: 641px){
  .modal-desktop{
    width: min(96vw, 560px);
    max-width: 560px;
    border-radius: 18px;
    overflow: hidden;
    max-height: 80vh;
  }
  .modal-body{
    max-height: calc(80vh - 120px);
    overflow:auto;
  }
}

.modal-body{ flex:1; min-height:0; overflow:auto; }
      `}</style>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 space-y-6 sm:space-y-8">
          {/* Resumo */}
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

          {/* Equipa principal */}
          <div className={`rounded-xl sm:rounded-2xl border shadow-sm p-4 sm:p-6 ${cardBase}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h3
                className={`font-semibold flex items-center gap-2 text-sm sm:text-base ${
                  isDark ? "text-white" : "text-zinc-900"
                }`}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                Equipa desta Obra
              </h3>

              <button
                onClick={() =>
                  navigate("/empresa/profissionais", {
                    state: {
                      fromObra: true,
                      obraId,
                      backTo: location.pathname,
                    },
                  })
                }
                className="px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition btn-mobile sm:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {["Todos", ...new Set(equipe.map((e) => e.funcao || "Sem função"))].map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroFuncao(f)}
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                    filtroFuncao === f
                      ? "bg-blue-600 text-white border-blue-600"
                      : `${
                          isDark
                            ? "bg-[#121926] border-zinc-700 text-zinc-300 hover:bg-blue-500/10"
                            : "bg-white border-zinc-300 text-zinc-700 hover:bg-blue-50"
                        }`
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Lista */}
            {loading ? (
              <div className={`${isDark ? "text-zinc-400" : "text-zinc-500"} text-sm`}>
                Carregando...
              </div>
            ) : equipaFiltrada.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {equipaFiltrada.map((e) => {
                  const pid = e.profissional?.id || "";
                  const media = medias[pid] ?? 0;

                  const fotoSrc =
                    e.profissional?.foto_url || initialsFallbackUrl(e.profissional?.nome);

                  return (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      className={`rounded-lg sm:rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 border ${
                        isDark
                          ? "from-zinc-800 to-zinc-900 bg-gradient-to-br border-zinc-700"
                          : "from-zinc-50 to-white bg-gradient-to-br border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={fotoSrc}
                          alt={e.profissional?.nome || "Profissional"}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-400/40"
                          onError={(ev) => {
                            (ev.currentTarget as HTMLImageElement).src =
                              initialsFallbackUrl(e.profissional?.nome);
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm sm:text-base font-semibold truncate ${
                              isDark ? "text-white" : "text-zinc-900"
                            }`}
                          >
                            {e.profissional?.nome || "Sem nome"}
                          </div>
                          <div className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {e.funcao || e.profissional?.area}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {renderStars(media)}
                          <span className="text-[11px] sm:text-xs text-zinc-500">
                            {media ? media.toFixed(1) : "—"}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                            e.status === "ativo"
                              ? "bg-green-500/10 text-green-600 dark:text-green-300 border border-green-500/30"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {e.status === "ativo" ? "Ativo" : "Convocado"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          onClick={() => abrirPerfilProfissional(e.profissional)}
                          className="text-xs sm:text-sm px-2.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10"
                        >
                          Ver perfil
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => abrirModalAvaliacao(e.profissional || null)}
                            className="group text-[11px] sm:text-xs md:text-sm inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-yellow-400/10 text-yellow-600 dark:text-yellow-300 border border-yellow-400/40 hover:bg-yellow-400/20 hover:border-yellow-400 transition-all"
                          >
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 group-hover:scale-110 transition-transform" />
                            <span>Avaliar</span>
                          </button>

                          <button
                            onClick={() =>
                              setProcessing(e.id) ||
                              handleStatusUpdate(
                                e.id,
                                e.status === "ativo" ? "convocado" : "ativo"
                              )
                            }
                            className="text-xs sm:text-sm px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                            disabled={processing === e.id}
                          >
                            {processing === e.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : e.status === "ativo" ? (
                              "Desativar"
                            ) : (
                              "Ativar"
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className={`${isDark ? "text-zinc-400" : "text-zinc-500"} text-sm`}>
                Nenhum profissional vinculado a esta obra.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão flutuante Candidaturas */}
      <button
        onClick={() => setPainelAberto(!painelAberto)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 sm:p-4 shadow-lg flex items-center gap-2 transition-all"
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

      {/* Painel lateral Candidaturas */}
      <AnimatePresence>
        {painelAberto && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPainelAberto(false)}
            />
            <motion.aside
              className={`fixed top-0 right-0 h-full w-full sm:w-[400px] border-l shadow-2xl p-4 sm:p-6 overflow-y-auto z-40 ${
                isDark ? "bg-[#121926] border-zinc-700" : "bg-white border-zinc-300"
              }`}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`font-semibold text-base sm:text-lg flex items-center gap-2 ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                >
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
                <div className={`${isDark ? "text-zinc-400" : "text-zinc-500"} text-sm`}>
                  Carregando...
                </div>
              ) : candidaturas.length ? (
                <div className="flex flex-col gap-3">
                  {candidaturas.map((c) => {
                    const fotoSrc =
                      c.profissional?.foto_url || initialsFallbackUrl(c.profissional?.nome);
                    return (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setPerfilAberto(c.profissional || null)}
                        className={`rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all border ${
                          isDark
                            ? "from-zinc-800 to-zinc-900 bg-gradient-to-br border-zinc-700"
                            : "from-white to-zinc-50 bg-gradient-to-br border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={fotoSrc}
                            alt={c.profissional?.nome || "Profissional"}
                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/40"
                            onError={(ev) => {
                              (ev.currentTarget as HTMLImageElement).src =
                                initialsFallbackUrl(c.profissional?.nome);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium truncate ${
                                isDark ? "text-white" : "text-zinc-900"
                              }`}
                            >
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
                    );
                  })}
                </div>
              ) : (
                <div className={`${isDark ? "text-zinc-400" : "text-zinc-500"} text-sm`}>
                  Nenhuma candidatura pendente.
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Perfil rápido */}
      <AnimatePresence>
        {perfilAberto && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-md border shadow-2xl relative ${
                isDark ? "bg-[#1b2332] border-zinc-700" : "bg-white border-zinc-200"
              }`}
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
                  src={perfilAberto.foto_url || initialsFallbackUrl(perfilAberto.nome)}
                  alt={perfilAberto.nome}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-emerald-400/40 shadow-md"
                  onError={(ev) => {
                    (ev.currentTarget as HTMLImageElement).src = initialsFallbackUrl(
                      perfilAberto.nome
                    );
                  }}
                />
                <h2
                  className={`text-base sm:text-lg font-semibold ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
                >
                  {perfilAberto.nome}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {perfilAberto.area}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  {renderStars(medias[perfilAberto.id] ?? 0)}
                  <span className="text-xs text-zinc-500">
                    {(medias[perfilAberto.id] ?? 0)
                      ? (medias[perfilAberto.id] ?? 0).toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>

              <div
                className={`mt-5 space-y-1 text-xs sm:text-sm ${
                  isDark ? "text-zinc-300" : "text-zinc-700"
                }`}
              >
                <p>
                  <strong>NIF:</strong> {perfilAberto.nif ?? "—"}
                </p>
                <p>
                  <strong>Categoria:</strong> {perfilAberto.categoria ?? "—"}
                </p>
                <p>
                  <strong>Sexo:</strong> {perfilAberto.sexo ?? "—"}
                </p>
                <p>
                  <strong>Seg. Social:</strong> {perfilAberto.seguranca_social ?? "—"}
                </p>
              </div>

              <div
                className={`mt-5 rounded-xl border p-3 sm:p-4 ${
                  isDark
                    ? "border-zinc-700 bg-zinc-800/50"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
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

              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
                <button
                  onClick={() =>
                    navigate(`/empresa/documentacao/profissionais/${perfilAberto.id}`)
                  }
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm flex items-center gap-1.5 transition"
                >
                  Ver Documentação
                </button>
                <button
                  onClick={() => abrirPerfilProfissional(perfilAberto)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm flex items-center gap-1.5 transition"
                >
                  Abrir perfil completo
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

      {/* MODAL AVALIAÇÃO */}
      <AnimatePresence>
        {avaliarDe && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAvaliarDe(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
                isDark ? "bg-[#020617] text-gray-100" : "bg-white text-gray-900"
              }`}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between px-5 py-4 ${
                  isDark
                    ? "bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/5"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-b border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white/70 bg-white/10 flex items-center justify-center">
                    <img
                      src={avaliarDe.foto_url || initialsFallbackUrl(avaliarDe.nome)}
                      alt={avaliarDe.nome}
                      className="h-full w-full object-cover"
                      onError={(ev) => {
                        (ev.currentTarget as HTMLImageElement).src =
                          initialsFallbackUrl(avaliarDe.nome);
                      }}
                    />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs opacity-80">{`Avaliação geral • ${String(
                      formAval.mes
                    ).padStart(2, "0")}/${formAval.ano}`}</div>
                    <div className="text-sm sm:text-base font-semibold">
                      Avaliar {avaliarDe.nome}
                    </div>
                  </div>
                </div>

                <button
                  aria-label="Fechar"
                  onClick={() => setAvaliarDe(null)}
                  className={`rounded-full p-1.5 ${
                    isDark
                      ? "hover:bg-white/10 text-gray-300"
                      : "hover:bg-white/20 text-white"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo */}
              <div className="px-5 pt-4 pb-5 space-y-4">
                {/* Nota */}
                <div
                  className={`rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${
                    isDark
                      ? "bg-slate-900/70 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p className="text-sm font-medium mb-1.5">Nota geral do profissional</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Clique nas estrelas para definir a avaliação.
                  </p>

                  {carregandoAval ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A carregar avaliação…
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFormAval((prev) => ({ ...prev, nota: n }))}
                          className="p-1"
                        >
                          <Star
                            className={`w-7 h-7 sm:w-8 sm:h-8 ${
                              n <= formAval.nota
                                ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                                : "text-gray-300 dark:text-slate-600"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-medium min-w-[48px] text-right">
                        {formAval.nota} / 5
                      </span>
                    </div>
                  )}
                </div>

                {/* Comentário */}
                <div
                  className={`rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${
                    isDark
                      ? "bg-slate-900/70 border-slate-700"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">Comentário</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-300">
                      Opcional, obrigatório para nota ≤ 3
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={formAval.comentario}
                    onChange={(e) =>
                      setFormAval((prev) => ({
                        ...prev,
                        comentario: e.target.value,
                      }))
                    }
                    placeholder="Escreva um feedback rápido sobre desempenho, atitude, comunicação…"
                    className={`mt-2 w-full rounded-lg px-3 py-2 text-sm resize-y outline-none border ${
                      isDark
                        ? "bg-slate-950/60 border-slate-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40"
                        : "bg-slate-50 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    }`}
                    disabled={carregandoAval || salvandoAval}
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Este comentário fica disponível no histórico interno de avaliações.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div
                className={`flex items-center justify-end gap-3 px-5 py-3 border-t ${
                  isDark
                    ? "border-slate-800 bg-slate-950/80"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <button
                  onClick={() => setAvaliarDe(null)}
                  disabled={salvandoAval}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    isDark
                      ? "bg-slate-800 text-gray-200 hover:bg-slate-700"
                      : "bg-white text-gray-700 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarAvaliacao}
                  disabled={salvandoAval || carregandoAval}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-slate-900 bg-yellow-400 hover:bg-yellow-300 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {salvandoAval ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Star className="w-4 h-4 fill-current" />
                  )}
                  Salvar avaliação
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ADD */}
      <AnimatePresence>
        {abrirAdd && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbrirAdd(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className={`modal-mobile sm:modal-desktop border ${cardBase} ${
                isDark ? "text-gray-200" : "text-gray-800"
              } flex flex-col p-0 max-h-[90vh]`}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`modal-header ${cardBase} flex items-center justify-between`}>
                <h4 className="text-base font-semibold">Adicionar à Equipe</h4>
                <button
                  aria-label="Fechar"
                  onClick={() => setAbrirAdd(false)}
                  className="p-2 rounded-md hover:bg-black/10"
                >
                  <X />
                </button>
              </div>

              {/* Body */}
              <div className="modal-body">
                <div className={`border rounded-xl p-3 ${cardBase}`}>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 opacity-60" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar profissional por nome…"
                      className="flex-1 bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  {carregandoLista ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin text-gray-400" />
                    </div>
                  ) : profissionais.length === 0 ? (
                    <div className="text-sm.opacity-70">Nenhum profissional encontrado.</div>
                  ) : (
                    <ul className="divide-y divide-gray-700/20 dark:divide-gray-700 rounded-xl overflow-hidden border border-gray-200/40 dark:border-gray-700/50">
                      {profissionais.map((p) => {
                        const ativo = selecionado?.id === p.id;
                        const fotoSrc = p.foto_url || initialsFallbackUrl(p.nome);
                        return (
                          <li
                            key={p.id}
                            className={`p-3 sm:p-4 cursor-pointer flex items-center gap-3 ${
                              ativo ? "bg-blue-500/10" : ""
                            }`}
                            onClick={() => setSelecionado(ativo ? null : p)}
                          >
                            <img
                              src={fotoSrc}
                              alt={p.nome}
                              className="w-10 h-10 rounded-full object-cover border"
                              onError={(ev) => {
                                (ev.currentTarget as HTMLImageElement).src =
                                  initialsFallbackUrl(p.nome);
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.nome}</div>
                              <div className="text-xs opacity-70 truncate">
                                {p.funcao || p.area || "—"}
                              </div>
                            </div>
                            {ativo && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white">
                                Selecionado
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 mt-4">
                  <div className="sm:col-span-1">
                    <label className="text-xs opacity-70">Status</label>
                    <select
                      value={formAdd.status}
                      onChange={(e) =>
                        setFormAdd({
                          ...formAdd,
                          status: e.target.value as VinculoStatus,
                        })
                      }
                      className="mt-1 w-full border rounded-lg px-3 py-2 bg-transparent"
                    >
                      <option value="convocado">Convocado</option>
                      <option value="ativo">Ativo</option>
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs opacity-70">Função</label>
                    <input
                      value={formAdd.funcao}
                      onChange={(e) => setFormAdd({ ...formAdd, funcao: e.target.value })}
                      placeholder="Ex.: Eletricista"
                      className="mt-1 w-full border rounded-lg px-3 py-2 bg-transparent"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs opacity-70">Experiência</label>
                    <input
                      value={formAdd.experiencia}
                      onChange={(e) => setFormAdd({ ...formAdd, experiencia: e.target.value })}
                      placeholder="Ex.: 2–3 anos"
                      className="mt-1 w-full border rounded-lg px-3 py-2 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className={`modal-footer ${cardBase} flex justify-end gap-3`}>
                <button
                  onClick={() => setAbrirAdd(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                >
                  Fechar
                </button>
                <button
                  onClick={salvarVinculo}
                  disabled={!selecionado || salvandoAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
                >
                  {salvandoAdd ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Vincular
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
