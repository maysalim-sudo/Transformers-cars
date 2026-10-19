import type { Listing } from "@/config/inventory";
import type { Locale } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";

/** WhatsApp text for "Ask about this car", in the language the showroom reads. */
export function inquiryText(listing: Listing, locale: Locale): string {
  const m = getStrings(locale).message;
  const template = listing.kind === "sale" ? m.inquirySale : m.inquiryRental;
  return template.replace("{name}", listing.name);
}
