// src/components/company/CentralDeNavegacaoEmpresa/Outros/PerfilEmpresa.tsx
"use client";

import { useEffect, useMemo, useState, useRef, type ChangeEvent } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =======================
   Tipos
======================= */

type EmpresaRow = {
  id: string;
  nome_legal?: string | null;
  nome_comercial?: string | null;
  nif?: string | null;
  telefone_geral?: string | null;
  cidade?: string | null;
  pais?: string | null;
  email_principal?: string | null;
  morada_fiscal?: string | null;

  email_faturacao?: string | null;

  contacto_operacional_nome?: string | null;
  contacto_operacional_telemovel?: string | null;

  // outros campos que não editamos aqui mas existem na tabela
  url_logo?: string | null;
  website?: string | null;
};

const LOGO_BUCKET = "empresa-logos";

function initialsFrom(name?: string | null) {
  const base = (name || "").trim() || "Empresa";
  const parts = base.split(/\s+/);
  const first = parts[0]?.[0] ?? "E";
  const last = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + last).toUpperCase();
}

function hueFrom(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) % 360;
  }
  return h;
}

/* =======================
   Componente principal
======================= */

export default function PerfilEmpresa() {
  const { user } = useAuth();

  const [empresa, setEmpresa] = useState<EmpresaRow | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<EmpresaRow>({ id: "" });

  // controla exibição de erros de campos obrigatórios
  const [forceValidate, setForceValidate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ========= carregar empresa do utilizador ========= */

  useEffect(() => {
    async function fetchEmpresa() {
      if (!user?.email) return;

      setLoading(true);
      setError(null);

      try {
        // 1) utilizador -> empresa_id
        const { data: usuario, error: errUser } = await supabase
          .from("usuarios")
          .select("id, empresa_id")
          .eq("email", user.email)
          .maybeSingle();

        if (errUser) throw errUser;
        if (!usuario?.empresa_id) {
          setError("Não foi possível encontrar a empresa deste utilizador.");
          setLoading(false);
          return;
        }

        const empId = usuario.empresa_id as string;
        setEmpresaId(empId);

        // 2) dados da empresa
        const { data: emp, error: errEmp } = await supabase
          .from("empresas")
          .select("*")
          .eq("id", empId)
          .maybeSingle();

        if (errEmp) throw errEmp;
        if (!emp) {
          setError("Empresa não encontrada na base de dados.");
          setLoading(false);
          return;
        }

        const base: EmpresaRow = {
          id: empId,
          ...(emp as any),
        };

        if (!base.pais) base.pais = "Portugal";

        setEmpresa(base);
        setForm(base);
      } catch (e: any) {
        console.error(e);
        setError("Erro ao carregar dados da empresa.");
      } finally {
        setLoading(false);
      }
    }

    fetchEmpresa();
  }, [user?.email]);

  /* ========= helpers form ========= */

  const handleChange = (field: keyof EmpresaRow, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* ========= campos obrigatórios / progresso ========= */

  const requiredFields: (keyof EmpresaRow)[] = [
    "nome_legal",
    "nif",
    "telefone_geral",
    "cidade",
    "pais",
    "email_faturacao",
    "contacto_operacional_nome",
    "contacto_operacional_telemovel",
  ];

  const missingRequiredKeys = useMemo(
    () =>
      requiredFields.filter((key) => {
        const v = form[key];
        if (v === null || v === undefined) return true;
        if (typeof v === "string" && v.trim().length === 0) return true;
        return false;
      }),
    [
      form.nome_legal,
      form.nif,
      form.telefone_geral,
      form.cidade,
      form.pais,
      form.email_faturacao,
      form.contacto_operacional_nome,
      form.contacto_operacional_telemovel,
    ]
  );

  const hasMissingRequired = missingRequiredKeys.length > 0;

  const camposObrigatorios = useMemo(
    () => [
      !!form.nome_legal,
      !!form.nif,
      !!form.telefone_geral,
      !!form.cidade,
      !!form.pais,
      !!form.email_faturacao,
      !!form.contacto_operacional_nome,
      !!form.contacto_operacional_telemovel,
    ],
    [
      form.nome_legal,
      form.nif,
      form.telefone_geral,
      form.cidade,
      form.pais,
      form.email_faturacao,
      form.contacto_operacional_nome,
      form.contacto_operacional_telemovel,
    ]
  );

  const percentEssencial = useMemo(() => {
    const filled = camposObrigatorios.filter(Boolean).length;
    return Math.round((filled / camposObrigatorios.length) * 100);
  }, [camposObrigatorios]);

  const missingCount = camposObrigatorios.filter((x) => !x).length;

  // estilos dos inputs
  const inputBase =
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500/60";
  const inputNormal = "border-slate-200 dark:border-slate-700";
  const inputErro =
    "border-amber-400 bg-amber-50/40 dark:border-amber-400/80 dark:bg-amber-500/5";

  const showFieldError = (key: keyof EmpresaRow) =>
    forceValidate && missingRequiredKeys.includes(key);

  /* ========= upload de logo ========= */

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecione um ficheiro de imagem.");
      e.target.value = "";
      return;
    }

    const maxSizeMb = 5;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Imagem demasiado grande (máx. ${maxSizeMb}MB).`);
      e.target.value = "";
      return;
    }

    setUploadingLogo(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${empresaId}/logo_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(path);

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error("Não foi possível obter o URL público.");

      setForm((prev) => ({ ...prev, url_logo: publicUrl }));
      setEmpresa((prev) => (prev ? { ...prev, url_logo: publicUrl } : prev));

      const { error: dbError } = await supabase
        .from("empresas")
        .update({ url_logo: publicUrl })
        .eq("id", empresaId);

      if (dbError) throw dbError;

      setSuccess("Logótipo atualizado com sucesso.");
      setTimeout(() => setSuccess(null), 4000);

      const nomeLegal = form.nome_legal || null;

      window.dispatchEvent(
        new CustomEvent("empresa-header-updated", {
          detail: {
            nome: nomeLegal,
            url_logo: publicUrl,
          },
        })
      );
    } catch (err) {
      console.error(err);
      setError("Erro ao fazer upload do logótipo.");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  /* ========= guardar ========= */

  const handleSave = async () => {
    if (!empresaId) return;

    // primeiro: validação
    if (hasMissingRequired) {
      setForceValidate(true);
      setError(null); // é um "erro de formulário", não de servidor
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Partial<EmpresaRow> = {
        nome_legal: form.nome_legal || null,
        nome_comercial: form.nome_comercial || null,
        nif: form.nif || null,
        telefone_geral: form.telefone_geral || null,
        cidade: form.cidade || null,
        pais: form.pais || null,
        email_principal: form.email_principal || form.email_faturacao || null,
        morada_fiscal: form.morada_fiscal || null,
        email_faturacao: form.email_faturacao || null,
        contacto_operacional_nome: form.contacto_operacional_nome || null,
        contacto_operacional_telemovel:
          form.contacto_operacional_telemovel || null,
        website: form.website || null,
        url_logo: form.url_logo || null,
      };

      const { data, error: err } = await supabase
        .from("empresas")
        .update(payload)
        .eq("id", empresaId)
        .select("*")
        .single();

      if (err) {
        console.error("Erro no update de empresas:", err);
        setError("Erro ao guardar alterações na empresa.");
        setSaving(false);
        return;
      }

      if (!data) {
        console.error("Update não retornou nenhum registo");
        setError("Não foi possível atualizar os dados da empresa.");
        setSaving(false);
        return;
      }

      const atualizada: EmpresaRow = {
        id: empresaId,
        ...(data as any),
      };

      setEmpresa(atualizada);
      setForm(atualizada);
      setForceValidate(false);

      setSuccess("Perfil atualizado com sucesso.");
      setTimeout(() => setSuccess(null), 4000);

      const nomeLegal = atualizada.nome_legal || null;

      window.dispatchEvent(
        new CustomEvent("empresa-header-updated", {
          detail: {
            nome: nomeLegal,
            url_logo: atualizada.url_logo || null,
          },
        })
      );
    } catch (e: any) {
      console.error(e);
      setError("Erro ao guardar alterações.");
    } finally {
      setSaving(false);
    }
  };

  // nome que usamos no cartão e no avatar
  const displayName =
    form.nome_legal || form.nome_comercial || "Nome da empresa";
  const initials = initialsFrom(displayName);
  const hue = hueFrom(displayName);
  const avatarBg = { backgroundColor: `hsl(${hue} 70% 45%)` };

  /* ========= UI ========= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        A carregar perfil da empresa…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho clean, com avatar clicável */}
      <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleLogoClick}
              className="relative group"
            >
              <div className="h-14 w-14 rounded-full ring-2 ring-sky-100 dark:ring-sky-700/60 shadow-sm overflow-hidden bg-slate-200 text-white grid place-items-center text-sm font-semibold">
                {form.url_logo ? (
                  <img
                    src={form.url_logo}
                    alt="Logótipo da empresa"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full grid place-items-center"
                    style={avatarBg}
                  >
                    <span>{initials}</span>
                  </div>
                )}
              </div>

              {/* overlay de loading */}
              {uploadingLogo && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}

              {/* hint hover */}
              <span className="pointer-events-none absolute -bottom-5 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 shadow-sm transition group-hover:opacity-100 sm:block">
                Alterar foto / logótipo
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />

            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {displayName}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Perfil usado em contratos, faturação e gestão operacional da mão
                de obra. Clique no logótipo para atualizar a imagem.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Perfil essencial {percentEssencial}% concluído
                {missingCount > 0 && ` • faltam ${missingCount} campos`}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Mensagens topo */}
      {forceValidate && hasMissingRequired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/60 dark:bg-amber-900/40 dark:text-amber-100">
          Preencha os campos obrigatórios assinalados.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
          {success}
        </div>
      )}

      {/* GRID PRINCIPAL */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Dados da empresa */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-900/40">
              <Building2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Dados da empresa
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informações legais usadas em contratos e no cabeçalho das
                faturas.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Nome legal da empresa *
              </label>
              <input
                className={`${inputBase} ${
                  showFieldError("nome_legal") ? inputErro : inputNormal
                }`}
                value={form.nome_legal || ""}
                onChange={(e) => handleChange("nome_legal", e.target.value)}
                placeholder="Ex.: Beniteca Infraestruturas"
              />
              {showFieldError("nome_legal") && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Campo obrigatório.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Nome comercial / como será apresentada (opcional)
              </label>
              <input
                className={`${inputBase} ${inputNormal}`}
                value={form.nome_comercial || ""}
                onChange={(e) =>
                  handleChange("nome_comercial", e.target.value)
                }
                placeholder="Ex.: Beniteca Infraestruturas"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  NIF / Número de contribuinte *
                </label>
                <input
                  className={`${inputBase} ${
                    showFieldError("nif") ? inputErro : inputNormal
                  }`}
                  value={form.nif || ""}
                  onChange={(e) => handleChange("nif", e.target.value)}
                  placeholder="Ex.: 509 000 000"
                />
                {showFieldError("nif") && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Campo obrigatório.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Telefone geral *
                </label>
                <div
                  className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-900 ${
                    showFieldError("telefone_geral") ? inputErro : inputNormal
                  }`}
                >
                  <Phone className="h-4 w-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent outline-none"
                    value={form.telefone_geral || ""}
                    onChange={(e) =>
                      handleChange("telefone_geral", e.target.value)
                    }
                    placeholder="+351 21 000 0000"
                  />
                </div>
                {showFieldError("telefone_geral") && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Campo obrigatório.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Cidade *
                </label>
                <div
                  className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-900 ${
                    showFieldError("cidade") ? inputErro : inputNormal
                  }`}
                >
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent outline-none"
                    value={form.cidade || ""}
                    onChange={(e) => handleChange("cidade", e.target.value)}
                    placeholder="Ex.: Lisboa"
                  />
                </div>
                {showFieldError("cidade") && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Campo obrigatório.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  País *
                </label>
                <input
                  className={`${inputBase} ${
                    showFieldError("pais") ? inputErro : inputNormal
                  }`}
                  value={form.pais || ""}
                  onChange={(e) => handleChange("pais", e.target.value)}
                  placeholder="Portugal"
                />
                {showFieldError("pais") && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Campo obrigatório.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Morada fiscal / sede
              </label>
              <input
                className={`${inputBase} ${inputNormal}`}
                value={form.morada_fiscal || ""}
                onChange={(e) =>
                  handleChange("morada_fiscal", e.target.value)
                }
                placeholder="Rua, nº, código postal"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Website da empresa (opcional)
              </label>
              <input
                className={`${inputBase} ${inputNormal}`}
                value={form.website || ""}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://empresa.pt"
              />
            </div>
          </div>
        </section>

        {/* Faturação + contacto */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#020617]">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Faturação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email usado no envio de faturas emitidas pela Acrobatas para
                esta empresa.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Email para envio de faturas *
              </label>
              <div
                className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm bg-white dark:bg-slate-900 ${
                  showFieldError("email_faturacao") ? inputErro : inputNormal
                }`}
              >
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  className="w-full bg-transparent outline-none"
                  value={form.email_faturacao || ""}
                  onChange={(e) =>
                    handleChange("email_faturacao", e.target.value)
                  }
                  placeholder="faturacao@empresa.pt"
                />
              </div>
              {showFieldError("email_faturacao") && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Campo obrigatório.
                </p>
              )}
            </div>
          </div>

          <hr className="my-4 border-dashed border-slate-200 dark:border-slate-800" />

          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/40">
              <Phone className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Contacto operacional
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Responsável por obras, equipas e contacto diário com a
                Acrobatas.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Nome da pessoa de contacto *
              </label>
              <input
                className={`${inputBase} ${
                  showFieldError("contacto_operacional_nome")
                    ? inputErro
                    : inputNormal
                }`}
                value={form.contacto_operacional_nome || ""}
                onChange={(e) =>
                  handleChange("contacto_operacional_nome", e.target.value)
                }
                placeholder="Ex.: Eng. João Silva"
              />
              {showFieldError("contacto_operacional_nome") && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Campo obrigatório.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Telemóvel / telefone direto *
              </label>
              <input
                className={`${inputBase} ${
                  showFieldError("contacto_operacional_telemovel")
                    ? inputErro
                    : inputNormal
                }`}
                value={form.contacto_operacional_telemovel || ""}
                onChange={(e) =>
                  handleChange(
                    "contacto_operacional_telemovel",
                    e.target.value
                  )
                }
                placeholder="+351 9xx xxx xxx"
              />
              {showFieldError("contacto_operacional_telemovel") && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  Campo obrigatório.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Footer guardar */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 pt-4 text-xs text-slate-500 dark:border-slate-800/70 dark:text-slate-400">
        <span>
          Estes dados serão usados nos contratos, faturas e comunicação com a
          equipa Acrobatas.
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar alterações
        </button>
      </div>
    </div>
  );
}
