// src/components/company/Profissionais.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Star,
  MapPin,
  Briefcase,
  Award,
  Flame,
  Hammer,
  Wrench,
  Zap,
  Paintbrush,
  HardHat,
  Building2,
  UsersRound,
  Globe2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ============================
   Tipos
============================ */
type Card = {
  profissional_id: string; // profissionais.id vindo da view
  usuario_id: string; // auth.users.id
  nome: string;
  funcao: string; // área principal (Canalizador, Eletricista, etc.)
  cidade: string;
  nivel: string; // Aprendiz, Auxiliar, Profissional, Oficial, Encarregado, Mestre
  avaliacao: number; // média 0..5
  obras: number;
  experiencia: number;
  disponibilidade: "Disponível" | "Em obra" | string;
  foto_url: string | null;
  capa_url: string | null;
  descricao: string; // descrição já gerada (manual ou automática)
  totalAvaliacoes?: number;
};

const clamp2 = {
  display: "-webkit-box",
  WebkitLineClamp: 2 as any,
  WebkitBoxOrient: "vertical" as any,
  overflow: "hidden",
};

const bannerFallback =
  "https://images.unsplash.com/photo-1523419409543-4d7f2a0efcc3?q=80&w=1400&auto=format&fit=crop";

/* ============================
   Helpers
============================ */

// níveis oficiais do Acrobatas
const careerLevels = [
  "aprendiz",
  "auxiliar",
  "profissional",
  "oficial",
  "encarregado",
  "mestre",
];

function toTitleCase(str: string) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Deduplica cards por usuario_id (fallback para profissional_id) */
function dedupeCards(cards: Card[]): Card[] {
  const map = new Map<string, Card>();
  for (const c of cards) {
    const key = c.usuario_id || c.profissional_id;
    if (!map.has(key)) {
      map.set(key, c);
    }
  }
  return Array.from(map.values());
}

/** Limita o nome a N palavras (sem mostrar o resto) */
function limitNameWords(name: string, maxWords = 3) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, maxWords).join(" ");
}

/* ============================
   Helpers visuais
============================ */
function badgeCor(nivel: string) {
  switch (nivel) {
    case "Mestre":
      return "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md";
    case "Encarregado":
      return "bg-purple-600 text-white";
    case "Oficial":
      return "bg-blue-600 text-white";
    case "Profissional":
      return "bg-green-600 text-white";
    case "Auxiliar":
      return "bg-yellow-400 text-slate-800";
    case "Aprendiz":
      return "bg-slate-500 text-white";
    default:
      return "bg-slate-400 text-white";
  }
}

function iconeFuncao(funcao: string) {
  const f = (funcao || "").toLowerCase();
  if (f.includes("canal")) return <Wrench className="w-4 h-4" />;
  if (f.includes("eletric")) return <Zap className="w-4 h-4" />;
  if (f.includes("pint")) return <Paintbrush className="w-4 h-4" />;
  if (f.includes("pedr")) return <Hammer className="w-4 h-4" />;
  if (f.includes("avac") || f.includes("climat"))
    return <Zap className="w-4 h-4" />;
  return <HardHat className="w-4 h-4" />;
}

/** Iniciais do nome (até 2 letras) */
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/* ============================
   Motor de descrição automática
============================ */
type DescricaoInput = {
  descricaoCurta?: string | null;
  funcao?: string | null;
  cidade?: string | null;
  experiencia?: number | null | undefined;
  obras?: number | null | undefined;
  disponibilidade?: string | null;
};

