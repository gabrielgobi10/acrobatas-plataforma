import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// 🌍 Importa os arquivos de tradução
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";

// 💾 Verifica se o usuário já tinha um idioma salvo
const savedLang = localStorage.getItem("acrobatas_lang");

// 🧩 Inicializa o i18n com todas as traduções
i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    hi: { translation: hi },
    ar: { translation: ar },
  },
  lng: savedLang || "pt", // idioma inicial
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// 🌐 Função que muda a direção (RTL ↔ LTR)
const updateDirection = (lang: string) => {
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
};

// 🏁 Aplica o idioma e direção na inicialização
updateDirection(i18n.language);

// 🔄 Atualiza sempre que o idioma mudar
i18n.on("languageChanged", (lang) => {
  updateDirection(lang);
  localStorage.setItem("acrobatas_lang", lang); // salva no cache
});

export default i18n;
