// src/components/company/perfil/tabs/TrabalhosTab.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Search,
  Loader2,
  ArrowLeft,
  Play,
  X,
} from "lucide-react";

/* ======================
   Tipos
====================== */
type Pasta = {
  id: string;
  nome: string | null;
  descricao?: string | null;
  capa_url?: string | null;
  visibilidade?: "publico" | "privado" | string | null;
  created_at?: string | null;
};

type Midia = {
  id: string;
  folder_id?: string | null;
  tipo?: "foto" | "video" | string | null;
  url?: string | null;
  thumb_url?: string | null;
  titulo?: string | null;
  visibilidade?: "publico" | "privado" | string | null;
  created_at?: string | null;
};

type Props = {
  /** profissionais.id (ideal). Mantemos compat com user_id enquanto migra */
  profissionalId?: string | null;
  /** users.id (compat) */
  usuarioId?: string | null;
};

/* ======================
   Componente
====================== */
export default function TrabalhosTab({ profissionalId, usuarioId }: Props) {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [buscandoPastas, setBuscandoPastas] = useState(false);

  const [q, setQ] = useState("");
  const termo = useMemo(() => q.trim().toLowerCase(), [q]);

  // Navegação para dentro da pasta
  const [pastaSelecionada, setPastaSelecionada] = useState<Pasta | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [buscandoMidias, setBuscandoMidias] = useState(false);

  // Modal de visualização de imagem
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    if (!termo) return pastas;
    return pastas.filter(
      (p) =>
        (p.nome || "").toLowerCase().includes(termo) ||
        (p.descricao || "").toLowerCase().includes(termo)
    );
  }, [pastas, termo]);

  /* ======================
     Carregar Pastas
  ====================== */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!profissionalId && !usuarioId) {
        setPastas([]);
        return;
      }

      setBuscandoPastas(true);
      try {
        // Buscamos por profissionalId (profissionais.id) e usuarioId (compat)
        const keys: string[] = [];
        if (profissionalId) keys.push(profissionalId);
        if (usuarioId && usuarioId !== profissionalId) keys.push(usuarioId);

        const searchKeys =
          keys.length > 0 ? keys : ["00000000-0000-0000-0000-000000000000"];

        const { data, error } = await supabase
          .from("portfolio_pastas")
          .select(
            "id, nome, descricao, capa_url, visibilidade, created_at, profissional_id"
          )
          .in("profissional_id", searchKeys)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!alive) return;
        setPastas((data || []) as Pasta[]);
      } catch (err) {
        console.error("TrabalhosTab.loadPastas error:", err);
        if (!alive) return;
        setPastas([]);
      } finally {
        if (alive) setBuscandoPastas(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profissionalId, usuarioId]);

  /* ======================
     Entrar/voltar da pasta
  ====================== */
  const entrarNaPasta = useCallback((p: Pasta) => {
    setPastaSelecionada(p);
  }, []);

  const voltarParaPastas = useCallback(() => {
    setPastaSelecionada(null);
    setMidias([]);
  }, []);

  /* ======================
     Carregar mídias da pasta
  ====================== */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pastaSelecionada?.id) return;

      setBuscandoMidias(true);
      try {
        const { data, error } = await supabase
          .from("portfolio_media")
          .select(
            "id, folder_id, tipo, url, thumb_url, titulo, visibilidade, created_at"
          )
          .eq("folder_id", pastaSelecionada.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!alive) return;
        setMidias((data || []) as Midia[]);
      } catch (err) {
        console.error("TrabalhosTab.loadMidias error:", err);
        if (!alive) return;
        setMidias([]);
      } finally {
        if (alive) setBuscandoMidias(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [pastaSelecionada?.id]);

  /* ======================
     Render
  ====================== */
  // View: Pastas
  const PastasView = (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar em trabalhos..."
          className="w-full rounded-lg bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        />
      </div>

      {buscandoPastas && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> carregando…
        </div>
      )}

      {!buscandoPastas && filtradas.length === 0 && (
        <div className="text-sm text-slate-500">Sem itens…</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtradas.map((p) => (
          <motion.button
            type="button"
            key={p.id}
            layout
            onClick={() => entrarNaPasta(p)}
            className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-md transition"
          >
            <div className="relative h-40 bg-slate-100 dark:bg-slate-800">
              {p.capa_url ? (
                <img
                  src={p.capa_url}
                  alt={p.nome || "capa"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                {p.nome || "Sem título"}
              </div>
              {p.descricao && (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {p.descricao}
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  // View: Mídias da pasta (SEM banner; sem nome de arquivo)
  const MidiasView = pastaSelecionada && (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={voltarParaPastas}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="min-w-0 flex-1 text-right">
          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
            Pasta
          </div>
          <div className="font-semibold text-slate-900 dark:text-white truncate">
            {pastaSelecionada.nome || "Sem título"}
          </div>
        </div>
      </div>

      {buscandoMidias && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> carregando…
        </div>
      )}

      {!buscandoMidias && midias.length === 0 && (
        <div className="text-sm text-slate-500">Sem mídias nesta pasta…</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {midias.map((m) => {
          const isVideo = (m.tipo || "").toLowerCase() === "video";
          const thumb = m.thumb_url || m.url || undefined;

          return (
            <motion.div
              key={m.id}
              layout
              className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => {
                  if (!isVideo && m.url) setPreviewUrl(m.url);
                  else if (isVideo && m.url) window.open(m.url, "_blank");
                }}
                className="block w-full"
                title={isVideo ? "Abrir vídeo" : "Abrir imagem"}
              >
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                  )}

                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/60">
                        <Play className="w-5 h-5 text-white" />
                      </span>
                    </div>
                  )}
                </div>
              </button>
              {/* Nome da foto/arquivo REMOVIDO */}
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {!pastaSelecionada ? (
          <motion.div
            key="pastas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {PastasView}
          </motion.div>
        ) : (
          <motion.div
            key="midias"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {MidiasView}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de preview de imagem */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] bg-black/70 p-4 flex items-center justify-center">
          <div className="relative w-full max-w-5xl">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm hover:bg-white dark:hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
              Fechar
            </button>
            <img
              src={previewUrl}
              alt="preview"
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
