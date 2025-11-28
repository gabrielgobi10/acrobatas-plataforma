// src/components/company/CentralDeNavegacaoEmpresa/Outros/ConfiguracoesConta.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Lock,
  Globe2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/* =========================
   Tipos
========================= */

type PasswordState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Feedback = {
  type: "success" | "error" | null;
  message: string;
};

/* =========================
   Componente principal
========================= */

export default function ConfiguracoesConta() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  const [passwordForm, setPasswordForm] = useState<PasswordState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>({
    type: null,
    message: "",
  });

  const [language, setLanguage] = useState<"pt-PT" | "en">("pt-PT");
  const [langLoading, setLangLoading] = useState(false);
  const [langFeedback, setLangFeedback] = useState<Feedback>({
    type: null,
    message: "",
  });

  /* =========================
     Efeito: carregar idioma salvo
  ========================= */

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "acrobatas_idioma_empresa"
      ) as "pt-PT" | "en" | null;
      if (stored === "pt-PT" || stored === "en") {
        setLanguage(stored);
        i18n.changeLanguage(stored === "pt-PT" ? "pt" : "en");
      }
    } catch {
      // se der erro, ignora
    }
  }, [i18n]);

  /* =========================
     Handlers — Password
  ========================= */

  function handlePasswordChange(
    field: keyof PasswordState,
    value: string
  ) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordFeedback({ type: null, message: "" });
  }

  async function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault();

    setPasswordFeedback({ type: null, message: "" });

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Preenche todos os campos.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "A nova palavra-passe deve ter pelo menos 8 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "A confirmação não coincide com a nova palavra-passe.",
      });
      return;
    }

    if (!user?.email) {
      setPasswordFeedback({
        type: "error",
        message:
          "Não foi possível identificar o utilizador. Tenta fazer login novamente.",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      // 1) Revalidar palavra-passe atual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordFeedback({
          type: "error",
          message: "A palavra-passe atual está incorreta.",
        });
        setPasswordLoading(false);
        return;
      }

      // 2) Atualizar palavra-passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordFeedback({
          type: "error",
          message:
            "Não foi possível atualizar a palavra-passe. Tenta novamente.",
        });
        setPasswordLoading(false);
        return;
      }

      setPasswordFeedback({
        type: "success",
        message: "Palavra-passe atualizada com sucesso.",
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        message:
          "Ocorreu um erro inesperado ao atualizar a palavra-passe.",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  /* =========================
     Handlers — Idioma
  ========================= */

  async function handleChangeLanguage(
    newLang: "pt-PT" | "en"
  ) {
    if (newLang === language) return;

    setLangFeedback({ type: null, message: "" });
    setLangLoading(true);

    try {
      i18n.changeLanguage(newLang === "pt-PT" ? "pt" : "en");

      window.localStorage.setItem(
        "acrobatas_idioma_empresa",
        newLang
      );

      // OPCIONAL: persistir no Supabase (ajusta para o teu schema real)
      if (user?.id) {
        await supabase
          .from("usuarios_empresa")
          .update({ idioma_preferido: newLang })
          .eq("user_id", user.id);
      }

      setLanguage(newLang);
      setLangFeedback({
        type: "success",
        message: "Idioma atualizado com sucesso.",
      });
    } catch (err) {
      setLangFeedback({
        type: "error",
        message:
          "Não foi possível atualizar o idioma. Tenta novamente.",
      });
    } finally {
      setLangLoading(false);
    }
  }

  /* =========================
     UI Helpers
  ========================== */

  function renderFeedbackBox(feedback: Feedback) {
    if (!feedback.type || !feedback.message) return null;

    const isSuccess = feedback.type === "success";

    return (
      <div
        className={`
          mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm
          ${
            isSuccess
              ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-400/5 dark:text-emerald-300"
              : "border-rose-500/40 bg-rose-500/5 text-rose-600 dark:border-rose-400/40 dark:bg-rose-400/5 dark:text-rose-300"
          }
        `}
      >
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p>{feedback.message}</p>
      </div>
    );
  }

  /* =========================
     Render
  ========================== */

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Título */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg md:text-2xl font-semibold text-gray-900 dark:text-gray-50">
            <Shield className="h-5 w-5 md:h-6 md:w-6 text-blue-500 dark:text-blue-400" />
            Segurança & Idioma
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gere a segurança da sua conta e as preferências de idioma.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card: Alterar palavra-passe */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-[#020617] p-4 md:p-5 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                Alterar palavra-passe
              </h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Atualiza regularmente para manter a sua conta segura.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmitPassword}
            className="mt-2 space-y-3"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Palavra-passe atual
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  handlePasswordChange(
                    "currentPassword",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#020617] dark:text-gray-50"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Nova palavra-passe
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  handlePasswordChange(
                    "newPassword",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#020617] dark:text-gray-50"
                autoComplete="new-password"
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Mínimo de 8 caracteres. Use uma combinação de letras e
                números.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Confirmar nova palavra-passe
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  handlePasswordChange(
                    "confirmPassword",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-[#020617] dark:text-gray-50"
                autoComplete="new-password"
              />
            </div>

            {renderFeedbackBox(passwordFeedback)}

            <div className="pt-1">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A atualizar…
                  </>
                ) : (
                  "Guardar nova palavra-passe"
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Card: Idioma */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200/70 bg-white shadow-sm dark:border-white/10 dark:bg-[#020617] p-4 md:p-5 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
              <Globe2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-50">
                Idioma do painel
              </h2>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                Escolhe o idioma preferido para a interface.
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Idioma
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChangeLanguage("pt-PT")}
                  disabled={langLoading}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-xs md:text-sm transition ${
                    language === "pt-PT"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50/70 dark:border-white/10 dark:bg-[#020617] dark:text-gray-200 dark:hover:border-blue-400/60 dark:hover:bg-blue-500/5"
                  }`}
                >
                  <span className="font-semibold">
                    Português (Portugal)
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    Recomendado
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeLanguage("en")}
                  disabled={langLoading}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-xs md:text-sm transition ${
                    language === "en"
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50/70 dark:border-white/10 dark:bg-[#020617] dark:text-gray-200 dark:hover:border-blue-400/60 dark:hover:bg-blue-500/5"
                  }`}
                >
                  <span className="font-semibold">English</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    Interface em inglês
                  </span>
                </button>
              </div>
            </div>

            {renderFeedbackBox(langFeedback)}

            {langLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                A guardar preferências de idioma…
              </div>
            )}

            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              O idioma afeta apenas a interface da plataforma, não o
              conteúdo das obras ou documentos enviados.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
