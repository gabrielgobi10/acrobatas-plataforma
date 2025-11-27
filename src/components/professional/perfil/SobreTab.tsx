import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  FileText,
  Clock4,
  Gauge,
  Banknote,
  MapPin,
  Plane,
  Home,
  Sparkles,
  PencilLine as EditIcon,
  Check,
  X,
  CalendarDays,
  Flag,
  Languages,
  Star,
} from "lucide-react";

/** ===== Tipos (inclui campos novos que você pediu) ===== */
export type PerfilSobre = {
  bio?: string | null;

  // PROFISSIONAL
  area_principal?: string | null;
  funcao_obra?: string | null;
  funcao?: string | null;                 // compat
  tipo_contrato?: string | null;
  nivel?: string | null;
  anos_experiencia?: number | null;
  experiencia?: number | null;            // compat
  valor_diario?: string | number | null;  // exibido como valor por hora
  disponibilidade?: string | null;
  habilidades?: string[] | null;

  // IDENTIFICAÇÃO
  nacionalidade?: string | null;
  data_nascimento?: string | null;        // ISO ou qualquer string exibível
  idiomas?: string[] | null;

  // LOCALIZAÇÃO
  cidade_base?: string | null;
  cidade?: string | null;                 // compat
  raio_deslocacao?: string | null;
  raio?: string | null;                   // compat
  pode_viajar?: boolean | string | null;
  pode_alojamento?: boolean | string | null;
};

type Props = {
  perfil: PerfilSobre;
  onSaveBio?: (texto: string) => Promise<void> | void;
  bioMaxLength?: number;
};

/** ===== Helpers ===== */
const valOr = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v);

const fmtMoney = (v?: string | number | null) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (Number.isNaN(n)) return String(v);
  return `€ ${n.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}`;
};

const fmtBool = (v?: boolean | string | null) => {
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (["sim", "true", "1"].includes(s)) return "Sim";
    if (["não", "nao", "false", "0"].includes(s)) return "Não";
    return v;
  }
  return "—";
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? valOr(iso) : d.toLocaleDateString("pt-PT");
};

function Line({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span className="opacity-80">{icon}</span>
        <span className="text-[13px]">{label}</span>
      </div>
      <span className="text-[13px] font-medium text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700">
      {children}
    </span>
  );
}

