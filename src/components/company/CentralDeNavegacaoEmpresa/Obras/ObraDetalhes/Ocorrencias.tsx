// src/components/company/CentralDeNavegacaoEmpresa/Obras/ObraDetalhes/Ocorrencias.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock4,
  FileWarning,
  Filter,
  Plus,
  Search,
  X,
  CalendarDays,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Severidade = "Baixa" | "Média" | "Alta" | "Crítica";
type Status = "Aberta" | "Em análise" | "Resolvida" | "Cancelada";

type OcorrenciaRow = {
  id: string;
  obra_id: string;
  titulo: string;
  categoria: string;
  severidade: Severidade;
  status: Status;
  data_ocorrencia: string; // ISO
  prazo_resolucao?: string | null; // ISO
  zona?: string | null;
  descricao?: string | null;
  acao_imediata?: string | null;
  registado_por?: string | null;
  profissionais_env?: string | null;
  criado_em?: string | null;
};

type Filtros = {
  search: string;
  status: "Todos" | Status;
  severidade: "Todas" | Severidade;
  categoria: string;
};

type NovaOcorrenciaForm = {
  titulo: string;
  categoria: string;
  severidade: Severidade;
  data_ocorrencia: string; // dd/mm/aaaa
  prazo_resolucao: string; // dd/mm/aaaa
  zona: string;
  descricao: string;
  acao_imediata: string;
  registado_por: string;
  profissionais_env: string;
};

function hojePT() {
  const d = new Date();
  return d.toLocaleDateString("pt-PT");
}

