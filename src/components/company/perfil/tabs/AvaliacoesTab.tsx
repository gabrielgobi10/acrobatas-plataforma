// src/components/company/perfil/tabs/AvaliacoesTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Star,
  Briefcase,
  Calendar,
  MapPin,
  Loader2,
  Filter,
} from "lucide-react";

type AvaliacoesTabProps = {
  profissionalId: string | null;
  usuarioId: string;
  mediaGeralHeader?: number; // opcional, só para exibir no card de cima
};

type AvalRaw = {
  id: string;
  obra_id: string | null;
  nota: number | null;
  pontualidade: number | null;
  produtividade: number | null;
  comportamento: number | null;
  seguranca: number | null;
  comentario: string | null;
  tipo: string | null; // "mensal" | "final" | null
  criado_em: string | null;
};

type ObraRow = { id: string; nome: string | null };

type AvalucaoEnriquecida = AvalRaw & {
  obra_nome: string | null;
};

type FiltroTipo = "todos" | "final" | "mensal";

function formatarData(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("pt-PT");
}

function formatarMesAno(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const mes = dt.toLocaleDateString("pt-PT", { month: "short" });
  const ano = dt.getFullYear();
  return `${mes}/${ano}`;
}

function MediaStars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value));
  return (
    <div className="inline-flex items-center gap-1 text-yellow-400">
      <Star className="w-4 h-4 fill-yellow-400" />
      <span className="text-sm text-slate-800 dark:text-slate-100">
        {v.toFixed(1)}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">/ 5</span>
    </div>
  );
}

