"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import {
  MapPin, Mail, Phone, Star, Clock4, Trophy, Camera, Sparkles, Edit3,
  Link as LinkIcon, ExternalLink, Loader2, Trash2, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

import SobreTab from "./perfil/SobreTab";
import PortfolioTab from "./perfil/PortfolioTab";
import ExperienciaTab from "./perfil/ExperienciaTab";
import HistoricoTab from "./perfil/HistoricoTab";
import DocumentosTab from "./perfil/DocumentosTab";
import AvaliacoesTab from "./perfil/AvaliacoesTab";
import AtividadeTab from "./perfil/AtividadeTab";
import EditarPerfilModal from "./EditarPerfilModal";

import type {
  Perfil, PastaPortfolio, Experiencia, Documento, Avaliacao, HistoricoObra,
} from "./perfil/types";

type PerfilProfissionalProps = {
  /** Quando aberto a partir do Admin */
  adminView?: boolean;
  /** Força o usuário alvo (usuario_id) quando no Admin */
  forceUsuarioId?: string;
};

const BUCKET_NAME = "public";

function mapDbToPerfil(row: any, userLike: { id?: string | null; email?: string | null } | null): Perfil {
  return {
    usuario_id: row.usuario_id ?? userLike?.id ?? null,
    nome_completo: row.nome_completo ?? userLike?.email?.split("@")[0],
    email: row.email ?? userLike?.email ?? "",
    telefone: row.telefone ?? null,
    whatsapp: row.whatsapp ?? null,
    cidade_base: row.cidade_base ?? null,
    nacionalidade: row.nacionalidade ?? null,
    data_nascimento: row.data_nascimento ?? null,
    nivel: row.nivel ?? "Profissional",
    anos_experiencia: row.anos_experiencia ?? 1,
    area_principal: row.area_principal ?? null,
    funcao_obra: row.funcao_obra ?? null,
    tipo_contrato: row.tipo_contrato ?? null,
    valor_diario: row.valor_diario ?? null,
    disponibilidade: row.disponibilidade ?? "Imediata",
    raio_deslocacao: row.raio_deslocacao ?? "100 km",
    pode_viajar: row.pode_viajar ?? false,
    pode_alojamento: row.pode_alojamento ?? false,
    idiomas: row.idiomas ?? [],
    habilidades: row.habilidades ?? [],
    observacoes: row.observacoes ?? null,
    bio: row.bio ?? null,
    perfil_completo: !!row.perfil_completo,
    avatar_url: row.avatar_url ?? null,
    banner_url: row.banner_url ?? null,
    site: row.site ?? null,
    linkedin: row.linkedin ?? null,
    instagram: row.instagram ?? null,
  } as Perfil;
}

