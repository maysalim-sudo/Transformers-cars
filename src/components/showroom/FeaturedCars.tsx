import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";
import { getListings, isShown } from "@/lib/listings";
import { ListingCard } from "./ListingCard";

const FEATURED = 3;

/** Home-page teaser for the showroom: a few cars and a way through to the full page. */
export async function FeaturedCars({ locale, t }: { locale: Locale; t: Strings }) {
  const s = t.inventory;
  const all = (await getListings()).filter(isShown);
  const featured = all.slice(0, FEATURED);

  return (
    <section id="showroom" className="relative z-10 scroll-mt-16 border-t border-line bg-ink-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{s.kicker}</p>
            <h2 className="mt-4 font-display text-3xl font-light text-snow sm:text-5xl">{s.title}</h2>
            <p className="mt-4 max-w-md text-sm text-mist">{s.lead}</p>
          </div>
          <Link
            href={`/${locale}/showroom`}
            className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-line-strong px-5 text-sm text-snow transition-colors hover:bg-white/5 sm:self-auto"
          >
            {s.seeAll} <span aria-hidden className="rtl:-scale-x-100">→</span>
          </Link>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} locale={locale} t={t} />
          ))}
        </ul>
        {all.some((l) => l.example) && <p className="mt-4 text-xs text-accent-dim">{s.exampleNote}</p>}
      </div>
    </section>
  );
}
