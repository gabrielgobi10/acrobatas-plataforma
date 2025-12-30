import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  FileText,
  Clock4,
  Gauge,
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================================================
   Tipos
========================================================= */
export type PerfilSobre = {
  bio?: string | null;

  // PROFISSIONAL
  area_id?: string | null; // AGORA É O CAMPO OFICIAL
  funcao_obra?: string | null;
  funcao?: string | null;
  tipo_contrato?: string | null;
  nivel?: string | null;
  anos_experiencia?: number | null;
  experiencia?: number | null;
  // valor_diario removido (não aparece mais)
  disponibilidade?: string | null;
  habilidades?: string[] | null;

  // IDENTIFICAÇÃO
  nacionalidade?: string | null;
  data_nascimento?: string | null;
  idiomas?: string[] | null;

  // LOCALIZAÇÃO
  cidade_base?: string | null;
  cidade?: string | null;
  raio_deslocacao?: string | null;
  raio?: string | null;
  pode_viajar?: boolean | string | null;
  pode_alojamento?: boolean | string | null;
};

type Props = {
  perfil: PerfilSobre;
  onSaveBio?: (texto: string) => Promise<void> | void;
  bioMaxLength?: number;
};

/* =========================================================
   Helpers
========================================================= */
const valOr = (v: any) =>
  v === null || v === undefined || String(v).trim() === "" ? "—" : String(v);

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

function Line({ icon, label, value }: any) {
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

function Tag({ children }: any) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700">
      {children}
    </span>
  );
}

/* =========================================================
   Componente principal
========================================================= */
const SobreTab = memo(function SobreTab({
  perfil,
  onSaveBio,
  bioMaxLength = 800,
}: Props) {
  /* ================================
     NOVO: Buscar nome da área pelo area_id
  ================================= */
  const [areaNome, setAreaNome] = useState("—");

  useEffect(() => {
    const loadArea = async () => {
      if (!perfil.area_id) return;

      const { data } = await supabase
        .from("profissional_areas")
        .select("nome")
        .eq("id", perfil.area_id)
        .maybeSingle();

      if (data?.nome) setAreaNome(data.nome);
    };
    loadArea();
  }, [perfil.area_id]);

  /* ================================
     Data normalization
  ================================= */
  const anos = Number(perfil.anos_experiencia ?? perfil.experiencia ?? 0);
  const cidadeBase = perfil.cidade_base ?? perfil.cidade ?? undefined;
  const raioDeslocacao = perfil.raio_deslocacao ?? perfil.raio ?? undefined;

  /* ================================
     BIO — editar/salvar
  ================================= */
  const [editing, setEditing] = useState(false);
  const [bioText, setBioText] = useState(
    (perfil.bio ?? "").trim() ||
      "Profissional focado em qualidade, prazos e segurança."
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setBioText((perfil.bio ?? "").trim());
    }
  }, [perfil.bio, editing]);

  const remaining = Math.max(0, bioMaxLength - bioText.length);

  const handleSave = async () => {
    if (!onSaveBio) return setEditing(false);
    setSaving(true);
    await onSaveBio(bioText.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setBioText((perfil.bio ?? "").trim());
    setEditing(false);
  };

  const idiomas = useMemo(
    () => (perfil.idiomas ?? []).filter(Boolean),
    [perfil.idiomas]
  );

  return (
    <div className="space-y-8">
      {/* =====================================================
         SOBRE MIM
      ===================================================== */}
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
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
            >
              <EditIcon className="w-3.5 h-3.5" /> Editar
            </button>
          )}
        </div>

        {!editing ? (
          <p className="mt-3 text-[15px] leading-7 text-slate-800 dark:text-slate-200">
            {bioText?.trim()?.length
              ? bioText
              : "Adicione uma breve descrição sobre sua experiência e serviços."}
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
              className="w-full rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 px-3 py-2"
            />

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {remaining} caracteres restantes
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-white"
                >
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
         CARDS DE INFORMAÇÕES
      ===================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PROFISSIONAL */}
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
              value={areaNome}
            />

            <Line
              icon={<FileText className="w-4 h-4" />}
              label="Tipo de contrato"
              value={valOr(perfil.tipo_contrato)}
            />

            <Line
              icon={<Gauge className="w-4 h-4" />}
              label="Nível"
              value={valOr(perfil.nivel || "Aprendiz")}
            />

            <Line
              icon={<Clock4 className="w-4 h-4" />}
              label="Experiência"
              value={`${Math.max(0, anos)} anos`}
            />

            {/* Valor por dia/hora removido */}

            <Line
              icon={<Sparkles className="w-4 h-4" />}
              label="Disponibilidade"
              value={valOr(perfil.disponibilidade)}
            />
          </div>
        </div>

        {/* IDENTIFICAÇÃO */}
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

          {/* IDIOMAS */}
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

        {/* LOCALIZAÇÃO */}
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
