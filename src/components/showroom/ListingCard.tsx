import Image from "next/image";
import Link from "next/link";
import { garage } from "@/config/garage";
import type { Listing } from "@/config/inventory";
import type { Locale } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";
import { inquiryText } from "@/lib/inquiry";
import { formatPrice } from "@/lib/listings";
import { whatsappUrl } from "@/lib/whatsapp";
import { CarView } from "../diagnose/CarView";
import { WhatsAppIcon } from "../WhatsAppFloat";

/** One car in the showroom: render or photo, kind badge, price, detail link and WhatsApp inquiry. */
export function ListingCard({ listing: l, locale, t }: { listing: Listing; locale: Locale; t: Strings }) {
  const s = t.inventory;
  const href = `/${locale}/showroom/${l.id}`;
  const unavailable = l.status && l.status !== "available";

  return (
    <li className="group flex flex-col rounded-2xl border border-line bg-ink-900 p-5">
      <Link
        href={href}
        className="relative block overflow-hidden rounded-xl bg-[radial-gradient(ellipse_65%_60%_at_50%_60%,rgba(255,255,255,0.08),transparent_72%)] px-2 py-6"
      >
        {l.photo ? (
          <Image src={l.photo} alt={l.name} width={600} height={360} className="h-auto w-full rounded-lg object-cover" />
        ) : (
          <div className="transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none">
            <CarView
              model={l.render.model}
              view="left"
              prefix={`inv-${l.id}`}
              label={l.name}
              paint={l.render.paint}
              tint="dark"
              wheel={l.render.wheel}
            />
          </div>
        )}
        <span
          className={`absolute start-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
            l.kind === "sale" ? "bg-accent text-accent-ink" : "border border-line-strong bg-ink-950/80 text-snow"
          }`}
        >
          {s[l.kind]}
        </span>
        {unavailable && (
          <span className="absolute end-3 top-3 rounded-full border border-line-strong bg-ink-950/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
            {s.statuses[l.status!]}
          </span>
        )}
      </Link>
      <h3 className="mt-4 font-display text-lg text-snow">
        <Link href={href} className="hover:text-accent-strong">
          <bdi>{l.name}</bdi>
        </Link>
      </h3>
      <p className="mt-1 text-sm text-mist">{l.price ? formatPrice(l.price, locale) : s.priceOnRequest}</p>
      <a
        href={whatsappUrl(garage.whatsapp, inquiryText(l, garage.messageLocale))}
        target="_blank"
        rel="noopener noreferrer"
        data-event="whatsapp_click"
        data-testid={`ask-${l.id}`}
        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong text-sm text-snow transition-colors hover:border-accent hover:text-accent-strong"
      >
        <WhatsAppIcon className="size-4" />
        {s.ask}
      </a>
    </li>
  );
}