function buildDescricaoFromDados(input: DescricaoInput): string {
  const descricaoCurta = input.descricaoCurta?.trim();

  // 1) Se o profissional escreveu algo, usa isso
  if (descricaoCurta && descricaoCurta.length > 0) {
    return descricaoCurta;
  }

  const funcao = input.funcao?.trim();
  const cidade = input.cidade?.trim();
  const experiencia =
    typeof input.experiencia === "number" ? input.experiencia : null;
  const obras = typeof input.obras === "number" ? input.obras : null;
  const disponibilidade = input.disponibilidade?.trim();

  // 2) Se praticamente não há dados, fallback simples
  if (!funcao && !cidade && experiencia === null && obras === null) {
    return "Informações do perfil ainda não foram completas.";
  }

  const partes: string[] = [];

  if (funcao) partes.push(funcao);
  if (cidade) partes.push(`em ${cidade.toLowerCase()}`);

  if (experiencia !== null) {
    if (experiencia === 0) partes.push("com perfil recente na Acrobatas");
    else if (experiencia === 1) partes.push("com 1 ano de experiência");
    else partes.push(`com ${experiencia} anos de experiência`);
  }

  let descricaoBase =
    partes.length > 0
      ? partes.join(", ")
      : "Profissional na plataforma Acrobatas";

  if (obras !== null) {
    if (obras === 0) {
      descricaoBase += ", ainda sem obras registadas na plataforma Acrobatas";
    } else if (obras === 1) {
      descricaoBase += ", com 1 obra concluída através da plataforma Acrobatas";
    } else {
      descricaoBase += `, com ${obras} obras concluídas através da plataforma Acrobatas`;
    }
  }

  if (disponibilidade) {
    const dispLower = disponibilidade.toLowerCase();
    if (dispLower === "disponível" || dispLower === "disponivel") {
      descricaoBase += ", atualmente disponível para novas obras.";
    } else if (dispLower === "em obra") {
      descricaoBase +=
        ", atualmente em obra, mas visível para futuras oportunidades.";
    } else {
      descricaoBase += ".";
    }
  } else {
    descricaoBase += ".";
  }

  return descricaoBase;
}