/** ===== Componente ===== */
const SobreTab = memo(function SobreTab({
  perfil,
  onSaveBio,
  bioMaxLength = 800,
}: Props) {
  // Compat / normalização
  const anos = Number(perfil.anos_experiencia ?? perfil.experiencia ?? 0);
  const funcaoObra = perfil.funcao_obra ?? perfil.funcao ?? undefined;
  const cidadeBase = perfil.cidade_base ?? perfil.cidade ?? undefined;
  const raioDeslocacao = perfil.raio_deslocacao ?? perfil.raio ?? undefined;
  const valorHora = perfil.valor_diario;

  // Estado do "Sobre mim"
  const [editing, setEditing] = useState(false);
  const [bioText, setBioText] = useState(
    (perfil.bio ?? "").trim() ||
      "Profissional focado em qualidade, prazos e segurança. Atendo pinturas, pequenas reformas e acabamentos com atenção ao detalhe e limpeza do local."
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setBioText((perfil.bio ?? "").trim() || "");
    }
  }, [perfil.bio, editing]);

  const remaining = Math.max(0, bioMaxLength - bioText.length);

  const handleCancel = () => {
    setBioText((perfil.bio ?? "").trim() || "");
    setEditing(false);
  };

  const handleSave = async () => {
    if (!onSaveBio) {
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await onSaveBio(bioText.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const habilidades = useMemo(
    () => (perfil.habilidades ?? []).filter(Boolean),
    [perfil.habilidades]
  );
  const idiomas = useMemo(
    () => (perfil.idiomas ?? []).filter(Boolean),
    [perfil.idiomas]
  );

  return (
    <div className="space-y-8">
      {/* ===== Sobre mim (sem chips extras) ===== */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sobre mim
            </h3>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
            >
              <EditIcon className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>

        {!editing ? (
          <p className="mt-3 text-[15px] leading-7 text-slate-800 dark:text-slate-200">
            {bioText && bioText.trim().length > 0
              ? bioText
              : "Adicione uma breve descrição do seu trabalho, experiência e como você atende o cliente."}
          </p>
        ) : (
          <div className="mt-3">
            <textarea
              value={bioText}
              onChange={(e) =>
                setBioText(
                  e.target.value.length > bioMaxLength
                    ? e.target.value.slice(0, bioMaxLength)
                    : e.target.value
                )
              }
              rows={6}
              placeholder="Escreva aqui sobre você e seus serviços (ex.: Pintura interior/exterior, reparos de parede, acabamento, limpeza do local, etc.)"
              className="w-full resize-y rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 px-3 py-2"
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {remaining} caracteres restantes
              </span>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== Cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profissional */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Briefcase className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Profissional
            </h4>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <Line
              icon={<FileText className="w-4 h-4" />}
              label="Área principal"
              value={valOr(perfil.area_principal)}
            />
            <Line
              icon={<Briefcase className="w-4 h-4" />}
              label="Função na obra"
              value={valOr(funcaoObra)}
            />
            <Line
              icon={<FileText className="w-4 h-4" />}
              label="Tipo de contrato"
              value={valOr(perfil.tipo_contrato)}
            />
            <Line
              icon={<Gauge className="w-4 h-4" />}
              label="Nível"
              value={valOr(perfil.nivel || "Profissional")}
            />
            <Line
              icon={<Clock4 className="w-4 h-4" />}
              label="Experiência"
              value={`${Math.max(0, Number(anos))}+ anos`}
            />
            <Line
              icon={<Banknote className="w-4 h-4" />}
              label="Valor por hora"
              value={fmtMoney(valorHora)}
            />
            <Line
              icon={<Sparkles className="w-4 h-4" />}
              label="Disponibilidade"
              value={valOr(perfil.disponibilidade)}
            />
          </div>

          {/* Habilidades */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Habilidades
              </span>
            </div>
            {habilidades.length ? (
              <div className="flex flex-wrap gap-1.5">
                {habilidades.map((h) => (
                  <Tag key={h}>{h}</Tag>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400">
                —
              </div>
            )}
          </div>
        </div>

        {/* Identificação */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <FileText className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Identificação
            </h4>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            <Line
              icon={<Flag className="w-4 h-4" />}
              label="Nacionalidade"
              value={valOr(perfil.nacionalidade)}
            />
            <Line
              icon={<CalendarDays className="w-4 h-4" />}
              label="Data de nascimento"
              value={fmtDate(perfil.data_nascimento)}
            />
          </div>

          {/* Idiomas */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-1">
              <Languages className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Idiomas
              </span>
            </div>
            {idiomas.length ? (
              <div className="flex flex-wrap gap-1.5">
                {idiomas.map((i) => (
                  <Tag key={i}>{i}</Tag>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-slate-500 dark:text-slate-400">
                —
              </div>
            )}
          </div>
        </div>

        {/* Localização & Mobilidade */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Localização & Mobilidade
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              <Line
                icon={<Home className="w-4 h-4" />}
                label="Cidade base"
                value={valOr(cidadeBase)}
              />
              <Line
                icon={<Sparkles className="w-4 h-4" />}
                label="Raio de deslocação"
                value={valOr(raioDeslocacao)}
              />
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              <Line
                icon={<Plane className="w-4 h-4" />}
                label="Pode viajar"
                value={fmtBool(perfil.pode_viajar)}
              />
              <Line
                icon={<Home className="w-4 h-4" />}
                label="Aceita alojamento"
                value={fmtBool(perfil.pode_alojamento)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SobreTab;
