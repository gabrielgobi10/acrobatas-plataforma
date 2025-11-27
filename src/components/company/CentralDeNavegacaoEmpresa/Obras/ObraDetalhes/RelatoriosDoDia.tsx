import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Cloud,
  CloudSun,
  CloudRain,
  Wind,
  Plus,
  Loader2,
  Upload,
  X,
  Search,
  User,
  BarChart3,
  Clock4,
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Toaster, toast } from "sonner";

/* ============================
   Tipos
============================ */
type Lider = { id: string; nome: string; funcao?: string | null };
type Presente = { id: string; nome: string };
type FotoJson = { url: string; nome: string };

type Relatorio = {
  id: string;
  obra_id: string;
  data: string | null;
  data_relatorio?: string | null;
  responsavel_id: string | null;
  condicoes_climaticas: string | null;
  nivel_avanco: "nenhum" | "leve" | "moderado" | "alto" | "muito_alto" | null;
  progresso_diario: number | null;
  progresso_total: number | null;
  horas_trabalhadas_total: number | null;
  atividades_realizadas: string | null;
  observacoes: string | null;
  incidentes: string | null;
  fotos: FotoJson[] | null;
  criado_em?: string | null;
  responsavel?: { nome?: string | null };
};

const NIVEL_MAP = {
  nenhum: { label: "Nenhum", base: 0, emoji: "🔴" },
  leve: { label: "Leve", base: 1.5, emoji: "🟠" },
  moderado: { label: "Moderado", base: 3, emoji: "🟡" },
  alto: { label: "Alto", base: 5, emoji: "🟢" },
  muito_alto: { label: "Muito alto", base: 8, emoji: "🔵" },
} as const;

const HORAS_PRESETS = [7, 8, 9, 10] as const;
const HORAS_BASE = 8;
const HORAS_FACTOR_MIN = 0.5;
const HORAS_FACTOR_MAX = 1.5;
const MAX_DAILY_INCREMENT = 10;
const BUCKET_NAME = "relatorios_fotos";
const HOJE = new Date().toISOString().split("T")[0];

