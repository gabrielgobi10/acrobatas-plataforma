// src/components/company/perfil/tabs/SobreTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Info,
  BadgeCheck,
  Briefcase,
  Sparkles,
  MapPin,
  Clock4,
  Star,
  ShieldCheck,
  CheckCircle2,
  Globe2,
  Ruler,
  Plane,
  Home,
  Languages,
  Flag,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { PerfilView } from "@/components/company/ProfissionalDetalhes";

/* =============================================================================
   Tipos (dados extras do perfil) — nomes batendo com o schema real
============================================================================= */
type PerfilExtra = {
  // Identificação
  nacionalidade?: string | null;
  idiomas?: string[] | null;

  // Profissional
  area_principal?: string | null;
  funcao_obra?: string | null;
  anos_experiencia?: number | null;
  nivel?: string | null;
  habilidades?: string[] | null;

  // Disponibilidade
  disponibilidade_text?: string | null; // "Imediata" | "1 semana" | ...

  // Localização & Mobilidade
  cidade_base?: string | null;
  raio_deslocacao?: string | null; // ex.: "100 km"
  pode_viajar?: boolean | null;
  pode_alojamento?: boolean | null;

  // status visual (em obra/disponível)
  em_obra?: boolean | null;
};

/* =============================================================================
   UI helpers
============================================================================= */
function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-[6px] text-xs font-medium " +
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 " +
        className
      }
    >
      {children}
    </span>
  );
}

function Card({
  title,
  icon,
  children,
  className = "",
  highlight = false,
}: {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-4 md:p-5 " +
        (highlight
          ? "border-emerald-500/30 bg-emerald-500/[0.08] dark:border-emerald-400/30"
          : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60") +
        " " +
        className
      }
    >
      {title && (
        <div className="mb-2 flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
            {title}
          </h3>
        </div>
      )}
      {children}
    </div>
  );
}

/* =============================================================================
   Modal — NÍVEIS DE CARREIRA
============================================================================= */
function NiveisModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-500" />
            <h3 className="text-base font-semibold">Níveis de Carreira — Acrobatas</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Os níveis refletem a experiência e responsabilidade do profissional na
          plataforma. A evolução é por pontuação, que soma desempenho, histórico
          de obras, avaliações e documentação.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card highlight>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Mestre</div>
              <Chip className="bg-gradient-to-r from-orange-500 to-red-600 text-white">1500+ pts</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Referência técnica, alta autonomia, histórico sólido de entregas.
            </p>
          </Card>
          <Card highlight>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Encarregado</div>
              <Chip className="bg-orange-500/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300">1000–1499 pts</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Lidera frentes de trabalho e coordena equipes e prazos.
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Oficial</div>
              <Chip>650–999 pts</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Execução com qualidade e independência na função.
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Profissional</div>
              <Chip>350–649 pts</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Boa base técnica e consistência nas entregas.
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Auxiliar</div>
              <Chip>150–349 pts</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Em desenvolvimento, sob orientação de profissionais mais experientes.
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Aprendiz</div>
              <Chip>0–149 pts</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Iniciando a carreira, foco em aprendizagem e segurança.
            </p>
          </Card>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
          <div className="mb-1 font-semibold">Como evoluir</div>
          <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
            <li>Concluir obras com boa avaliação.</li>
            <li>Manter documentação válida e completa.</li>
            <li>Evitar faltas, registrar presenças e relatórios em dia.</li>
            <li>Participar de obras mais complexas e entregar com qualidade.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Componente principal
