import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

const storedLang = localStorage.getItem("boardgamehub.language");
const browserLang = navigator.language?.startsWith("vi") ? "vi" : "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLang || browserLang,
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
