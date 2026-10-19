"use client";

import Link from "next/link";
import { useState } from "react";
import { PartRender } from "@/car/PartRender";
import { defaults, paints, tints, type WheelStyle, wheelStyles } from "@/car/palette";
import { type Locale, pick } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";

const pill = "inline-flex h-9 items-center rounded-full border px-4 text-[13px] transition-colors";

/** Live recolour of the hero car: real palette changes, not an overlay. */
export function ColourStudio({ locale, t }: { locale: Locale; t: Strings }) {
  const [paint, setPaint] = useState("rosso");
  const [wheel, setWheel] = useState<WheelStyle["id"]>(defaults.wheel);
  const [tint, setTint] = useState("dark");
  const p = t.diagnose.parts;

  return (
    <section className="relative z-10 overflow-hidden border-t border-line bg-ink-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 md:grid-cols-2 md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{t.teaser.kicker}</p>
            <h2 className="mt-4 font-display text-3xl font-light text-snow sm:text-5xl">{t.teaser.title}</h2>
          </div>
          <p className="text-mist md:text-end">{t.teaser.body}</p>
        </div>

        <div className="relative mt-10 rounded-3xl border border-line bg-[radial-gradient(ellipse_60%_55%_at_50%_62%,rgba(255,255,255,0.07),transparent_70%)] px-2 pb-6 pt-10 sm:px-10">
          <div className="pointer-events-none absolute inset-x-10 bottom-16 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <PartRender id="studio" show="car" viewBox="50 96 1100 344" paint={paint} wheel={wheel} tint={tint} className="studio-car aspect-[1100/344] w-full" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <fieldset>
            <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{p.paint}</legend>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {paints.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPaint(c.id)}
                  aria-pressed={paint === c.id}
                  aria-label={pick(c.label, locale)}
                  title={pick(c.label, locale)}
                  className={`size-10 rounded-full border-2 p-0.5 transition-colors ${paint === c.id ? "border-accent" : "border-transparent hover:border-line-strong"}`}
                >
                  <span
                    className="block size-full rounded-full ring-1 ring-white/15"
                    style={{ background: `linear-gradient(135deg, ${c.tones[0]}, ${c.tones[1]} 55%, ${c.tones[3]})` }}
                  />
                </button>
              ))}
              <span className="ms-1 text-sm text-fog">{pick(paints.find((c) => c.id === paint)!.label, locale)}</span>
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{p.wheels}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {wheelStyles.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={wheel === w.id}
                  onClick={() => setWheel(w.id)}
                  className={`${pill} ${wheel === w.id ? "border-snow bg-snow text-ink-950" : "border-line-strong text-fog hover:border-fog"}`}
                >
                  {pick(w.label, locale)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{p.tint}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {tints.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={tint === x.id}
                  onClick={() => setTint(x.id)}
                  className={`${pill} ${tint === x.id ? "border-snow bg-snow text-ink-950" : "border-line-strong text-fog hover:border-fog"}`}
                >
                  {pick(x.label, locale)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-accent-dim">{p.illustrative}</p>
          <Link
            href={`/${locale}/diagnose`}
            className="inline-flex h-12 shrink-0 items-center self-start rounded-full bg-snow px-6 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-strong"
          >
            {t.teaser.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
