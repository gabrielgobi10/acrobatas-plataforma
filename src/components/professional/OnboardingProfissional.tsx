// src/components/professional/OnboardingProfissional.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  User as UserIcon,
  Phone,
  Flag,
  MapPin,
  Briefcase,
  Clock4,
  Globe2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Camera,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const BUCKET_NAME = "public";

type Props = {
  onFinish?: () => void;
};

type Step = 1 | 2 | 3 | 4;

type AreaFromDB = {
  id: string;
  nome: string;
  slug?: string | null;
  ativo?: boolean | null;
  ordem?: number | null;
};

type FormState = {
  // passo 1
  nome_completo: string;
  telefone: string;
  nacionalidade: string;
  outra_nacionalidade: string;
  cidade_base: string;

  // passo 2
  area_id: string;
  anos_experiencia: string;
  funcao_obra: string;
  tipo_contrato: string;
  disponibilidade: string;
  tem_experiencia: string;
  pode_comprovar_experiencia: string;

  // passo 3
  pode_viajar: string;
  pode_alojamento: string;
  raio_deslocacao: string;

  // passo 4
  avatar_url: string | null;
  bio: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

// Fallback (caso query/RLS falhe) — mantém onboarding funcional
const NACIONALIDADES_FALLBACK = [
  "Portugal",
  "Brasil",
  "Cabo Verde",
  "Guiné-Bissau",
  "Angola",
  "Moçambique",
  "São Tomé e Príncipe",

  "Senegal",
  "Gâmbia",
  "Guiné-Conacri",
  "Marrocos",

  "Índia",
  "Paquistão",
  "Nepal",
  "Bangladesh",
  "Sri Lanka",

  "Roménia",
  "Ucrânia",
  "Moldávia",
  "Espanha",
  "França",
] as const;

const tiposContrato = [
  "Contrato a termo",
  "Sem termo",
  "Recibos verdes",
  "Tarefa / empreitada",
];

const disponibilidades = ["Imediata", "1 semana", "15 dias", "Indisponível"];

const raiosDeslocacao = ["25 km", "50 km", "75 km", "100 km", "Mais de 100 km"];

function formatPhonePt(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 9);
  const p1 = clean.slice(0, 3);
  const p2 = clean.slice(3, 6);
  const p3 = clean.slice(6, 9);
  return [p1, p2, p3].filter(Boolean).join(" ");
}

