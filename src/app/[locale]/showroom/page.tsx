import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShowroomGrid } from "@/components/showroom/ShowroomGrid";
import { isLocale } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";
import { getListings, isShown } from "@/lib/listings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getStrings(locale);
  return { title: `${t.nav.showroom} — ${t.meta.title}`, description: t.inventory.lead };
}

export default async function ShowroomPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getStrings(locale);
  const s = t.inventory;
  const listings = (await getListings()).filter(isShown);

  return (
    <section className="relative min-h-svh bg-ink-950 pb-24 pt-32 sm:pb-32 sm:pt-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{s.kicker}</p>
        <h1 className="mt-4 font-display text-4xl font-light text-snow sm:text-6xl">{s.title}</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mist">{s.lead}</p>
        <div className="mt-12">
          <ShowroomGrid listings={listings} locale={locale} t={t} />
        </div>
        {listings.some((l) => l.example) && <p className="mt-4 text-xs text-accent-dim">{s.exampleNote}</p>}
      </div>
    </section>
  );
}