export default function Profissionais() {
  // Base Acrobatas (view)
  const [cardsBase, setCardsBase] = useState<Card[]>([]);
  // Minha Equipa (subset da BASE filtrado pelos vínculos da empresa)
  const [cardsEmpresa, setCardsEmpresa] = useState<Card[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("todas");
  const [filtroFuncao, setFiltroFuncao] = useState("todas");
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [apenasDisponiveis, setApenasDisponiveis] = useState(false);
  const [modoEmpresa, setModoEmpresa] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const fromObra = Boolean((location.state as any)?.fromObra);
  const backTo: string | undefined = (location.state as any)?.backTo;

  /* ============================
      Carregar Base + Minha Equipa
  ============================ */
  useEffect(() => {
    (async () => {
      /* ---------- 1) BASE ACROBATAS (VIEW) ---------- */
      const { data: dataView, error: errorView } = await supabase
        .from("profissionais_publico_cards_v3")
        .select("*")
        .not("usuario_id", "is", null); // garante só perfis com usuário real

      if (errorView) {
        console.error("Erro ao buscar cards (view):", errorView);
        setCardsBase([]);
      }

      const rows = dataView || [];

      // remover duplicados por USUARIO_ID (mais confiável na view)
      const dedupMapView = new Map<string, any>();
      rows.forEach((r: any) => {
        const key = r.usuario_id;
        if (!key) return;
        if (!dedupMapView.has(key)) dedupMapView.set(key, r);
      });

      const cleaned = Array.from(dedupMapView.values());

      // ===== Dados extras do perfil público (área, avatar, banner, cidade) =====
      const usuarioIds = cleaned
        .map((r: any) => r.usuario_id)
        .filter((id: any) => !!id);

      type PerfilPublico = {
        usuario_id: string;
        area_principal?: string | null;
        avatar_url?: string | null;
        banner_url?: string | null;
        cidade_base?: string | null;
      };

      const perfilMap = new Map<string, PerfilPublico>();

      if (usuarioIds.length > 0) {
        const { data: perfis, error: perfisErr } = await supabase
          .from("profissionais_perfil_publico_v2")
          .select(
            "usuario_id, area_principal, avatar_url, banner_url, cidade_base"
          )
          .in("usuario_id", usuarioIds as string[]);

        if (perfisErr) {
          console.error("Erro ao buscar perfis públicos:", perfisErr);
        }

        (perfis || []).forEach((p: any) => {
          if (p.usuario_id) {
            perfilMap.set(p.usuario_id, p as PerfilPublico);
          }
        });
      }

      // Monta lista base sem avaliação ainda + filtro de perfis "rascunho"
      const baseListSemAval: Card[] = cleaned
        .map((r: any) => {
          const perfilPublico = perfilMap.get(r.usuario_id) || {};
          const areaPrincipal = perfilPublico.area_principal || null;

          const rawFuncao: string | null = r.funcao || null;
          const rawFuncaoLower = (rawFuncao || "").toLowerCase();

          let nivelFinal: string;
          if (r.nivel) {
            nivelFinal = r.nivel;
          } else if (careerLevels.includes(rawFuncaoLower)) {
            nivelFinal = toTitleCase(rawFuncaoLower);
          } else {
            nivelFinal = "Aprendiz";
          }

          const funcaoNaVerdadeNivel = careerLevels.includes(rawFuncaoLower);

          const funcaoTopo =
            areaPrincipal ||
            (!funcaoNaVerdadeNivel && rawFuncao
              ? rawFuncao
              : "Profissional da construção");

          const cidadeFinal =
            r.cidade || perfilPublico.cidade_base || "Não informado";

          const fotoFinal = r.foto_url || perfilPublico.avatar_url || null;

          const capaFinal =
            r.capa_url || perfilPublico.banner_url || bannerFallback;

          // ===== FIX: disponibilidade não pode virar "Disponível" por fallback =====
          const disponibilidadeRaw = (r.disponibilidade ?? "")
            .toString()
            .trim();

          const disponibilidadeFinal = r.em_obra
            ? "Em obra"
            : disponibilidadeRaw.length
            ? disponibilidadeRaw
            : "Indisponível";

          const experienciaFinal =
            typeof r.experiencia === "number" ? r.experiencia : 0;
          const obrasFinal = typeof r.obras === "number" ? r.obras : 0;

          const descricaoGerada = buildDescricaoFromDados({
            descricaoCurta: r.descricao_curta,
            funcao: funcaoTopo,
            cidade: cidadeFinal,
            experiencia: experienciaFinal,
            obras: obrasFinal,
            disponibilidade: disponibilidadeFinal,
          });

          return {
            profissional_id: r.profissional_id,
            usuario_id: r.usuario_id,
            nome: r.nome || "Profissional Acrobatas",
            funcao: funcaoTopo,
            cidade: cidadeFinal,
            nivel: nivelFinal,
            avaliacao: 0.0,
            obras: obrasFinal,
            experiencia: experienciaFinal,
            disponibilidade: disponibilidadeFinal,
            foto_url: fotoFinal,
            capa_url: capaFinal,
            descricao: descricaoGerada,
            totalAvaliacoes: 0,
          } as Card;
        })
        .filter((c) => {
          // Esconder perfis MUITO vazios (rascunho)
          const nome = c.nome.trim().toLowerCase();
          const cidade = c.cidade.trim().toLowerCase();
          const semNomeReal =
            nome === "" ||
            nome === "profissional acrobatas" ||
            nome === "profissional";
          const cidadeDefault = cidade === "" || cidade === "não informado";
          const semFoto = !c.foto_url;
          const semObras = !c.obras;
          const semExp = !c.experiencia;

          // só esconde se estiver quase tudo default
          return !(semNomeReal && cidadeDefault && semFoto && semObras && semExp);
        });

      // ===== AVALIAÇÕES (MÉDIA) POR PROFISSIONAL =====
      const profissionalIds = Array.from(
        new Set(
          baseListSemAval
            .map((c) => c.profissional_id)
            .filter((id) => !!id) as string[]
        )
      );

      let baseListComAval = baseListSemAval;

      if (profissionalIds.length) {
        const { data: medias, error: avalErr } = await supabase
          .from("profissional_avaliacao_resumo_v1")
          .select("profissional_id, avaliacao_media, total_avaliacoes")
          .in("profissional_id", profissionalIds);

        if (avalErr) {
          console.error("Erro ao buscar médias de avaliação:", avalErr);
        } else {
          const mapAval = new Map<string, { media: number; total: number }>();

          (medias || []).forEach((row: any) => {
            if (!row.profissional_id) return;
            mapAval.set(row.profissional_id, {
              media: Number(row.avaliacao_media ?? 0),
              total: Number(row.total_avaliacoes ?? 0),
            });
          });

          baseListComAval = baseListSemAval.map((c) => {
            const info = mapAval.get(c.profissional_id);
            if (!info) return c;
            return {
              ...c,
              avaliacao: info.media,
              totalAvaliacoes: info.total,
            };
          });
        }
      }

      // dedupe final por usuario_id/profissional_id
      const baseListFinal = dedupeCards(baseListComAval);

      setCardsBase(baseListFinal);

      /* ---------- 2) MINHA EMPRESA / MINHA EQUIPA ---------- */
      try {
        const { data: empIdRaw, error: empErr } = await supabase.rpc(
          "minha_empresa_id"
        );

        if (empErr) {
          console.error("Erro ao obter minha_empresa_id:", empErr);
          setCardsEmpresa([]);
          return;
        }

        const empresaId = empIdRaw as string | null;

        if (!empresaId) {
          setCardsEmpresa([]);
          return;
        }

        const { data: vinc, error: vincErr } = await supabase
          .from("profissionais_obras")
          .select("profissional_id, empresa_id, obra_id")
          .eq("empresa_id", empresaId);

        if (vincErr) {
          console.error(
            "Erro ao buscar profissionais_obras para Minha Equipa:",
            vincErr
          );
          setCardsEmpresa([]);
          return;
        }

        const profissionalIdsSet = new Set<string>(
          (vinc || [])
            .map((v: any) => v.profissional_id as string)
            .filter(Boolean)
        );

        const empresaCards = baseListFinal.filter((c) =>
          profissionalIdsSet.has(c.profissional_id)
        );

        setCardsEmpresa(empresaCards);
      } catch (e) {
        console.error("Erro geral ao carregar Minha Equipa:", e);
        setCardsEmpresa([]);
      }
    })();
  }, []);

  /* ============================
      Opções de filtros (áreas / níveis / cidades)
  ============================ */
  const { opcoesFuncoes, opcoesCidades, opcoesNiveis } = useMemo(() => {
    const fonteBruta = modoEmpresa ? cardsEmpresa : cardsBase;
    const fonte = dedupeCards(fonteBruta);

    const funcoesMap = new Map<string, string>(); // key: normalizado, value: label
    const cidadesMap = new Map<string, string>();
    const niveisMap = new Map<string, string>();

    const canonicalNivel = (str: string) => {
      const n = normalize(str);
      if (n === "aprendiz") return "Aprendiz";
      if (n === "auxiliar") return "Auxiliar";
      if (n === "profissional") return "Profissional";
      if (n === "oficial") return "Oficial";
      if (n === "encarregado") return "Encarregado";
      if (n === "mestre") return "Mestre";
      return toTitleCase(str.trim());
    };

    fonte.forEach((p) => {
      if (p.funcao) {
        const key = normalize(p.funcao);
        if (!funcoesMap.has(key)) {
          funcoesMap.set(key, toTitleCase(p.funcao.trim()));
        }
      }

      if (p.cidade) {
        const key = normalize(p.cidade);
        if (!cidadesMap.has(key)) {
          cidadesMap.set(key, toTitleCase(p.cidade.trim()));
        }
      }

      if (p.nivel) {
        const key = normalize(p.nivel);
        if (!niveisMap.has(key)) {
          niveisMap.set(key, canonicalNivel(p.nivel));
        }
      }
    });

    const funcoes = Array.from(funcoesMap.values()).sort((a, b) =>
      a.localeCompare(b, "pt-PT")
    );

    const cidades = Array.from(cidadesMap.values()).sort((a, b) =>
      a.localeCompare(b, "pt-PT")
    );

    const niveis = Array.from(niveisMap.values()).sort((a, b) => {
      const ia = careerLevels.indexOf(normalize(a));
      const ib = careerLevels.indexOf(normalize(b));
      if (ia === -1 && ib === -1) return a.localeCompare(b, "pt-PT");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return {
      opcoesFuncoes: funcoes,
      opcoesCidades: cidades,
      opcoesNiveis: niveis,
    };
  }, [cardsBase, cardsEmpresa, modoEmpresa]);

  /* ============================
      Filtros + ordenação
  ============================ */
  const filtrados = useMemo(() => {
    const q = busca.trim();
    const qNorm = normalize(q);
    const fonteBruta = modoEmpresa ? cardsEmpresa : cardsBase;
    const fonte = dedupeCards(fonteBruta);

    const result = fonte.filter((p) => {
      const nomeNorm = normalize(p.nome);
      const funcaoNorm = normalize(p.funcao);
      const cidadeNorm = normalize(p.cidade);
      const nivelNorm = normalize(p.nivel);
      const dispNorm = normalize(String(p.disponibilidade));

      const combinaBusca =
        q === "" || nomeNorm.includes(qNorm) || funcaoNorm.includes(qNorm);

      const combinaCidade =
        filtroCidade === "todas" || cidadeNorm === normalize(filtroCidade);

      const combinaFuncao =
        filtroFuncao === "todas" || funcaoNorm === normalize(filtroFuncao);

      const combinaNivel =
        filtroNivel === "todos" || nivelNorm === normalize(filtroNivel);

      const combinaDisponibilidade =
        !apenasDisponiveis || dispNorm === "disponivel";

      return (
        combinaBusca &&
        combinaCidade &&
        combinaFuncao &&
        combinaNivel &&
        combinaDisponibilidade
      );
    });

    // Ordenar priorizando Disponíveis, depois melhor avaliados, depois mais experientes
    const sorted = result.slice().sort((a, b) => {
      const dispA = normalize(String(a.disponibilidade)) === "disponivel";
      const dispB = normalize(String(b.disponibilidade)) === "disponivel";

      if (dispA !== dispB) return dispA ? -1 : 1;

      const diffAval = (b.avaliacao || 0) - (a.avaliacao || 0);
      if (diffAval !== 0) return diffAval;

      const diffExp = (b.experiencia || 0) - (a.experiencia || 0);
      if (diffExp !== 0) return diffExp;

      return a.nome.localeCompare(b.nome, "pt-PT");
    });

    return sorted;
  }, [
    cardsBase,
    cardsEmpresa,
    busca,
    filtroCidade,
    filtroFuncao,
    filtroNivel,
    apenasDisponiveis,
    modoEmpresa,
  ]);

  /* ============================
      Contagens (KPI de topo)
  ============================ */
  const fonteAtual = modoEmpresa
    ? dedupeCards(cardsEmpresa)
    : dedupeCards(cardsBase);

  const totalBase = fonteAtual.length;
  const totalFiltrados = filtrados.length;
  const totalDisponiveis = fonteAtual.filter(
    (p) => normalize(String(p.disponibilidade)) === "disponivel"
  ).length;

  /* ============================
      Render
  ============================ */
  const modoEmpresaEmpty = modoEmpresa && filtrados.length === 0;
  const baseEmpty = !modoEmpresa && filtrados.length === 0;

  return (
    <div className="p-6 md:p-10">
      {fromObra && (
        <div className="mb-4">
          <button
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para a obra
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {modoEmpresa ? "Profissionais da Minha Empresa" : "Base Acrobatas"}
          </h1>
          <p className="text-slate-500 text-sm">
            {modoEmpresa
              ? "Profissionais já vinculados à sua empresa."
              : "Explore profissionais verificados e encontre a equipa ideal para sua obra."}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="mt-1 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-sm">
            <input
              type="text"
              placeholder="Pesquisar por nome ou função..."
              className="bg-transparent outline-none text-sm w-64 text-slate-700 dark:text-slate-100"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {totalFiltrados}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {totalBase}
            </span>{" "}
            profissionais •{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {totalDisponiveis}
            </span>{" "}
            disponíveis na base
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <button
          onClick={() => setModoEmpresa(false)}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            !modoEmpresa
              ? "bg-blue-600 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Globe2 className="w-4 h-4" />
          Base Acrobatas
        </button>

        <button
          onClick={() => setModoEmpresa(true)}
          className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            modoEmpresa
              ? "bg-blue-600 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
          }`}
        >
          <UsersRound className="w-4 h-4" />
          Minha Equipa
        </button>

        {/* Filtros avançados */}
        <div className="flex flex-wrap gap-2 ml-0 md:ml-4">
          <select
            className="text-xs md:text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 min-w-[150px]"
            value={filtroFuncao}
            onChange={(e) => setFiltroFuncao(e.target.value)}
          >
            <option value="todas">Todas as áreas</option>
            {opcoesFuncoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            className="text-xs md:text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 min-w-[130px]"
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
          >
            <option value="todos">Todos os níveis</option>
            {opcoesNiveis.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <select
            className="text-xs md:text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100 min-w-[130px]"
            value={filtroCidade}
            onChange={(e) => setFiltroCidade(e.target.value)}
          >
            <option value="todas">Todas as cidades</option>
            {opcoesCidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 text-xs md:text-sm px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
              checked={apenasDisponiveis}
              onChange={(e) => setApenasDisponiveis(e.target.checked)}
            />
            Apenas disponíveis
          </label>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center text-slate-400">
          <UsersRound className="w-10 h-10 mb-3" />
          {modoEmpresaEmpty && (
            <>
              <p className="text-sm font-medium text-slate-600">
                Ainda não há profissionais na sua equipa.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Utilize a Base Acrobatas para encontrar profissionais e
                adicioná-los às suas obras. Assim que forem vinculados, eles
                aparecerão aqui (desde que tenham perfil ativo na Base).
              </p>
              <button
                onClick={() => setModoEmpresa(false)}
                className="mt-4 px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                Ver Base Acrobatas
              </button>
            </>
          )}

          {baseEmpty && (
            <>
              <p className="text-sm font-medium text-slate-600">
                Nenhum profissional encontrado.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Ajuste os filtros ou pesquise por outro nome/função para ver
                mais resultados.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtrados.map((p) => (
            <motion.div
              key={p.profissional_id}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 150 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg overflow-hidden flex flex-col transition-all"
            >
              <div
                className="h-24 bg-cover bg-center relative"
                style={{
                  backgroundImage: `url(${p.capa_url || bannerFallback})`,
                }}
              >
                <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
                <div className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2">
                  {p.foto_url ? (
                    <img
                      src={p.foto_url}
                      alt={p.nome}
                      className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-slate-600 flex items-center justify-center text-white text-lg font-semibold">
                      {getInitials(p.nome)}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-10 pb-5 px-4 text-center">
                {/* PROFISSÃO / ÁREA PRINCIPAL */}
                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm mb-1">
                  {iconeFuncao(p.funcao)}
                  <span>{p.funcao}</span>
                </div>

                <h2
                  className="text-lg font-bold text-slate-800 dark:text-white truncate"
                  title={p.nome}
                >
                  {limitNameWords(p.nome, 3)}
                </h2>

                <p
                  className="text-slate-400 text-xs italic mb-1"
                  style={clamp2}
                  title={p.descricao}
                >
                  {p.descricao}
                </p>

                <div className="flex items-center justify-center gap-1 mt-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {p.avaliacao.toFixed(1)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1 mt-1 text-slate-500 dark:text-slate-400 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{p.cidade}</span>
                </div>

                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium ${
                      normalize(String(p.disponibilidade)) === "disponivel"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {p.disponibilidade}
                  </span>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${badgeCor(
                      p.nivel
                    )} flex items-center gap-1`}
                  >
                    {p.nivel === "Mestre" && <Flame className="w-3 h-3" />}
                    {p.nivel === "Encarregado" && (
                      <Building2 className="w-3 h-3" />
                    )}
                    {p.nivel === "Oficial" && <Award className="w-3 h-3" />}
                    {p.nivel === "Profissional" && (
                      <Hammer className="w-3 h-3" />
                    )}
                    {p.nivel === "Auxiliar" && (
                      <UsersRound className="w-3 h-3" />
                    )}
                    {p.nivel === "Aprendiz" && <HardHat className="w-3 h-3" />}
                    {p.nivel}
                  </span>
                </div>

                <div className="flex justify-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" /> {p.obras} obras
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" /> {p.experiencia} anos
                  </div>
                </div>

                <button
                  onClick={() =>
                    navigate(`/empresa/profissional/${p.usuario_id}`)
                  }
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-blue-700 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Ver Perfil
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