function extractStoragePathFromPublicUrl(url?: string | null) {
  if (!url) return null;
  try {
    const marker = `/object/public/${BUCKET_NAME}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  } catch {
    return null;
  }
}

export default function PerfilProfissional(props: PerfilProfissionalProps) {
  const { adminView = false, forceUsuarioId } = props;
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🔑 ID alvo para TODAS as queries deste componente
  const alvoUsuarioId = adminView && forceUsuarioId ? forceUsuarioId : user?.id ?? null;

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [portfolios, setPortfolios] = useState<PastaPortfolio[]>([]);
  const [experiencias, setExperiencias] = useState<Experiencia[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [historicoObras, setHistoricoObras] = useState<HistoricoObra[]>([]);
  const [aba, setAba] = useState<
    "sobre" | "portfolio" | "experiencia" | "historico" | "documentos" | "avaliacoes" | "atividade"
  >("sobre");

  const [savingBanner, setSavingBanner] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // ações por toque (mobile)
  const [showBannerActions, setShowBannerActions] = useState(false);
  const [showAvatarActions, setShowAvatarActions] = useState(false);
  const isTouch = useMemo(
    () => typeof window !== "undefined" && matchMedia?.("(hover: none)").matches,
    []
  );

  const [openEditar, setOpenEditar] = useState(false);

  const fileBannerRef = useRef<HTMLInputElement | null>(null);
  const fileAvatarRef = useRef<HTMLInputElement | null>(null);

  // --- NOVO: refs para tabs + centralizar ativa
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const tabsRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const tabs = useMemo(
    () =>
      [
        ["sobre", "Sobre"],
        ["portfolio", "Portfólio"],
        ["experiencia", "Experiência"],
        ["historico", "Histórico de Obras"],
        ["documentos", "Documentos"],
        ["avaliacoes", "Avaliações"],
        ["atividade", "Atividade"],
      ] as const,
    []
  );

  useEffect(() => {
    const btn = tabsRefs.current[aba];
    if (btn) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [aba]);

  // =======================
  // CARREGAMENTO DE DADOS
  // =======================
  useEffect(() => {
    (async () => {
      if (!alvoUsuarioId) return;
      const { data, error } = await supabase
        .from("profissionais_perfil")
        .select("*")
        .eq("usuario_id", alvoUsuarioId)
        .maybeSingle();

      if (!error && data) {
        setPerfil(mapDbToPerfil(data, { id: alvoUsuarioId, email: user?.email ?? null }));
      } else {
        setPerfil({
          usuario_id: alvoUsuarioId,
          nome_completo: user?.email?.split("@")[0] ?? "Profissional",
          email: user?.email ?? "",
          perfil_completo: false,
          nivel: "Profissional",
          anos_experiencia: 1,
          disponibilidade: "Imediata",
          raio_deslocacao: "100 km",
          pode_viajar: false,
          pode_alojamento: false,
          idiomas: [],
          habilidades: [],
        } as any);
      }
    })();
  }, [alvoUsuarioId, user?.email]);

  useEffect(() => {
    (async () => {
      if (!alvoUsuarioId) return;
      const { data } = await supabase
        .from("profissionais_portfolio_pastas")
        .select("id,titulo,obra_id,cliente,cidade,ano,capa_url,midias")
        .eq("usuario_id", alvoUsuarioId);
      setPortfolios((data as any[])?.map(p => ({ ...p, midias: p.midias ?? [] })) ?? []);
    })();
  }, [alvoUsuarioId]);

  useEffect(() => {
    (async () => {
      if (!alvoUsuarioId) return;
      const { data, error } = await supabase
        .from("profissionais_experiencias")
        .select("id,empresa,cargo,cidade,inicio,fim,descricao,tecnologias")
        .eq("usuario_id", alvoUsuarioId)
        .order("inicio", { ascending: false });
      if (!error) setExperiencias((data as any[]) ?? []);
    })();
  }, [alvoUsuarioId]);

  useEffect(() => {
    (async () => {
      if (!alvoUsuarioId) return;
      const { data, error } = await supabase
        .from("profissionais_documentos")
        .select("id,titulo,tipo,status,validade,arquivo_url")
        .eq("usuario_id", alvoUsuarioId);
      if (!error) setDocumentos((data as any[]) ?? []);
    })();
  }, [alvoUsuarioId]);

  useEffect(() => {
    (async () => {
      if (!alvoUsuarioId) return;
      const { data, error } = await supabase
        .from("profissionais_avaliacoes")
        .select("id,avaliador,comentario,nota,data,obra")
        .eq("usuario_id", alvoUsuarioId)
        .order("data", { ascending: false });
      if (!error) setAvaliacoes((data as any[]) ?? []);
    })();
  }, [alvoUsuarioId]);

  useEffect(() => {
    (async () => {
      if (!alvoUsuarioId) return;
      const { data, error } = await supabase
        .from("profissionais_obras_historico")
        .select("id,nome,cidade,ano,horas")
        .eq("usuario_id", alvoUsuarioId)
        .order("ano", { ascending: false });
      if (!error) setHistoricoObras((data as any[]) ?? []);
    })();
  }, [alvoUsuarioId]);

  const mediaAvaliacao = useMemo(() => {
    if (!avaliacoes.length) return 0;
    return avaliacoes.reduce((acc, a) => acc + (a.nota ?? 0), 0) / Math.max(1, avaliacoes.length);
  }, [avaliacoes]);

  const MAX_MB = 10;
  const uploadToBucket = async (file: File, path: string) => {
    if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Arquivo muito grande (>${MAX_MB}MB).`);
    const { data: up, error: upErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) throw upErr;
    const { data: publicUrl } = supabase.storage.from(BUCKET_NAME).getPublicUrl(up.path);
    return publicUrl.publicUrl;
  };

  const handleBannerChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!perfil?.usuario_id || !ev.target.files?.[0]) return;
      setSavingBanner(true);
      const file = ev.target.files[0];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `perfis/${perfil.usuario_id}/banner_${Date.now()}.${ext}`;
      const publicUrl = await uploadToBucket(file, path);

      const { data, error } = await supabase
        .from("profissionais_perfil")
        .update({ banner_url: publicUrl, data_atualizacao: new Date().toISOString() })
        .eq("usuario_id", perfil.usuario_id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) setPerfil(mapDbToPerfil(data, { id: alvoUsuarioId, email: user?.email ?? null }));
    } catch (e) {
      console.error("Erro ao trocar banner:", e);
      alert("Não foi possível trocar a capa. Tente novamente.");
    } finally {
      setSavingBanner(false);
      fileBannerRef.current && (fileBannerRef.current.value = "");
    }
  };

  const handleDeleteBanner = async () => {
    if (!perfil?.usuario_id || !perfil?.banner_url) return;
    if (!confirm("Remover capa do perfil?")) return;

    try {
      setSavingBanner(true);
      const { data, error } = await supabase
        .from("profissionais_perfil")
        .update({ banner_url: null, data_atualizacao: new Date().toISOString() })
        .eq("usuario_id", perfil.usuario_id)
        .select()
        .maybeSingle();
      if (error) throw error;

      const path = extractStoragePathFromPublicUrl(perfil.banner_url);
      if (path) await supabase.storage.from(BUCKET_NAME).remove([path]);

      if (data) setPerfil(mapDbToPerfil(data, { id: alvoUsuarioId, email: user?.email ?? null }));
    } catch (e) {
      console.error("Erro ao apagar capa:", e);
      alert("Não foi possível apagar a capa.");
    } finally {
      setSavingBanner(false);
    }
  };

  const handleAvatarChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!perfil?.usuario_id || !ev.target.files?.[0]) return;
      setSavingAvatar(true);
      const file = ev.target.files[0];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `perfis/${perfil.usuario_id}/avatar_${Date.now()}.${ext}`;
      const publicUrl = await uploadToBucket(file, path);

      const { data, error } = await supabase
        .from("profissionais_perfil")
        .update({ avatar_url: publicUrl, data_atualizacao: new Date().toISOString() })
        .eq("usuario_id", perfil.usuario_id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) setPerfil(mapDbToPerfil(data, { id: alvoUsuarioId, email: user?.email ?? null }));
    } catch (e) {
      console.error("Erro ao trocar avatar:", e);
      alert("Não foi possível trocar a foto. Tente novamente.");
    } finally {
      setSavingAvatar(false);
      fileAvatarRef.current && (fileAvatarRef.current.value = "");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!perfil?.usuario_id || !perfil?.avatar_url) return;
    if (!confirm("Remover foto de perfil?")) return;

    try {
      setSavingAvatar(true);
      const { data, error } = await supabase
        .from("profissionais_perfil")
        .update({ avatar_url: null, data_atualizacao: new Date().toISOString() })
        .eq("usuario_id", perfil.usuario_id)
        .select()
        .maybeSingle();
      if (error) throw error;

      const path = extractStoragePathFromPublicUrl(perfil.avatar_url);
      if (path) await supabase.storage.from(BUCKET_NAME).remove([path]);

      if (data) setPerfil(mapDbToPerfil(data, { id: alvoUsuarioId, email: user?.email ?? null }));
    } catch (e) {
      console.error("Erro ao apagar avatar:", e);
      alert("Não foi possível apagar a foto.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSaveModal = async (data: any) => {
    if (!perfil?.usuario_id) return;
    const safeKeys = [
      "nome_completo","email","telefone","cidade_base","nacionalidade","data_nascimento","nivel",
      "anos_experiencia","area_principal","funcao_obra","disponibilidade","raio_deslocacao",
      "pode_viajar","pode_alojamento","idiomas","habilidades","avatar_url","banner_url",
      "site","linkedin","instagram","perfil_completo","tipo_contrato","valor_diario","whatsapp",
      "observacoes","bio",
    ] as const;

    const normalizeBool = (v: any) =>
      typeof v === "string" ? v.toLowerCase().startsWith("s") || v === "true" || v === "1" : !!v;
    const normalizeMoney = (v: any) =>
      v == null || v === "" ? null : String(v).replace(/[^\d,.-]/g, "").replace(",", ".");

    const payload: any = { usuario_id: perfil.usuario_id };
    for (const k of safeKeys) if (data[k] !== undefined) payload[k] = data[k];

    if (payload.pode_viajar !== undefined) payload.pode_viajar = normalizeBool(payload.pode_viajar);
    if (payload.pode_alojamento !== undefined)
      payload.pode_alojamento = normalizeBool(payload.pode_alojamento);
    if (payload.valor_diario !== undefined) payload.valor_diario = normalizeMoney(payload.valor_diario);

    payload.perfil_completo = !!(
      payload.nome_completo && payload.telefone && payload.area_principal && payload.cidade_base
    );

    try {
      const { data: up, error } = await supabase
        .from("profissionais_perfil")
        .upsert({ ...payload, data_atualizacao: new Date().toISOString() }, { onConflict: "usuario_id" })
        .select()
        .maybeSingle();

      if (error) {
        console.error("Erro ao salvar perfil:", error.message, error);
        alert("Não foi possível salvar o perfil.\n\nDetalhe: " + (error.message ?? ""));
        return;
      }
      if (up) setPerfil(mapDbToPerfil(up, { id: alvoUsuarioId, email: user?.email ?? null }));
    } catch (e) {
      console.error("Erro inesperado ao salvar perfil:", e);
      alert("Erro inesperado ao salvar o perfil.");
    }
  };

  const handleSaveBio = async (texto: string) => {
    if (!perfil?.usuario_id) return;
    try {
      const { data, error } = await supabase
        .from("profissionais_perfil")
        .update({ bio: texto, data_atualizacao: new Date().toISOString() })
        .eq("usuario_id", perfil.usuario_id)
        .select()
        .maybeSingle();
      if (!error && data) setPerfil(mapDbToPerfil(data, { id: alvoUsuarioId, email: user?.email ?? null }));
    } catch (e) {
      console.error("Erro ao salvar bio:", e);
    }
  };

  if (!alvoUsuarioId) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        ID do usuário não identificado.
      </div>
    );
  }

  if (!perfil) {
    return <div className="flex items-center justify-center h-[60vh] text-slate-400">Carregando perfil…</div>;
  }

  const nome = perfil?.nome_completo || "Profissional";
  const avatar =
    perfil?.avatar_url ||
    "https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=256&auto=format&fit=crop";
  const bannerFallback =
    "https://images.unsplash.com/photo-1523419409543-4d7f2a0efcc3?q=80&w=1400&auto=format&fit=crop";
  const hasBanner = !!perfil?.banner_url;
  const banner = perfil?.banner_url || bannerFallback;

  // visibilidade (hover desktop / toque mobile)
  const bannerActionsBase =
    "transition-opacity inline-flex items-center gap-2 rounded-full px-2.5 py-2 text-[13px] bg-white/70 text-slate-800 border border-black/5 backdrop-blur-sm shadow-sm hover:bg-white/90 dark:bg-slate-900/60 dark:text-slate-100 dark:border-white/10 dark:hover:bg-slate-900/80 disabled:opacity-60";
  const bannerActionOpacity = isTouch ? (showBannerActions ? "opacity-100" : "opacity-0") : "opacity-0 md:group-hover:opacity-100";
  const avatarActionOpacity = isTouch ? (showAvatarActions ? "opacity-100" : "opacity-0") : "opacity-0 group-hover:opacity-100";

  return (
    <div className="mx-auto max-w-6xl px-3 md:px-6 pb-24">
      {/* ===== Header ===== */}
      <div className="relative overflow-hidden rounded-2xl border dark:border-slate-800/50 border-gray-200 bg-white dark:bg-slate-900">
        {/* Botão voltar (apenas Admin) */}
        {adminView && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-3 top-3 z-20 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium bg-white/85 text-slate-800 ring-1 ring-black/10 hover:bg-white dark:bg-slate-800/80 dark:text-slate-100 dark:ring-white/15"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        )}

        {/* Capa */}
        <div
          className="group relative"
          onClick={() => { if (isTouch) setShowBannerActions(v => !v); }}
        >
          {hasBanner ? (
            <div className="h-44 sm:h-52 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url(${banner})` }} aria-label="Capa do perfil" />
          ) : (
            <div className="h-44 sm:h-52 md:h-64 relative overflow-hidden" aria-label="Área da capa (vazia)">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-900" />
              <div className="absolute inset-0 [background:radial-gradient(transparent_1px,rgba(0,0,0,0)_1px)] [background-size:24px_24px] opacity-30 dark:opacity-20" />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/10 dark:to-black/30" />

          {/* Ações da capa */}
          <div className="absolute right-3 top-3 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fileBannerRef.current?.click(); }}
              disabled={savingBanner}
              className={`${bannerActionsBase} ${bannerActionOpacity}`}
              title="Trocar capa"
              aria-label="Trocar capa"
            >
              {savingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span className="hidden sm:inline">Trocar capa</span>
            </button>

            {perfil.banner_url && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteBanner(); }}
                disabled={savingBanner}
                className={`${bannerActionsBase} ${bannerActionOpacity}`}
                title="Apagar capa"
                aria-label="Apagar capa"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Apagar capa</span>
              </button>
            )}
          </div>

          <input ref={fileBannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {/* Conteúdo principal */}
        <div className="px-4 md:px-8 pb-5 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] gap-4 -mt-14 md:-mt-16 items-end">
            {/* Avatar */}
            <div className="flex justify-center md:block">
              <div
                className="relative group"
                onClick={() => { if (isTouch) setShowAvatarActions(v => !v); }}
              >
                <img
                  src={avatar}
                  alt={nome}
                  className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-xl"
                />

                {/* Trocar */}
                <button
                  onClick={(e) => { e.stopPropagation(); fileAvatarRef.current?.click(); }}
                  disabled={savingAvatar}
                  className={`absolute right-1.5 bottom-1.5 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/95 border border-gray-200 text-slate-700 hover:bg-white hover:shadow-sm dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700 ${avatarActionOpacity}`}
                  title="Alterar foto"
                  aria-label="Alterar foto"
                >
                  {savingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>

                {/* Apagar */}
                {perfil.avatar_url && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAvatar(); }}
                    disabled={savingAvatar}
                    className={`absolute left-1.5 top-1.5 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/95 border border-gray-200 text-slate-700 hover:bg-white hover:shadow-sm dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-700 ${avatarActionOpacity}`}
                    title="Apagar foto"
                    aria-label="Apagar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <input ref={fileAvatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            {/* Nome + meta */}
            <div className="min-w-0 text-center md:text-left mt-2 md:mt-3">
              <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold text-gray-900 dark:text-white leading-snug break-words whitespace-normal max-w-lg md:max-w-2xl mx-auto md:mx-0">
                {nome}
              </h1>
              <p className="mt-0.5 text-gray-600 dark:text-slate-300 text-sm md:text-[15px]">
                {perfil.funcao_obra || perfil.area_principal || "Profissional"}
                {perfil.cidade_base && (
                  <span className="inline-flex items-center gap-1 ml-2 text-gray-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4" /> {perfil.cidade_base}
                  </span>
                )}
              </p>

              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2 text-xs sm:text-[13px]">
                <Chip icon={<Trophy className="w-3.5 h-3.5" />} txt={perfil.nivel || "Profissional"} color="indigo" />
                <Chip icon={<Clock4 className="w-3.5 h-3.5" />} txt={`${perfil.anos_experiencia ?? 1}+ anos`} color="emerald" />
                <Chip icon={<Star className="w-3.5 h-3.5" />} txt={`${mediaAvaliacao.toFixed(1)} (${avaliacoes.length})`} color="amber" />
                {perfil.perfil_completo && <Chip icon={<Sparkles className="w-3.5 h-3.5" />} txt="Perfil completo" color="sky" />}
              </div>
            </div>

            {/* Ação */}
            <div className="flex justify-center md:justify-end mt-1 md:mt-0">
              <button
                onClick={() => setOpenEditar(true)}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium bg-sky-600 text-white hover:bg-sky-500 shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                Editar perfil
              </button>
            </div>
          </div>

          {/* Contatos / Links */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 justify-center sm:justify-start text-gray-700 dark:text-slate-300">
              <Mail className="w-4 h-4" />
              <span className="truncate">{perfil.email || "-"}</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start text-gray-700 dark:text-slate-300">
              <Phone className="w-4 h-4" />
              <span className="truncate">{perfil.telefone || (perfil as any).whatsapp || "-"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {safeHttpUrl(perfil.site) && (
                <a href={safeHttpUrl(perfil.site)!} target="_blank" rel="noopener noreferrer" className={btnLink}>
                  <LinkIcon className="w-4 h-4" /> Site
                </a>
              )}
              {safeHttpUrl(perfil.linkedin) && (
                <a href={safeHttpUrl(perfil.linkedin)!} target="_blank" rel="noopener noreferrer" className={btnLink}>
                  <ExternalLink className="w-4 h-4" /> LinkedIn
                </a>
              )}
              {safeHttpUrl(perfil.instagram) && (
                <a href={safeHttpUrl(perfil.instagram)!} target="_blank" rel="noopener noreferrer" className={btnLink}>
                  <Camera className="w-4 h-4" /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Abas ===== */}
      <div className="sticky top-0 z-30 mt-6 border-b dark:border-slate-800/60 border-gray-200
                      bg-white/70 dark:bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <div
          ref={tabsContainerRef}
          className="
            flex overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth gap-2 px-1
            touch-pan-x overscroll-x-contain select-none
          "
        >
          {tabs.map(([k, label]) => {
            const active = aba === k;
            return (
              <button
                key={k}
                ref={(el) => (tabsRefs.current[k] = el)}
                onClick={() => setAba(k as any)}
                className={`
                  snap-center whitespace-nowrap relative
                  px-4 py-3 text-sm md:text-[15px] font-medium
                  transition-colors
                  ${
                    active
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }
                `}
              >
                {label}
                <span
                  className={`
                    absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-all
                    ${active ? "bg-sky-600 dark:bg-sky-500" : "bg-transparent"}
                  `}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Conteúdo ===== */}
      <div className="mt-6">
        <Suspense fallback={<div className="text-slate-400">Carregando…</div>}>
          {aba === "sobre" && (
            <SobreTab
              perfil={{ ...(perfil ?? ({} as any)), experiencia: (perfil as any)?.experiencia ?? (perfil as any)?.anos_experiencia ?? 0 }}
              onSaveBio={handleSaveBio}
            />
          )}

          {/* 🔧 Portfólio: garante ownerId do profissional aberto (funciona no Admin e no painel do próprio) */}
          {aba === "portfolio" && <PortfolioTab ownerId={alvoUsuarioId} />}

          {aba === "experiencia" && <ExperienciaTab experiencias={experiencias} />}
          {aba === "historico" && <HistoricoTab obras={historicoObras} />}
          {aba === "documentos" && <DocumentosTab docs={documentos} />}
          {aba === "avaliacoes" && <AvaliacoesTab avaliacoes={avaliacoes} />}
          {aba === "atividade" && <AtividadeTab />}
        </Suspense>
      </div>

      {openEditar && (
        <EditarPerfilModal
          open={openEditar as any}
          isOpen={openEditar as any}
          onClose={() => setOpenEditar(false)}
          initialData={{
            nome: perfil?.nome_completo ?? "",
            email: perfil?.email ?? "",
            telefone: perfil?.telefone ?? "",
            whatsapp: (perfil as any)?.whatsapp ?? "",
            data_nascimento: (perfil as any)?.data_nascimento ?? "",
            nacionalidade: (perfil as any)?.nacionalidade ?? "",
            idiomas: perfil?.idiomas ?? [],
            area_principal: perfil?.area_principal ?? "",
            nivel: (perfil?.nivel as any) ?? "Profissional",
            anos_experiencia: perfil?.anos_experiencia ?? 0,
            valor_diario: (perfil as any)?.valor_diario ?? "",
            tipo_contrato: (perfil as any)?.tipo_contrato ?? "",
            disponibilidade: (perfil?.disponibilidade as any) ?? "Imediata",
            funcao: perfil?.funcao_obra ?? perfil?.area_principal ?? "",
            cidade: perfil?.cidade_base ?? "",
            pode_viajar: perfil?.pode_viajar ? "Sim" : "Não",
            pode_alojamento: perfil?.pode_alojamento ? "Sim" : "Não",
            raio: perfil?.raio_deslocacao ?? "",
            habilidades: perfil?.habilidades ?? [],
            observacoes: (perfil as any)?.observacoes ?? "",
            foto_url: perfil?.avatar_url ?? "",
            site: perfil?.site ?? "",
            instagram: perfil?.instagram ?? "",
            linkedin: perfil?.linkedin ?? "",
          }}
          onSave={async (data: any) => {
            const mapped = {
              nome_completo: data.nome ?? "",
              email: data.email ?? "",
              telefone: data.telefone ?? "",
              whatsapp: data.whatsapp ?? "",
              data_nascimento: data.data_nascimento ?? null,
              nacionalidade: data.nacionalidade ?? null,
              cidade_base: data.cidade ?? "",
              avatar_url: data.foto_url ?? "",
              nivel: data.nivel ?? "Profissional",
              area_principal: data.area_principal ?? "",
              funcao_obra: data.funcao ?? "",
              anos_experiencia: data.anos_experiencia ?? 0,
              valor_diario: data.valor_diario ?? null,
              tipo_contrato: data.tipo_contrato ?? "",
              disponibilidade: data.disponibilidade ?? "Imediata",
              raio_deslocacao: data.raio ?? null,
              pode_viajar: typeof data.pode_viajar === "string" ? data.pode_viajar.toLowerCase().startsWith("s") : !!data.pode_viajar,
              pode_alojamento: typeof data.pode_alojamento === "string" ? data.pode_alojamento.toLowerCase().startsWith("s") : !!data.pode_alojamento,
              idiomas: data.idiomas ?? [],
              habilidades: data.habilidades ?? [],
              observacoes: data.observacoes ?? null,
              site: data.site ?? "",
              instagram: data.instagram ?? "",
              linkedin: data.linkedin ?? "",
            };
            await handleSaveModal(mapped);
            setOpenEditar(false);
          }}
        />
      )}
    </div>
  );
}

function Chip({ icon, txt, color }: { icon: React.ReactNode; txt: string; color: "sky" | "emerald" | "amber" | "indigo"; }) {
  const map: Record<string, string> = {
    sky: "bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-300 dark:border-sky-500/20",
    emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-500/20",
    indigo: "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-300 dark:border-indigo-500/20",
  };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${map[color]}`}>{icon}{txt}</span>;
}

const linkBase = "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium border transition";
const light = "bg-white text-slate-700 border-gray-200 hover:bg-gray-50";
const dark = "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700";
export const btnLink = `${linkBase} ${light} ${dark}`;

function safeHttpUrl(u?: string | null) {
  if (!u) return null;
  try {
    const url = new URL(u, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {}
  return null;
}