export default function AvaliacoesTab({
  profissionalId,
  usuarioId,
  mediaGeralHeader,
}: AvaliacoesTabProps) {
  const [loading, setLoading] = useState(true);
  const [avaliacoes, setAvaliacoes] = useState<AvalucaoEnriquecida[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  useEffect(() => {
    (async () => {
      if (!profissionalId) {
        setAvaliacoes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1) Buscar avaliações do profissional
        const { data: avs, error: errAv } = await supabase
          .from("avaliacoes_profissionais")
          .select(
            "id, obra_id, nota, pontualidade, produtividade, comportamento, seguranca, comentario, tipo, criado_em"
          )
          .eq("profissional_id", profissionalId)
          .order("criado_em", { ascending: false });

        if (errAv) throw errAv;

        const rows: AvalRaw[] = (avs as any) || [];

        // 2) Buscar nomes das obras (se existir obra_id)
        const obraIds = Array.from(
          new Set(rows.map((r) => r.obra_id).filter(Boolean) as string[])
        );

        let mapaObras = new Map<string, string | null>();
        if (obraIds.length) {
          const { data: obras, error: errObras } = await supabase
            .from("obras")
            .select("id,nome")
            .in("id", obraIds);

          if (errObras) {
            console.error("[AvaliacoesTab] erro ao buscar obras:", errObras);
          } else {
            (obras || []).forEach((o: ObraRow) => {
              mapaObras.set(o.id, o.nome);
            });
          }
        }

        const enriquecidas: AvalucaoEnriquecida[] = rows.map((r) => ({
          ...r,
          obra_nome: r.obra_id ? mapaObras.get(r.obra_id) || null : null,
        }));

        setAvaliacoes(enriquecidas);
      } catch (e) {
        console.error("[AvaliacoesTab] erro geral:", e);
        setAvaliacoes([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [profissionalId]);

  // ==== Estatísticas (usando só tipo final para reputação) ====
  const resumo = useMemo(() => {
    if (!avaliacoes.length) {
      return {
        total: 0,
        mediaGeral: 0,
        mediaPontualidade: 0,
        mediaProdutividade: 0,
        mediaComportamento: 0,
        mediaSeguranca: 0,
        ultimaData: null as string | null,
      };
    }

    const finais = avaliacoes.filter(
      (a) => (a.tipo || "final").toLowerCase() === "final"
    );
    const base = finais.length ? finais : avaliacoes;

    const calc = (field: keyof AvalucaoEnriquecida) => {
      const vals = base
        .map((a) => Number((a as any)[field] ?? 0))
        .filter((n) => !Number.isNaN(n));
      if (!vals.length) return 0;
      const soma = vals.reduce((acc, n) => acc + n, 0);
      return soma / vals.length;
    };

    const medias = {
      mediaGeral: calc("nota"),
      mediaPontualidade: calc("pontualidade"),
      mediaProdutividade: calc("produtividade"),
      mediaComportamento: calc("comportamento"),
      mediaSeguranca: calc("seguranca"),
    };

    const ultima = avaliacoes[0]?.criado_em ?? null;

    return {
      total: avaliacoes.length,
      ...medias,
      ultimaData: ultima,
    };
  }, [avaliacoes]);

  const listaFiltrada = useMemo(() => {
    if (filtroTipo === "todos") return avaliacoes;
    return avaliacoes.filter(
      (a) => (a.tipo || "").toLowerCase() === filtroTipo
    );
  }, [avaliacoes, filtroTipo]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando avaliações…
      </div>
    );
  }

  if (!avaliacoes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-300">
        Ainda não existem avaliações registradas para este profissional.
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Assim que as obras concluídas forem avaliadas, a média e o histórico
          aparecerão aqui.
        </p>
      </div>
    );
  }

  const mediaHeader =
    typeof mediaGeralHeader === "number"
      ? mediaGeralHeader
      : resumo.mediaGeral;

  return (
    <div className="space-y-6">
      {/* Bloco de resumo geral */}
      <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Média geral atual
            </h3>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <MediaStars value={mediaHeader || 0} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({resumo.total} {resumo.total === 1 ? "avaliação" : "avaliações"})
            </span>
          </div>
          {resumo.ultimaData && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Última avaliação em {formatarData(resumo.ultimaData)}.
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            A média considera principalmente as avaliações finais das obras.
          </p>
        </div>

        {/* Resumo por critério */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ResumoCritCard titulo="Pontualidade" valor={resumo.mediaPontualidade} />
          <ResumoCritCard
            titulo="Produtividade"
            valor={resumo.mediaProdutividade}
          />
          <ResumoCritCard
            titulo="Comportamento"
            valor={resumo.mediaComportamento}
          />
          <ResumoCritCard titulo="Segurança" valor={resumo.mediaSeguranca} />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Filtrar histórico</span>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setFiltroTipo("todos")}
            className={`px-3 py-1 rounded-full border ${
              filtroTipo === "todos"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroTipo("final")}
            className={`px-3 py-1 rounded-full border ${
              filtroTipo === "final"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            }`}
          >
            Apenas finais
          </button>
          <button
            onClick={() => setFiltroTipo("mensal")}
            className={`px-3 py-1 rounded-full border ${
              filtroTipo === "mensal"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-transparent text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            }`}
          >
            Mensais
          </button>
        </div>
      </div>

      {/* Lista de avaliações */}
      <div className="space-y-3">
        {listaFiltrada.map((a) => {
          const tipoLabel =
            (a.tipo || "final").toLowerCase() === "mensal"
              ? "Avaliação mensal"
              : "Avaliação final";

          return (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MediaStars value={a.nota || 0} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {tipoLabel} • {formatarMesAno(a.criado_em)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Briefcase className="w-3 h-3" />
                  <span>{a.obra_nome || "Obra não informada"}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <TagCrit nome="Pontualidade" valor={a.pontualidade} />
                <TagCrit nome="Produtividade" valor={a.produtividade} />
                <TagCrit nome="Comportamento" valor={a.comportamento} />
                <TagCrit nome="Segurança" valor={a.seguranca} />
              </div>

              {a.comentario && (
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {a.comentario}
                </p>
              )}

              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>Avaliado em {formatarData(a.criado_em)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResumoCritCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {titulo}
      </span>
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {valor ? valor.toFixed(1) : "—"}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          / 5
        </span>
      </div>
    </div>
  );
}

function TagCrit({ nome, valor }: { nome: string; valor: number | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800/80 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200">
      <MapPin className="w-3 h-3 opacity-60 hidden" />
      <span className="font-medium">{nome}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {valor != null ? `${valor}/5` : "—"}
      </span>
    </span>
  );
}
