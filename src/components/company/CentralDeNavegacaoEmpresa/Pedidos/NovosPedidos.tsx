import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  ClipboardPlus,
  Calendar,
  Loader2,
  FileText,
  MapPin,
  Search,
  XCircle,
  Briefcase,
  Euro,
  Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import { cidadesPortugal } from "@/data/cidadesPortugal";
import CampoProfissionais from "./CampoProfissionais";
import { ToastMensagem } from "./ToastMensagem";

/* ======================================
   Tokens visuais
====================================== */
const card =
  "rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm";
const sectionTitle =
  "flex items-center gap-2 text-[15px] md:text-lg font-semibold text-gray-900 dark:text-gray-100";
const label =
  "text-[12px] md:text-sm font-medium text-gray-700 dark:text-gray-300";
const inputBase =
  "mt-1 w-full rounded-xl border border-gray-200 dark:border-[#1f2a37] " +
  "bg-white dark:bg-[#1b2535] text-gray-800 dark:text-gray-100 " +
  "p-2 min-h-11 text-[13px] md:text-sm focus:ring-2 focus:ring-blue-500 outline-none";
const divider = "border-t border-gray-200/70 dark:border-white/10";

/* ======================================
   Helpers
====================================== */
function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const nText = normalize(text);
  const nQuery = normalize(query);
  const idx = nText.indexOf(nQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ======================================
   CampoLocal (autocomplete)
====================================== */
function CampoLocal({
  valor,
  onChange,
  keyId,
  placeholder,
}: {
  valor: string;
  onChange: (v: string) => void;
  keyId: string | number;
  placeholder: string;
}) {
  const [input, setInput] = useState(valor ?? "");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [debounced, setDebounced] = useState(input);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setInput(valor ?? ""), [valor, keyId]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 140);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const lista = useMemo(() => {
    const q = normalize(debounced);
    if (!q) return [];
    return cidadesPortugal
      .filter((c) => normalize(c).includes(q))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 50);
  }, [debounced]);

  const select = (cidade: string) => {
    onChange(cidade);
    setInput(cidade);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1 >= lista.length ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 < 0 ? lista.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && lista[highlightIndex]) select(lista[highlightIndex]);
      else select(input.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div ref={rootRef} key={keyId} className="relative w-full">
      <div
        className={
          "flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#1f2a37] " +
          "bg-white dark:bg-[#161d27] px-3 py-2 min-h-11 focus-within:ring-2 focus-within:ring-blue-500 transition-all"
        }
      >
        <MapPin size={18} className="text-blue-500 shrink-0" />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[13px] md:text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
        />
        {input ? (
          <button
            onClick={() => select("")}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Limpar local"
          >
            <XCircle size={18} />
          </button>
        ) : (
          <Search size={18} className="text-gray-400" />
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-40 mt-2 w-full max-h-64 overflow-auto rounded-xl border border-gray-200 dark:border-[#1f2a37] bg-white dark:bg-[#161d27] shadow-lg"
        >
          {lista.length > 0 ? (
            lista.map((cidade, idx) => (
              <button
                key={cidade}
                onClick={() => select(cidade)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={
                  "flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] md:text-sm transition " +
                  (highlightIndex === idx
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                    : "hover:bg-gray-50 dark:hover:bg-[#1f2a37]")
                }
              >
                <MapPin size={16} className="text-blue-500" />
                <span className="truncate">
                  <Highlight text={cidade} query={input} />
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              Nenhum resultado encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================
   Componente principal
====================================== */
export default function NovosPedidos({
  setSection,
}: {
  setSection: (sec: string) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("");
  const [experiencia, setExperiencia] = useState("1–3 anos");
  const [quantidade, setQuantidade] = useState(1);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [duracao, setDuracao] = useState<number | null>(null);
  const [valorHora, setValorHora] = useState<number | null>(null);
  const [valorDia, setValorDia] = useState<number | null>(null);
  const [custoTotal, setCustoTotal] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [localCidade, setLocalCidade] = useState("");
  const [turno, setTurno] = useState("Diurno (08h–17h)");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("17:00");
  const [tipoObra, setTipoObra] = useState("Residencial");
  const [alojamento, setAlojamento] = useState(false);
  const [transporte, setTransporte] = useState(false);
  const [toast, setToast] = useState({ tipo: "", texto: "", visivel: false });
  const [formKey, setFormKey] = useState(0);
  const [faixa, setFaixa] = useState<{
    min: number;
    max: number;
    sugerido: number;
  } | null>(null);

  // empresaId (RLS)
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [carregandoEmpresa, setCarregandoEmpresa] = useState(true);

  const mostrarToast = (tipo: "sucesso" | "erro" | "aviso", texto: string) =>
    setToast({ tipo, texto, visivel: true });
  const fecharToast = () => setToast({ tipo: "", texto: "", visivel: false });

  /* ======================================
     Obter empresa do usuário (RLS)
  ====================================== */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data, error } = await supabase.rpc("minha_empresa_id");
      if (!cancelado) {
        if (error) console.error("[NovosPedidos] minha_empresa_id:", error);
        setEmpresaId(data ?? null);
        setCarregandoEmpresa(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  /* ======================================
     Faixa de valores (sugestão)
  ====================================== */
  useEffect(() => {
    async function buscarFaixa() {
      if (!tipo || !experiencia) return;
      const { data, error } = await supabase
        .from("politica_valores")
        .select("valor_profissional_min, valor_profissional_max")
        .eq("tipo_profissional", tipo)
        .eq("nivel", experiencia)
        .maybeSingle();

    if (error) console.error(error);

      if (data) {
        const min = Number(data.valor_profissional_min ?? 0);
        const max = Number(data.valor_profissional_max ?? 0);
        const sugerido = Number(((min + max) / 2).toFixed(2));
        setFaixa({ min, max, sugerido });
        setValorHora(sugerido);
        setValorDia(sugerido * 8);
      } else {
        setFaixa(null);
      }
    }
    buscarFaixa();
  }, [tipo, experiencia]);

  /* ======================================
     Cálculos automáticos
  ====================================== */
  useEffect(() => {
    if (!dataInicio || !dataFim) return setDuracao(null);
    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    setDuracao(diff > 0 ? diff : null);
  }, [dataInicio, dataFim]);

  useEffect(() => {
    if (!valorDia || !duracao || !quantidade) return setCustoTotal(null);
    setCustoTotal(valorDia * duracao * quantidade);
  }, [valorDia, duracao, quantidade]);

  /* ======================================
     Salvamento (mesma lógica)
  ====================================== */
  const salvar = async (
    status: "em_analise" | "aprovado" | "recusado" | "cancelado"
  ) => {
    if (saving) return;
    if (carregandoEmpresa) {
      mostrarToast("aviso", "Aguarde carregar a empresa.");
      return;
    }
    if (!empresaId) {
      mostrarToast("erro", "Nenhuma empresa vinculada ao seu utilizador.");
      return;
    }

    const faltas: string[] = [];
    if (!localCidade) faltas.push("Local");
    if (!tipo) faltas.push("Tipo de profissional");
    if (!dataInicio) faltas.push("Data de início");
    if (!dataFim) faltas.push("Data de término");
    if (faltas.length) {
      mostrarToast("aviso", `⚠️ Faltam: ${faltas.join(", ")}.`);
      return;
    }

    setSaving(true);

    const vHora = Number.isFinite(valorHora as number) ? (valorHora as number) : 0;
    const vDia = Number.isFinite(valorDia as number) ? (valorDia as number) : vHora * 8;
    const vTotal = Number.isFinite(custoTotal as number) ? (custoTotal as number) : 0;

    const statusNormalizado = status === "em_analise" ? "em_analise" : status;

    const payload = {
      id_empresa: empresaId,
      email_empresa: user?.email || null,
      nome_empresa: user?.email || null,
      tipo_profissional: tipo,
      experiencia,
      quantidade,
      local: localCidade,
      data_inicio: dataInicio,
      data_fim: dataFim,
      duracao_dias: duracao,
      valor_hora: vHora,
      valor_dia: vDia,
      custo_total: vTotal,
      observacoes: observacoes?.trim() || null,
      tipo_obra: tipoObra,
      turno,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      alojamento,
      transporte,
      status: statusNormalizado,
    } as const;

    const { data, error } = await supabase
      .from("pedidos_empresa_v2")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      console.error("[NovosPedidos] insert:", error);
      setSaving(false);
      mostrarToast("erro", `Erro ao salvar o pedido: ${error.message}`);
      return;
    }

    const novoPedidoId = data?.id as string | undefined;

    if (novoPedidoId) {
      try {
        await supabase.from("notificacoes_realtime").insert([
          {
            empresa_id: empresaId,
            usuario_id: null,
            tipo: "empresa_admin",
            titulo: "Novo pedido criado",
            conteudo: `${tipo} (${quantidade}) — ${localCidade}`,
            icone: "ClipboardPlus",
            url_destino: `/empresa/pedidos/em-avaliacao?novo=${novoPedidoId}`,
            lida: false,
          },
        ]);
        window.dispatchEvent(new CustomEvent("refresh-notifications"));
      } catch (e) {
        console.warn("[NovosPedidos] notificacao_realtime falhou:", e);
      }
    }

    setSaving(false);
    try {
      if (typeof setSection === "function") setSection("em-avaliacao");
    } catch {}

    if (novoPedidoId) {
      sessionStorage.setItem("pedido_novo", novoPedidoId);
      navigate(`/empresa/pedidos/em-avaliacao?novo=${novoPedidoId}`, {
        replace: true,
        state: { section: "em-avaliacao" },
      });
    } else {
      navigate("/empresa/pedidos/em-avaliacao", {
        replace: true,
        state: { section: "em-avaliacao" },
      });
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ======================================
     Layout
  ====================================== */
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8 pb-10">
      {/* Título */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-center"
      >
        <h1 className="text-[22px] md:text-3xl font-bold text-gray-800 dark:text-gray-100">
          Novo Pedido
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Preencha os dados da obra e do profissional que precisa.
        </p>
      </motion.div>

      {/* CARD ÚNICO DO FORM */}
      <div className={`${card} p-4 sm:p-6 md:p-8 space-y-8 md:space-y-10`}>
        {/* LOCAL */}
        <section className="space-y-3">
          <h2 className={sectionTitle}>
            <MapPin className="text-blue-500 w-5 h-5" />
            Obra & Local
          </h2>
          <CampoLocal
            keyId={`local-${formKey}`}
            valor={localCidade}
            onChange={setLocalCidade}
            placeholder="Digite ou selecione o local da obra"
          />
        </section>

        <div className={divider} />

        {/* PROFISSIONAIS — o componente já tem o título */}
        <CampoProfissionais
          key={`prof-${formKey}`}
          tipo={tipo}
          experiencia={experiencia}
          quantidade={quantidade}
          onChange={({ tipo, experiencia, quantidade }) => {
            setTipo(tipo);
            setExperiencia(experiencia);
            setQuantidade(quantidade);
          }}
        />

        <div className={divider} />

        {/* VALOR E CUSTOS */}
        <section className="space-y-3">
          <h2 className={sectionTitle}>
            <Euro className="w-5 h-5 text-blue-500" />
            Valor e Custos
          </h2>

          {faixa && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Lightbulb size={14} className="text-amber-400" />
              Faixa sugerida: {faixa.min.toFixed(2)}€ – {faixa.max.toFixed(2)}€/h (sugerido{" "}
              {faixa.sugerido.toFixed(2)}€)
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            <div>
              <label className={label}>Valor hora (€)</label>
              <input
                type="number"
                step="0.1"
                value={valorHora ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setValorHora(v);
                  setValorDia(v * 8);
                }}
                className={inputBase}
              />
            </div>

            <div>
              <label className={label}>Valor dia (€)</label>
              <input
                type="number"
                step="0.1"
                value={valorDia ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setValorDia(v);
                  setValorHora(v / 8);
                }}
                className={inputBase}
              />
            </div>

            <div>
              <label className={label}>Custo total estimado (€)</label>
              <input
                type="text"
                disabled
                value={
                  custoTotal
                    ? custoTotal.toLocaleString("pt-PT", {
                        style: "currency",
                        currency: "EUR",
                      })
                    : "—"
                }
                className={
                  "mt-1 w-full rounded-xl border border-gray-200 dark:border-[#1f2a37] " +
                  "bg-gray-50 dark:bg-[#152033] text-gray-800 dark:text-gray-100 " +
                  "p-2 min-h-11 text-[13px] md:text-sm"
                }
              />
            </div>
          </div>
        </section>

        <div className={divider} />

        {/* DETALHES ADICIONAIS */}
        <section className="space-y-4 md:space-y-6">
          <h2 className={sectionTitle}>
            <Briefcase className="text-blue-500 w-5 h-5" />
            Detalhes adicionais
          </h2>

          <div>
            <label className={label}>Tipo de obra</label>
            <select
              value={tipoObra}
              onChange={(e) => setTipoObra(e.target.value)}
              className={inputBase}
            >
              <option>Residencial</option>
              <option>Comercial</option>
              <option>Infraestrutura</option>
              <option>Indústria</option>
              <option>Manutenção</option>
            </select>
          </div>

          <div>
            <label className={label}>Turno de trabalho</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className={inputBase}
            >
              <option>Diurno (08h–17h)</option>
              <option>Noturno (20h–05h)</option>
              <option>Personalizado</option>
            </select>

            {turno === "Personalizado" && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className={inputBase}
                />
                <input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className={inputBase}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-2">
            <label className="flex items-center gap-2 text-[13px] md:text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={alojamento}
                onChange={() => setAlojamento((v) => !v)}
                className="accent-blue-600"
              />
              Alojamento fornecido
            </label>
            <label className="flex items-center gap-2 text-[13px] md:text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={transporte}
                onChange={() => setTransporte((v) => !v)}
                className="accent-blue-600"
              />
              Transporte incluído
            </label>
          </div>
        </section>

        <div className={divider} />

        {/* DATAS */}
        <section className="space-y-3">
          <h2 className={sectionTitle}>
            <Calendar className="w-5 h-5 text-blue-500" />
            Datas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            <div>
              <label className={label}>Data de início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className={inputBase}
              />
            </div>

            <div>
              <label className={label}>Data de término</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className={inputBase}
              />
            </div>

            {duracao && (
              <div className="flex items-end">
                <span className="text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl text-sm font-medium">
                  📅 {duracao} dias
                </span>
              </div>
            )}
          </div>
        </section>

        <div className={divider} />

        {/* OBSERVAÇÕES */}
        <section className="space-y-3">
          <h2 className={sectionTitle}>
            <FileText className="w-5 h-5 text-blue-500" />
            Observações
          </h2>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            className={inputBase + " resize-y"}
            placeholder="Informações adicionais (opcional)"
          />
        </section>
      </div>

      {/* AÇÃO (mesmo botão para mobile e desktop) */}
      <div className="pt-6 pb-4 flex md:justify-end">
        <button
          disabled={saving}
          onClick={() => salvar("em_analise")}
          className="w-full md:w-auto px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:opacity-90 flex items-center justify-center gap-2 shadow transition-all disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <ClipboardPlus className="w-5 h-5" /> Criar Pedido
            </>
          )}
        </button>
      </div>

      {/* TOAST */}
      <ToastMensagem
        tipo={toast.tipo as any}
        texto={toast.texto}
        visivel={toast.visivel}
        onFechar={fecharToast}
        onNovoPedido={() => {
          setFormKey((k) => k + 1);
          fecharToast();
          navigate("/empresa/pedidos/novo");
        }}
        onVerPedidos={() => {
          fecharToast();
          if (typeof setSection === "function") setSection("em-avaliacao");
          navigate("/empresa/pedidos/em-avaliacao");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
