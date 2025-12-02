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
  ClipboardList,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Toaster, toast } from "sonner";

/* ============================
   Tipos
============================ */
type Lider = { id: string; nome: string; funcao?: string | null };
type FotoJson = { url: string; nome: string };

type Relatorio = {
  id: string;
  obra_id: string;
  data: string | null;
  data_relatorio?: string | null;
  responsavel_id: string | null;
  condicoes_climaticas: string | null;
  atividades_realizadas: string | null; // aqui vira a "descrição do dia"
  observacoes: string | null;
  fotos: FotoJson[] | null;
  criado_em?: string | null;
  responsavel?: { nome?: string | null };
};

const BUCKET_NAME = "relatorios_fotos";
const HOJE = new Date().toISOString().split("T")[0];

/* ============================
   Componente
============================ */
export default function RelatoriosDoDia({ obraId }: { obraId: string }) {
  // Tema atual
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

  // Estado base
  const [carregando, setCarregando] = useState(true);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [abrirModalNovo, setAbrirModalNovo] = useState(false);
  const [abrirModalDetalhe, setAbrirModalDetalhe] = useState<Relatorio | null>(
    null
  );

  // Filtros/Busca
  const [busca, setBusca] = useState("");
  const [filtroClima, setFiltroClima] = useState("Todos");
  const [filtroResp, setFiltroResp] = useState("Todos");
  const [ordemData, setOrdemData] = useState<"desc" | "asc">("desc");

  // Formulário simples
  const [form, setForm] = useState({
    data: HOJE,
    condicoes_climaticas: "",
    responsavel_id: "",
    atividades_realizadas: "", // descrição do dia (obrigatória)
    observacoes: "",
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
      await Promise.all([carregarRelatorios(), carregarLideres()]);
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
      leaders = viaObra.map((r: any) => ({
        id: r.profissional_id,
        nome: r.profissionais?.nome || "Sem nome",
        funcao: r.funcao,
      }));
    }

    // fallback geral se não tiver ninguém ligado à obra
    if (!leaders.length) {
      const { data: viaProf } = await supabase
        .from("profissionais")
        .select("id, nome, funcao");
      if (viaProf) {
        leaders = viaProf.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          funcao: p.funcao,
        }));
      }
    }

    setLideres(leaders);
  }

  /* ============================
     Utils
  ============================ */
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

    setForm((old) => {
      const existente = old.fotosArquivos.length;
      const espacoRestante = 4 - existente;

      if (espacoRestante <= 0) {
        toast.error("Máximo de 4 fotos por relatório.");
        return old;
      }

      const arr = Array.from(files);
      const selecionadas = arr.slice(0, espacoRestante);

      if (selecionadas.length < arr.length) {
        toast.error("Só é possível adicionar até 4 fotos por relatório.");
      }

      const previews = selecionadas.map((f) => ({
        objectUrl: URL.createObjectURL(f),
        nome: f.name,
      }));

      return {
        ...old,
        fotosArquivos: [...old.fotosArquivos, ...selecionadas],
        fotosPreview: [...old.fotosPreview, ...previews],
      };
    });
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
    if (!form.atividades_realizadas.trim()) {
      toast.error("Descrição do dia é obrigatória.");
      return;
    }

    try {
      setSalvando(true);

      // empresa_id é opcional aqui, se existir na obra
      const { data: ob, error: errObra } = await supabase
        .from("obras")
        .select("empresa_id")
        .eq("id", obraId)
        .single();

      if (errObra) {
        console.error(errObra);
      }

      const empresaId = ob?.empresa_id ?? null;

      const payload: any = {
        obra_id: obraId,
        empresa_id: empresaId,
        data: form.data,
        data_relatorio: form.data,
        condicoes_climaticas: form.condicoes_climaticas || null,
        clima: form.condicoes_climaticas || null,
        responsavel_id: form.responsavel_id || null,
        atividades_realizadas: form.atividades_realizadas.trim(),
        observacoes: form.observacoes?.trim() || null,
        // campos antigos mantidos como nulos para não quebrar schema
        nivel_avanco: null,
        progresso_diario: null,
        progresso_total: null,
        horas_trabalhadas_total: null,
        incidentes: null,
        equipa: null,
        atividades: null,
        custos: null,
        ocorrencias: null,
        fotos: null as any,
      };

      const { data: inserted, error: errInsert } = await supabase
        .from("relatorios_obras")
        .insert([payload])
        .select("id")
        .single();
      if (errInsert) throw errInsert;

      const relatorioId = inserted?.id as string;

      // Upload de fotos (opcional, até 4)
      if (form.fotosArquivos.length) {
        const urls: FotoJson[] = [];
        for (const file of form.fotosArquivos) {
          const path = `relatorios/${obraId}/${relatorioId}/${Date.now()}_${file.name}`;
          const up = await supabase.storage
            .from(BUCKET_NAME)
            .upload(path, file);
          if (!up.error) {
            const pub = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
            if (pub.data?.publicUrl) {
              urls.push({ url: pub.data.publicUrl, nome: file.name });
            }
          }
        }
        await supabase
          .from("relatorios_obras")
          .update({ fotos: urls })
          .eq("id", relatorioId);
      }

      limparForm();
      setAbrirModalNovo(false);
      await carregarRelatorios();
      toast.success("Relatório criado com sucesso!");
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
      atividades_realizadas: "",
      observacoes: "",
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
        (r.atividades_realizadas || "")
          .toLowerCase()
          .includes(busca.toLowerCase()) ||
        (r.observacoes || "").toLowerCase().includes(busca.toLowerCase());
      const climaOk =
        filtroClima === "Todos" ||
        (r.condicoes_climaticas || "") === filtroClima;
      const respOk =
        filtroResp === "Todos" ||
        (r.responsavel?.nome || "").toLowerCase() ===
          filtroResp.toLowerCase();
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
    ? "bg-[#10161f] border-[#203044] text-gray-100"
    : "bg-white border-gray-200 text-gray-900";

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

      {/* Helpers responsivos leves */}
      <style>{`
@media (max-width: 640px) {
  .mobile-wrap { padding: 12px !important; }
  .mobile-card { padding: 14px !important; border-radius: 14px !important; }
  .mobile-input { font-size: 16px !important; }
  .mobile-btn { font-size: 15px !important; }
}
      `}</style>

      {/* Header da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-blue-600 w-5 h-5" />
          <h2
            className={`text-lg font-semibold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
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
      <div
        className={`border rounded-xl p-4 mobile-card ${cardBase} shadow-sm`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Search size={16} className="opacity-60 shrink-0" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`flex-1 ${inputBase} ${
                isDark ? darkInput : lightInput
              } mobile-input`}
              placeholder="Buscar pela descrição ou observações…"
            />
          </div>

          <select
            value={filtroClima}
            onChange={(e) => setFiltroClima(e.target.value)}
            className={`${selectBase} ${
              isDark ? darkInput : lightInput
            } mobile-input`}
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
            className={`${selectBase} ${
              isDark ? darkInput : lightInput
            } mobile-input`}
          >
            <option>Todos</option>
            {Array.from(
              new Set(
                relatorios
                  .map((r) => r.responsavel?.nome)
                  .filter(Boolean) as string[]
              )
            ).map((nome) => (
              <option key={nome}>{nome}</option>
            ))}
          </select>

          <select
            value={ordemData}
            onChange={(e) => setOrdemData(e.target.value as "asc" | "desc")}
            className={`${selectBase} ${
              isDark ? darkInput : lightInput
            } mobile-input`}
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
        <div
          className={`border rounded-xl p-6 text-center text-gray-500 mobile-card ${cardBase}`}
        >
          Nenhum relatório registrado.
        </div>
      ) : (
        <div className="grid gap-4 mt-4">
          <AnimatePresence>
            {listaFiltrada.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`border rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between mobile-card ${cardBase} shadow-sm`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-blue-500 font-medium">
                    <CalendarDays size={16} />
                    {r.data
                      ? new Date(r.data).toLocaleDateString("pt-PT")
                      : "—"}
                  </div>

                  <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                    <span className="flex items-center gap-2">
                      {IconeClima(r.condicoes_climaticas)}
                      <span className="opacity-80">
                        {r.condicoes_climaticas || "Clima não informado"}
                      </span>
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed max-w-3xl opacity-90 line-clamp-2">
                    {r.atividades_realizadas || "Sem descrição do dia."}
                  </p>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-50 px-2 sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              limparForm();
              setAbrirModalNovo(false);
            }}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className={`w-full sm:w-[780px] max-w-[960px] h-[92vh] sm:h-auto max-h-[90vh] rounded-t-2xl sm:rounded-2xl border ${cardBase} shadow-xl flex flex-col overflow-hidden`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <div className="leading-tight">
                    <h3 className="text-[15px] font-semibold">
                      Novo relatório do dia
                    </h3>
                    <p className="text-xs opacity-70">
                      Registe rapidamente como foi o dia na obra.
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Fechar"
                  onClick={() => {
                    limparForm();
                    setAbrirModalNovo(false);
                  }}
                  className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/5"
                >
                  <X />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {/* Dados gerais */}
                <section className="space-y-3">
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
                        className={`${inputBase} ${
                          isDark ? darkInput : lightInput
                        } mobile-input`}
                      />
                    </div>
                    <div>
                      <label className="text-xs opacity-70">Clima</label>
                      <select
                        value={form.condicoes_climaticas}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            condicoes_climaticas: e.target.value,
                          })
                        }
                        className={`${selectBase} ${
                          isDark ? darkInput : lightInput
                        } mobile-input`}
                      >
                        <option value="">Não informar</option>
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
                        onChange={(e) =>
                          setForm({ ...form, responsavel_id: e.target.value })
                        }
                        className={`${selectBase} ${
                          isDark ? darkInput : lightInput
                        } mobile-input`}
                      >
                        <option value="">Opcional</option>
                        {lideres.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nome} {l.funcao ? `— ${l.funcao}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <hr
                  className={`${
                    isDark ? "border-white/10" : "border-gray-200"
                  }`}
                />

                {/* Descrição do dia */}
                <section>
                  <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80 mb-2">
                    Descrição do dia (obrigatória)
                  </h4>
                  <textarea
                    value={form.atividades_realizadas}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        atividades_realizadas: e.target.value,
                      })
                    }
                    className={`${textareaBase} ${
                      isDark ? darkInput : lightInput
                    } mobile-input`}
                    rows={4}
                    maxLength={300}
                    placeholder="Ex.: Instalação de tubagens no 2º andar e acabamentos em 2 casas de banho."
                  />
                  <div className="text-xs opacity-60 mt-1">
                    Resuma em 1–2 linhas o que a equipa fez hoje.
                  </div>
                </section>

                <hr
                  className={`${
                    isDark ? "border-white/10" : "border-gray-200"
                  }`}
                />

                {/* Observações opcionais */}
                <section>
                  <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80 mb-2">
                    Observações (opcional)
                  </h4>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({ ...form, observacoes: e.target.value })
                    }
                    className={`${textareaBase} ${
                      isDark ? darkInput : lightInput
                    } mobile-input`}
                    rows={4}
                    placeholder="Ex.: Faltou material em parte do dia, chuva no período da tarde, cliente pediu pequeno ajuste…"
                  />
                </section>

                <hr
                  className={`${
                    isDark ? "border-white/10" : "border-gray-200"
                  }`}
                />

                {/* Fotos */}
                <section>
                  <h4 className="text-[13px] font-medium tracking-wide uppercase opacity-80 mb-2">
                    Fotos do dia (até 4)
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
                            className={`w-24 h-24 object-cover rounded-lg border ${
                              isDark ? "border-[#1f2a37]" : "border-gray-300"
                            }`}
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
              <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 border-t border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <button
                  onClick={() => {
                    limparForm();
                    setAbrirModalNovo(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-transparent bg-gray-600 hover:bg-gray-500 text-white"
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarRelatorio}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={salvando}
                >
                  {salvando ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-50 px-2 sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbrirModalDetalhe(null)}
          >
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 32, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className={`w-full sm:w-[680px] max-w-[900px] max-h-[86vh] rounded-t-2xl sm:rounded-2xl border ${cardBase} shadow-xl flex flex-col overflow-hidden`}
            >
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-blue-600" />
                  <h3 className="text-[15px] font-semibold">
                    {abrirModalDetalhe?.data
                      ? new Date(
                          abrirModalDetalhe.data
                        ).toLocaleDateString("pt-PT")
                      : "Detalhes do relatório"}
                  </h3>
                </div>
                <button
                  aria-label="Fechar"
                  onClick={() => setAbrirModalDetalhe(null)}
                  className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/5"
                >
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="opacity-70">Clima</div>
                  <div className="flex items-center gap-2">
                    {IconeClima(abrirModalDetalhe?.condicoes_climaticas)}
                    {abrirModalDetalhe?.condicoes_climaticas || "—"}
                  </div>

                  <div className="opacity-70">Responsável</div>
                  <div>{abrirModalDetalhe?.responsavel?.nome || "—"}</div>

                  <div className="opacity-70">Data do registo</div>
                  <div>
                    {abrirModalDetalhe?.data
                      ? new Date(
                          abrirModalDetalhe.data
                        ).toLocaleDateString("pt-PT")
                      : "—"}
                  </div>
                </div>

                <div>
                  <div className="opacity-70 mb-1">Descrição do dia</div>
                  <div className="whitespace-pre-line">
                    {abrirModalDetalhe?.atividades_realizadas || "—"}
                  </div>
                </div>

                <div>
                  <div className="opacity-70 mb-1">Observações</div>
                  <div className="whitespace-pre-line">
                    {abrirModalDetalhe?.observacoes || "—"}
                  </div>
                </div>

                {(abrirModalDetalhe?.fotos || []).length > 0 && (
                  <div>
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
                            className={`w-24 h-24 rounded-lg object-cover border ${
                              isDark ? "border-[#1f2a37]" : "border-gray-300"
                            }`}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end px-4 sm:px-6 py-3 border-t border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
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
