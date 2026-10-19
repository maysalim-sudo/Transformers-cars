export const locales = ["fr", "ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export const localeDir: Record<Locale, "ltr" | "rtl"> = {
  fr: "ltr",
  ar: "rtl",
  en: "ltr",
};

export const localeNames: Record<Locale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

export const localeShort: Record<Locale, string> = {
  fr: "FR",
  ar: "ع",
  en: "EN",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Text in the visitor's language with a fallback to English. */
export type Localized = { en: string; fr?: string; ar?: string };

export function pick(text: Localized, locale: Locale): string {
  return text[locale] ?? text.en;
}