============================================================================= */
export default function SobreTab({ prof }: { prof: PerfilView }) {
  const [extra, setExtra] = useState<PerfilExtra | null>(null);
  const [openNiveis, setOpenNiveis] = useState(false);

  // Carrega dados do perfil com fallback robusto:
  // 1) profissionais_view (leitura pública p/ empresas)
  // 2) profissionais_perfil (policy com card público)
  // + estado "em_obra" vindo do card público
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // 1) tenta pela VIEW pública
        const view = await supabase
          .from("profissionais_view")
          .select(
            [
              "nacionalidade",
              "idiomas",
              "area_principal",
              "funcao_obra",
              "experiencia",      // se sua view não tiver, remova esta linha
              "nivel",
              "habilidades",
              "cidade_base",
              "raio_deslocacao",
              "pode_viajar",
              "pode_alojamento",
              "user_id",
            ].join(",")
          )
          .eq("user_id", prof.usuarioId)
          .maybeSingle();

        if (!view.data && view.error) {
          console.warn("profissionais_view error:", view.error);
        }

        // 2) fallback: tabela original
        let p: any = view.data || null;
        if (!p) {
          const tbl = await supabase
            .from("profissionais_perfil")
            .select(
              [
                "nacionalidade",
                "idiomas",
                "area_principal",
                "funcao_obra",
                "anos_experiencia",
                "nivel",
                "habilidades",
                "disponibilidade",
                "cidade_base",
                "raio_deslocacao",
                "pode_viajar",
                "pode_alojamento",
                "usuario_id",
              ].join(",")
            )
            .eq("usuario_id", prof.usuarioId)
            .maybeSingle();

          if (!tbl.data && tbl.error) {
            console.warn("profissionais_perfil error:", tbl.error);
          }
          p = tbl.data || {};
        }

        // 3) status "em obra" (card público)
        const cardRes = prof.profissionalId
          ? await supabase
              .from("profissionais_publico_cards_v1")
              .select("em_obra")
              .eq("profissional_id", prof.profissionalId)
              .maybeSingle()
          : { data: null as any };

        const e: PerfilExtra = {
          // Identificação
          nacionalidade: p?.nacionalidade ?? null,
          idiomas: Array.isArray(p?.idiomas) ? p.idiomas : p?.idiomas ? [p.idiomas] : [],

          // Profissional
          area_principal: p?.area_principal ?? null,
          funcao_obra: p?.funcao_obra ?? prof.funcao ?? null,
          anos_experiencia:
            typeof p?.anos_experiencia === "number"
              ? p.anos_experiencia
              : typeof p?.experiencia === "number"
              ? p.experiencia
              : prof.experiencia ?? null,
          nivel: p?.nivel ?? prof.nivel ?? null,
          habilidades: Array.isArray(p?.habilidades) ? p.habilidades : [],

          // Disponibilidade (texto no perfil)
          disponibilidade_text: p?.disponibilidade ?? null,

          // Localização & Mobilidade
          cidade_base: p?.cidade_base ?? prof.cidade ?? null,
          raio_deslocacao: typeof p?.raio_deslocacao === "string" ? p.raio_deslocacao : null,
          pode_viajar: typeof p?.pode_viajar === "boolean" ? p.pode_viajar : null,
          pode_alojamento: typeof p?.pode_alojamento === "boolean" ? p.pode_alojamento : null,

          // status (em obra / disponível)
          em_obra: cardRes.data?.em_obra ?? null,
        };

        if (!alive) return;
        setExtra(e);
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setExtra({
          nacionalidade: null,
          idiomas: [],
          area_principal: null,
          funcao_obra: prof.funcao,
          anos_experiencia: prof.experiencia,
          nivel: prof.nivel,
          habilidades: [],
          disponibilidade_text: null,
          cidade_base: prof.cidade ?? "-",
          raio_deslocacao: null,
          pode_viajar: null,
          pode_alojamento: null,
          em_obra: null,
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [prof.usuarioId, prof.profissionalId, prof.funcao, prof.experiencia, prof.nivel, prof.cidade]);

  /* -------------------- Badges -------------------- */
  // Disponibilidade operacional (em obra / disponível)
  const disponibilidadeBadge = useMemo(() => {
    const emObra = !!extra?.em_obra;
    if (emObra) {
      return (
        <Chip className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <Clock4 className="h-3.5 w-3.5" /> Em obra
        </Chip>
      );
    }
    return (
      <Chip className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> Disponível
      </Chip>
    );
  }, [extra?.em_obra]);

  // Nível
  const nivelBadge = useMemo(() => {
    const base = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold";
    const nivel = (extra?.nivel || prof.nivel) as string | undefined;
    switch (nivel) {
      case "Mestre":
        return (
          <span className={base + " bg-gradient-to-r from-orange-500 to-red-600 text-white shadow"}>
            <Sparkles className="h-3.5 w-3.5" />
            Mestre
          </span>
        );
      case "Oficial":
        return (
          <span className={base + " bg-blue-600 text-white"}>
            <BadgeCheck className="h-3.5 w-3.5" />
            Oficial
          </span>
        );
      case "Profissional":
        return (
          <span className={base + " bg-emerald-600 text-white"}>
            <BadgeCheck className="h-3.5 w-3.5" />
            Profissional
          </span>
        );
      default:
        return <Chip>—</Chip>;
    }
  }, [extra?.nivel, prof.nivel]);

  const idiomasFmt = useMemo(() => {
    const arr = Array.isArray(extra?.idiomas) ? extra!.idiomas! : [];
    return arr.length ? arr.join(", ") : "—";
  }, [extra?.idiomas]);

  /* -------------------- UI -------------------- */
  return (
    <>
      {/* 1) Sobre o profissional */}
      <Card
        title="Sobre o profissional"
        icon={<Star className="h-4 w-4 text-blue-500" />}
        className="mb-5"
      >
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          Profissional {(extra?.funcao_obra || prof.funcao || "—").toLowerCase()} com{" "}
          <span className="font-semibold">
            {extra?.anos_experiencia ?? prof.experiencia ?? 0}+ anos
          </span>{" "}
          de experiência.
        </p>
      </Card>

      {/* 2) Informações profissionais */}
      <Card
        title="Informações profissionais"
        icon={<Briefcase className="h-4 w-4 text-blue-500" />}
        className="mb-5"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Área principal
            </div>
            <div className="mt-1 text-sm font-semibold">
              {extra?.area_principal || "—"}
            </div>
          </Card>

          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Função na obra
            </div>
            <div className="mt-1 text-sm font-semibold">
              {extra?.funcao_obra || prof.funcao || "—"}
            </div>
          </Card>

          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Experiência
            </div>
            <div className="mt-1 text-sm font-semibold">
              {extra?.anos_experiencia ?? prof.experiencia ?? 0}+ anos
            </div>
          </Card>

          <Card className="relative h-full" highlight>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Nível profissional
                </div>
                <div className="mt-1">{nivelBadge}</div>
              </div>
              <button
                onClick={() => setOpenNiveis(true)}
                className="rounded-lg p-1.5 hover:bg-emerald-500/10"
                title="Como funcionam os níveis?"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </Card>

          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Disponibilidade
            </div>
            <div className="mt-1 flex items-center gap-2">
              {disponibilidadeBadge}
              <span className="text-xs text-slate-500">
                {extra?.disponibilidade_text ? `• ${extra.disponibilidade_text}` : ""}
              </span>
            </div>
          </Card>

          <Card className="h-full md:col-span-2 xl:col-span-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Habilidades
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {extra?.habilidades && extra.habilidades.length > 0 ? (
                extra.habilidades.map((h) => (
                  <Chip key={h}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {h}
                  </Chip>
                ))
              ) : (
                <span className="text-xs text-slate-500">
                  Nenhuma habilidade cadastrada.
                </span>
              )}
            </div>
          </Card>
        </div>
      </Card>

      {/* 3) Localização & Mobilidade */}
      <Card title="Localização & Mobilidade" icon={<Globe2 className="h-4 w-4 text-blue-500" />}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Cidade base
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
              <MapPin className="h-4 w-4 opacity-70" />
              {extra?.cidade_base || prof.cidade || "—"}
            </div>
          </Card>

          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Raio de deslocação
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
              <Ruler className="h-4 w-4 opacity-70" />
              {extra?.raio_deslocacao || "—"}
            </div>
          </Card>

          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Pode viajar
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
              <Plane className="h-4 w-4 opacity-70" />
              {extra?.pode_viajar == null ? "—" : extra.pode_viajar ? "Sim" : "Não"}
            </div>
          </Card>

          <Card className="h-full">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Aceita alojamento
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
              <Home className="h-4 w-4 opacity-70" />
              {extra?.pode_alojamento == null ? "—" : extra.pode_alojamento ? "Sim" : "Não"}
            </div>
          </Card>
        </div>
      </Card>

      {/* 4) Identificação */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card title="Identificação" icon={<Flag className="h-4 w-4 text-blue-500" />}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="h-full">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Nacionalidade
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
                <Globe2 className="h-4 w-4 opacity-70" />
                {extra?.nacionalidade || "—"}
              </div>
            </Card>

            <Card className="h-full">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Idiomas
              </div>
              <div className="mt-1 flex items-center gap-1 text-sm font-semibold">
                <Languages className="h-4 w-4 opacity-70" />
                {idiomasFmt}
              </div>
            </Card>
          </div>
        </Card>
      </div>

      {/* Modal de níveis */}
      <NiveisModal open={openNiveis} onClose={() => setOpenNiveis(false)} />
    </>
  );
}
