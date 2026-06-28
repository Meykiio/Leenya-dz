import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enLanding from "./locales/en/landing.json";
import enAuth from "./locales/en/auth.json";
import enDashboard from "./locales/en/dashboard.json";
import enBooking from "./locales/en/booking.json";
import enStaff from "./locales/en/staff.json";

import arCommon from "./locales/ar/common.json";
import arLanding from "./locales/ar/landing.json";
import arAuth from "./locales/ar/auth.json";
import arDashboard from "./locales/ar/dashboard.json";
import arBooking from "./locales/ar/booking.json";
import arStaff from "./locales/ar/staff.json";

import frCommon from "./locales/fr/common.json";
import frLanding from "./locales/fr/landing.json";
import frAuth from "./locales/fr/auth.json";
import frDashboard from "./locales/fr/dashboard.json";
import frBooking from "./locales/fr/booking.json";
import frStaff from "./locales/fr/staff.json";

const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
    dashboard: enDashboard,
    booking: enBooking,
    staff: enStaff,
  },
  ar: {
    common: arCommon,
    landing: arLanding,
    auth: arAuth,
    dashboard: arDashboard,
    booking: arBooking,
    staff: arStaff,
  },
  fr: {
    common: frCommon,
    landing: frLanding,
    auth: frAuth,
    dashboard: frDashboard,
    booking: frBooking,
    staff: frStaff,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "landing", "auth", "dashboard", "booking", "staff"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "leenya_lang",
      caches: ["localStorage"],
    },
  });

export default i18n;