const OnboardingProfissional: React.FC<Props> = ({ onFinish }) => {
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [areasFromDB, setAreasFromDB] = useState<AreaFromDB[]>([]);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");
  const areaInputRef = useRef<HTMLDivElement | null>(null);

  // Nacionalidades vindas do Supabase (com fallback)
  const [nacionalidades, setNacionalidades] = useState<string[]>(
    Array.from(NACIONALIDADES_FALLBACK)
  );
  const [initialNacionalidadeRaw, setInitialNacionalidadeRaw] = useState<
    string | null
  >(null);
  const nacionalidadeTouchedRef = useRef(false);

  // Combobox de nacionalidade (para ficar igual ao da Área)
  const [nacDropdownOpen, setNacDropdownOpen] = useState(false);
  const [nacQuery, setNacQuery] = useState("");
  const nacInputRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormState>({
    nome_completo: "",
    telefone: "",
    nacionalidade: "Brasil",
    outra_nacionalidade: "",
    cidade_base: "",

    area_id: "",
    anos_experiencia: "",
    funcao_obra: "Aprendiz",
    tipo_contrato: "Contrato a termo",
    disponibilidade: "Imediata",
    tem_experiencia: "",
    pode_comprovar_experiencia: "",

    pode_viajar: "Não",
    pode_alojamento: "Não",
    raio_deslocacao: "100 km",

    avatar_url: null,
    bio: "",
  });

  // ==========================
  // Carregar lista de nacionalidades (Supabase)
  // ==========================
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("nacionalidades")
        .select("nome")
        .eq("ativa", true)
        .order("ordem", { ascending: true });

      if (error) {
        console.error("Erro ao carregar nacionalidades:", error);
        return; // mantém fallback
      }

      const list = (data ?? [])
        .map((r: any) => String(r.nome).trim())
        .filter(Boolean);

      if (list.length) setNacionalidades(list);
    })();
  }, []);

  // ==========================
  // Carregar lista de áreas
  // ==========================
  useEffect(() => {
    async function loadAreas() {
      const { data, error } = await supabase
        .from("profissional_areas")
        .select("id, nome, slug, ativo, ordem")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) {
        console.error("Erro ao carregar áreas profissionais:", error);
        setAreasFromDB([]);
        return;
      }

      setAreasFromDB((data as AreaFromDB[]) ?? []);
    }

    loadAreas();
  }, []);

  // Quando já existir área gravada, preenche o texto da busca com o nome
  useEffect(() => {
    if (!form.area_id || !areasFromDB.length) return;
    const found = areasFromDB.find((a) => a.id === form.area_id);
    if (found) setAreaQuery(found.nome);
  }, [form.area_id, areasFromDB]);

  // ==========================
  // Carregar dados existentes
  // ==========================
  useEffect(() => {
    (async () => {
      // ✅ usa SEMPRE o auth uid real (alinhado com o handleSubmit)
      const { data: authData } = await supabase.auth.getUser();
      const authUid = authData?.user?.id;
      if (!authUid) return;

      const { data, error } = await supabase
        .from("profissionais_perfil")
        .select(
          `nome_completo, telefone, whatsapp, cidade_base, nacionalidade,
           area_id, anos_experiencia, funcao_obra, tipo_contrato,
           disponibilidade, pode_viajar, pode_alojamento, raio_deslocacao,
           avatar_url, bio`
        )
        .eq("usuario_id", authUid)
        .maybeSingle();

      if (!error && data) {
        const phoneDigits = data.telefone?.replace(/\D/g, "").slice(-9) ?? "";

        // guarda o bruto para normalizar depois que a lista do DB carregar
        setInitialNacionalidadeRaw(data.nacionalidade ?? null);

        setForm((prev) => ({
          ...prev,
          nome_completo: data.nome_completo ?? "",
          telefone: phoneDigits,
          cidade_base: data.cidade_base ?? "",
          // preenche temporariamente; será normalizado no useEffect abaixo
          nacionalidade: data.nacionalidade ?? "Brasil",
          outra_nacionalidade: "",

          area_id: data.area_id ?? "",

          anos_experiencia: data.anos_experiencia
            ? String(data.anos_experiencia)
            : "",

          funcao_obra: data.funcao_obra ?? "Aprendiz",
          tipo_contrato: data.tipo_contrato ?? "Contrato a termo",
          disponibilidade: data.disponibilidade ?? "Imediata",

          pode_viajar: data.pode_viajar ? "Sim" : "Não",
          pode_alojamento: data.pode_alojamento ? "Sim" : "Não",
          raio_deslocacao: data.raio_deslocacao ?? "100 km",

          avatar_url: data.avatar_url ?? null,
          bio: data.bio ?? "",
        }));
      }
    })();
    // mantém o user no deps para recarregar quando a sessão/contexto muda
  }, [user?.id]);

  // Normalizar nacionalidade (se não estiver na lista, vira "Outra" e preenche input)
  useEffect(() => {
    if (!initialNacionalidadeRaw) return;
    if (nacionalidadeTouchedRef.current) return;

    const raw = initialNacionalidadeRaw.trim();
    if (!raw) return;

    if (nacionalidades.includes(raw)) {
      setForm((f) => ({ ...f, nacionalidade: raw, outra_nacionalidade: "" }));
    } else {
      setForm((f) => ({
        ...f,
        nacionalidade: "Outra",
        outra_nacionalidade: raw,
      }));
    }
  }, [initialNacionalidadeRaw, nacionalidades]);

  // Sync do texto do combobox com o valor selecionado
  useEffect(() => {
    if (!form.nacionalidade) return;
    if (form.nacionalidade === "Outra") return;
    setNacQuery(form.nacionalidade);
  }, [form.nacionalidade]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;

      if (areaInputRef.current && !areaInputRef.current.contains(t)) {
        setAreaDropdownOpen(false);
      }
      if (nacInputRef.current && !nacInputRef.current.contains(t)) {
        setNacDropdownOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAreaDropdownOpen(false);
        setNacDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const telefoneFormatado = useMemo(
    () => formatPhonePt(form.telefone),
    [form.telefone]
  );

  const clearError = (field: keyof FormState) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const clone = { ...prev };
      delete clone[field];
      return clone;
    });
  };

  // ==========================
  // Validação
  // ==========================
  function validateStep(stepToValidate: Step): Errors {
    const newErrors: Errors = {};

    if (stepToValidate === 1) {
      if (!form.nome_completo.trim())
        newErrors.nome_completo = "Informe o seu nome completo.";

      const digits = form.telefone.replace(/\D/g, "");
      if (digits.length !== 9)
        newErrors.telefone = "Número inválido. Deve ter 9 dígitos.";

      const n =
        form.nacionalidade === "Outra"
          ? form.outra_nacionalidade.trim()
          : form.nacionalidade;
      if (!n) newErrors.nacionalidade = "Selecione ou escreva a nacionalidade.";

      if (!form.cidade_base.trim())
        newErrors.cidade_base = "Informe a cidade base.";
    }

    if (stepToValidate === 2) {
      if (!form.area_id) newErrors.area_id = "Selecione a área profissional.";

      if (!form.tem_experiencia)
        newErrors.tem_experiencia = "Informe se tem experiência.";

      if (form.tem_experiencia === "Sim") {
        if (!form.anos_experiencia.trim())
          newErrors.anos_experiencia = "Informe os anos.";

        const anos = Number(form.anos_experiencia);
        if (isNaN(anos) || anos < 0 || anos > 60)
          newErrors.anos_experiencia = "Informe um número válido (0–60 anos).";

        if (!form.pode_comprovar_experiencia)
          newErrors.pode_comprovar_experiencia =
            "Informe se consegue comprovar.";
      }

      if (!form.tipo_contrato.trim())
        newErrors.tipo_contrato = "Selecione o tipo de contrato.";

      if (!form.disponibilidade.trim())
        newErrors.disponibilidade = "Selecione a disponibilidade.";
    }

    if (stepToValidate === 3) {
      if (!form.raio_deslocacao.trim())
        newErrors.raio_deslocacao = "Selecione um raio.";

      if (!form.pode_viajar.trim())
        newErrors.pode_viajar = "Informe se pode viajar.";

      if (!form.pode_alojamento.trim())
        newErrors.pode_alojamento = "Informe se aceita alojamento.";
    }

    return newErrors;
  }

  const validateAll = () => {
    const e1 = validateStep(1);
    const e2 = validateStep(2);
    const e3 = validateStep(3);
    const all = { ...e1, ...e2, ...e3 };

    let firstStep: Step = 4;
    if (Object.keys(e1).length) firstStep = 1;
    else if (Object.keys(e2).length) firstStep = 2;
    else if (Object.keys(e3).length) firstStep = 3;

    return { ok: Object.keys(all).length === 0, errors: all, firstStep };
  };

  // ==========================
  // Lista filtrada de áreas
  // ==========================
  const filteredAreas = useMemo(() => {
    const q = areaQuery.trim().toLowerCase();
    if (!q) return areasFromDB.slice(0, 20);

    return areasFromDB
      .filter((a) => {
        const nome = a.nome?.toLowerCase() ?? "";
        const slug = a.slug?.toLowerCase() ?? "";
        return nome.includes(q) || slug.includes(q);
      })
      .slice(0, 20);
  }, [areasFromDB, areaQuery]);

  // ==========================
  // Lista filtrada de nacionalidades
  // ==========================
  const filteredNacionalidades = useMemo(() => {
    const q = nacQuery.trim().toLowerCase();
    if (!q) return nacionalidades.slice(0, 25);
    return nacionalidades
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 25);
  }, [nacionalidades, nacQuery]);

  // ==========================
  // Submit
  // ==========================
  const handleSubmit = async () => {
    const { ok, errors: allErrors, firstStep } = validateAll();
    if (!ok) {
      setErrors(allErrors);
      setStep(firstStep);
      return;
    }

    try {
      setSaving(true);

      // 1) Sempre usar o user REAL do auth (evita mismatch do teu contexto)
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user?.id) {
        console.error("AUTH getUser ERROR:", authErr);
        alert("Sessão inválida. Faça login novamente.");
        return;
      }
      const authUser = authData.user;

      // Debug rápido (podes remover depois)
      console.log("CTX user.id:", user?.id, "CTX user.email:", user?.email);
      console.log("AUTH user.id:", authUser.id, "AUTH user.email:", authUser.email);

      let avatarUrl = form.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `perfis/${authUser.id}/avatar_${Date.now()}.${ext}`;

        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, avatarFile, { upsert: true });

        if (error) {
          console.error("UPLOAD avatar ERROR:", {
            message: (error as any).message,
            name: (error as any).name,
            details: (error as any).details,
          });
          alert(`Erro ao enviar a foto.\n${(error as any).message ?? ""}`);
          return;
        }

        if (data) {
          const { data: publicUrl } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

          avatarUrl = publicUrl.publicUrl;
        }
      }

      const anos =
        form.tem_experiencia === "Sim"
          ? Number(form.anos_experiencia || "0")
          : 0;

      const nivelInicial = "Aprendiz";

      const telefoneDigits = form.telefone.replace(/\D/g, "").slice(-9);
      const telefoneCompleto = telefoneDigits ? `+351${telefoneDigits}` : null;

      const payload: any = {
        // 2) Grava sempre com authUser.id
        usuario_id: authUser.id,
        email: authUser.email ?? null,

        nome_completo: form.nome_completo.trim(),
        telefone: telefoneCompleto,
        whatsapp: telefoneCompleto,
        cidade_base: form.cidade_base.trim(),

        nacionalidade:
          form.nacionalidade === "Outra"
            ? form.outra_nacionalidade.trim()
            : form.nacionalidade,

        area_id: form.area_id,
        anos_experiencia: anos,

        funcao_obra: nivelInicial,
        tipo_contrato: form.tipo_contrato,
        disponibilidade: form.disponibilidade,

        pode_viajar: form.pode_viajar === "Sim",
        pode_alojamento: form.pode_alojamento === "Sim",
        raio_deslocacao: form.raio_deslocacao,

        avatar_url: avatarUrl,
        bio: form.bio || null,

        nivel: nivelInicial,
        perfil_completo: true,
        data_atualizacao: new Date().toISOString(),
      };

      // Debug obrigatório para provar que está certo
      console.log("SUBMIT usuario_id =", payload.usuario_id);
      console.log("AUTH uid =", authUser.id);

      const { error } = await supabase
        .from("profissionais_perfil")
        .upsert(payload, { onConflict: "usuario_id" });

      if (error) {
        console.error("UPSERT profissionais_perfil ERROR:", {
          code: (error as any).code,
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint,
        });

        alert(
          `Erro ao salvar o perfil.\n${(error as any).message ?? ""}\n${
            (error as any).details ?? ""
          }`
        );
        return;
      }

      try {
        localStorage.setItem("perfil_completo", "true");
      } catch {}

      if (onFinish) onFinish();
    } finally {
      setSaving(false);
    }
  };

  const progresso = useMemo(
    () => (step === 1 ? 0.25 : step === 2 ? 0.5 : step === 3 ? 0.75 : 1),
    [step]
  );

  const errorOn = (f: keyof FormState) => errors[f];

  // ==========================
  // Render
  // ==========================
  return (
    <div className="min-h-screen flex items-center justify-center bg-app px-4 py-8">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-app overflow-hidden">
        {/* HEADER */}
        <div className="px-6 md:px-10 pt-6 pb-4 border-b border-app">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 dark:bg-sky-900/40 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Bem-vindo ao Acrobatas
              </div>

              <h1 className="mt-3 text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50">
                Vamos montar o seu perfil profissional
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                São apenas 4 passos.
              </p>
            </div>

            <div className="hidden md:flex flex-col items-end text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Passo {step} de 4</span>
              <div className="mt-2 w-40 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-600 rounded-full transition-all duration-300"
                  style={{ width: `${progresso * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* STEP CONTENT */}
        <div className="px-6 md:px-10 py-6 space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100">
            {step === 1 && "1. Dados de identificação"}
            {step === 2 && "2. Perfil profissional"}
            {step === 3 && "3. Localização e mobilidade"}
            {step === 4 && "4. Foto e resumo"}
          </h2>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nome completo *
                </label>
                <div
                  className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-slate-50/40 dark:bg-slate-900/60 ${
                    errorOn("nome_completo") ? "border-red-400" : "border-app"
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="flex-1 bg-transparent outline-none text-sm"
                    value={form.nome_completo}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, nome_completo: e.target.value }));
                      clearError("nome_completo");
                    }}
                    placeholder="Ex: João Silva"
                  />
                </div>
                {errorOn("nome_completo") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("nome_completo")}
                  </p>
                )}
              </div>

              {/* Telemóvel */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Telemóvel / WhatsApp *
                </label>
                <div
                  className={`mt-1 flex items-center rounded-xl border bg-slate-50/40 dark:bg-slate-900/60 ${
                    errorOn("telefone") ? "border-red-400" : "border-app"
                  }`}
                >
                  <div className="flex items-center gap-1 px-3 py-2 border-r border-app text-xs text-slate-600 dark:text-slate-300">
                    <Flag className="w-3.5 h-3.5" />
                    <span>Portugal</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      (+351)
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 px-3 py-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="933 723 818"
                      value={telefoneFormatado}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setForm((f) => ({ ...f, telefone: digits }));
                        clearError("telefone");
                      }}
                    />
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Use um número real. Podemos utilizá-lo para confirmar presenças
                  ou enviar avisos importantes.
                </p>
                {errorOn("telefone") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("telefone")}
                  </p>
                )}
              </div>

              {/* Nacionalidade */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nacionalidade *
                </label>

                <div className="mt-1 space-y-2">
                  <div className="relative" ref={nacInputRef}>
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-slate-50/40 dark:bg-slate-900/60 cursor-text ${
                        errorOn("nacionalidade") ? "border-red-400" : "border-app"
                      }`}
                      onClick={() => setNacDropdownOpen(true)}
                    >
                      <Flag className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="flex-1 bg-transparent outline-none text-sm"
                        placeholder="Selecione ou pesquise…"
                        value={form.nacionalidade === "Outra" ? "" : nacQuery}
                        onChange={(e) => {
                          nacionalidadeTouchedRef.current = true;
                          setNacQuery(e.target.value);
                          setNacDropdownOpen(true);

                          if (form.nacionalidade !== "Outra") {
                            setForm((f) => ({ ...f, nacionalidade: "" }));
                          }
                          clearError("nacionalidade");
                        }}
                      />
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>

                    {nacDropdownOpen && (
                      <div className="absolute z-30 mt-1 w-full rounded-xl border border-app bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-y-auto">
                        {filteredNacionalidades.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            Nenhuma nacionalidade encontrada.
                          </div>
                        ) : (
                          filteredNacionalidades.map((n) => (
                            <button
                              key={n}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                nacionalidadeTouchedRef.current = true;
                                setForm((f) => ({
                                  ...f,
                                  nacionalidade: n,
                                  outra_nacionalidade: "",
                                }));
                                setNacQuery(n);
                                clearError("nacionalidade");
                                setNacDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {n}
                            </button>
                          ))
                        )}

                        <div className="border-t border-app" />

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            nacionalidadeTouchedRef.current = true;
                            setForm((f) => ({ ...f, nacionalidade: "Outra" }));
                            setNacDropdownOpen(false);
                            clearError("nacionalidade");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Outra…
                        </button>
                      </div>
                    )}
                  </div>

                  {form.nacionalidade === "Outra" && (
                    <input
                      type="text"
                      className={`w-full rounded-xl border px-3 py-2 text-sm bg-slate-50/60 dark:bg-slate-900/60 ${
                        errorOn("nacionalidade") ? "border-red-400" : "border-app"
                      }`}
                      placeholder="Escreva a nacionalidade"
                      value={form.outra_nacionalidade}
                      onChange={(e) => {
                        nacionalidadeTouchedRef.current = true;
                        setForm((f) => ({
                          ...f,
                          outra_nacionalidade: e.target.value,
                        }));
                        clearError("nacionalidade");
                      }}
                    />
                  )}
                </div>

                {errorOn("nacionalidade") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("nacionalidade")}
                  </p>
                )}
              </div>

              {/* Cidade base */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Cidade base *
                </label>
                <div
                  className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-slate-50/40 dark:bg-slate-900/60 ${
                    errorOn("cidade_base") ? "border-red-400" : "border-app"
                  }`}
                >
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="flex-1 bg-transparent outline-none text-sm"
                    placeholder="Ex: Lisboa, Porto, Setúbal…"
                    value={form.cidade_base}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, cidade_base: e.target.value }));
                      clearError("cidade_base");
                    }}
                  />
                </div>
                {errorOn("cidade_base") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("cidade_base")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Área profissional *</label>

                <div className="mt-1 relative" ref={areaInputRef}>
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-slate-50/40 dark:bg-slate-900/60 cursor-text ${
                      errorOn("area_id") ? "border-red-400" : "border-app"
                    }`}
                    onClick={() => setAreaDropdownOpen(true)}
                  >
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="flex-1 bg-transparent outline-none text-sm"
                      placeholder="Comece a escrever: Canalizador, Eletricista…"
                      value={areaQuery}
                      onChange={(e) => {
                        setAreaQuery(e.target.value);
                        setAreaDropdownOpen(true);
                        if (!e.target.value.trim()) {
                          setForm((f) => ({ ...f, area_id: "" }));
                          clearError("area_id");
                        }
                      }}
                    />
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {areaDropdownOpen && (
                    <div className="absolute z-30 mt-1 w-full rounded-xl border border-app bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-y-auto">
                      {filteredAreas.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400">
                          Nenhuma área encontrada.
                        </div>
                      ) : (
                        filteredAreas.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm((f) => ({ ...f, area_id: area.id }));
                              setAreaQuery(area.nome);
                              clearError("area_id");
                              setAreaDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {area.nome}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {errorOn("area_id") && (
                  <p className="text-xs text-red-500 mt-1">
                    {errorOn("area_id")}
                  </p>
                )}
              </div>

              {/* Tem experiência */}
              <div>
                <label className="text-sm">Tem experiência? *</label>
                <div className="mt-1 flex gap-2">
                  {["Sim", "Não"].map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          tem_experiencia: v,
                          anos_experiencia: v === "Não" ? "" : f.anos_experiencia,
                          pode_comprovar_experiencia:
                            v === "Não" ? "" : f.pode_comprovar_experiencia,
                        }));
                        clearError("tem_experiencia");
                        clearError("anos_experiencia");
                        clearError("pode_comprovar_experiencia");
                      }}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                        form.tem_experiencia === v
                          ? "border-sky-500 bg-sky-50"
                          : "border-app bg-slate-50/40"
                      }`}
                      type="button"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {errorOn("tem_experiencia") && (
                  <p className="text-xs text-red-500 mt-1">
                    {errorOn("tem_experiencia")}
                  </p>
                )}

                {form.tem_experiencia === "Não" && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Você irá começar no nível inicial: Aprendiz.
                  </p>
                )}
              </div>

              {/* Anos */}
              {form.tem_experiencia === "Sim" && (
                <div>
                  <label className="text-sm">Anos de experiência *</label>
                  <div
                    className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                      errorOn("anos_experiencia") ? "border-red-400" : "border-app"
                    }`}
                  >
                    <Clock4 className="w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      className="flex-1 bg-transparent text-sm outline-none"
                      placeholder="Ex: 3"
                      value={form.anos_experiencia}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          anos_experiencia: e.target.value,
                        }));
                        clearError("anos_experiencia");
                      }}
                    />
                    <span className="text-xs text-slate-400">anos</span>
                  </div>
                  {errorOn("anos_experiencia") && (
                    <p className="text-xs text-red-500 mt-1">
                      {errorOn("anos_experiencia")}
                    </p>
                  )}
                </div>
              )}

              {/* Comprovar */}
              {form.tem_experiencia === "Sim" && (
                <div className="md:col-span-2">
                  <label className="text-sm">Consegue comprovar? *</label>
                  <div className="mt-1 flex gap-2">
                    {["Sim", "Não"].map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            pode_comprovar_experiencia: v,
                          }));
                          clearError("pode_comprovar_experiencia");
                        }}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm ${
                          form.pode_comprovar_experiencia === v
                            ? "border-sky-500 bg-sky-50"
                            : "border-app bg-slate-50/40"
                        }`}
                        type="button"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  {errorOn("pode_comprovar_experiencia") && (
                    <p className="text-xs text-red-500 mt-1">
                      {errorOn("pode_comprovar_experiencia")}
                    </p>
                  )}
                </div>
              )}

              {/* Tipo contrato */}
              <div>
                <label className="text-sm">Tipo de contrato preferido *</label>
                <select
                  className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm bg-slate-50/40 dark:bg-slate-900/60 ${
                    errorOn("tipo_contrato") ? "border-red-400" : "border-app"
                  }`}
                  value={form.tipo_contrato}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, tipo_contrato: e.target.value }));
                    clearError("tipo_contrato");
                  }}
                >
                  {tiposContrato.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errorOn("tipo_contrato") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("tipo_contrato")}
                  </p>
                )}
              </div>

              {/* Disponibilidade */}
              <div>
                <label className="text-sm">Disponibilidade *</label>
                <select
                  className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm bg-slate-50/40 dark:bg-slate-900/60 ${
                    errorOn("disponibilidade") ? "border-red-400" : "border-app"
                  }`}
                  value={form.disponibilidade}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, disponibilidade: e.target.value }));
                    clearError("disponibilidade");
                  }}
                >
                  {disponibilidades.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errorOn("disponibilidade") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("disponibilidade")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Raio de deslocação *
                </label>
                <select
                  className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm bg-slate-50/40 dark:bg-slate-900/60 ${
                    errorOn("raio_deslocacao") ? "border-red-400" : "border-app"
                  }`}
                  value={form.raio_deslocacao}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      raio_deslocacao: e.target.value,
                    }));
                    clearError("raio_deslocacao");
                  }}
                >
                  {raiosDeslocacao.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {errorOn("raio_deslocacao") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("raio_deslocacao")}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Pode viajar? *
                </label>
                <div className="mt-1 flex gap-2">
                  {["Sim", "Não"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, pode_viajar: v }));
                        clearError("pode_viajar");
                      }}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm flex items-center justify-center gap-2 ${
                        form.pode_viajar === v
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-app text-slate-600 bg-slate-50/40"
                      }`}
                    >
                      <Globe2 className="w-4 h-4" />
                      {v}
                    </button>
                  ))}
                </div>
                {errorOn("pode_viajar") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("pode_viajar")}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Aceita alojamento? *
                </label>
                <div className="mt-1 flex gap-2">
                  {["Sim", "Não"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, pode_alojamento: v }));
                        clearError("pode_alojamento");
                      }}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm flex items-center justify-center gap-2 ${
                        form.pode_alojamento === v
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-app text-slate-600 bg-slate-50/40"
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      {v}
                    </button>
                  ))}
                </div>
                {errorOn("pode_alojamento") && (
                  <p className="mt-1 text-xs text-red-500">
                    {errorOn("pode_alojamento")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 md:gap-10">
              <div className="flex flex-col items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Foto de perfil (opcional)
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-36 h-44 rounded-2xl overflow-hidden border border-app bg-slate-50 dark:bg-slate-900 flex items-center justify-center group"
                >
                  {form.avatar_url || avatarFile ? (
                    <>
                      <img
                        src={
                          avatarFile
                            ? URL.createObjectURL(avatarFile)
                            : (form.avatar_url as string)
                        }
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="text-xs text-white inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60">
                          <Camera className="w-3.5 h-3.5" />
                          Trocar foto
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 text-xs">
                      <Camera className="w-6 h-6 mb-2" />
                      <span>Adicionar foto</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                  }}
                />
                <p className="mt-2 text-[11px] text-slate-400 text-center">
                  Formato JPG ou PNG, até 10MB.
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  Bio / descrição curta (opcional)
                </label>
                <textarea
                  className="min-h-[140px] rounded-2xl border border-app px-3 py-2.5 text-sm bg-slate-50/60 dark:bg-slate-900/60 outline-none resize-none"
                  placeholder="Ex: Canalizador com 5 anos de experiência em remodelações. Trabalhei em obras residenciais e comerciais em Lisboa e Setúbal."
                  maxLength={280}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>Fique à vontade para deixar em branco.</span>
                  <span>{form.bio.length}/280</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 md:px-10 pb-6 pt-4 border-t border-app flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || saving}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-app hover:bg-slate-50 dark:hover:bg-slate-900/60 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {step < 4 ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const e = validateStep(step);
                if (Object.keys(e).length) {
                  setErrors((prev) => ({ ...prev, ...e }));
                  return;
                }
                setStep((s) => ((s + 1) as Step));
              }}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-60"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Concluir perfil
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProfissional;
