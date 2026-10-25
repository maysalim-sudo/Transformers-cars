import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarView } from "@/components/diagnose/CarView";
import { WhatsAppIcon } from "@/components/WhatsAppFloat";
import { garage } from "@/config/garage";
import { isLocale, locales } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";
import { inquiryText } from "@/lib/inquiry";
import { formatPrice, getListing, getListings, isShown } from "@/lib/listings";
import { whatsappUrl } from "@/lib/whatsapp";

type Params = Promise<{ locale: string; id: string }>;

/** Extra drawings under the main one while a car has no photos yet. */
const GALLERY_VIEWS = ["front", "rear", "right"] as const;

export async function generateStaticParams() {
  const listings = (await getListings()).filter(isShown);
  return locales.flatMap((locale) => listings.map((l) => ({ locale, id: l.id })));
}

async function load(params: Params) {
  const { locale, id } = await params;
  if (!isLocale(locale)) return undefined;
  const listing = await getListing(id);
  if (!listing || !isShown(listing)) return undefined;
  return { locale, listing, t: getStrings(locale) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  return { title: `${data.listing.name} — ${data.t.nav.showroom}` };
}

export default async function ListingPage({ params }: { params: Params }) {
  const data = await load(params);
  if (!data) notFound();
  const { locale, listing: l, t } = data;
  const s = t.inventory;
  const photos = [l.photo, ...(l.photos ?? [])].filter((p): p is string => !!p);
  const drawing = (view: "left" | (typeof GALLERY_VIEWS)[number]) => (
    <CarView
      model={l.render.model}
      view={view}
      prefix={`lst-${l.id}-${view}`}
      label={l.name}
      paint={l.render.paint}
      tint="dark"
      wheel={l.render.wheel}
    />
  );

  return (
    <article className="relative min-h-svh bg-ink-950 pb-24 pt-28 sm:pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <Link href={`/${locale}/showroom`} className="inline-flex items-center gap-2 text-sm text-mist hover:text-snow">
          <span aria-hidden className="rtl:-scale-x-100">
            ←
          </span>{" "}
          {s.back}
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          {/* gallery: photos when the showroom has them, drawings until then */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_65%_60%_at_50%_60%,rgba(255,255,255,0.09),transparent_72%)] px-4 py-10">
              {photos[0] ? (
                <Image src={photos[0]} alt={l.name} width={1200} height={720} priority className="h-auto w-full rounded-lg object-cover" />
              ) : (
                drawing("left")
              )}
            </div>
            <ul className="mt-4 grid grid-cols-3 gap-4">
              {photos.length > 1
                ? photos.slice(1, 4).map((p) => (
                    <li key={p} className="overflow-hidden rounded-xl border border-line bg-ink-900">
                      <Image src={p} alt={l.name} width={400} height={240} className="h-auto w-full object-cover" />
                    </li>
                  ))
                : GALLERY_VIEWS.map((v) => (
                    <li key={v} className="rounded-xl border border-line bg-ink-900 p-3">
                      {drawing(v)}
                    </li>
                  ))}
            </ul>
          </div>

          {/* details */}
          <div className="lg:sticky lg:top-28">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
                l.kind === "sale" ? "bg-accent text-accent-ink" : "border border-line-strong text-snow"
              }`}
            >
              {s[l.kind]}
            </span>
            <h1 className="mt-4 font-display text-3xl font-light text-snow sm:text-5xl">
              <bdi>{l.name}</bdi>
            </h1>
            <p className="mt-3 text-lg text-fog">{l.price ? formatPrice(l.price, locale) : s.priceOnRequest}</p>

            <h2 className="mt-10 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{s.specs}</h2>
            <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-ink-900 text-sm">
              <Row label={s.type} value={s[l.kind]} />
              {l.year && <Row label={s.year} value={String(l.year)} />}
              <Row label={s.status} value={s.statuses[l.status ?? "available"]} />
            </dl>

            <a
              href={whatsappUrl(garage.whatsapp, inquiryText(l, garage.messageLocale))}
              target="_blank"
              rel="noopener noreferrer"
              data-event="whatsapp_click"
              data-testid={`ask-${l.id}`}
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-snow text-sm font-medium text-ink-950 transition-colors hover:bg-accent-strong"
            >
              <WhatsAppIcon className="size-4" />
              {s.ask}
            </a>
            {l.example && <p className="mt-4 text-xs text-accent-dim">{s.exampleNote}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <dt className="text-mist">{label}</dt>
      <dd className="text-snow">{value}</dd>
    </div>
  );
}