function ptToIso(d: string | undefined) {
  if (!d) return null;
  const [dd, mm, yyyy] = d.split("/");
  if (!dd || !mm || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function isoToPt(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-PT");
}

export default function OcorrenciasObra({ obraId }: { obraId: string }) {
  // ✅ Bloqueio total (preview sem interação) — muda para false quando lançar
  const BLOQUEADO = true;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRow[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    search: "",
    status: "Todos",
    severidade: "Todas",
    categoria: "Todas",
  });

  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovaOcorrenciaForm>({
    titulo: "",
    categoria: "Outro",
    severidade: "Média",
    data_ocorrencia: hojePT(),
    prazo_resolucao: "",
    zona: "",
    descricao: "",
    acao_imediata: "",
    registado_por: "",
    profissionais_env: "",
  });

  /* =======================
     Carregar ocorrências
  ======================= */
  useEffect(() => {
    if (!obraId) return;
    carregarOcorrencias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId, mes, ano]);

  async function carregarOcorrencias() {
    setLoading(true);
    try {
      const inicioIso = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fimDate = new Date(ano, mes, 0); // último dia do mês
      const fimIso = `${fimDate.getFullYear()}-${String(
        fimDate.getMonth() + 1
      ).padStart(2, "0")}-${String(fimDate.getDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("obras_ocorrencias")
        .select("*")
        .eq("obra_id", obraId)
        .gte("data_ocorrencia", inicioIso)
        .lte("data_ocorrencia", fimIso)
        .order("data_ocorrencia", { ascending: false });

      if (error) throw error;
      setOcorrencias(data as OcorrenciaRow[]);
    } catch (e) {
      console.error("Erro ao carregar ocorrências:", e);
      setOcorrencias([]);
    } finally {
      setLoading(false);
    }
  }

  /* =======================
     Filtros
  ======================= */
  const ocorrenciasFiltradas = useMemo(() => {
    let arr = [...ocorrencias];

    if (filtros.search.trim()) {
      const q = filtros.search.toLowerCase();
      arr = arr.filter(
        (o) =>
          o.titulo.toLowerCase().includes(q) ||
          (o.categoria || "").toLowerCase().includes(q) ||
          (o.descricao || "").toLowerCase().includes(q)
      );
    }
    if (filtros.status !== "Todos") {
      arr = arr.filter((o) => o.status === filtros.status);
    }
    if (filtros.severidade !== "Todas") {
      arr = arr.filter((o) => o.severidade === filtros.severidade);
    }
    if (filtros.categoria !== "Todas") {
      arr = arr.filter((o) => o.categoria === filtros.categoria);
    }

    return arr;
  }, [ocorrencias, filtros]);

  const resumo = useMemo(() => {
    const abertas = ocorrencias.filter((o) => o.status !== "Resolvida");
    const criticas = ocorrencias.filter((o) => o.severidade === "Crítica");
    const resolvidas = ocorrencias.filter(
      (o) =>
        o.status === "Resolvida" &&
        new Date(o.data_ocorrencia).getMonth() + 1 === mes
    );
    const prazoVencido = ocorrencias.filter((o) => {
      if (!o.prazo_resolucao) return false;
      const prazo = new Date(o.prazo_resolucao);
      return prazo < new Date() && o.status !== "Resolvida";
    });

    return {
      abertas: abertas.length,
      criticas: criticas.length,
      resolvidas: resolvidas.length,
      prazoVencido: prazoVencido.length,
    };
  }, [ocorrencias, mes]);

  /* =======================
     Modal nova ocorrência
  ======================= */

  function abrirModalNova() {
    setForm({
      titulo: "",
      categoria: "Outro",
      severidade: "Média",
      data_ocorrencia: hojePT(),
      prazo_resolucao: "",
      zona: "",
      descricao: "",
      acao_imediata: "",
      registado_por: "",
      profissionais_env: "",
    });
    setModalAberto(true);
  }

  async function handleSalvarNova() {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      alert("Título e descrição são obrigatórios.");
      return;
    }

    setSalvando(true);
    try {
      const dataOcIso = ptToIso(form.data_ocorrencia);
      const prazoIso = ptToIso(form.prazo_resolucao || "");

      const payload = {
        obra_id: obraId,
        titulo: form.titulo.trim(),
        categoria: form.categoria.trim(),
        severidade: form.severidade,
        status: "Aberta" as Status, // sempre começa aberta
        data_ocorrencia: dataOcIso,
        prazo_resolucao: prazoIso,
        zona: form.zona.trim() || null,
        descricao: form.descricao.trim(),
        acao_imediata: form.acao_imediata.trim() || null,
        registado_por: form.registado_por.trim() || null,
        profissionais_env: form.profissionais_env.trim() || null,
      };

      const { error } = await supabase.from("obras_ocorrencias").insert(payload);
      if (error) throw error;

      setModalAberto(false);
      await carregarOcorrencias();
    } catch (e) {
      console.error("Erro ao registar ocorrência:", e);
      alert("Erro ao registar ocorrência. Tenta novamente.");
    } finally {
      setSalvando(false);
    }
  }

  /* =======================
     UI Helpers
  ======================= */

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const categoriasMock = [
    "Segurança",
    "Qualidade",
    "Produtividade",
    "Comportamento",
    "Outro",
  ];

  return (
    <div className="relative">
      {/* ✅ Conteúdo normal (fica com preview visual, mas sem interação quando bloqueado) */}
      <div
        className={
          BLOQUEADO
            ? "pointer-events-none select-none opacity-60 blur-[0.2px]"
            : ""
        }
      >
        <div className="space-y-6 sm:space-y-8">
          {/* Resumo + período */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Ocorrências da Obra
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
                Registo de situações fora do normal, incidentes e não conformidades
                relacionadas com esta obra.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#020617] px-3 py-1.5">
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">
                  Período de análise:
                </span>
                <select
                  className="bg-transparent outline-none text-zinc-900 dark:text-zinc-100"
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                >
                  {meses.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  className="bg-transparent outline-none text-zinc-900 dark:text-zinc-100"
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={carregarOcorrencias}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Atualizar
              </button>
            </div>
          </div>

          {/* Cards resumo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResumoCard
              icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
              titulo="Ocorrências abertas"
              label="Ainda sem resolução ou cancelamento."
              valor={resumo.abertas}
            />
            <ResumoCard
              icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
              titulo="Críticas"
              label="Severidade crítica registada."
              valor={resumo.criticas}
            />
            <ResumoCard
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              titulo="Resolvidas no período"
              label="Fechadas neste mês."
              valor={resumo.resolvidas}
            />
            <ResumoCard
              icon={<FileWarning className="w-5 h-5 text-red-500" />}
              titulo="Prazo vencido"
              label="Prazo de resolução ultrapassado."
              valor={resumo.prazoVencido}
            />
          </div>

          {/* Filtros lista */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#020617] px-3 py-3 sm:px-4 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={filtros.search}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, search: e.target.value }))
                }
                placeholder="Pesquisar por título, descrição ou categoria…"
                className="w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <Filter className="w-4 h-4" /> Filtros:
              </span>

              <select
                value={filtros.status}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, status: e.target.value as any }))
                }
                className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-1.5"
              >
                <option value="Todos">Todos status</option>
                <option value="Aberta">Abertas</option>
                <option value="Em análise">Em análise</option>
                <option value="Resolvida">Resolvidas</option>
                <option value="Cancelada">Canceladas</option>
              </select>

              <select
                value={filtros.severidade}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    severidade: e.target.value as any,
                  }))
                }
                className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-1.5"
              >
                <option value="Todas">Todas severidades</option>
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>

              <select
                value={filtros.categoria}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, categoria: e.target.value }))
                }
                className="rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-1.5"
              >
                <option value="Todas">Todas categorias</option>
                {categoriasMock.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={() =>
                  setFiltros({
                    search: "",
                    status: "Todos",
                    severidade: "Todas",
                    categoria: "Todas",
                  })
                }
                className="rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Lista + botão nova */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#020617] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Clock4 className="w-4 h-4 text-blue-500" />
                Ocorrências registadas
              </h3>

              <button
                onClick={abrirModalNova}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nova ocorrência
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                A carregar ocorrências…
              </div>
            ) : ocorrenciasFiltradas.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Ainda não há ocorrências registadas para este período.
              </div>
            ) : (
              <div className="space-y-3">
                {ocorrenciasFiltradas.map((o) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-3 sm:px-4 sm:py-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-50">
                          {o.titulo}
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {o.descricao}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusChip status={o.status} />
                        <SeveridadeChip severidade={o.severidade} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        {isoToPt(o.data_ocorrencia)}{" "}
                        {o.zona ? `• ${o.zona}` : null}
                      </span>
                      {o.categoria && (
                        <span className="rounded-full bg-zinc-200/70 dark:bg-zinc-700/70 px-2 py-[2px]">
                          {o.categoria}
                        </span>
                      )}
                      {o.prazo_resolucao && (
                        <span className="inline-flex items-center gap-1">
                          <Clock4 className="w-3 h-3" />
                          Prazo: {isoToPt(o.prazo_resolucao)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* MODAL NOVA OCORRÊNCIA */}
          <AnimatePresence>
            {modalAberto && (
              <NovaOcorrenciaModal
                form={form}
                setForm={setForm}
                onClose={() => (!salvando ? setModalAberto(false) : null)}
                onSave={handleSalvarNova}
                salvando={salvando}
                categorias={categoriasMock}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ✅ Overlay de bloqueio (mantém a página bonita e impede qualquer clique) */}
      {BLOQUEADO && (
        <div className="absolute inset-0 z-[60] flex items-start justify-center px-4 pt-4 sm:pt-6">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#020617]/85 backdrop-blur-md shadow-sm">
            <div className="p-4 sm:p-5 flex items-start gap-3">
              <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-2">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>

              <div className="flex-1">
                <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Em desenvolvimento
                </p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
                  Esta funcionalidade estará disponível em breve. Por enquanto,
                  esta página está em modo de pré-visualização.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-[#050816]/70 px-3 py-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                    Sem registo/edição nesta versão
                  </span>
                  <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-[#050816]/70 px-3 py-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                    Dados e filtros serão ativados no lançamento
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======================================
   SUBCOMPONENTES
====================================== */

function ResumoCard({
  icon,
  titulo,
  label,
  valor,
}: {
  icon: React.ReactNode;
  titulo: string;
  label: string;
  valor: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#020617] p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-2">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {titulo}
          </p>
          <p className="mt-0.5 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {valor}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    Aberta:
      "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
    "Em análise":
      "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30",
    Resolvida:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    Cancelada:
      "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-medium ${map[status]}`}
    >
      {status}
    </span>
  );
}

function SeveridadeChip({ severidade }: { severidade: Severidade }) {
  const map: Record<Severidade, string> = {
    Baixa:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    Média:
      "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30",
    Alta:
      "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
    Crítica:
      "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-medium ${map[severidade]}`}
    >
      {severidade}
    </span>
  );
}

/* ======================================
   MODAL — mobile + desktop
====================================== */

function NovaOcorrenciaModal({
  form,
  setForm,
  onClose,
  onSave,
  salvando,
  categorias,
}: {
  form: NovaOcorrenciaForm;
  setForm: React.Dispatch<React.SetStateAction<NovaOcorrenciaForm>>;
  onClose: () => void;
  onSave: () => void;
  salvando: boolean;
  categorias: string[];
}) {
  function handleChange(field: keyof NovaOcorrenciaForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex justify-center items-stretch md:items-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Mobile = full-screen; Desktop = modal centralizado com margem */}
      <motion.div
        className="relative w-full h-full md:h-auto md:max-h-[90vh] md:w-[760px] md:my-6 bg-white dark:bg-[#020617] md:rounded-2xl shadow-2xl flex flex-col"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 border-bottom border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Nova ocorrência
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Registe uma situação fora do normal relacionada a esta obra.
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Corpo scrollável */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 md:px-6 md:pb-6 space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label>Título da ocorrência</Label>
            <input
              value={form.titulo}
              onChange={(e) => handleChange("titulo", e.target.value)}
              placeholder="Ex.: Queda de material próximo à zona de circulação"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categoria / Severidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                value={form.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categorias.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Severidade</Label>
              <select
                value={form.severidade}
                onChange={(e) =>
                  handleChange("severidade", e.target.value as Severidade)
                }
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
                <option>Crítica</option>
              </select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data da ocorrência</Label>
              <input
                value={form.data_ocorrencia}
                onChange={(e) =>
                  handleChange("data_ocorrencia", e.target.value)
                }
                placeholder="dd/mm/aaaa"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label>Prazos para resolução (opcional)</Label>
              <input
                value={form.prazo_resolucao}
                onChange={(e) =>
                  handleChange("prazo_resolucao", e.target.value)
                }
                placeholder="dd/mm/aaaa"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Zona */}
          <div className="space-y-2">
            <Label>Zona / área da obra (opcional)</Label>
            <input
              value={form.zona}
              onChange={(e) => handleChange("zona", e.target.value)}
              placeholder="Ex.: Piso 2 – fachada norte"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição detalhada</Label>
            <textarea
              value={form.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              rows={4}
              placeholder="Descreva o que aconteceu, contexto, riscos, etc."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Ação imediata */}
          <div className="space-y-2">
            <Label>Ação imediata tomada (opcional)</Label>
            <textarea
              value={form.acao_imediata}
              onChange={(e) => handleChange("acao_imediata", e.target.value)}
              rows={3}
              placeholder="Ex.: Área isolada, equipa de segurança notificada, etc."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Registado por / Profissionais envolvidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Registado por (opcional)</Label>
              <input
                value={form.registado_por}
                onChange={(e) =>
                  handleChange("registado_por", e.target.value)
                }
                placeholder="Nome do responsável que registou"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label>Profissionais envolvidos (opcional)</Label>
              <input
                value={form.profissionais_env}
                onChange={(e) =>
                  handleChange("profissionais_env", e.target.value)
                }
                placeholder="Ex.: João Silva, Maria Costa"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#050816] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Depois podemos ligar isto diretamente aos profissionais ativos na obra.
              </p>
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 md:px-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={salvando}
            className="text-xs sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={salvando}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando && (
              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
            )}
            Registar ocorrência
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
      {children}
    </label>
  );
}
