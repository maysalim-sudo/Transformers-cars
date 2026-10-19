import type { Locale } from "@/i18n/config";

/**
 * Business details for Transformer Tuning Cars (from the public Instagram bio).
 * Opening hours and email are not known yet and stay unset rather than invented.
 */
export const garage = {
  name: "Transformer Tuning Cars",
  tagline: "Cars Tuning Tunisie",
  logo: { src: "/brand/logo-on-dark.png", width: 393, height: 105 },
  /** International format, digits only. */
  whatsapp: "21653008080",
  phoneDisplay: "+216 53 008 080",
  address: "Sousse, Tunisie",
  instagram: { url: "https://www.instagram.com/transformer_tuning__cars/", handle: "@transformer_tuning__cars" },
  tiktok: { url: "https://www.tiktok.com/@transformertuningcars", handle: "@transformertuningcars" },
  /** Language the workshop reads WhatsApp requests in. */
  messageLocale: "fr" as Locale,
  isPlaceholder: false,
} as const;
