"use client";

import Image from "next/image";
import { useState } from "react";
import { garage } from "@/config/garage";
import { type Listing, listings } from "@/config/inventory";
import type { Locale } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";
import { inquiryText } from "@/lib/inquiry";
import { whatsappUrl } from "@/lib/whatsapp";
import { CarView } from "./diagnose/CarView";
import { WhatsAppIcon } from "./WhatsAppFloat";

type Filter = "all" | Listing["kind"];

/** "Available now": consignment sales and rentals, each with a one-tap WhatsApp inquiry. */
export function Inventory({ t }: { locale: Locale; t: Strings }) {
  const s = t.inventory;
  const [filter, setFilter] = useState<Filter>("all");
  const shown = listings.filter((l) => filter === "all" || l.kind === filter);
  const hasExamples = listings.some((l) => l.example);

  return (
    <section id="showroom" className="relative z-10 scroll-mt-16 border-t border-line bg-ink-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{s.kicker}</p>
            <h2 className="mt-4 font-display text-3xl font-light text-snow sm:text-5xl">{s.title}</h2>
          </div>
          <div className="flex gap-2" role="group" aria-label={s.kicker}>
            {(["all", "sale", "rental"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-[13px] transition-colors ${
                  filter === f ? "border-snow bg-snow text-ink-950" : "border-line-strong text-fog hover:border-fog"
                }`}
              >
                {s[f]}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((l) => (
            <li key={l.id} className="group flex flex-col rounded-2xl border border-line bg-ink-900 p-5">
              <div className="relative overflow-hidden rounded-xl bg-[radial-gradient(ellipse_65%_60%_at_50%_60%,rgba(255,255,255,0.08),transparent_72%)] px-2 py-6">
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
              </div>
              <h3 className="mt-4 font-display text-lg text-snow">
                <bdi>{l.name}</bdi>
              </h3>
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
          ))}
        </ul>
        {hasExamples && <p className="mt-4 text-xs text-accent-dim">{s.exampleNote}</p>}
      </div>
    </section>
  );
}
