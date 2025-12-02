// src/components/company/ProfissionalDetalhes.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  MapPin,
  Briefcase,
  Building2,
  Flame,
  Award,
  Hammer,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Tabs
import SobreTab from "@/components/company/perfil/tabs/SobreTab";
import TrabalhosTab from "@/components/company/perfil/tabs/TrabalhosTab";
import HistoricoTab from "@/components/company/perfil/tabs/HistoricoTab";
import AvaliacoesTab from "@/components/company/perfil/tabs/AvaliacoesTab";
import DocumentosTab from "@/components/company/perfil/tabs/DocumentosTab";

/* =========================
   Tipos
========================= */
type Nivel = "Aprendiz" | "Profissional" | "Oficial" | "Mestre";

type HeaderFromCardsView = {
  profissional_id: string;
  user_id: string | null;
  nome: string | null;
  funcao: string | null;
  cidade: string | null;
  nivel: Nivel | null;
  experiencia: number | null;
  descricao_curta: string | null;
  foto_url: string | null;
  capa_url: string | null;
  obras: number | null;
  em_obra: boolean | null;
};

type VinculoRow = { profissional_id: string | null; status: string | null };

type DocumentoRow = {
  id: string;
  titulo: string | null;
  tipo: string | null;
  status: "validado" | "pendente" | "expirado" | null;
  validade?: string | null;
  arquivo_url?: string | null;
};

type AvaliacaoRow = {
  id: string;
  avaliador: string | null;
  comentario: string | null;
  nota: number | null;
  data: string | null;
  obra?: string | null;
};

type PortfolioMidia = { id: string; url: string; tipo?: "foto" | "video"; thumb?: string };
type PortfolioPastaRow = {
  id: string;
  titulo: string | null;
  capa_url: string | null;
  midias?: PortfolioMidia[];
};

type HistoricoObraRow = {
  id: string;
  nome: string | null;
  cidade: string | null;
  ano: number | null;
  horas?: number | null;
};

type Documento = { nome: string; status: "validado" | "pendente" | "expirado" };
type Midia = { id: string; tipo: "foto" | "video"; url: string; thumb?: string };

export type PerfilView = {
  usuarioId: string;
  profissionalId: string | null;

  nome: string;
  funcao: string;
  cidade: string;
  nivel: Nivel;
  experiencia: number;
  descricao: string;

  obras: number;
  avaliacao: number;

  foto_url: string;
  capa_url: string;
  skills: string[];

  documentos: Documento[];
  portfolio: Midia[];
  timeline: Array<{ id: string; titulo: string; subtitulo: string; inicio: string; fim?: string; descricao?: string }>;

  // CAMPOS DO “SOBRE”
  area_principal?: string | null;
  funcao_obra?: string | null;
  anos_experiencia?: number | null;
  nivel_perfil?: string | null;
  habilidades?: string[] | null;

  disponibilidade_text?: string | null;

  cidade_base?: string | null;
  raio_deslocacao?: string | null;
  pode_viajar?: boolean | null;
  pode_alojamento?: boolean | null;

  nacionalidade?: string | null;
  idiomas?: string[] | null;
};

type ObraRow = { id: string; nome: string | null };

/* =========================
   Helpers
========================= */
function storagePublicUrlMaybe(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from("public").getPublicUrl(path);
  return data?.publicUrl || null;
}

function nivelBadgeClass(nivel: Nivel) {
  switch (nivel) {
    case "Mestre":
      return "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-red-900/30";
    case "Oficial":
      return "bg-blue-600 text-white shadow-sm shadow-blue-900/30";
    case "Profissional":
      return "bg-green-600 text-white shadow-sm shadow-emerald-900/30";
    default:
      return "bg-slate-500 text-white";
  }
}

const Estrela = ({ n }: { n: number }) => (
  <span className="inline-flex items-center gap-1 text-yellow-500">
    <Star className="w-4 h-4 fill-yellow-500" />
    <span className="text-sm text-slate-800 dark:text-slate-200">{n.toFixed(1)}</span>
  </span>
);

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 px-2.5 py-1 text-xs">
    {children}
  </span>
);