/* ============================
   Componente
============================ */
export default function RelatoriosDoDia({ obraId }: { obraId: string }) {
  // Tema atual (para ajustar classes dinâmicas)
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Estado base
  const [carregando, setCarregando] = useState(true);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [presentes, setPresentes] = useState<Presente[]>([]);
  const [abrirModalNovo, setAbrirModalNovo] = useState(false);
  const [abrirModalDetalhe, setAbrirModalDetalhe] = useState<Relatorio | null>(null);

  // Filtros/Busca
  const [busca, setBusca] = useState("");
  const [filtroClima, setFiltroClima] = useState("Todos");
  const [filtroResp, setFiltroResp] = useState("Todos");
  const [ordemData, setOrdemData] = useState<"desc" | "asc">("desc");

  // Formulário
  const [form, setForm] = useState({
    data: HOJE,
    condicoes_climaticas: "",
    responsavel_id: "",
    nivel_avanco: "moderado" as keyof typeof NIVEL_MAP,
    horasPreset: 8 as number | "custom",
    horasCustom: "",
    atividades_realizadas: "",
    observacoes: "",
    incidentes: "",
    profissionais_presentes: [] as string[],
    fotosArquivos: [] as File[],
    fotosPreview: [] as { objectUrl: string; nome: string }[],
  });
  const [salvando, setSalvando] = useState(false);

  /* ============================
     Carga
  ============================ */
  useEffect(() => {
    (async () => {
      setCarregando(true);
      await Promise.all([carregarRelatorios(), carregarLideres(), carregarPresentes()]);
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obraId, ordemData]);

  async function carregarRelatorios() {
    const { data, error } = await supabase
      .from("relatorios_obras")
      .select("*, responsavel:responsavel_id(nome)")
      .eq("obra_id", obraId)
      .order("data", { ascending: ordemData === "asc" });
    if (error) console.error(error);
    const normalizados = (data || []).map((r: any) => ({
      ...r,
      data: r.data || r.data_relatorio || HOJE,
      condicoes_climaticas: r.condicoes_climaticas ?? r.clima ?? null,
      fotos: safeParseFotos(r.fotos),
    }));
    setRelatorios(normalizados as Relatorio[]);
  }

  async function carregarLideres() {
    let leaders: Lider[] = [];
    const { data: viaObra } = await supabase
      .from("profissionais_obras")
      .select("profissional_id, funcao, profissionais(nome)")
      .eq("obra_id", obraId);

    if (viaObra && viaObra.length) {
      leaders = viaObra
        .filter((r: any) =>
          ["chefe de equipa", "encarregado", "engenheiro", "mestre de obra"].includes(
            (r.funcao || "").toLowerCase()
          )
        )
        .map((r: any) => ({
          id: r.profissional_id,
          nome: r.profissionais?.nome || "Sem nome",
          funcao: r.funcao,
        }));
    }

    if (!leaders.length) {
      const { data: viaProf } = await supabase
        .from("profissionais")
        .select("id, nome, funcao");
      if (viaProf) {
        leaders = viaProf
          .filter((p: any) =>
            ["chefe de equipa", "encarregado", "engenheiro", "mestre de obra"].includes(
              (p.funcao || "").toLowerCase()
            )
          )
          .map((p: any) => ({ id: p.id, nome: p.nome, funcao: p.funcao }));
      }
    }
    setLideres(leaders);
  }

  async function carregarPresentes() {
    const { data, error } = await supabase
      .from("profissionais_obras")
      .select("profissional_id, profissionais(nome)")
      .eq("obra_id", obraId);
    if (error) console.error(error);
    const list =
      data?.map((d: any) => ({
        id: d.profissional_id,
        nome: d.profissionais?.nome || "Sem nome",
      })) || [];
    setPresentes(list);
  }

  /* ============================
     Utils
  ============================ */
  function horasNumber(): number {
    if (form.horasPreset === "custom") {
      const val = Number(form.horasCustom);
      return Number.isFinite(val) && val >= 0 ? val : HORAS_BASE;
    }
    return form.horasPreset;
  }

  function incrementoPrevisto(): number {
    const base = NIVEL_MAP[form.nivel_avanco].base;
    const fator = Math.max(
      HORAS_FACTOR_MIN,
      Math.min(HORAS_FACTOR_MAX, horasNumber() / HORAS_BASE)
    );
    return Math.min(MAX_DAILY_INCREMENT, Math.round(base * fator * 100) / 100);
  }

  function safeParseFotos(f: any): FotoJson[] | null {
    if (!f) return null;
    if (Array.isArray(f)) return f as FotoJson[];
    try {
      const parsed = JSON.parse(f);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function onSelectFotos(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const previews = arr.map((f) => ({
      objectUrl: URL.createObjectURL(f),
      nome: f.name,
    }));
    setForm((old) => ({
      ...old,
      fotosArquivos: [...old.fotosArquivos, ...arr],
      fotosPreview: [...old.fotosPreview, ...previews],
    }));
  }

  function removerFotoTemp(idx: number) {
    setForm((old) => {
      const previews = [...old.fotosPreview];
      URL.revokeObjectURL(previews[idx].objectUrl);
      previews.splice(idx, 1);
      const arquivos = [...old.fotosArquivos];
      arquivos.splice(idx, 1);
      return { ...old, fotosArquivos: arquivos, fotosPreview: previews };
    });
  }

  /* ============================
     Salvar
  ============================ */
  async function salvarRelatorio() {
    try {
      setSalvando(true);

      const { data: ob, error: errObra } = await supabase
        .from("obras")
        .select("progresso, empresa_id")
        .eq("id", obraId)
        .single();
      if (errObra) throw errObra;

      const progressoAtual = Number(ob?.progresso || 0);
      const empresaId = ob?.empresa_id;
      if (!empresaId) throw new Error("empresa_id ausente na obra.");

      const incremento = incrementoPrevisto();
      const novoTotal = Math.min(100, Math.round((progressoAtual + incremento) * 100) / 100);

      const payload = {
        obra_id: obraId,
        empresa_id: empresaId,
        data: HOJE,
        data_relatorio: HOJE,
        condicoes_climaticas: form.condicoes_climaticas || null,
        clima: form.condicoes_climaticas || null,
        responsavel_id: form.responsavel_id || null,
        nivel_avanco: form.nivel_avanco,
        progresso_diario: incremento,
        progresso_total: novoTotal,
        horas_trabalhadas_total: horasNumber(),
        atividades_realizadas: form.atividades_realizadas || null,
        observacoes: form.observacoes?.trim() || null,
        incidentes: form.incidentes?.trim() || null,
        equipa: JSON.stringify(form.profissionais_presentes || []),
        atividades: JSON.stringify([]),
        custos: JSON.stringify([]),
        ocorrencias: JSON.stringify([]),
        fotos: null as any,
      };

      const { data: inserted, error: errInsert } = await supabase
        .from("relatorios_obras")
        .insert([payload])
        .select("id")
        .single();
      if (errInsert) throw errInsert;

      const relatorioId = inserted?.id as string;

      // Upload de fotos (opcional)
      if (form.fotosArquivos.length) {
        const urls: FotoJson[] = [];
        for (const file of form.fotosArquivos) {
          const path = `relatorios/${obraId}/${relatorioId}/${Date.now()}_${file.name}`;
          const up = await supabase.storage.from(BUCKET_NAME).upload(path, file);
          if (!up.error) {
            const pub = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
            if (pub.data?.publicUrl) {
              urls.push({ url: pub.data.publicUrl, nome: file.name });
            }
          }
        }
        await supabase.from("relatorios_obras").update({ fotos: urls }).eq("id", relatorioId);
      }

      await supabase.from("obras").update({ progresso: novoTotal }).eq("id", obraId);

      limparForm();
      setAbrirModalNovo(false);
      await carregarRelatorios();
      toast.success(`Relatório criado com sucesso! (+${incremento}% hoje • Total ${novoTotal}%)`);
    } catch (e: any) {
      console.error("❌ Erro ao salvar:", e);
      toast.error(`Erro ao salvar relatório: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  function limparForm() {
    form.fotosPreview.forEach((p) => URL.revokeObjectURL(p.objectUrl));
    setForm({
      data: HOJE,
      condicoes_climaticas: "",
      responsavel_id: "",
      nivel_avanco: "moderado",
      horasPreset: 8,
      horasCustom: "",
      atividades_realizadas: "",
      observacoes: "",
      incidentes: "",
      profissionais_presentes: [],
      fotosArquivos: [],
      fotosPreview: [],
    });
  }

  /* ============================
     Lista filtrada
  ============================ */
  const listaFiltrada = useMemo(() => {
    let lista = relatorios.filter((r) => {
      const buscaOk =
        !busca ||
        (r.atividades_realizadas || "").toLowerCase().includes(busca.toLowerCase()) ||
        (r.observacoes || "").toLowerCase().includes(busca.toLowerCase());
      const climaOk =
        filtroClima === "Todos" ||
        (r.condicoes_climaticas || "") === filtroClima;
      const respOk =
        filtroResp === "Todos" ||
        (r.responsavel?.nome || "").toLowerCase() === filtroResp.toLowerCase();
      return buscaOk && climaOk && respOk;
    });

    lista.sort((a, b) => {
      const ad = a.data ? new Date(a.data).getTime() : 0;
      const bd = b.data ? new Date(b.data).getTime() : 0;
      return ordemData === "desc" ? bd - ad : ad - bd;
    });

    return lista;
  }, [relatorios, busca, filtroClima, filtroResp, ordemData]);

  /* ============================
     UI helpers
  ============================ */
  const cardBase = isDark
    ? "bg-[#10161f] border-[#203044]"
    : "bg-white border-gray-200";

  const inputBase =
    "w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/30";
  const lightInput =
    "bg-white text-gray-900 border-gray-300 placeholder:text-gray-400";
  const darkInput =
    "bg-[#0f141b] text-gray-100 border-[#1f2a37] placeholder:text-gray-400";

  const textareaBase = `${inputBase} min-h-[120px]`;
  const selectBase = `${inputBase}`;

  function IconeClima(tipo?: string | null) {
    switch (tipo) {
      case "Sol":
        return <CloudSun className="text-yellow-400" />;
      case "Chuva":
        return <CloudRain className="text-blue-400" />;
      case "Nublado":
        return <Cloud className="text-gray-400" />;
      case "Vento":
        return <Wind className="text-cyan-400" />;
      default:
        return <Cloud className="text-gray-500" />;
    }
  }

  /* ============================
     Render
  ============================ */
  return (
    <div className="w-full p-6 mobile-wrap">
      <Toaster position="top-right" richColors />

      {/* Utilitários responsivos para mobile */}
      <style>{`
@media (max-width: 640px) {
  .mobile-wrap { padding: 12px !important; }
  .mobile-card { padding: 14px !important; border-radius: 14px !important; }
  .mobile-grid { display: grid; grid-template-columns: 1fr !important; gap: 12px !important; }
  .mobile-input { padding: 10px 12px !important; font-size: 16px !important; }
  .mobile-btn { padding: 12px !important; font-size: 16px !important; }

  .modal-mobile{
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    border-top-left-radius: 18px !important;
    border-top-right-radius: 18px !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    overflow: hidden;
    box-shadow: 0 -8px 30px rgba(0,0,0,.35);
  }
  .modal-header{
    position: sticky; top: 0; z-index: 2;
    padding: 14px 16px;
    backdrop-filter: saturate(180%) blur(6px);
  }
  .modal-footer{
    position: sticky; bottom: 0; z-index: 2;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;
    backdrop-filter: saturate(180%) blur(6px);
  }
}
      `}</style>

      {/* Header da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-blue-600 w-5 h-5" />
          <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Relatórios do dia
          </h2>
        </div>
        <button
          onClick={() => setAbrirModalNovo(true)}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex justify-center items-center gap-2 text-sm font-medium transition mobile-btn"
        >
          <Plus size={16} />
          Novo relatório
        </button>
      </div>

      {/* Filtros */}
      <div className={`border rounded-xl p-4 mobile-card ${cardBase}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mobile-grid">
          <div className="flex items-center gap-2">
            <Search size={16} className="opacity-60 shrink-0" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`flex-1 ${inputBase} ${isDark ? darkInput : lightInput} mobile-input`}
              placeholder="Buscar atividades ou observações…"
            />
          </div>

          <select
            value={filtroClima}
            onChange={(e) => setFiltroClima(e.target.value)}
            className={`${selectBase} ${isDark ? darkInput : lightInput} mobile-input`}
          >
            <option>Todos</option>
            <option>Sol</option>
            <option>Nublado</option>
            <option>Chuva</option>
            <option>Vento</option>
          </select>

          <select
            value={filtroResp}
            onChange={(e) => setFiltroResp(e.target.value)}
            className={`${selectBase} ${isDark ? darkInput : lightInput} mobile-input`}
          >
            <option>Todos</option>
            {Array.from(
              new Set(relatorios.map((r) => r.responsavel?.nome).filter(Boolean) as string[])
            ).map((nome) => (
              <option key={nome}>{nome}</option>
            ))}
          </select>

          <select
            value={ordemData}
            onChange={(e) => setOrdemData(e.target.value as "asc" | "desc")}
            className={`${selectBase} ${isDark ? darkInput : lightInput} mobile-input`}
          >
            <option value="desc">Mais recentes primeiro</option>
            <option value="asc">Mais antigos primeiro</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className={`border rounded-xl p-6 text-center text-gray-500 mobile-card ${cardBase}`}>
          Nenhum relatório registrado.
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {listaFiltrada.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`border rounded-xl p-5 flex flex-col mobile-card md:flex-row md:items-center md:justify-between ${cardBase} ${isDark ? "text-gray-200" : "text-gray-900"}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-blue-500 font-medium">
                    <CalendarDays size={16} />
                    {r.data ? new Date(r.data).toLocaleDateString("pt-PT") : "—"}
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                    {IconeClima(r.condicoes_climaticas)}
                    <span className="flex items-center gap-1">
                      <BarChart3 size={14} />
                      +{r.progresso_diario || 0}% (total {r.progresso_total ?? 0}%)
                    </span>
                    {r.horas_trabalhadas_total != null && (
                      <span className="flex items-center gap-1">
                        <Clock4 size={14} /> {r.horas_trabalhadas_total}h
                      </span>
                    )}
                  </div>
                  {r.atividades_realizadas && (
                    <p className="mt-2 text-sm/6 max-w-3xl opacity-90">
                      {r.atividades_realizadas}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                  <span className="text-sm flex items-center gap-2 opacity-90">
                    <User size={14} />
                    {r.responsavel?.nome || "Sem responsável"}
                  </span>
                  <button
                    className="text-blue-500 text-sm hover:underline"
                    onClick={() => setAbrirModalDetalhe(r)}
                  >
                    Ver detalhes
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* MODAL: Novo relatório */}
      <AnimatePresence>
        {abrirModalNovo && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex sm:items-center items-end justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { limparForm(); setAbrirModalNovo(false); }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className={`modal-mobile sm:rounded-2xl sm:w-[720px] sm:max-h-[88vh] w-full border ${cardBase} overflow-hidden`}
            >
              {/* Header */}
              <div className={`modal-header ${cardBase} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <div className="leading-tight">
                    <h3 className="text-[15px] font-semibold">
                      Novo relatório do dia
                    </h3>
                    <p className="text-xs opacity-70">
                      Preencha as informações da jornada de trabalho.
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Fechar"
                  onClick={() => { limparForm(); setAbrirModalNovo(false); }}
                  className="p-2 rounded-md hover:bg-black/10"
                >
                  <X />
                </button>
              </div>

              {/* Body */}
              <div className="modal-body sm:max-h-[calc(88vh-112px)] overflow-auto px-4 sm:px-6 pb-4">
                {/* Dados gerais */}
                <section className="space-y-3 pb-4">
                  <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80">
                    Dados gerais
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-xs opacity-70">Data</label>
                      <input
                        type="date"
                        value={form.data}
                        min={HOJE}
                        max={HOJE}
                        disabled
                        className={`${inputBase} ${isDark ? darkInput : lightInput} mobile-input`}
                      />
                    </div>
                    <div>
                      <label className="text-xs opacity-70">Clima</label>
                      <select
                        value={form.condicoes_climaticas}
                        onChange={(e) => setForm({ ...form, condicoes_climaticas: e.target.value })}
                        className={`${selectBase} ${isDark ? darkInput : lightInput} mobile-input`}
                      >
                        <option value="">Selecione</option>
                        <option>Sol</option>
                        <option>Nublado</option>
                        <option>Chuva</option>
                        <option>Vento</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs opacity-70">Responsável</label>
                      <select
                        value={form.responsavel_id}
                        onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                        className={`${selectBase} ${isDark ? darkInput : lightInput} mobile-input`}
                      >
                        <option value="">Selecione</option>
                        {lideres.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nome} {l.funcao ? `— ${l.funcao}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <hr className={`${isDark ? "border-white/10" : "border-gray-200"} my-3`} />

                {/* Produção + Atividades */}
                <section className="grid gap-6 md:grid-cols-2 pb-2">
                  {/* Coluna esquerda */}
                  <div className="space-y-4">
                    <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80">
                      Produção do dia
                    </h4>

                    {/* Nível */}
                    <div>
                      <label className="text-xs opacity-70 block mb-1">Nível de avanço</label>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(NIVEL_MAP) as (keyof typeof NIVEL_MAP)[]).map((k) => {
                          const active = form.nivel_avanco === k;
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setForm({ ...form, nivel_avanco: k })}
                              className={`px-3 py-1.5 rounded-full border text-sm transition mobile-btn
                                ${active ? "bg-blue-600 text-white border-blue-600" : (isDark ? "border-[#1f2a37] text-gray-100" : "border-gray-300 text-gray-800")}
                              `}
                            >
                              {NIVEL_MAP[k].emoji} {NIVEL_MAP[k].label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Horas */}
                    <div>
                      <label className="text-xs opacity-70 block mb-1">
                        Horas trabalhadas (total da equipa)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {HORAS_PRESETS.map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setForm({ ...form, horasPreset: h, horasCustom: "" })}
                            className={`px-3 py-1.5 rounded-full border text-sm transition mobile-btn
                              ${form.horasPreset === h ? "bg-blue-600 text-white border-blue-600" : (isDark ? "border-[#1f2a37] text-gray-100" : "border-gray-300 text-gray-800")}
                            `}
                          >
                            {h}h
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, horasPreset: "custom" })}
                          className={`px-3 py-1.5 rounded-full border text-sm transition mobile-btn
                            ${form.horasPreset === "custom" ? "bg-blue-600 text-white border-blue-600" : (isDark ? "border-[#1f2a37] text-gray-100" : "border-gray-300 text-gray-800")}
                          `}
                        >
                          Personalizado
                        </button>
                        {form.horasPreset === "custom" && (
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            placeholder="Horas…"
                            value={form.horasCustom}
                            onChange={(e) => setForm({ ...form, horasCustom: e.target.value })}
                            className={`w-28 ${inputBase} ${isDark ? darkInput : lightInput} ml-1`}
                          />
                        )}
                      </div>
                      <div className="mt-2 text-xs opacity-70">
                        Incremento previsto hoje: <strong>+{incrementoPrevisto()}%</strong>
                      </div>
                    </div>

                    {/* Profissionais */}
                    <div>
                      <label className="text-xs opacity-70">Profissionais presentes</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {presentes.map((p) => {
                          const ativo = form.profissionais_presentes.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                const sel = form.profissionais_presentes;
                                const novo = ativo ? sel.filter((id) => id !== p.id) : [...sel, p.id];
                                setForm({ ...form, profissionais_presentes: novo });
                              }}
                              className={`px-3 py-1 rounded-full text-sm border transition mobile-btn
                                ${ativo ? "bg-blue-600 text-white border-blue-600" : (isDark ? "border-[#1f2a37] text-gray-100" : "border-gray-300 text-gray-800")}
                              `}
                            >
                              {p.nome}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Coluna direita: atividades */}
                  <div>
                    <label className="text-xs opacity-70">Atividades realizadas</label>
                    <textarea
                      value={form.atividades_realizadas}
                      onChange={(e) =>
                        setForm({ ...form, atividades_realizadas: e.target.value })
                      }
                      className={`${textareaBase} ${isDark ? darkInput : lightInput} mobile-input`}
                      rows={12}
                      placeholder="Ex.: Concretagem da laje do piso 2, assentamento de blocos…"
                    />
                  </div>
                </section>

                <hr className={`${isDark ? "border-white/10" : "border-gray-200"} my-3`} />

                {/* Observações & Incidentes */}
                <section className="grid gap-4 md:grid-cols-2 pb-2">
                  <div>
                    <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80 mb-2">
                      Observações
                    </h4>
                    <textarea
                      value={form.observacoes}
                      onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                      className={`${textareaBase} ${isDark ? darkInput : lightInput} mobile-input`}
                      rows={6}
                    />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80 mb-2">
                      Incidentes
                    </h4>
                    <textarea
                      value={form.incidentes}
                      onChange={(e) => setForm({ ...form, incidentes: e.target.value })}
                      className={`${textareaBase} ${isDark ? darkInput : lightInput} mobile-input`}
                      rows={6}
                      placeholder="Se houve acidente, atraso, falta de material, etc."
                    />
                  </div>
                </section>

                <hr className={`${isDark ? "border-white/10" : "border-gray-200"} my-3`} />

                {/* Fotos */}
                <section className="pb-1">
                  <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80 mb-2">
                    Registo fotográfico
                  </h4>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => onSelectFotos(e.target.files)}
                    className="mt-1 text-sm"
                  />
                  {form.fotosPreview.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {form.fotosPreview.map((f, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={f.objectUrl}
                            alt={f.nome}
                            className={`w-24 h-24 object-cover rounded-lg border ${isDark ? "border-[#1f2a37]" : "border-gray-300"}`}
                          />
                          <button
                            type="button"
                            onClick={() => removerFotoTemp(idx)}
                            className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full px-2 text-xs"
                            aria-label="Remover foto"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Footer */}
              <div className={`modal-footer ${cardBase} flex justify-end gap-3`}>
                <button
                  onClick={() => { limparForm(); setAbrirModalNovo(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border transition hover:bg-black/10
                             border-transparent bg-gray-600 hover:bg-gray-500 text-white"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarRelatorio}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2
                             bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={salvando}
                >
                  {salvando ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Salvar relatório
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Detalhes */}
      <AnimatePresence>
        {abrirModalDetalhe && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex sm:items-center items-end justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbrirModalDetalhe(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className={`modal-mobile sm:rounded-2xl sm:w-[680px] sm:max-h-[86vh] w-full border ${cardBase} overflow-hidden`}
            >
              <div className={`modal-header ${cardBase} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-blue-600" />
                  <h3 className="text-[15px] font-semibold">
                    {abrirModalDetalhe?.data
                      ? new Date(abrirModalDetalhe.data).toLocaleDateString("pt-PT")
                      : "Detalhes do relatório"}
                  </h3>
                </div>
                <button
                  aria-label="Fechar"
                  onClick={() => setAbrirModalDetalhe(null)}
                  className="p-2 rounded-md hover:bg-black/10"
                >
                  <X />
                </button>
              </div>

              <div className="modal-body sm:max-h-[calc(86vh-108px)] overflow-auto px-4 sm:px-6 pb-4">
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div className="opacity-70">Clima</div>
                  <div className="flex items-center gap-2">
                    {IconeClima(abrirModalDetalhe?.condicoes_climaticas)}
                    {abrirModalDetalhe?.condicoes_climaticas || "—"}
                  </div>

                  <div className="opacity-70">Responsável</div>
                  <div>{abrirModalDetalhe?.responsavel?.nome || "—"}</div>

                  <div className="opacity-70">Avanço</div>
                  <div>
                    +{abrirModalDetalhe?.progresso_diario || 0}% (total{" "}
                    {abrirModalDetalhe?.progresso_total ?? 0}%)
                  </div>

                  <div className="opacity-70">Horas trabalhadas</div>
                  <div>{abrirModalDetalhe?.horas_trabalhadas_total ?? 0}h</div>
                </div>

                <div className="mt-4">
                  <div className="opacity-70 mb-1 text-sm">Atividades</div>
                  <div className="text-sm whitespace-pre-line">
                    {abrirModalDetalhe?.atividades_realizadas || "—"}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="opacity-70 mb-1 text-sm">Observações</div>
                    <div className="text-sm whitespace-pre-line">
                      {abrirModalDetalhe?.observacoes || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-70 mb-1 text-sm">Incidentes</div>
                    <div className="text-sm whitespace-pre-line">
                      {abrirModalDetalhe?.incidentes || "—"}
                    </div>
                  </div>
                </div>

                {(abrirModalDetalhe?.fotos || []).length > 0 && (
                  <div className="mt-5">
                    <div className="text-sm font-medium opacity-80 mb-2">
                      Fotos do dia
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(abrirModalDetalhe?.fotos || []).map((f, idx) => (
                        <a
                          key={idx}
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                          title={f.nome}
                        >
                          <img
                            src={f.url}
                            alt={f.nome}
                            className={`w-24 h-24 rounded-lg object-cover border ${isDark ? "border-[#1f2a37]" : "border-gray-300"}`}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`modal-footer ${cardBase} flex justify-end`}>
                <button
                  onClick={() => setAbrirModalDetalhe(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mobile-btn text-sm font-medium"
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
