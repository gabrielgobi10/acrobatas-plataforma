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
  Image as ImageIcon,
  User,
  Users,
  ChevronRight,
  ChevronLeft,
  MapPin,
  BarChart3,
  Clock4,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Toaster, toast } from "sonner";

// ============================
// Tipos
// ============================
type Lider = { id: string; nome: string; funcao?: string | null };
type Presente = { id: string; nome: string };
type FotoJson = { url: string; nome: string };

type Relatorio = {
  id: string;
  obra_id: string;
  data: string | null; // garantir robustez
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
const BUCKET_NAME = "relatorios_fotos"; // bucket recomendado

const HOJE = new Date().toISOString().split("T")[0];

// ============================
// Componente
// ============================
export default function RelatoriosDoDia({ obraId }: { obraId: string }) {
  // Tema
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

  // Filtros/Busca lista
  const [busca, setBusca] = useState("");
  const [filtroClima, setFiltroClima] = useState("Todos");
  const [filtroResp, setFiltroResp] = useState("Todos");
  const [ordemData, setOrdemData] = useState<"desc" | "asc">("desc");

  // Formulário de novo relatório
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

  // ============================
  // Cargas iniciais
  // ============================
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
    // garantir coerência data/data_relatorio
    const normalizados = (data || []).map((r: any) => ({
      ...r,
      data: r.data || r.data_relatorio || HOJE,
      condicoes_climaticas: r.condicoes_climaticas ?? r.clima ?? null,
      fotos: safeParseFotos(r.fotos),
    }));
    setRelatorios(normalizados as Relatorio[]);
  }

  // Busca líderes via profissionais_obras.funcao, com fallback em profissionais.funcao
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

  // Profissionais presentes (todos vinculados à obra)
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

  // ============================
  // Util / Cálculos
  // ============================
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
-
  // Upload de fotos (preview + remoção)
  function onSelectFotos(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const previews = arr.map((f) => ({
      objectUrl: URL.createObjectURL(f),
      nome: f.name,
    }));
    setForm((f) => ({
      ...f,
      fotosArquivos: [...f.fotosArquivos, ...arr],
      fotosPreview: [...f.fotosPreview, ...previews],
    }));
  }

  function removerFotoTemp(idx: number) {
    setForm((f) => {
      const previews = [...f.fotosPreview];
      URL.revokeObjectURL(previews[idx].objectUrl);
      previews.splice(idx, 1);
      const arquivos = [...f.fotosArquivos];
      arquivos.splice(idx, 1);
      return { ...f, fotosArquivos: arquivos, fotosPreview: previews };
    });
  }

  // ============================
  // Salvar (versão corrigida + linda)
  // ============================
  async function salvarRelatorio() {
    try {
      setSalvando(true);

      // 1️⃣ Pega progresso atual da obra
      const { data: ob, error: errObra } = await supabase
        .from("obras")
        .select("progresso, empresa_id")
        .eq("id", obraId)
        .single();
      if (errObra) throw errObra;

      const progressoAtual = Number(ob?.progresso || 0);
      const empresaId = ob?.empresa_id;
      if (!empresaId) throw new Error("empresa_id ausente na obra.");

      // 2️⃣ Calcula incremento do dia
      const incremento = incrementoPrevisto();
      const novoTotal = Math.min(100, Math.round((progressoAtual + incremento) * 100) / 100);

      // 3️⃣ Monta payload compatível com a tua tabela
      const payload = {
        obra_id: obraId,
        empresa_id: empresaId,                   // ✅
        data: HOJE,                               // ✅ garante listagem
        data_relatorio: HOJE,                     // ✅ para histórico
        condicoes_climaticas: form.condicoes_climaticas || null, // ✅ nome unificado
        clima: form.condicoes_climaticas || null, // (se ainda existir a coluna `clima`)
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
        fotos: null as any, // será atualizado após upload
      };

      const { data: inserted, error: errInsert } = await supabase
        .from("relatorios_obras")
        .insert([payload])
        .select("id")
        .single();
      if (errInsert) throw errInsert;

      const relatorioId = inserted?.id as string;

      // 4️⃣ upload das fotos (se houver)
      let fotosJson: FotoJson[] | null = null;
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
        fotosJson = urls;
        // se a coluna for jsonb, salva como objeto; se for text, envia string JSON
        await supabase
          .from("relatorios_obras")
          .update({ fotos: fotosJson })
          .eq("id", relatorioId);
      }

      // 5️⃣ atualiza progresso da obra
      const { error: errUpd } = await supabase
        .from("obras")
        .update({ progresso: novoTotal })
        .eq("id", obraId);
      if (errUpd) throw errUpd;

      // 6️⃣ limpar form e recarregar
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
    // limpar URLs temporárias
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

  // ============================
  // Lista filtrada + ordenação
  // ============================
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

  // ============================
  // UI helpers
  // ============================
  const cardBase = isDark
    ? "bg-[#151B24] border-[#1E2632]"
    : "bg-white border-gray-200";

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

  // ============================
  // Render
  // ============================
  return (
    <div className="w-full p-6">
      <Toaster position="top-right" richColors />

{/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
  <div className="flex items-center gap-2">
    <CalendarDays className="text-blue-500 w-5 h-5" />
    <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
      Relatórios do Dia
    </h2>
  </div>
  <button
    onClick={() => setAbrirModalNovo(true)}
    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex justify-center items-center gap-2 text-sm font-medium transition"
  >
    <Plus size={16} />
    Novo Relatório
  </button>
</div>

{/* Filtros */}
<div className={`border rounded-xl p-4 ${cardBase}`}>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {/* Campo de busca */}
    <div className="flex items-center gap-2">
      <Search size={16} className="opacity-60 shrink-0" />
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="flex-1 bg-transparent border rounded-md px-3 py-2 text-sm"
        placeholder="Buscar atividades ou observações…"
      />
    </div>

    {/* Filtro por clima */}
    <select
      value={filtroClima}
      onChange={(e) => setFiltroClima(e.target.value)}
      className="w-full bg-transparent border rounded-md px-3 py-2 text-sm"
    >
      <option>Todos</option>
      <option>Sol</option>
      <option>Nublado</option>
      <option>Chuva</option>
      <option>Vento</option>
    </select>

    {/* Filtro por responsável */}
    <select
      value={filtroResp}
      onChange={(e) => setFiltroResp(e.target.value)}
      className="w-full bg-transparent border rounded-md px-3 py-2 text-sm"
    >
      <option>Todos</option>
      {Array.from(
        new Set(relatorios.map((r) => r.responsavel?.nome).filter(Boolean) as string[])
      ).map((nome) => (
        <option key={nome}>{nome}</option>
      ))}
    </select>

    {/* Filtro por data */}
    <select
      value={ordemData}
      onChange={(e) => setOrdemData(e.target.value as "asc" | "desc")}
      className="w-full bg-transparent border rounded-md px-3 py-2 text-sm"
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
        <div className={`border rounded-xl p-6 text-center text-gray-400 ${cardBase}`}>
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
                className={`border rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between ${cardBase} ${isDark ? "text-gray-200" : "text-gray-800"}`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold">
                    <CalendarDays size={16} />
                    {r.data ? new Date(r.data).toLocaleDateString("pt-PT") : "—"}
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    {IconeClima(r.condicoes_climaticas)}
                    <span className="flex items-center gap-1">
                      <BarChart3 size={14} />
                      +{r.progresso_diario || 0}% (Total: {r.progresso_total ?? 0}%)
                    </span>
                    {r.horas_trabalhadas_total != null && (
                      <span className="flex items-center gap-1">
                        <Clock4 size={14} /> {r.horas_trabalhadas_total}h
                      </span>
                    )}
                  </div>
                  {r.atividades_realizadas && (
                    <p className="mt-2 text-sm max-w-3xl">
                      {r.atividades_realizadas}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
                  <span className="text-sm flex items-center gap-2">
                    <User size={14} />
                    {r.responsavel?.nome || "Sem responsável"}
                  </span>
                  <button
                    className="text-blue-400 text-sm hover:underline"
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

      {/* MODAL NOVO */}
      <AnimatePresence>
        {abrirModalNovo && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`border rounded-xl p-6 w-full max-w-4xl ${cardBase} ${isDark ? "text-gray-200" : "text-gray-800"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Novo Relatório do Dia</h3>
                <button
                  onClick={() => {
                    limparForm();
                    setAbrirModalNovo(false);
                  }}
                  className="p-2 rounded-md hover:bg-black/10"
                >
                  <X />
                </button>
              </div>

              <div className="space-y-6">
                {/* Dados gerais */}
                <div>
                  <h4 className="text-sm font-semibold opacity-80 mb-2">📅 Dados gerais</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm opacity-70">Data</label>
                      <input
                        type="date"
                        value={form.data}
                        min={HOJE}
                        max={HOJE}
                        disabled
                        className="w-full border rounded-lg p-2 mt-1 bg-gray-100 dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="text-sm opacity-70">Clima</label>
                      <select
                        value={form.condicoes_climaticas}
                        onChange={(e) =>
                          setForm({ ...form, condicoes_climaticas: e.target.value })
                        }
                        className="w-full border rounded-lg p-2 mt-1 bg-transparent"
                      >
                        <option value="">Selecione</option>
                        <option>Sol</option>
                        <option>Nublado</option>
                        <option>Chuva</option>
                        <option>Vento</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm opacity-70">Responsável</label>
                      <select
                        value={form.responsavel_id}
                        onChange={(e) =>
                          setForm({ ...form, responsavel_id: e.target.value })
                        }
                        className="w-full border rounded-lg p-2 mt-1 bg-transparent"
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
                </div>

                {/* Produção do dia */}
                <div>
                  <h4 className="text-sm font-semibold opacity-80 mb-2">🧱 Produção do dia</h4>

                  {/* Nível de avanço */}
                  <div className="mb-3">
                    <label className="text-sm opacity-70 block mb-1">Nível de avanço</label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(NIVEL_MAP) as (keyof typeof NIVEL_MAP)[]).map((k) => {
                        const active = form.nivel_avanco === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setForm({ ...form, nivel_avanco: k })}
                            className={`px-3 py-1.5 rounded-full border text-sm transition ${
                              active ? "bg-blue-600 text-white" : "bg-transparent"
                            }`}
                          >
                            {NIVEL_MAP[k].emoji} {NIVEL_MAP[k].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Horas trabalhadas */}
                  <div className="mb-3">
                    <label className="text-sm opacity-70 block mb-1">
                      Horas trabalhadas (total da equipa)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {HORAS_PRESETS.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, horasPreset: h, horasCustom: "" })
                          }
                          className={`px-3 py-1.5 rounded-full border text-sm transition ${
                            form.horasPreset === h ? "bg-blue-600 text-white" : "bg-transparent"
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, horasPreset: "custom" })}
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${
                          form.horasPreset === "custom" ? "bg-blue-600 text-white" : "bg-transparent"
                        }`}
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
                          className="ml-2 w-28 border rounded-lg p-2 bg-transparent"
                        />
                      )}
                    </div>
                    {/* Preview do cálculo */}
                    <div className="mt-2 text-xs opacity-70">
                      Incremento previsto hoje:{" "}
                      <strong>+{incrementoPrevisto()}%</strong>
                    </div>
                  </div>

                  {/* Profissionais presentes + Atividades */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm opacity-70">Profissionais presentes</label>
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
                              className={`px-3 py-1 rounded-full text-sm border transition ${
                                ativo ? "bg-blue-600 text-white" : "bg-transparent"
                              }`}
                            >
                              {p.nome}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm opacity-70">Atividades realizadas</label>
                      <textarea
                        value={form.atividades_realizadas}
                        onChange={(e) =>
                          setForm({ ...form, atividades_realizadas: e.target.value })
                        }
                        className="w-full border rounded-lg p-2 mt-1 bg-transparent"
                        rows={3}
                        placeholder="Ex.: Concretagem da laje do piso 2, assentamento de blocos…"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações & Incidentes */}
                <div>
                  <h4 className="text-sm font-semibold opacity-80 mb-2">💬 Observações & Incidentes</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm opacity-70">Observações</label>
                      <textarea
                        value={form.observacoes}
                        onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                        className="w-full border rounded-lg p-2 mt-1 bg-transparent"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm opacity-70">Incidentes</label>
                      <textarea
                        value={form.incidentes}
                        onChange={(e) => setForm({ ...form, incidentes: e.target.value })}
                        className="w-full border rounded-lg p-2 mt-1 bg-transparent"
                        rows={2}
                        placeholder="Se houve acidente, atraso, falta de material, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Fotos */}
                <div>
                  <h4 className="text-sm font-semibold opacity-80 mb-2">📸 Registo fotográfico</h4>
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
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removerFotoTemp(idx)}
                            className="absolute -top-2 -right-2 bg-black/70 text-white rounded-full px-2 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    limparForm();
                    setAbrirModalNovo(false);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarRelatorio}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  disabled={salvando}
                >
                  {salvando ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETALHES */}
      <AnimatePresence>
        {abrirModalDetalhe && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className={`border rounded-xl p-6 w-full max-w-3xl ${cardBase} ${isDark ? "text-gray-200" : "text-gray-800"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays size={18} />
                  {abrirModalDetalhe?.data
                    ? new Date(abrirModalDetalhe.data).toLocaleDateString("pt-PT")
                    : "—"}
                </h3>
                <button
                  onClick={() => setAbrirModalDetalhe(null)}
                  className="p-2 rounded-md hover:bg-black/10"
                >
                  <X />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="text-sm opacity-80">Clima</div>
                <div className="text-sm flex items-center gap-2">
                  {IconeClima(abrirModalDetalhe?.condicoes_climaticas)}
                  {abrirModalDetalhe?.condicoes_climaticas || "—"}
                </div>

                <div className="text-sm opacity-80">Responsável</div>
                <div className="text-sm">
                  {abrirModalDetalhe?.responsavel?.nome || "—"}
                </div>

                <div className="text-sm opacity-80">Avanço</div>
                <div className="text-sm">
                  +{abrirModalDetalhe?.progresso_diario || 0}% (Total{" "}
                  {abrirModalDetalhe?.progresso_total ?? 0}%)
                </div>

                <div className="text-sm opacity-80">Horas trabalhadas</div>
                <div className="text-sm">
                  {abrirModalDetalhe?.horas_trabalhadas_total ?? 0}h
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm opacity-80 mb-1">Atividades</div>
                <div className="text-sm whitespace-pre-line">
                  {abrirModalDetalhe?.atividades_realizadas || "—"}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm opacity-80 mb-1">Observações</div>
                  <div className="text-sm whitespace-pre-line">
                    {abrirModalDetalhe?.observacoes || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm opacity-80 mb-1">Incidentes</div>
                  <div className="text-sm whitespace-pre-line">
                    {abrirModalDetalhe?.incidentes || "—"}
                  </div>
                </div>
              </div>

              {(abrirModalDetalhe?.fotos || []).length > 0 && (
                <div className="mt-5">
                  <div className="text-sm font-semibold opacity-80 mb-2">
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
                          className="w-24 h-24 rounded-lg object-cover border"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
