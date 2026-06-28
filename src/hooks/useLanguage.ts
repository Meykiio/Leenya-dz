import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const RTL_LANGS = ["ar"];

export function useLanguage() {
  const { i18n } = useTranslation();

  const language = i18n.language?.startsWith("ar")
    ? "ar"
    : i18n.language?.startsWith("fr")
      ? "fr"
      : "en";

  const direction = RTL_LANGS.includes(language) ? "rtl" : "ltr";

  const setLanguage = useCallback(
    async (lang: string) => {
      await i18n.changeLanguage(lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        await supabase
          .from("profiles")
          .update({ preferred_lang: lang })
          .eq("id", user.user.id);
      }
    },
    [i18n]
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  return { language, direction, setLanguage };
}
