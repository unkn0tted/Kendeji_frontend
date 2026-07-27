/// <reference path="../typings.d.ts" />
import type { InitOptions } from "i18next";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

export function initializeI18n(i18nConfig?: InitOptions) {
  const translationVersion = import.meta.env.VITE_APP_BUILD_ID || "dev";

  i18n
    // Load translation using http backend
    // Learn more: https://github.com/i18next/i18next-http-backend
    .use(Backend)
    // Detect user language
    // Learn more: https://github.com/i18next/i18next-browser-languagedetector
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    // For all options read: https://www.i18next.com/overview/configuration-options
    .init({
      // Language configuration
      fallbackLng: "en-US", // Default language when detection fails
      supportedLngs: ["en-US", "zh-CN"], // Available locales
      load: "currentOnly", // Load only the detected locale, not derived variants (e.g. "en" for "en-US")
      // Note: lng is not set to allow LanguageDetector to handle detection

      // Interpolation configuration
      interpolation: {
        escapeValue: false, // Disable escaping since React handles XSS protection
      },

      // HTTP backend configuration
      backend: {
        loadPath: "assets/locales/{{lng}}/{{ns}}.json", // Translation files path template (relative to base)
        crossDomain: false, // Disable cross-domain requests
        withCredentials: false, // Don't send credentials with requests
        queryStringParams: {
          v: translationVersion,
        },
        requestOptions: {
          cache: import.meta.env.DEV ? "no-store" : "default",
        },
      },

      // Language detection configuration
      detection: {
        order: ["localStorage", "navigator", "htmlTag"], // Detection priority order
        lookupLocalStorage: "language", // localStorage key for saved language
        caches: ["localStorage"], // Cache detected language in localStorage
      },
      // Namespace configuration
      defaultNS: "components", // Default namespace for translations
      ns: [],

      // React integration options
      react: {
        useSuspense: true, // Enable React Suspense for async translation loading
      },
      ...i18nConfig,
    });

  // Keep <html lang> in sync with the active language (initial detection + switches)
  const syncDocumentLanguage = (lng: string) => {
    if (typeof document !== "undefined" && lng) {
      document.documentElement.lang = lng;
    }
  };
  i18n.on("languageChanged", syncDocumentLanguage);
  if (i18n.language) {
    syncDocumentLanguage(i18n.language);
  }

  window.i18n = i18n;
  return i18n;
}
