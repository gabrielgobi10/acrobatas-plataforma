// src/components/professional/EditarPerfilModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Save,
  User2,
  Mail,
  Phone,
  Calendar,
  Globe2,
  Languages,
  Briefcase,
  BadgeCheck,
  Gauge,
  FileText,
  Clock4,
  MapPin,
  Plane,
  Home,
  Ruler,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

/* ================================
   Props
================================== */
type Props = {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  initialData: any;
  onSave: (data: any) => void | Promise<void>;
};

/* ================================
   Opções
================================== */
const SEG_AVAIL = ["Imediata", "1 semana", "15 dias", "Indisponível"];
const SEG_BOOL = ["Sim", "Não"];
const RAIO_OPTS = ["25 km", "50 km", "75 km", "100 km", "Mais de 100 km"];

const IDIOMAS_SUG = [
  "Português",
  "Inglês",
  "Espanhol",
  "Francês",
  "Hindi",
  "Nepalês",
  "Ucraniano",
  "Russo",
  "Árabe",
];

const NACIONALIDADES_SUG = [
  "Portugal",
  "Brasil",
  "Nepal",
  "Índia",
  "Ucrânia",
  "Rússia",
  "Marrocos",
  "Angola",
  "Cabo Verde",
  "Guiné-Bissau",
  "Moçambique",
  "São Tomé e Príncipe",
  "Espanha",
  "França",
  "Itália",
  "Alemanha",
  "Paquistão",
  "Bangladesh",
];

const CONTRATOS_SUG = [
  "Recibos verdes",
  "Contrato a termo",
  "Contrato sem termo",
  "Prestação de serviços",
  "Trabalho temporário",
  "Freelancer",
];

/* Campos obrigatórios — alinhados com o mínimo do perfil completo */
const REQUIRED: string[] = [
  "nome",
  "telefone",
  "nacionalidade",
  "area_id",
  "anos_experiencia",
  "tipo_contrato",
  "disponibilidade",
  "cidade",
  "pode_viajar",
];

/* ================================
   Helpers de saneamento (evita "" em colunas date/uuid/numeric/int)
================================== */
const toNullIfBlank = (v: any) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

const normalizeInt = (v: any) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.trunc(n);
};

const normalizeDate = (v: any) => {
  // Aceita "YYYY-MM-DD" (input type="date"). Qualquer "" vira null.
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null; // evita "Object"
  const s = v.trim();
  if (!s) return null;
  return s;
};

