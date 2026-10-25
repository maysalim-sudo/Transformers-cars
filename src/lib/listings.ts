import { type Listing, listings } from "@/config/inventory";
import type { Locale } from "@/i18n/config";

/**
 * The one place pages read showroom stock from. Static config today; the CRM swaps the source
 * (Supabase) here without touching the UI, which is why these are async already.
 */
export async function getListings(kind?: Listing["kind"]): Promise<Listing[]> {
  return listings.filter((l) => !kind || l.kind === kind);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  return listings.find((l) => l.id === id);
}

/** Sold cars and finished rentals stay off the public showroom. */
export function isShown(l: Listing): boolean {
  return l.status !== "sold";
}

/** "85 000 TND" in the visitor's language; undefined price reads as "price on request" upstream. */
export function formatPrice(price: number, locale: Locale): string {
  return new Intl.NumberFormat(`${locale}-TN`, { style: "currency", currency: "TND", maximumFractionDigits: 0 }).format(price);
}
