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
  Clock4,
  Euro,
  Users,
  Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import { cidadesPortugal } from "@/data/cidadesPortugal";
import CampoProfissionais from "./CampoProfissionais";
import { ToastMensagem } from "./ToastMensagem";

/* ======================================
   Funções auxiliares
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
   CampoLocal (autocomplete de cidades)
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
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#1f2a37] bg-white dark:bg-[#161d27] px-3 py-2 min-h-11 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
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
          className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100"
        />
        {input ? (
          <button onClick={() => select("")} className="text-gray-400 hover:text-gray-600">
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
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                  highlightIndex === idx
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
                    : "hover:bg-gray-50 dark:hover:bg-[#1f2a37]"
                }`}
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
export default function NovosPedidos({ setSection }: { setSection: (sec: string) => void }) {
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
  const [faixa, setFaixa] = useState<{ min: number; max: number; sugerido: number } | null>(null);

  const mostrarToast = (tipo: "sucesso" | "erro" | "aviso", texto: string) =>
    setToast({ tipo, texto, visivel: true });
  const fecharToast = () => setToast({ tipo: "", texto: "", visivel: false });

  /* ======================================
     Buscar faixa de valores do Supabase
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
     Salvamento
  ====================================== */
  const salvar = async (status: string) => {
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

    const { error } = await supabase.from("pedidos_empresa_v2").insert([
  {
    // ⚙️ só envia id_empresa se existir mesmo
    ...(user?.id && { id_empresa: user.id }),
    nome_empresa: user?.email || null,
    tipo_profissional: tipo,
    experiencia,
    quantidade,
    local: localCidade,
    data_inicio: dataInicio,
    data_fim: dataFim,
    duracao_dias: duracao,
    valor_hora: valorHora,
    valor_dia: valorDia,
    custo_total: custoTotal,
    observacoes: observacoes?.trim() || "EMPTY",
    tipo_obra: tipoObra,
    turno,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    alojamento,
    transporte,
    status: status || "em_avaliacao",
    criado_em: new Date().toISOString(),
  },
]);


    setSaving(false);
    if (error) {
      mostrarToast("erro", "Erro ao salvar o pedido.");
      return;
    }

    mostrarToast("sucesso", "Pedido criado com sucesso!");
  };

  /* ======================================
     Layout
  ====================================== */
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-10">
      <motion.h1
        className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        Novo Pedido
      </motion.h1>

      <div className="bg-white dark:bg-[#161d27] rounded-2xl shadow-lg border border-gray-100 dark:border-[#1f2a37] p-4 sm:p-6 md:p-8 space-y-8 relative">
        {/* LOCAL */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
            <MapPin className="text-blue-500 w-5 h-5" /> Obra & Local
          </h2>
          <CampoLocal
            keyId={`local-${formKey}`}
            valor={localCidade}
            onChange={setLocalCidade}
            placeholder="Digite ou selecione o local da obra"
          />
        </section>

        {/* PROFISSIONAIS */}
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

        {/* VALOR E CUSTOS */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
            <Euro className="w-5 h-5 text-blue-500" /> Valor e Custos
          </h2>

          {faixa && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Lightbulb size={14} className="text-amber-400" />
              Faixa sugerida: {faixa.min.toFixed(2)}€ – {faixa.max.toFixed(2)}€/h (sugerido{" "}
              {faixa.sugerido.toFixed(2)}€)
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            <div>
              <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor hora (€)
              </label>
              <input
                type="number"
                step="0.1"
                value={valorHora ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setValorHora(v);
                  setValorDia(v * 8);
                }}
                className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 text-sm bg-white dark:bg-[#1e2a3a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor dia (€)
              </label>
              <input
                type="number"
                step="0.1"
                value={valorDia ?? ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setValorDia(v);
                  setValorHora(v / 8);
                }}
                className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 text-sm bg-white dark:bg-[#1e2a3a] text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                Custo total estimado (€)
              </label>
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
                className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 text-sm bg-gray-50 dark:bg-[#1b2535] text-gray-800 dark:text-gray-100"
              />
            </div>
          </div>
        </section>
               {/* demais seções continuam iguais */}

        {/* DETALHES ADICIONAIS */}
        <section className="space-y-4 md:space-y-6">
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
            <Briefcase className="text-blue-500 w-5 h-5" />
            Detalhes adicionais
          </h2>

          <div>
            <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo de obra
            </label>
            <select
              value={tipoObra}
              onChange={(e) => setTipoObra(e.target.value)}
              className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 min-h-11 
                         text-sm bg-white dark:bg-[#1e2a3a] text-gray-800 dark:text-gray-100 
                         focus:ring-2 focus:ring-blue-500"
            >
              <option>Residencial</option>
              <option>Comercial</option>
              <option>Infraestrutura</option>
              <option>Indústria</option>
              <option>Manutenção</option>
            </select>
          </div>

          <div>
            <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
              Turno de trabalho
            </label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 min-h-11 
                         text-sm bg-white dark:bg-[#1e2a3a] text-gray-800 dark:text-gray-100 
                         focus:ring-2 focus:ring-blue-500"
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
                  className="border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 
                             min-h-11 text-sm bg-white dark:bg-[#1e2a3a] focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className="border border-gray-200 dark:border-[#1f2a37] rounded-xl p-2 
                             min-h-11 text-sm bg-white dark:bg-[#1e2a3a] focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Alojamento e transporte */}
          <div>
            <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
              Alojamento e Transporte
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={alojamento}
                  onChange={() => setAlojamento((v) => !v)}
                  className="accent-blue-600"
                />
                Alojamento fornecido
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={transporte}
                  onChange={() => setTransporte((v) => !v)}
                  className="accent-blue-600"
                />
                Transporte incluído
              </label>
            </div>
          </div>
        </section>

        {/* DATAS */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
            <Calendar className="w-5 h-5 text-blue-500" />
            Datas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            <div>
              <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                Data de início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] 
                           rounded-xl p-2 min-h-11 text-sm bg-white dark:bg-[#1e2a3a] 
                           text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                Data de término
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="mt-1 w-full border border-gray-200 dark:border-[#1f2a37] 
                           rounded-xl p-2 min-h-11 text-sm bg-white dark:bg-[#1e2a3a] 
                           text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {duracao && (
              <div className="flex items-end">
                <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 
                                 px-3 py-2 rounded-xl text-sm font-medium">
                  📅 {duracao} dias
                </span>
              </div>
            )}
          </div>
        </section>

        {/* OBSERVAÇÕES */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100">
            <FileText className="w-5 h-5 text-blue-500" />
            Observações
          </h2>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-gray-200 dark:border-[#1f2a37] 
                       bg-white dark:bg-[#1e2a3a] text-gray-800 dark:text-gray-100 
                       p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            placeholder="Informações adicionais (opcional)"
          />
        </section>

        {/* BOTÃO DESKTOP */}
        <div className="hidden md:flex justify-end pt-6 border-t border-gray-100 dark:border-[#1f2a37]">
          <button
            disabled={saving}
            onClick={() => salvar("em_avaliacao")}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium 
                       hover:opacity-90 flex items-center gap-2 shadow transition-all disabled:opacity-60"
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
      </div>

      {/* BOTÃO MOBILE */}
      <div className="md:hidden h-16" />
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0f1620]/90 
                      backdrop-blur-md border-t border-gray-200/70 dark:border-[#1f2a37] px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <button
            disabled={saving}
            onClick={() => salvar("em_avaliacao")}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold 
                       hover:opacity-90 flex items-center justify-center gap-2 shadow-md 
                       active:scale-[0.99] transition disabled:opacity-60"
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
          setSection("em-avaliacao");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}


