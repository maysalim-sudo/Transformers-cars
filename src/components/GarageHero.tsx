"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AnchorId } from "@/garage/heroCar";
import type { Garage } from "@/garage/scene";
import { createSoundEngine, type SoundEngine } from "@/garage/sound/engine";
import { follow } from "@/garage/scroll";
import { type GarageState, stateAt } from "@/garage/timeline";
import { garage as shop } from "@/config/garage";
import type { Locale } from "@/i18n/config";
import { getStrings, type Strings } from "@/i18n/strings";
import { whatsappUrl } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./WhatsAppFloat";

const ANCHORS: AnchorId[] = ["wheels", "stance", "kit", "paint", "tint"];
/** which still stands in for the scene in each bay (still mode, and while the scene loads) */
const STILL_OF_BAY = [0, 0, 0, 0, 1, 1, 2];
const STILLS = ["arrival", "paint", "reveal"] as const;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const SOUND_KEY = "tt-sound";

function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

function writeSoundPref(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // private window or blocked storage: the toggle still works for this visit
  }
}

function webglAvailable() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export function GarageHero({ locale, t }: { locale: Locale; t: Strings }) {
  const g = t.garage;
  const track = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stills = useRef<(HTMLElement | null)[]>([]);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const jobs = useRef<(HTMLElement | null)[]>([]);
  const callouts = useRef<(HTMLElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const waText = getStrings(shop.messageLocale).message.general;
  const sound = useRef<SoundEngine | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  const enableSound = async () => {
    sound.current ??= createSoundEngine();
    await sound.current.enable();
  };

  const toggleSound = () => {
    const on = !soundOn;
    setSoundOn(on);
    writeSoundPref(on);
    if (on) void enableSound();
    else sound.current?.disable();
  };

  // a visitor who left sound on gets it back, but only from their first gesture: browsers refuse to start
  // audio without one, so nothing plays before it
  useEffect(() => {
    if (!readSoundPref()) return;
    setSoundOn(true);
    // a touch pointerdown is not a gesture that may start audio; click, pointerup and keydown are.
    // enable() resolves only once the context is running, so keep listening until it does
    const events = ["click", "pointerup", "keydown"] as const;
    const stop = () => events.forEach((e) => removeEventListener(e, first));
    const first = () => void enableSound().then(stop);
    events.forEach((e) => addEventListener(e, first));
    return stop;
  }, []);

  useEffect(() => () => sound.current?.dispose(), []);

  useEffect(() => {
    const trackEl = track.current;
    const canvasEl = canvas.current;
    if (!trackEl || !canvasEl) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const portrait = () => innerHeight > innerWidth;
    let scene: Garage | null = null;
    let live = false;
    let raf = 0;
    let visible = false;
    let p = 0;
    let lastBay = -1;
    let lastStill = -1;
    let cancelled = false;

    const readP = () => {
      const r = trackEl.getBoundingClientRect();
      return clamp01(-r.top / Math.max(1, r.height - innerHeight));
    };

    const setMode = (mode: "still" | "live") => {
      trackEl.dataset.mode = mode;
      canvasEl.style.opacity = mode === "live" ? "1" : "0";
    };

    const toStill = () => {
      live = false;
      scene?.dispose();
      scene = null;
      setMode("still");
    };

    const overlays = (s: GarageState, pNow: number) => {
      if (s.bay !== lastBay) {
        cards.current.forEach((el, i) => {
          if (!el) return;
          const on = i === s.bay;
          el.dataset.on = on ? "1" : "0";
          // hidden cards stay in the accessibility tree (all the copy is readable), but out of the tab order
          el.querySelectorAll("a, button").forEach((c) => ((c as HTMLElement).tabIndex = on ? 0 : -1));
        });
        lastBay = s.bay;
      }
      jobs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.state = s.done[i] ? "done" : s.bay === i + 1 ? "active" : "todo";
      });
      // the headline has no card: shade the scene behind it while it shows
      if (scrim.current) scrim.current.style.opacity = s.bay === 0 ? "1" : "0";
      if (bar.current) bar.current.style.transform = `scaleX(${pNow.toFixed(4)})`;
      const still = STILL_OF_BAY[s.bay];
      if (still !== lastStill) {
        stills.current.forEach((el, i) => el && (el.style.opacity = i === still ? "1" : "0"));
        lastStill = still;
      }
      callouts.current.forEach((el, i) => {
        if (!el) return;
        const shown = live && scene && s.bay === i + 1 && !s.done[i];
        if (!shown) {
          el.dataset.on = "0";
          return;
        }
        const at = scene!.project(ANCHORS[i]);
        el.dataset.on = at.visible ? "1" : "0";
        el.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
      });
    };

    let lastT = performance.now();
    let soundP: number | null = null;
    // null after a pause: the first frame back snaps to wherever the visitor scrolled meanwhile
    let lastTarget: number | null = null;
    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      const target = readP();
      const step = follow(p, target, lastTarget, dt, reduced);
      lastTarget = target;
      p = step.p;
      if (step.jumped) soundP = null;
      const s = stateAt(p, { portrait: portrait() });
      overlays(s, p);
      if (live && scene) {
        scene.apply(s);
        scene.render();
      }
      // the stills show a parked car: no engine note in still mode
      sound.current?.frame(soundP, p, live ? s : { ...s, carSpeed: 0 });
      soundP = p;
      raf = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
      if (!raf) {
        soundP = null;
        lastTarget = null;
        sound.current?.suspend();
      }
    };
    const start = () => {
      if (!raf && visible && !document.hidden) {
        lastT = performance.now();
        sound.current?.resume();
        raf = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      start();
    });
    io.observe(trackEl);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);
    // size the scene to the canvas box, not the window: a classic scrollbar makes them differ, which
    // would squash the scene and shift the callouts (and appearing scrollbars fire no window resize)
    const onResize = () => scene?.resize(canvasEl.clientWidth || innerWidth, canvasEl.clientHeight || innerHeight, portrait());
    const ro = new ResizeObserver(onResize);
    ro.observe(canvasEl);

    // first paint is the still; jump straight to where the visitor already is (deep link, reload)
    p = readP();
    setMode("still");
    overlays(stateAt(p, { portrait: portrait() }), p);

    if (!reduced && webglAvailable()) {
      import("@/garage/scene")
        .then(({ createGarage }) => {
          if (cancelled) return;
          scene = createGarage(canvasEl, { phone: innerWidth < 768, reduced });
          scene.onSlow(toStill);
          scene.onLost(toStill);
          onResize();
          return scene.ready.then(() => {
            if (cancelled || !scene) return;
            live = true;
            setMode("live");
            start();
          });
        })
        .catch(toStill);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      scene?.dispose();
    };
  }, []);

  const cta = (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={`/${locale}/diagnose`}
        className="inline-flex h-12 items-center rounded-full bg-snow px-6 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-strong"
      >
        {g.cta.primary}
      </Link>
      <a
        href={whatsappUrl(shop.whatsapp, waText)}
        target="_blank"
        rel="noopener noreferrer"
        data-event="whatsapp_click"
        className="inline-flex h-12 items-center gap-2 rounded-full border border-line-strong px-5 text-sm text-snow transition-colors hover:bg-white/5"
      >
        <WhatsAppIcon className="size-4" />
        {g.cta.secondary}
      </a>
    </div>
  );

  return (
    <section ref={track} data-garage-track data-mode="still" className="relative" style={{ height: "1100svh" }} aria-label={g.title}>
      <div className="sticky top-0 h-svh overflow-hidden bg-[#0b0f18]">
        {/* stills: the whole hero without WebGL, and the first paint while the scene loads */}
        {STILLS.map((name, i) => (
          <picture
            key={name}
            ref={(el) => void (stills.current[i] = el)}
            className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <source media="(orientation: portrait)" srcSet={`/garage/still_${name}_9x16.webp`} />
            <img src={`/garage/still_${name}_16x9.webp`} alt="" className="h-full w-full object-cover" fetchPriority={i === 0 ? "high" : "low"} />
          </picture>
        ))}
        <canvas ref={canvas} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700" aria-hidden />

        {/* spec callouts pinned to the car */}
        {ANCHORS.map((id, i) => (
          <div
            key={id}
            ref={(el) => void (callouts.current[i] = el)}
            data-on="0"
            className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-300 data-[on=1]:opacity-100"
            aria-hidden
          >
            <span className="absolute -start-1.5 -top-1.5 size-3 rounded-full bg-accent-strong shadow-[0_0_0_5px_rgba(240,176,78,.18),0_0_18px_var(--accent)]" />
            <span className="absolute start-0 top-0 h-px w-16 origin-left -rotate-[32deg] bg-gradient-to-r from-accent-strong to-accent-strong/20 rtl:origin-right rtl:rotate-[32deg]" />
            <span className="absolute -top-16 start-14 whitespace-nowrap rounded-xl border border-line bg-ink-900/85 px-3 py-2 backdrop-blur-md">
              <small className="block font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{g.callouts[id].label}</small>
              <b className="font-display text-[15px] font-normal text-snow">{g.callouts[id].value}</b>
            </span>
          </div>
        ))}

        {/* job card; on phones a thin row of six segments, so it does not cover the car */}
        <ol className="absolute inset-x-4 top-[4.5rem] z-10 flex gap-1.5 roomy:inset-x-auto roomy:end-8 roomy:top-24 roomy:block roomy:w-56 roomy:rounded-xl roomy:border roomy:border-line roomy:bg-ink-900/75 roomy:p-4 roomy:text-[13px] roomy:backdrop-blur-md">
          <li className="sr-only mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-mist roomy:not-sr-only roomy:block">{g.jobCard.title}</li>
          {g.jobCard.items.map((item, i) => (
            <li
              key={item}
              ref={(el) => void (jobs.current[i] = el)}
              data-state="todo"
              className="group h-1 flex-1 rounded-full bg-white/20 data-[state=active]:bg-accent/60 data-[state=done]:bg-accent roomy:flex roomy:h-auto roomy:items-center roomy:justify-between roomy:rounded-none roomy:border-t roomy:border-line roomy:bg-transparent roomy:py-2 roomy:text-mist roomy:data-[state=active]:bg-transparent roomy:data-[state=active]:text-snow roomy:data-[state=done]:bg-transparent roomy:data-[state=done]:text-snow"
            >
              <span className="sr-only roomy:not-sr-only">{item}</span>
              <span className="hidden size-4 place-items-center rounded border border-white/25 text-[10px] font-semibold text-ink-950 roomy:grid group-data-[state=active]:border-accent group-data-[state=active]:shadow-[0_0_12px_rgba(211,140,34,.6)] group-data-[state=done]:border-accent group-data-[state=done]:bg-accent">
                <span className="hidden group-data-[state=done]:inline">✓</span>
              </span>
            </li>
          ))}
        </ol>

        {/* sound toggle: opt-in, remembered; inside the stage so it exists only while the hero is on screen */}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={g.sound.on}
          title={soundOn ? g.sound.on : g.sound.off}
          className="absolute end-4 top-[5.5rem] z-10 grid size-10 place-items-center rounded-full border border-line bg-ink-900/75 text-mist backdrop-blur-md transition-colors hover:text-snow aria-pressed:border-accent aria-pressed:text-accent-strong roomy:end-[17rem] roomy:top-24"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {soundOn ? (
              <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
            ) : (
              <path d="M16 9.5l5 5M21 9.5l-5 5" />
            )}
          </svg>
        </button>

        {/* shade behind the headline, so the lit garage does not fight the words: an ellipse behind the text on wide
            screens (mirrored in RTL), leaving the sign bright, from the bottom on phones where the headline sits low */}
        <div
          ref={scrim}
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-700 bg-[linear-gradient(to_top,rgb(5_6_8/.92)_0%,rgb(5_6_8/.75)_38%,transparent_70%)] sm:bg-[radial-gradient(ellipse_62%_58%_at_0%_74%,rgb(5_6_8/.9)_0%,rgb(5_6_8/.62)_50%,transparent_100%)] sm:rtl:bg-[radial-gradient(ellipse_62%_58%_at_100%_74%,rgb(5_6_8/.9)_0%,rgb(5_6_8/.62)_50%,transparent_100%)]"
        />

        {/* bay 0: the headline; bays 1–6: one card each */}
        <div
          ref={(el) => void (cards.current[0] = el)}
          data-on="1"
          className="absolute inset-x-4 bottom-10 z-10 max-w-2xl transition-opacity duration-500 data-[on=0]:pointer-events-none data-[on=0]:opacity-0 sm:start-8 sm:bottom-14"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{g.eyebrow}</p>
          <h1 className="mt-4 max-w-[17ch] font-display text-[clamp(2.1rem,5.4vw,4.4rem)] font-light leading-[1.04] tracking-[-0.02em] text-snow">{g.title}</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mist">{g.lead}</p>
          {cta}
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-mist">{g.scroll}</p>
        </div>
        {g.bays.map((b, i) => (
          <article
            key={b.kicker}
            ref={(el) => void (cards.current[i + 1] = el)}
            data-on="0"
            className="absolute inset-x-4 bottom-6 z-10 max-w-md rounded-2xl border border-line bg-ink-900/85 p-6 opacity-0 shadow-[0_30px_80px_-30px_rgba(0,0,0,.9)] backdrop-blur-md transition-[opacity,transform] duration-500 data-[on=0]:pointer-events-none data-[on=0]:translate-y-3 data-[on=1]:opacity-100 sm:start-8 sm:bottom-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent">{b.kicker}</p>
            <h2 className="mt-3 font-display text-2xl font-light text-snow sm:text-3xl">{b.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist">{b.body}</p>
            {i === g.bays.length - 1 && (
              <>
                {/* the spec sheet repeats the callouts; on phones it would hide the car the reveal is about */}
                <p className="sr-only mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-mist sm:not-sr-only sm:block">{g.spec.title}</p>
                <dl className="sr-only mt-2 border-t sm:not-sr-only sm:block border-line text-[13px]">
                  {g.spec.rows.map((r) => (
                    <div key={r.label} className="flex justify-between border-b border-line py-1.5">
                      <dt className="text-mist">{r.label}</dt>
                      <dd className="text-snow">{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {cta}
              </>
            )}
          </article>
        ))}

        <div ref={bar} className="absolute inset-x-0 bottom-0 z-10 h-0.5 origin-left scale-x-0 bg-accent shadow-[0_0_12px_var(--accent)] rtl:origin-right" />
      </div>
    </section>
  );
}
