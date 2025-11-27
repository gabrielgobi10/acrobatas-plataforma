import { useState, useEffect, FocusEvent } from "react";
import {
  Users,
  Building2,
  Shield,
  AlertCircle,
  CheckCircle,
  LockKeyhole,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Suporte from "./Suporte";
import IdiomaSelector from "./IdiomaSelector";
import RecuperarSenha from "./RecuperarSenha";
import MobileDock from "./MobileDock";
import { useTranslation } from "react-i18next";

export const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [userRole, setUserRole] =
    useState<"professional" | "company" | "admin">("professional");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  /* ======================
     Eventos externos (MobileDock)
  ====================== */
  useEffect(() => {
    const openLang = () => setShowLangModal(true);
    window.addEventListener("toggle-idioma", openLang);
    document.addEventListener("toggle-idioma", openLang);
    return () => {
      window.removeEventListener("toggle-idioma", openLang);
      document.removeEventListener("toggle-idioma", openLang);
    };
  }, []);

  /* ======================
     Lembrar tipo de usuário
  ====================== */
  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    if (savedRole === "professional" || savedRole === "company") {
      setUserRole(savedRole);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("userRole", userRole);
  }, [userRole]);

  /* ======================
     Redirecionamento pós-login (auth context)
  ====================== */
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.tipo_usuario) {
        case "empresa":
          navigate("/empresa");
          break;
        case "profissional":
          navigate("/profissional");
          break;
        case "admin":
          navigate("/admin");
          break;
        case "mestre":
          navigate("/mestre");
          break;
        default:
          navigate("/");
      }
    }
  }, [isAuthenticated, user, navigate]);

  /* ======================
     Submit
  ====================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      if (!email.trim() || !password.trim())
        throw new Error(t("login.erroCampos"));
      if (!isLogin && !name.trim()) throw new Error(t("login.erroNome"));
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
        throw new Error(t("login.erroEmail"));
      if (password.length < 6) throw new Error(t("login.erroSenha"));

      const tipoMap = {
        professional: "profissional",
        company: "empresa",
        admin: "admin",
      } as const;

      const tipo = adminMode ? "admin" : tipoMap[userRole];

      if (isLogin) {
        const userData = await login(email, password, tipo);
        setSuccess(t("login.sucessoLogin"));

        setTimeout(() => {
          switch (userData.tipo_usuario) {
            case "empresa":
              navigate("/empresa");
              break;
            case "profissional":
              navigate("/profissional");
              break;
            case "admin":
              navigate("/admin");
              break;
            case "mestre":
              navigate("/mestre");
              break;
            default:
              navigate("/");
          }
        }, 1000);
      } else {
        await register(name, email, password, tipo, codigo);
        setSuccess(t("login.sucessoCadastro"));
        setTimeout(() => {
          setIsLogin(true);
          setSuccess("");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || t("login.erroGenerico"));
    } finally {
      setSubmitting(false);
    }
  };

  /* ======================
     Admin key
  ====================== */
  const handleConfirmAdminKey = () => {
    const adminKeyEnv =
      import.meta.env.VITE_ADMIN_ACCESS_KEY || "acrobatas2024";
    if (adminKey === adminKeyEnv) {
      setAdminMode(true);
      setUserRole("admin");
      setShowAdminModal(false);
    } else {
      alert(t("login.chaveIncorreta"));
    }
  };

  const handleTabSwitch = (loginTab: boolean) => {
    setIsLogin(loginTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ======================
     Scroll em iOS ao focar inputs
  ====================== */
  const handleInputFocus = (
    e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    const isIOS = /iP(ad|hone|od)/.test(ua);
    if (!isIOS) return;

    const target = e.target as HTMLElement;
    setTimeout(() => {
      try {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        // ignore
      }
    }, 250);
  };

  /* ======================
     Idiomas para o modal mobile
  ====================== */
  const LANGUAGES = [
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
  ];

  return (
    <div
      className="min-h-[100dvh] md:min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 animate-gradient-slow flex flex-col items-center md:items-center justify-start relative overflow-x-hidden w-full"
    >
      {/* 🌍 Desktop: idioma + suporte */}
      <div className="hidden sm:flex absolute top-3 right-3 items-center gap-3 z-20">
        <IdiomaSelector />
        <Suporte />
      </div>

      {/* 🚀 Mobile Dock */}
      <MobileDock />

      {/* Safe-area + padding geral */}
      <div className="w-full px-4 sm:px-6 py-4 sm:py-6 flex justify-center">
        {/* Container principal */}
        <div className="w-full max-w-5xl flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 items-stretch mt-2 md:mt-0">
          {/* ESQUERDA – formulário */}
          <div className="order-1 bg-white/95 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-center relative">
            <div className="text-center mb-8">
              <img
                src="/Design sem nome (45).png"
                alt="Acrobatas Workforce"
                className="h-14 sm:h-20 mx-auto mb-3 animate-fade-in"
              />
            </div>

            {/* Abas login/cadastro */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => handleTabSwitch(true)}
                className={`flex-1 pb-2 sm:pb-3 text-center font-semibold transition-all ${
                  isLogin
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500"
                }`}
              >
                {t("login.entrar")}
              </button>
              <button
                onClick={() => handleTabSwitch(false)}
                className={`flex-1 pb-2 sm:pb-3 text-center font-semibold transition-all ${
                  !isLogin
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500"
                }`}
              >
                {t("login.cadastrar")}
              </button>
            </div>

            {/* Alertas */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p>{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {!adminMode && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("login.tipoUsuario")}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUserRole("professional")}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        userRole === "professional"
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-xs sm:text-sm font-semibold">
                        {t("login.profissional")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserRole("company")}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        userRole === "company"
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-gray-300 hover:border-blue-300"
                      }`}
                    >
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                      <span className="text-xs sm:text-sm font-semibold">
                        {t("login.empresa")}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("login.nomeCompleto")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all text-sm sm:text-base"
                    placeholder={t("login.nomeCompleto")}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("login.email")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleInputFocus}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all text-sm sm:text-base"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("login.senha")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all pr-9 sm:pr-10 text-sm sm:text-base"
                    placeholder="******"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 sm:right-3 top-2.5 sm:top-3 text-gray-500 hover:text-blue-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>

              {isLogin && (
                <p
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer text-right"
                >
                  {t("login.esqueceuSenha")}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-xl disabled:opacity-60 flex items-center justify-center text-sm sm:text-base"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                    {t("login.aguarde")}
                  </>
                ) : isLogin ? (
                  t("login.entrar")
                ) : (
                  t("login.cadastrar")
                )}
              </button>

              {isLogin && !adminMode && (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="w-full mt-3 text-gray-400 hover:text-blue-600 text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  {t("login.acessoAdmin")}
                </button>
              )}
            </form>
          </div>

          {/* DIREITA – texto institucional */}
          <div className="order-2 bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-white shadow-xl border border-white/20 mt-6 md:mt-0">
            <h2 className="text-3xl font-bold mb-6 text-center md:text-left">
              {t("login.sistema")}
            </h2>
            <div className="space-y-6">
              {[
                {
                  icon: <Users className="w-6 h-6 text-blue-200" />,
                  title: t("login.profissional"),
                  text: t("login.descricaoProfissionais"),
                },
                {
                  icon: <Building2 className="w-6 h-6 text-blue-200" />,
                  title: t("login.empresa"),
                  text: t("login.descricaoEmpresas"),
                },
                {
                  icon: <Shield className="w-6 h-6 text-blue-200" />,
                  title: t("login.cadastroGratuito"),
                  text: t("login.descricaoCadastro"),
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 items-start bg-white/5 md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none border border-white/10 md:border-0"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/20">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-blue-100 text-sm">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🔐 MODAL ADMIN */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 w-[90%] max-w-[380px] shadow-2xl relative"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button
                onClick={() => setShowAdminModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center text-center">
                <LockKeyhole className="w-10 h-10 text-blue-600 mb-3" />
                <h2 className="text-xl font-semibold mb-2 text-gray-800">
                  {t("login.acessoAdmin")}
                </h2>
                <p className="text-gray-500 text-sm mb-5">
                  {t("login.digiteChave")}
                </p>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder={t("login.placeholderChave")}
                  className="w-full border border-gray-300 rounded-lg p-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex justify-end gap-3 mt-6 w-full">
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm"
                  >
                    {t("login.cancelar")}
                  </button>
                  <button
                    onClick={handleConfirmAdminKey}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                  >
                    {t("login.confirmar")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔑 Recuperar senha */}
      <RecuperarSenha
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />

      {/* 🌍 MODAL IDIOMA MOBILE */}
      <AnimatePresence>
        {showLangModal &&
          createPortal(
            <motion.div
              key="idioma-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center"
              onClick={() => setShowLangModal(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-2xl w-[88%] max-w-sm p-5 text-gray-800 border border-gray-200 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowLangModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-lg font-bold mb-4 text-center">
                  🌍 Selecione o idioma
                </h2>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setShowLangModal(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        i18n.language.startsWith(lang.code)
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>

      {/* espaçador para cobrir a área do gesto do iOS */}
      <div
        aria-hidden="true"
        className="w-full"
        style={{ height: "env(safe-area-inset-bottom)" }}
      />
    </div>
  );
};

export default LoginPage;
