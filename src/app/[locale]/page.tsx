import { notFound } from "next/navigation";
import { PartRender } from "@/car/PartRender";
import { ColourStudio } from "@/components/ColourStudio";
import { GarageHero } from "@/components/GarageHero";
import { FeaturedCars } from "@/components/showroom/FeaturedCars";
import { WhatsAppIcon } from "@/components/WhatsAppFloat";
import { garage } from "@/config/garage";
import { isLocale } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";
import { whatsappUrl } from "@/lib/whatsapp";

/** Which crop of the car illustrates each service card (side-view viewBox units). */
const serviceRenders: Record<string, Omit<Parameters<typeof PartRender>[0], "id" | "className">> = {
  accessories: { show: "car", viewBox: "40 200 330 206", paint: "obsidian" },
  styling: { show: "car", viewBox: "40 130 560 350", paint: "rosso" },
  wheels: { show: ["brake_disc_front", "caliper_front", "wheel_front_left"], viewBox: "124 236 280 175", wheel: "mesh" },
  performance: { show: ["engine", "transmission"], viewBox: "104 214 520 186" },
  consignment: { show: "car", viewBox: "50 96 1100 340", paint: "glacier", wheel: "aero" },
  rental: { show: "car", viewBox: "680 92 480 300", paint: "midnight" },
};

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getStrings(locale);
  const msg = getStrings(garage.messageLocale).message;

  return (
    <>
      <GarageHero locale={locale} t={t} />

      {/* Services: solid surfaces, nothing shows through */}
      <section id="services" className="relative z-10 scroll-mt-16 border-t border-line bg-ink-950 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{t.services.kicker}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-xl font-display text-3xl font-light text-snow sm:text-5xl">{t.services.title}</h2>
            <p className="text-xs text-mist">{t.services.lead}</p>
          </div>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {t.services.items.map((s, i) => (
              <li key={s.id} className="group flex flex-col bg-ink-900 p-7">
                {serviceRenders[s.id] && (
                  <div className="relative -mx-2 mb-6 aspect-[16/10] overflow-hidden rounded-xl bg-[radial-gradient(ellipse_65%_60%_at_50%_55%,rgba(255,255,255,0.08),transparent_72%)]">
                    <PartRender
                      id={`svc-${s.id}`}
                      {...serviceRenders[s.id]}
                      className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
                    />
                  </div>
                )}
                <span className="font-mono text-[11px] text-accent-dim">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-xl text-snow">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-mist">{s.body}</p>
                <a
                  href={whatsappUrl(garage.whatsapp, `${msg.general}\n— ${getStrings(garage.messageLocale).services.items[i].title}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-event="whatsapp_click"
                  className="mt-6 inline-flex items-center gap-2 self-start text-sm text-snow underline decoration-line-strong underline-offset-4 hover:decoration-accent"
                >
                  {t.services.quote} <span aria-hidden className="rtl:-scale-x-100">→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FeaturedCars locale={locale} t={t} />

      <ColourStudio locale={locale} t={t} />

      {/* Contact (placeholder data) */}
      <section id="contact" className="relative z-10 scroll-mt-16 border-t border-line bg-ink-950 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{t.contact.kicker}</p>
          <h2 className="mt-4 font-display text-3xl font-light text-snow sm:text-5xl">{t.contact.title}</h2>
          <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-ink-900 p-6">
              <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{t.contact.whatsapp}</dt>
              <dd className="mt-3">
                <a
                  href={whatsappUrl(garage.whatsapp, msg.general)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-event="whatsapp_click"
                  className="inline-flex items-center gap-2 text-snow hover:text-accent-strong"
                >
                  <WhatsAppIcon className="size-4" />
                  <span dir="ltr">{garage.phoneDisplay}</span>
                </a>
              </dd>
            </div>
            <div className="bg-ink-900 p-6">
              <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{t.contact.phone}</dt>
              <dd className="mt-3 text-snow" dir="ltr">
                {garage.phoneDisplay}
              </dd>
            </div>
            <div className="bg-ink-900 p-6">
              <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{t.contact.address}</dt>
              <dd className="mt-3 text-snow">{garage.address}</dd>
              <dd className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-mist" dir="ltr">
                <a href={garage.instagram.url} target="_blank" rel="noopener noreferrer" className="hover:text-snow">
                  {garage.instagram.handle}
                </a>
                <a href={garage.tiktok.url} target="_blank" rel="noopener noreferrer" className="hover:text-snow">
                  TikTok
                </a>
              </dd>
            </div>
            <div className="bg-ink-900 p-6">
              <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{t.contact.hours}</dt>
              <dd className="mt-3 text-snow">{t.contact.hoursValue}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-accent-dim">{t.contact.note}</p>
        </div>
      </section>
    </>
  );
}