/* =========================
   Componente
========================= */
const TAB_KEYS = ["sobre", "trabalhos", "historico", "avaliacoes", "docs"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function ProfissionalDetalhes() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("sobre");
  const [loading, setLoading] = useState(true);
  const [prof, setProf] = useState<PerfilView | null>(null);

  // refs para as abas (pra dar scrollIntoView)
  const tabButtonRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    sobre: null,
    trabalhos: null,
    historico: null,
    avaliacoes: null,
    docs: null,
  });

  // Modal "Convidar para Obra"
  const [abrirConvidar, setAbrirConvidar] = useState(false);
  const [carregandoObras, setCarregandoObras] = useState(false);
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<string>("");

  const handleKeyTabs = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const order = TAB_KEYS;
      const idx = order.indexOf(tab);
      if (e.key === "ArrowRight") setTab(order[(idx + 1) % order.length]);
      if (e.key === "ArrowLeft") setTab(order[(idx - 1 + order.length) % order.length]);
    },
    [tab]
  );

  // sempre que mudar de aba no mobile, faz a aba ativa deslizar pro centro
  useEffect(() => {
    const btn = tabButtonRefs.current[tab];
    if (!btn) return;

    // só faz isso em telas pequenas
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      btn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [tab]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!idParam) return;

      setLoading(true);

      // Resolver IDs pela mesma view dos cards
      let header: HeaderFromCardsView | null = null;

      {
        const { data, error } = await supabase
          .from("profissionais_publico_cards_v1")
          .select(
            "profissional_id,user_id,nome,funcao,cidade,nivel,experiencia,descricao_curta,foto_url,capa_url,obras,em_obra"
          )
          .eq("user_id", idParam)
          .maybeSingle();
        if (!error && data) header = data as HeaderFromCardsView;
      }

      if (!header) {
        const { data, error } = await supabase
          .from("profissionais_publico_cards_v1")
          .select(
            "profissional_id,user_id,nome,funcao,cidade,nivel,experiencia,descricao_curta,foto_url,capa_url,obras,em_obra"
          )
          .eq("profissional_id", idParam)
          .maybeSingle();
        if (!error && data) header = data as HeaderFromCardsView;
      }

      if (!header) {
        if (mounted) {
          setProf(null);
          setLoading(false);
        }
        return;
      }

      const usuarioId = header.user_id || "";
      const profissionalId = header.profissional_id || null;

      const [vinculosRes, avaliacoesRes, docsRes, pastasRes, histRes, perfilRes] = await Promise.all([
        profissionalId
          ? supabase.from("profissionais_obras").select("profissional_id,status").eq("profissional_id", profissionalId)
          : Promise.resolve({ data: [] } as any),
        usuarioId
          ? supabase
              .from("profissionais_avaliacoes")
              .select("id,avaliador,comentario,nota,data,obra")
              .eq("usuario_id", usuarioId)
              .order("data", { ascending: false })
          : Promise.resolve({ data: [] } as any),
        usuarioId
          ? supabase
              .from("profissionais_documentos")
              .select("id,titulo,tipo,status,validade,arquivo_url")
              .eq("usuario_id", usuarioId)
          : Promise.resolve({ data: [] } as any),
        usuarioId
          ? supabase
              .from("profissionais_portfolio_pastas")
              .select("id,titulo,capa_url,midias")
              .eq("usuario_id", usuarioId)
          : Promise.resolve({ data: [] } as any),
        usuarioId
          ? supabase
              .from("profissionais_obras_historico")
              .select("id,nome,cidade,ano,horas")
              .eq("usuario_id", usuarioId)
              .order("ano", { ascending: false })
          : Promise.resolve({ data: [] } as any),

        usuarioId
          ? supabase
              .from("profissionais_perfil")
              .select(`
                area_principal,
                funcao_obra,
                anos_experiencia,
                nivel,
                habilidades,
                disponibilidade,
                cidade_base,
                raio_deslocacao,
                pode_viajar,
                pode_alojamento,
                nacionalidade,
                idiomas
              `)
              .eq("usuario_id", usuarioId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      const vinculos: VinculoRow[] = (vinculosRes.data as any) ?? [];
      const obrasCount = header.obras ?? vinculos.filter((v) => v.profissional_id).length;

      const avs: AvaliacaoRow[] = (avaliacoesRes.data as any) ?? [];
      const avaliacaoMedia =
        avs.length > 0 ? avs.reduce((acc, a) => acc + (a.nota ?? 0), 0) / Math.max(1, avs.length) : 0;

      const docsRaw: DocumentoRow[] = (docsRes.data as any) ?? [];
      const documentos: Documento[] = docsRaw.map((d) => ({
        nome: d.titulo || d.tipo || "Documento",
        status:
          (d.status as any) === "validado"
            ? "validado"
            : (d.status as any) === "expirado"
            ? "expirado"
            : "pendente",
      }));

      const pastas: PortfolioPastaRow[] = (pastasRes.data as any) ?? [];
      const portfolio: Midia[] = [];
      for (const p of pastas) {
        const arr = (p.midias || []).slice(0, 8 - portfolio.length);
        for (const m of arr) {
          portfolio.push({
            id: m.id,
            tipo: (m.tipo as any) || "foto",
            url: storagePublicUrlMaybe(m.url) || m.url,
            thumb: m.thumb,
          });
        }
        if (portfolio.length >= 8) break;
      }

      const hist: HistoricoObraRow[] = (histRes.data as any) ?? [];
      const timeline: PerfilView["timeline"] = hist.map((h) => ({
        id: h.id,
        titulo: h.nome || "Obra",
        subtitulo: h.cidade || "",
        inicio: h.ano ? String(h.ano) : "",
        descricao: h.horas ? `${h.horas}h` : undefined,
      }));

      const perfilData: any = (perfilRes as any)?.data || {};

      const nome = header.nome || "Profissional";
      const funcao = header.funcao || "Profissional";
      const cidade = header.cidade || "-";
      const nivel: Nivel = (header.nivel as Nivel) || "Profissional";
      const experiencia = header.experiencia ?? 0;
      const descricao =
        (header.descricao_curta || "").trim() ||
        `Profissional ${funcao.toLowerCase()} com ${experiencia || 0}+ anos de experiência.`;

      const foto_url =
        storagePublicUrlMaybe(header.foto_url) ||
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=256&auto=format&fit=crop";
      const capa_url =
        storagePublicUrlMaybe(header.capa_url) ||
        "https://images.unsplash.com/photo-1523419409543-4d7f2a0efcc3?q=80&w=1400&auto=format&fit=crop";

      const view: PerfilView = {
        usuarioId: usuarioId || "sem-usuario",
        profissionalId,
        nome,
        funcao,
        cidade,
        nivel,
        experiencia,
        obras: obrasCount ?? 0,
        avaliacao: Number.isFinite(avaliacaoMedia) ? +avaliacaoMedia.toFixed(2) : 0,
        descricao,
        foto_url,
        capa_url,
        skills: [],
        documentos,
        portfolio,
        timeline,

        area_principal: perfilData?.area_principal ?? null,
        funcao_obra: perfilData?.funcao_obra ?? null,
        anos_experiencia:
          typeof perfilData?.anos_experiencia === "number" ? perfilData.anos_experiencia : null,
        nivel_perfil: perfilData?.nivel ?? null,
        habilidades: Array.isArray(perfilData?.habilidades) ? perfilData.habilidades : [],
        disponibilidade_text: perfilData?.disponibilidade ?? null,

        cidade_base: perfilData?.cidade_base ?? null,
        raio_deslocacao:
          typeof perfilData?.raio_deslocacao === "string" ? perfilData.raio_deslocacao : null,
        pode_viajar: typeof perfilData?.pode_viajar === "boolean" ? perfilData.pode_viajar : null,
        pode_alojamento:
          typeof perfilData?.pode_alojamento === "boolean" ? perfilData.pode_alojamento : null,

        nacionalidade: perfilData?.nacionalidade ?? null,
        idiomas: Array.isArray(perfilData?.idiomas) ? perfilData.idiomas : [],
      };

      if (mounted) {
        setProf(view);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [idParam]);

  /* =========================
     Convidar para Obra (modal)
  ========================== */
  const abrirModalConvidar = async () => {
    setAbrirConvidar(true);
    setCarregandoObras(true);
    try {
      const { data: empId, error: rpcErr } = await supabase.rpc("minha_empresa_id");
      if (rpcErr) throw rpcErr;

      if (!empId) {
        setObras([]);
      } else {
        const { data, error } = await supabase
          .from("obras")
          .select("id,nome")
          .eq("empresa_id", empId)
          .order("nome", { ascending: true });
        if (error) throw error;
        setObras((data || []) as ObraRow[]);
      }
    } catch (e) {
      console.error(e);
      setObras([]);
    } finally {
      setCarregandoObras(false);
    }
  };

  const confirmarConvite = async () => {
    if (!prof?.profissionalId || !obraSelecionada) return;
    try {
      const { data: empId, error: rpcErr } = await supabase.rpc("minha_empresa_id");
      if (rpcErr) throw rpcErr;

      const { error } = await supabase.from("profissionais_obras").insert({
        obra_id: obraSelecionada,
        profissional_id: prof.profissionalId,
        empresa_id: empId || null,
        status: "ativo",
      });
      if (error) throw error;

      setAbrirConvidar(false);
      setObraSelecionada("");
      alert("Profissional convidado/adicionado à obra com sucesso.");
    } catch (e) {
      console.error(e);
      alert("Não foi possível convidar. Tente novamente.");
    }
  };

  /* =========================
     UI
  ========================== */
  if (loading) {
    return (
      <div className="min-h-screen px-4 md:px-8 max-w-6xl mx-auto py-12">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> carregando…
        </div>
      </div>
    );
  }

  if (!prof) {
    return (
      <div className="px-4 md:px-8 max-w-3xl mx-auto py-16 text-center text-slate-500">
        Perfil não encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ===== CAPA (mantida) ===== */}
      <section className="relative w-full">
        <div className="relative h-44 md:h-56">
          <div
            className="absolute inset-0 rounded-3xl overflow-hidden ring-1 ring-slate-200/60 dark:ring-white/10 shadow-sm"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, black 90%, rgba(0,0,0,0) 100%)",
              maskImage: "linear-gradient(to bottom, black 90%, rgba(0,0,0,0) 100%)",
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${prof.capa_url})` }}
            />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(120%_65%_at_50%_10%,rgba(59,130,246,0.22),transparent_55%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/20 to-transparent" />
            <button
              onClick={() => navigate(-1)}
              className="absolute top-3 left-3 bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-700/60 p-2 rounded-full shadow-sm hover:bg-white/95 dark:hover:bg-slate-900 transition"
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            </button>
          </div>

          {/* Avatar fora do container arredondado (não é cortado) */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 z-10">
            <img
              src={prof.foto_url}
              alt={prof.nome}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-950 shadow-xl"
            />
          </div>
        </div>

        {/* HEADER */}
        <div className="px-4 md:px-8 max-w-6xl mx-auto pt-14 md:pt-16 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{prof.nome}</h1>
          <div className="mt-1 inline-flex items-center justify-center gap-2 px-2 py-1 rounded-full bg-white/70 dark:bg-slate-800/60 backdrop-blur ring-1 ring-slate-200/80 dark:ring-slate-700/70">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-700 dark:text-blue-300">{prof.funcao}</span>
          </div>

          <p className="mt-2 text-[13px] md:text-sm text-slate-600 dark:text-slate-300 max-w-3xl mx-auto line-clamp-2">
            {prof.descricao}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Chip>
              <Estrela n={prof.avaliacao} />
              <span className="text-slate-500 dark:text-slate-300">/ 5</span>
            </Chip>
            <Chip>
              <Briefcase className="w-4 h-4" /> {prof.obras} obras
            </Chip>
            <Chip>
              <Building2 className="w-4 h-4" /> {prof.experiencia} anos
            </Chip>
            <Chip>
              <MapPin className="w-4 h-4" /> {prof.cidade}
            </Chip>
            <span
              className={`text-xs px-3 py-1 rounded-full font-semibold ${nivelBadgeClass(
                prof.nivel
              )} inline-flex items-center gap-1`}
            >
              {prof.nivel === "Mestre" && <Flame className="w-3 h-3" />}
              {prof.nivel === "Oficial" && <Award className="w-3 h-3" />}
              {prof.nivel === "Profissional" && <Hammer className="w-3 h-3" />}
              {prof.nivel}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={abrirModalConvidar}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold shadow-lg shadow-blue-600/20 ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 active:scale-[0.99] transition"
            >
              Convidar para Obra
            </button>
          </div>

          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Contato direto não está disponível. Utilize “Convidar para Obra” para iniciar o processo.
          </div>
        </div>
      </section>

      {/* ===== ABAS ===== */}
      <div
        className="sticky top-[56px] z-30 mt-6"
        role="tablist"
        aria-label="Navegação de seções do perfil"
        onKeyDown={handleKeyTabs}
      >
        <div className="max-w-6xl mx-auto px-2 md:px-4">
          <nav className="w-full flex justify-center">
            {/* wrapper rolável no mobile */}
            <div className="w-full md:w-auto overflow-x-auto">
              <div
                className="inline-flex min-w-max md:min-w-0 items-center gap-1 rounded-full px-1 py-1
                            bg-white/75 dark:bg-slate-900/55 backdrop-blur
                            ring-1 ring-slate-200/80 dark:ring-white/10 shadow-sm"
              >
                {[
                  { key: "sobre", label: "Sobre" },
                  { key: "trabalhos", label: "Trabalhos" },
                  { key: "historico", label: "Histórico" },
                  { key: "avaliacoes", label: "Avaliações" },
                  { key: "docs", label: "Documentos" },
                ].map((t) => {
                  const k = t.key as TabKey;
                  const active = tab === k;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(k)}
                      ref={(el) => {
                        tabButtonRefs.current[k] = el;
                      }}
                      className={[
                        "px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition whitespace-nowrap",
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* CONTEÚDO das tabs */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {tab === "sobre" && <SobreTab prof={prof} />}

        {tab === "trabalhos" && (
          <TrabalhosTab profissionalId={prof.profissionalId} usuarioId={prof.usuarioId} />
        )}

        {tab === "historico" && <HistoricoTab timeline={prof.timeline} />}
        {tab === "avaliacoes" && (
          <AvaliacoesTab usuarioId={prof.usuarioId} media={prof.avaliacao} />
        )}
        {tab === "docs" && (
          <DocumentosTab documentos={prof.documentos} usuarioId={prof.usuarioId} />
        )}
      </div>

      {/* MODAL: Convidar para Obra */}
      {abrirConvidar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Convidar para Obra</h3>
              <button
                onClick={() => setAbrirConvidar(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {carregandoObras ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> carregando obras…
              </div>
            ) : obras.length === 0 ? (
              <div className="text-sm text-slate-500">Nenhuma obra encontrada para sua empresa.</div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm">Selecione a obra</label>
                <select
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  value={obraSelecionada}
                  onChange={(e) => setObraSelecionada(e.target.value)}
                >
                  <option value="">-- escolher --</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome || o.id}
                    </option>
                  ))}
                </select>

                <button
                  disabled={!obraSelecionada}
                  onClick={confirmarConvite}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold enabled:shadow-lg enabled:shadow-blue-600/20 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 transition"
                >
                  Convidar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
