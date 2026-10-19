"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { CarStage } from "@/car/CarStage";
import { PartRender } from "@/car/PartRender";
import { TRANSFORM_FINISH } from "@/car/palette";
import { type HeroFrame, useExplode } from "@/car/useExplode";
import { garage } from "@/config/garage";
import type { Locale } from "@/i18n/config";
import { getStrings, type Strings } from "@/i18n/strings";
import { whatsappUrl } from "@/lib/whatsapp";
import { type EmitSparks, Sparks } from "./sparks/Sparks";
import { WhatsAppIcon } from "./WhatsAppFloat";

const PANEL_IDS = ["car-explode-start", "car-explode-full", undefined, undefined, "car-reassemble", "car-transform", undefined];
/** hero + one panel per sequence entry */
const PANELS = 8;
/** sparks follow the beam: same mapping as .car-beam in globals.css */
const beamX = (tx: number) => tx * 1.2 - 0.2;

export function HeroSequence({ locale, t }: { locale: Locale; t: Strings }) {
  const track = useRef<HTMLElement>(null);
  const emit = useRef<EmitSparks>(null);
  const lit = useRef(false);

  const onFrame = useCallback(({ tx, dTx, dE, snapped }: HeroFrame) => {
    // welding sparks on the transformation beam, a few at the hubs while parts separate
    if (snapped) {
      // jumped (deep link / off screen / reduced motion): no sparks, just keep the lit state right
    } else if (dTx > 0.0005) emit.current?.(beamX(tx), Math.min(1, dTx * 60));
    if (!snapped && Math.abs(dE) > 0.004) {
      emit.current?.(0.25, Math.min(0.4, Math.abs(dE) * 20));
      emit.current?.(0.76, Math.min(0.4, Math.abs(dE) * 20));
    }
    // headlight flash once the build is finished
    const el = track.current;
    if (!el) return;
    if (!lit.current && tx > 0.98) {
      lit.current = true;
      el.dataset.lit = "1";
    } else if (lit.current && tx < 0.9) {
      lit.current = false;
      delete el.dataset.lit;
    }
  }, []);
  useExplode(track, track, onFrame);
  const waText = getStrings(garage.messageLocale).message.general;

  return (
    <section ref={track} className="relative" style={{ height: `${PANELS * 100}svh` }} aria-label={t.hero.title}>
      {/* pinned stage */}
      <div
        className="sticky top-0 h-svh overflow-hidden"
        style={{ opacity: "var(--fade, 1)" }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_58%,rgba(213,217,224,0.07),transparent_70%)]" />
        <div className="absolute inset-x-0 top-[62%] h-px md:top-[70%] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-0 top-[50%] mx-auto w-[min(94vw,1040px)] -translate-y-1/2 md:top-[56%]">
          <div className="car-idle relative">
            {/* showroom floor: the car mirrored about its ground line, only while assembled */}
            <div className="car-reflection" aria-hidden>
              <PartRender id="refl-s" show="car" viewBox="0 0 1200 480" variant="stock" {...TRANSFORM_FINISH.stock} className="car-stock absolute inset-0" />
              <PartRender id="refl-t" show="car" viewBox="0 0 1200 480" variant="tuned" {...TRANSFORM_FINISH.tuned} className="car-tuned absolute inset-0" />
            </div>
            <CarStage locale={locale} />
            <Sparks emitRef={emit} />
          </div>
        </div>
      </div>

      {/* copy, in normal flow over the pinned car */}
      <div className="relative" style={{ marginTop: "-100svh" }}>
        <div className="relative mx-auto flex h-svh max-w-7xl flex-col justify-between px-4 pb-8 pt-24 sm:px-8 sm:pt-28 md:justify-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{t.hero.eyebrow}</p>
            <h1 className="mt-4 max-w-[17ch] font-display text-[clamp(2.1rem,5.4vw,4.4rem)] font-light leading-[1.04] tracking-[-0.02em] text-snow">
              {t.hero.title}
            </h1>
          </div>
          <div className="md:mt-6">
            <p className="max-w-md text-[15px] leading-relaxed text-mist">{t.hero.lead}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/diagnose`}
                className="inline-flex h-12 items-center rounded-full bg-snow px-6 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-strong"
              >
                {t.hero.primary}
              </Link>
              <a
                href={whatsappUrl(garage.whatsapp, waText)}
                target="_blank"
                rel="noopener noreferrer"
                data-event="whatsapp_click"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-sm text-snow transition-colors hover:bg-white/5"
              >
                <WhatsAppIcon className="size-4" />
                {t.hero.secondary}
              </a>
            </div>
          </div>
          <p className="absolute bottom-8 end-8 hidden font-mono text-[10px] uppercase tracking-[0.3em] text-mist md:block">
            {t.hero.scroll} ↓
          </p>
        </div>

        {t.sequence.map((s, i) => (
          <div
            key={s.kicker}
            id={PANEL_IDS[i]}
            className={`relative mx-auto flex h-svh max-w-7xl px-4 sm:px-8 ${
              // the closing CTA sits above the reassembled car instead of over its wheels
              i === t.sequence.length - 1 ? "items-start pt-24" : "items-end pb-24 sm:pb-12"
            }`}
          >
            <article className="w-full max-w-md rounded-2xl border border-line bg-ink-900/85 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)] backdrop-blur-md">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{s.kicker}</p>
              <h2 className="mt-3 font-display text-2xl font-light text-snow sm:text-3xl">{s.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist">{s.body}</p>
              {i === t.sequence.length - 1 && (
                <Link
                  href={`/${locale}/diagnose`}
                  className="mt-5 inline-flex h-11 items-center rounded-full bg-snow px-5 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-strong"
                >
                  {t.hero.primary}
                </Link>
              )}
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