export default function EditarPerfilModal({
  open,
  isOpen,
  onClose,
  initialData,
  onSave,
}: Props) {
  const visible = Boolean(open ?? isOpen);
  const [tab, setTab] = useState<"basico" | "prof" | "mob" | "links">("basico");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [areas, setAreas] = useState<{ id: string; nome: string }[]>([]);

  /* Carrega áreas */
  useEffect(() => {
    const loadAreas = async () => {
      const { data } = await supabase
        .from("profissional_areas")
        .select("id, nome")
        .order("nome", { ascending: true });

      setAreas(data || []);
    };
    loadAreas();
  }, []);

  /* Hidrata */
  useEffect(() => {
    setForm({
      nome: initialData?.nome ?? "",
      email: initialData?.email ?? "",
      telefone: initialData?.telefone ?? "",
      whatsapp: initialData?.whatsapp ?? "",
      data_nascimento: initialData?.data_nascimento ?? "", // UI pode ficar "", mas no save vira null
      nacionalidade: initialData?.nacionalidade ?? "",
      idiomas: initialData?.idiomas ?? [],
      area_id: initialData?.area_id ?? initialData?.area_principal ?? "",
      nivel: initialData?.nivel ?? "Aprendiz",
      anos_experiencia: initialData?.anos_experiencia ?? 0,
      // valor_diario removido (não aparece mais)
      tipo_contrato: initialData?.tipo_contrato ?? "",
      disponibilidade: initialData?.disponibilidade ?? "Imediata",
      cidade: initialData?.cidade ?? initialData?.cidade_base ?? "",
      pode_viajar: initialData?.pode_viajar ?? "Não",
      pode_alojamento: initialData?.pode_alojamento ?? "Não",
      raio: initialData?.raio ?? initialData?.raio_deslocacao ?? "",
      observacoes: initialData?.observacoes ?? "",
      foto_url: initialData?.foto_url ?? "",
      site: initialData?.site ?? "",
      instagram: initialData?.instagram ?? "",
      linkedin: initialData?.linkedin ?? "",
    });
    setErrors({});
  }, [initialData]);

  /* Esc + travar scroll (iOS-safe) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && visible && onClose();
    if (visible) {
      document.addEventListener("keydown", onKey);
      document.body.classList.add("aw-modal-open");
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("aw-modal-open");
    };
  }, [visible, onClose]);

  const set = (k: string, v: any) => {
    setForm((s: any) => ({ ...s, [k]: v }));
    setErrors((prev) => {
      const copy = { ...prev };
      if (
        REQUIRED.includes(k) &&
        v !== undefined &&
        v !== null &&
        `${v}`.trim() !== ""
      ) {
        delete copy[k];
      }
      return copy;
    });
  };

  const completion = useMemo(() => {
    const done = REQUIRED.filter((k) => {
      const v = form?.[k];
      return v !== undefined && v !== null && `${v}`.trim() !== "";
    }).length;
    return Math.round((done / REQUIRED.length) * 100);
  }, [form]);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    REQUIRED.forEach((k) => {
      const v = form?.[k];
      if (v === undefined || v === null || `${v}`.trim() === "") {
        newErrors[k] = "Campo obrigatório";
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // SANEAMENTO: evita enviar "" e objetos para colunas não-texto
    const payload = {
      ...form,

      // normalizações críticas (evita: invalid input syntax for type date: "")
      data_nascimento: normalizeDate(form.data_nascimento),

      // números
      anos_experiencia: normalizeInt(form.anos_experiencia),

      // arrays/strings
      idiomas: Array.isArray(form.idiomas) ? form.idiomas : [],
      whatsapp: (form.whatsapp ?? "") as string,
      observacoes: (form.observacoes ?? "") as string,

      // duplicações de compatibilidade
      cidade_base: toNullIfBlank(form.cidade),
      raio_deslocacao: toNullIfBlank(form.raio),

      // campos que podem estar "" mas ideal é null no banco
      area_id: toNullIfBlank(form.area_id),
      tipo_contrato: toNullIfBlank(form.tipo_contrato),
      disponibilidade: toNullIfBlank(form.disponibilidade),
      nacionalidade: toNullIfBlank(form.nacionalidade),
      cidade: toNullIfBlank(form.cidade),

      // opcionais
      site: toNullIfBlank(form.site),
      instagram: toNullIfBlank(form.instagram),
      linkedin: toNullIfBlank(form.linkedin),
    };

    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  /* Scroll suave para bloco da tab */
  useEffect(() => {
    const el = containerRef.current?.querySelector(`#sec-${tab}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tab]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100]">
          <style>{`
            .aw-modal-open {
              position: fixed;
              width: 100%;
              overflow: hidden;
              touch-action: none;
            }
            @supports(height: 100svh){
              .aw-svh { height: 100svh; max-height: 100svh; }
            }
            .aw-modal-scroll {
              -webkit-overflow-scrolling: touch;
              overscroll-behavior: contain;
              touch-action: pan-y;
            }
          `}</style>

          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
            className="
              absolute inset-x-0 top-0 mx-auto
              w-[min(100vw,1120px)]
              sm:top-3 sm:w-[min(96vw,1120px)]
            "
          >
            <div
              className="
                bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl
                border border-slate-200 dark:border-slate-800
                shadow-xl overflow-hidden
                aw-svh sm:max-h-[92vh] flex flex-col
              "
              style={{ maxWidth: "1120px" }}
            >
              <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
                <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                      Editar Perfil Profissional
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 border border-sky-200 dark:text-sky-300 dark:border-sky-500/20">
                      <Sparkles className="w-3.5 h-3.5" /> {completion}%
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-3 sm:px-4 pb-3 pt-0 flex flex-wrap gap-2">
                  <Pill
                    active={tab === "basico"}
                    onClick={() => setTab("basico")}
                    icon={<User2 className="w-3.5 h-3.5" />}
                  >
                    Básico
                  </Pill>
                  <Pill
                    active={tab === "prof"}
                    onClick={() => setTab("prof")}
                    icon={<Briefcase className="w-3.5 h-3.5" />}
                  >
                    Profissional
                  </Pill>
                  <Pill
                    active={tab === "mob"}
                    onClick={() => setTab("mob")}
                    icon={<MapPin className="w-3.5 h-3.5" />}
                  >
                    Mobilidade
                  </Pill>
                  <Pill
                    active={tab === "links"}
                    onClick={() => setTab("links")}
                    icon={<MessageSquareText className="w-3.5 h-3.5" />}
                  >
                    Contatos & Notas
                  </Pill>
                </div>
              </div>

              <div
                ref={containerRef}
                className="
                  aw-modal-scroll
                  flex-1 overflow-y-auto overflow-x-hidden
                  px-4 sm:px-5 md:px-6 py-5 sm:py-6 space-y-10
                  scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-900/20
                  max-w-full
                "
              >
                <Section
                  id="sec-basico"
                  title="Informações básicas"
                  icon={<User2 className="w-4 h-4" />}
                >
                  <Grid>
                    <Input
                      icon={<User2 />}
                      label="Nome Completo*"
                      value={form.nome}
                      onChange={(v: string) => set("nome", v)}
                      error={errors.nome}
                    />
                    <Input
                      icon={<Mail />}
                      label="Email"
                      value={form.email}
                      onChange={(v: string) => set("email", v)}
                    />
                    <Input
                      icon={<Phone />}
                      label="Telefone*"
                      value={form.telefone}
                      onChange={(v: string) => set("telefone", v)}
                      inputMode="tel"
                      error={errors.telefone}
                    />
                    <Input
                      icon={<Phone />}
                      label="WhatsApp"
                      value={form.whatsapp}
                      onChange={(v: string) => set("whatsapp", v)}
                      inputMode="tel"
                    />
                    <Input
                      icon={<Calendar />}
                      label="Data de Nascimento"
                      type="date"
                      value={form.data_nascimento}
                      onChange={(v: string) => set("data_nascimento", v)}
                    />
                    <Combo
                      icon={<Globe2 />}
                      label="Nacionalidade*"
                      value={form.nacionalidade}
                      onChange={(v: string) => set("nacionalidade", v)}
                      suggestions={NACIONALIDADES_SUG}
                      placeholder="Ex.: Portugal, Brasil…"
                      error={errors.nacionalidade}
                    />
                    <ChipMultiSelect
                      icon={<Languages />}
                      label="Idiomas"
                      values={form.idiomas || []}
                      onChange={(vals: string[]) => set("idiomas", vals)}
                      suggestions={IDIOMAS_SUG}
                      helper="Clique para marcar; digite para procurar; Enter para adicionar."
                    />
                  </Grid>
                </Section>

                <Section
                  id="sec-prof"
                  title="Informações profissionais"
                  icon={<Briefcase className="w-4 h-4" />}
                >
                  <Grid>
                    <AreaSelect
                      icon={<Briefcase />}
                      label="Área Principal*"
                      value={form.area_id}
                      onChange={(v: string) => set("area_id", v)}
                      areas={areas}
                      error={errors.area_id}
                    />
                    <Input
                      icon={<BadgeCheck />}
                      label="Nível"
                      value={form.nivel}
                      onChange={(v: string) => set("nivel", v)}
                      disabled
                    />
                    <NumberInput
                      icon={<Gauge />}
                      label="Anos de Experiência*"
                      value={form.anos_experiencia}
                      onChange={(v: number) => set("anos_experiencia", v)}
                      min={0}
                      max={60}
                      error={errors.anos_experiencia}
                    />

                    {/* Valor por dia removido */}

                    <Combo
                      icon={<FileText />}
                      label="Tipo de Contrato*"
                      value={form.tipo_contrato}
                      onChange={(v: string) => set("tipo_contrato", v)}
                      suggestions={CONTRATOS_SUG}
                      placeholder="Ex.: Recibos verdes, contrato…"
                      error={errors.tipo_contrato}
                    />
                    <Segmented
                      icon={<Clock4 />}
                      label="Disponibilidade*"
                      value={form.disponibilidade}
                      onChange={(v: string) => set("disponibilidade", v)}
                      options={SEG_AVAIL}
                      error={errors.disponibilidade}
                    />
                    {/* Função na obra e Habilidades removidos */}
                  </Grid>
                </Section>

                <Section
                  id="sec-mob"
                  title="Localização e mobilidade"
                  icon={<MapPin className="w-4 h-4" />}
                >
                  <Grid>
                    <Input
                      icon={<Home />}
                      label="Cidade Base*"
                      value={form.cidade}
                      onChange={(v: string) => set("cidade", v)}
                      error={errors.cidade}
                    />
                    <Segmented
                      icon={<Plane />}
                      label="Pode Viajar?*"
                      value={form.pode_viajar}
                      onChange={(v: string) => set("pode_viajar", v)}
                      options={SEG_BOOL}
                      error={errors.pode_viajar}
                    />
                    <Segmented
                      icon={<Home />}
                      label="Pode Alojamento?"
                      value={form.pode_alojamento}
                      onChange={(v: string) => set("pode_alojamento", v)}
                      options={SEG_BOOL}
                    />
                    <Select
                      icon={<Ruler />}
                      label="Raio de Deslocação"
                      value={form.raio}
                      onChange={(v: string) => set("raio", v)}
                      options={RAIO_OPTS}
                    />
                  </Grid>
                </Section>

                <Section
                  id="sec-links"
                  title="Contatos e observações"
                  icon={<MessageSquareText className="w-4 h-4" />}
                >
                  <Grid>
                    <TextArea
                      icon={<MessageSquareText />}
                      label="Observações (opcional)"
                      value={form.observacoes}
                      onChange={(v: string) => set("observacoes", v)}
                      placeholder="Ex.: Disponível para turnos noturnos, trabalha com própria ferramenta, etc."
                      rows={4}
                    />
                  </Grid>
                </Section>
              </div>

              <div className="sticky bottom-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-4 sm:px-5 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
                <div className="hidden md:flex items-center gap-3 w-1/2">
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[64px] text-right">
                    {completion}%
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      saving
                        ? "bg-sky-400/60 text-white cursor-not-allowed"
                        : "bg-sky-600 text-white hover:bg-sky-500"
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando…" : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ================================
   Primitives reutilizáveis
================================== */
function Pill({ active, onClick, children, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition
        ${
          active
            ? "bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-300 dark:border-sky-500/20"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
    >
      {icon} {children}
    </button>
  );
}

function Section({ id, title, icon, children }: any) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  icon,
  inputMode,
  error,
}: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          className={`w-full rounded-lg pl-10 pr-3 py-2.5 border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          ${
            disabled
              ? "opacity-70 cursor-not-allowed"
              : "focus:outline-none focus:ring-2 focus:ring-sky-500"
          }
          ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-slate-300 dark:border-slate-700"
          }`}
        />
      </div>
      {error && (
        <span className="mt-1 text-[11px] text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, icon }: any) {
  return (
    <div className="flex flex-col md:col-span-2">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-3 text-slate-400">{icon}</span>
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg pl-10 pr-3 py-2.5 border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
        />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, icon, error }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg pl-10 pr-3 py-2.5 border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2
          ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-slate-300 dark:border-slate-700 focus:ring-sky-500"
          }`}
        >
          <option value="">Selecionar…</option>
          {options.map((o: string) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <span className="mt-1 text-[11px] text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}

function Segmented({ label, value, onChange, options, icon, error }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div
        className={`flex flex-wrap gap-2 rounded-lg ${
          error ? "ring-1 ring-rose-500/80 p-1" : ""
        }`}
      >
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm border transition
              ${
                value === opt
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && (
        <span className="mt-1 text-[11px] text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  icon,
  error,
}: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type="number"
          min={min}
          max={max}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full rounded-lg pl-10 pr-3 py-2.5 border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-slate-300 dark:border-slate-700 focus:ring-sky-500"
          }`}
        />
      </div>
      {error && (
        <span className="mt-1 text-[11px] text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}

function Combo({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder,
  icon,
  error,
}: any) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value || "");
  useEffect(() => setQ(value || ""), [value]);
  const filtered = suggestions.filter((s: string) =>
    s.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="flex flex-col relative">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          className={`w-full rounded-lg pl-10 pr-3 py-2.5 border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-slate-300 dark:border-slate-700 focus:ring-sky-500"
          }`}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow max-h-52 overflow-y-auto">
          {filtered.slice(0, 12).map((s: string) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s);
                setQ(s);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {error && (
        <span className="mt-1 text-[11px] text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}

function ChipMultiSelect({
  label,
  values,
  onChange,
  suggestions = [],
  helper,
  icon,
}: any) {
  const [query, setQuery] = useState("");
  const normalized = (query || "").toLowerCase().trim();
  const filtered = suggestions.filter(
    (s: string) => s.toLowerCase().includes(normalized) && !values.includes(s)
  );

  const add = (v: string) => {
    const clean = v.trim();
    if (!clean) return;
    if (!values.includes(clean)) onChange([...values, clean]);
    setQuery("");
  };
  const remove = (v: string) => onChange(values.filter((x: string) => x !== v));
  const toggle = (v: string) => (values.includes(v) ? remove(v) : add(v));

  return (
    <div className="flex flex-col md:col-span-2">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>

      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
          <span className="text-slate-400">{icon}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add(query)}
            placeholder="Digite para procurar… (Enter para adicionar)"
            className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {helper && (
            <span className="hidden md:block text-[11px] text-slate-400">
              {helper}
            </span>
          )}
        </div>

        <div className="p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {(normalized ? filtered : suggestions)
              .slice(0, 12)
              .map((s: string) => {
                const selected = values.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs border transition
                    ${
                      selected
                        ? "bg-sky-600 text-white border-sky-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {values.map((v: string) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-300 dark:border-sky-500/20"
              >
                {v}
                <button
                  onClick={() => remove(v)}
                  className="ml-1 opacity-70 hover:opacity-100"
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AreaSelect({ label, value, onChange, areas, icon, error }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg pl-10 pr-3 py-2.5 border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2
          ${
            error
              ? "border-rose-500 focus:ring-rose-500"
              : "border-slate-300 dark:border-slate-700 focus:ring-sky-500"
          }`}
        >
          <option value="">Selecionar…</option>
          {areas.map((a: { id: string; nome: string }) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <span className="mt-1 text-[11px] text-rose-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
