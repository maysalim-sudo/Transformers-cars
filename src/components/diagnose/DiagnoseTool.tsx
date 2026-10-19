"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { defaults, type Livery, liveries, paints, tints, type WheelStyle, wheelStyles } from "@/car/palette";
import { getPart } from "@/car/registry";
import { type CarModelId, carModels, modelIds } from "@/car/models";
import { selectablePartsIn, type ViewId, viewIds } from "@/car/views";
import { garage } from "@/config/garage";
import { type Locale, pick } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";
import { buildRequestMessage, type RequestInput } from "@/lib/requestMessage";
import { whatsappUrl } from "@/lib/whatsapp";
import { WhatsAppIcon } from "../WhatsAppFloat";
import { CarCanvas } from "./CarCanvas";

// three.js only loads when the 3D view is switched on
const Car3D = dynamic(() => import("./Car3D"), { ssr: false });

const PREF_KEY = "dg-3d";
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
import { CarView } from "./CarView";

type Mode = "repair" | "customize";

const chip =
  "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition-colors focus-visible:outline-2";
const chipOn = "border-snow bg-snow text-ink-950";
const chipOff = "border-line-strong text-fog hover:border-fog";

export function DiagnoseTool({ locale, t }: { locale: Locale; t: Strings }) {
  const d = t.diagnose;
  const [step, setStep] = useState(0);
  /** the furthest step reached: every step up to it stays one tap away, forwards as well as back */
  const [reached, setReached] = useState(0);
  const [view, setView] = useState<ViewId>("left");
  const [seen, setSeen] = useState<ViewId[]>([]);
  const [mode, setMode] = useState<Mode>("repair");
  const [selected, setSelected] = useState<string[]>([]);
  const [mechanical, setMechanical] = useState(false);
  const [model, setModel] = useState<CarModelId>("hatchback");
  const [paint, setPaint] = useState(defaults.paint);
  const [wheel, setWheel] = useState<WheelStyle["id"]>(defaults.wheel);
  const [tint, setTint] = useState(defaults.tint);
  const [livery, setLivery] = useState<Livery["id"]>(defaults.livery);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [drivable, setDrivable] = useState<RequestInput["drivable"]>("");
  // 3D: on by default for desktops and laptops, opt-in on phones and tablets
  const [can3d, setCan3d] = useState(false);
  const [use3d, setUse3d] = useState(false);
  const [lost3d, setLost3d] = useState(false);

  useEffect(() => {
    const ok = webglAvailable();
    setCan3d(ok);
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(PREF_KEY);
    } catch {}
    const desktop = window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
    setUse3d(ok && (saved === null ? desktop : saved === "1"));
  }, []);

  const switch3d = (on: boolean) => {
    setUse3d(on);
    setLost3d(false);
    try {
      window.localStorage.setItem(PREF_KEY, on ? "1" : "0");
    } catch {}
  };
  const on3dUnavailable = useCallback(() => {
    setUse3d(false);
    setCan3d(false);
    setLost3d(true);
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const show = useCallback((n: number) => {
    setStep(n);
    setReached((r) => Math.max(r, n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  // each step is its own history entry (?step=n), so the browser's back button steps back through the
  // form instead of leaving the page; a fresh load always starts at the vehicle
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("step")) window.history.replaceState(null, "", window.location.pathname);
    const onPop = () => {
      const n = Number(new URLSearchParams(window.location.search).get("step") ?? 0);
      show(Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [show]);
  const go = (n: number) => {
    if (n === step) return;
    show(n);
    if (n === 1 && !seen.includes(view)) setSeen((s) => [...s, view]);
    window.history.pushState(null, "", n ? `?step=${n}` : window.location.pathname);
  };
  const pickView = (v: ViewId) => {
    setView(v);
    setSeen((s) => (s.includes(v) ? s : [...s, v]));
  };

  const chooseModel = (id: CarModelId) => {
    setModel(id);
    // drop parts this class does not have (e.g. rear doors on a coupé)
    setSelected((s) => s.filter((x) => !carModels[id].missing.has(x)));
    go(1);
  };

  const request: RequestInput = {
    model,
    views: viewIds.filter((v) => seen.includes(v)),
    parts: selected,
    mechanical,
    notes,
    name,
    drivable,
    paint,
    wheel,
    tint,
    livery,
  };
  const message = buildRequestMessage(request, garage.messageLocale);
  const link = whatsappUrl(garage.whatsapp, message);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{d.kicker}</p>
      <h1 className="mt-3 max-w-2xl font-display text-3xl font-light text-snow sm:text-5xl">{d.title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mist">{d.lead}</p>

      {/* stepper */}
      <ol className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={d.title}>
        {d.steps.map((label, i) => {
          const current = i === step;
          const open = i <= reached && !current;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => open && go(i)}
                disabled={i > reached}
                aria-current={current ? "step" : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors focus-visible:outline-2 ${
                  current
                    ? "border-accent bg-accent/10"
                    : open
                      ? "border-line-strong bg-ink-900/60 hover:border-accent hover:bg-accent/5"
                      : "cursor-default border-line opacity-50"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                    current ? "bg-accent text-ink-950" : open ? "border border-accent text-accent group-hover:bg-accent group-hover:text-ink-950" : "border border-line-strong text-mist"
                  }`}
                  aria-hidden
                >
                  {open && i < step ? "✓" : i + 1}
                </span>
                <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${current ? "text-snow" : open ? "text-fog group-hover:text-snow" : "text-mist"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8">
        {step === 0 && (
          <section aria-labelledby="dg-vehicle">
            <h2 id="dg-vehicle" className="font-display text-xl text-snow">
              {d.vehicle.title}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {modelIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={model === id}
                  onClick={() => chooseModel(id)}
                  className={`group rounded-2xl border bg-ink-900 p-5 text-start transition-colors ${
                    model === id ? "border-accent/70" : "border-line hover:border-line-strong"
                  }`}
                >
                  <div className="transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none">
                    <CarView
                      model={id}
                      view="left"
                      prefix={`pick-${id}`}
                      label={d.vehicle[id]}
                      paint={carModels[id].paint}
                      tint="dark"
                      wheel={id === "suv" ? "aero" : id === "coupe" ? "mesh" : id === "pickup" || id === "doublecab" || id === "offroad" || id === "desert" || id === "trail" ? "stock" : "split"}
                    />
                  </div>
                  <span className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-snow">{d.vehicle[id]}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">{d.vehicle.available}</span>
                  </span>
                  <span className="text-sm text-mist">{d.vehicle[`${id}Note`]}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="dg-parts" className="space-y-8">
            <div className="min-w-0">
              <h2 id="dg-parts" className="font-display text-xl text-snow">
                {d.parts.title}
              </h2>
              <p className="mt-1 text-sm text-mist">{d.parts.hint}</p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label={d.parts.title} className="flex flex-wrap gap-2">
                {viewIds.map((v) => (
                  <button
                    key={v}
                    role="tab"
                    type="button"
                    aria-selected={view === v}
                    onClick={() => pickView(v)}
                    className={`${chip} h-9 px-3 text-[13px] ${view === v ? chipOn : chipOff}`}
                  >
                    {t.views[v]}
                  </button>
                ))}
              </div>
              {can3d && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={use3d}
                  onClick={() => switch3d(!use3d)}
                  className="inline-flex h-9 items-center gap-3 rounded-full border border-line-strong ps-4 pe-1.5 text-[13px] text-fog transition-colors hover:border-fog"
                >
                  {d.parts.view3d}
                  <span className={`relative h-6 w-11 rounded-full transition-colors ${use3d ? "bg-accent" : "bg-ink-700"}`}>
                    <span
                      className={`absolute top-1 size-4 rounded-full bg-snow shadow transition-[inset-inline-start] ${use3d ? "start-6" : "start-1"}`}
                    />
                  </span>
                </button>
              )}
              </div>
              {lost3d && <p className="mt-2 text-xs text-accent-dim">{d.parts.unavailable3d}</p>}

              <div className="mt-4 rounded-2xl border border-line bg-ink-900 bg-[radial-gradient(ellipse_at_50%_60%,rgba(213,217,224,0.06),transparent_70%)]">
                {use3d ? (
                  <Car3D
                    model={model}
                    view={view}
                    selected={selectedSet}
                    onToggle={toggle}
                    paint={paint}
                    tint={tint}
                    wheel={wheel}
                    livery={livery}
                    locale={locale}
                    t={t}
                    onUnavailable={on3dUnavailable}
                  />
                ) : (
                  <CarCanvas
                    model={model}
                    view={view}
                    onView={pickView}
                    selected={selectedSet}
                    onToggle={toggle}
                    paint={paint}
                    tint={tint}
                    wheel={wheel}
                    livery={livery}
                    locale={locale}
                    t={t}
                  />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-line-strong p-1" role="radiogroup" aria-label={d.parts.title}>
                {(["repair", "customize"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => {
                      setMode(m);
                      // paint and wheels read best from the side
                      if (m === "customize" && (view === "underside" || view === "top")) pickView("left");
                    }}
                    className={`h-9 rounded-full px-4 text-sm transition-colors ${mode === m ? "bg-snow text-ink-950" : "text-fog"}`}
                  >
                    {m === "repair" ? d.parts.modeRepair : d.parts.modeCustomize}
                  </button>
                ))}
              </div>

              {mode === "repair" ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{d.parts.selected}</h3>
                    {selected.length === 0 ? (
                      <p className="mt-2 text-sm text-mist">{d.parts.none}</p>
                    ) : (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {selected.map((id) => (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() => toggle(id)}
                              className="inline-flex h-8 items-center gap-2 rounded-full bg-snow ps-3 pe-2 text-[13px] text-ink-950"
                              aria-label={`${d.parts.remove}: ${pick(getPart(id).label, locale)}`}
                            >
                              {pick(getPart(id).label, locale)}
                              <span aria-hidden className="grid size-4 place-items-center rounded-full bg-ink-950/10">×</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <fieldset>
                    <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
                      {d.parts.list} · {t.views[view]}
                    </legend>
                    <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                      {selectablePartsIn(view, model).map((id) => (
                        <li key={id}>
                          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm text-fog hover:bg-white/5">
                            <input
                              type="checkbox"
                              checked={selectedSet.has(id)}
                              onChange={() => toggle(id)}
                              className="size-4 accent-[var(--accent)]"
                            />
                            {pick(getPart(id).label, locale)}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>

                  <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 text-sm text-fog">
                    <input
                      type="checkbox"
                      checked={mechanical}
                      onChange={(e) => setMechanical(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span>
                      {d.parts.mechanical}
                      <span className="mt-1 block text-xs text-mist">{d.parts.mechanicalHint}</span>
                    </span>
                  </label>
                </div>
              ) : (
                <div className="mt-6 grid gap-7 lg:grid-cols-3">
                  <fieldset>
                    <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{d.parts.paint}</legend>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {paints.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaint(p.id)}
                          aria-pressed={paint === p.id}
                          title={pick(p.label, locale)}
                          aria-label={pick(p.label, locale)}
                          className={`size-10 rounded-full border-2 ${paint === p.id ? "border-snow" : "border-transparent"} p-0.5`}
                        >
                          <span className="block size-full rounded-full ring-1 ring-white/15" style={{ background: `linear-gradient(135deg, ${p.tones[0]}, ${p.tones[1]} 55%, ${p.tones[3]})` }} />
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-fog">{pick(paints.find((p) => p.id === paint)!.label, locale)}</p>
                  </fieldset>
                  <fieldset>
                    <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{d.parts.wheels}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {wheelStyles.map((w) => (
                        <button key={w.id} type="button" aria-pressed={wheel === w.id} onClick={() => setWheel(w.id)} className={`${chip} ${wheel === w.id ? chipOn : chipOff}`}>
                          {pick(w.label, locale)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{d.parts.tint}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tints.map((x) => (
                        <button key={x.id} type="button" aria-pressed={tint === x.id} onClick={() => setTint(x.id)} className={`${chip} ${tint === x.id ? chipOn : chipOff}`}>
                          {pick(x.label, locale)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{d.parts.livery}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {liveries.map((x) => (
                        <button key={x.id} type="button" aria-pressed={livery === x.id} onClick={() => setLivery(x.id)} className={`${chip} ${livery === x.id ? chipOn : chipOff}`}>
                          {pick(x.label, locale)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <p className="text-xs leading-relaxed text-accent-dim">{d.parts.illustrative}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="dg-details" className="max-w-2xl space-y-6">
            <h2 id="dg-details" className="font-display text-xl text-snow">
              {d.details.title}
            </h2>
            <label className="block">
              <span className="text-sm text-fog">{d.details.notes}</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                maxLength={800}
                placeholder={d.details.notesPlaceholder}
                className="mt-2 w-full rounded-xl border border-line-strong bg-ink-900 p-4 text-sm text-snow placeholder:text-mist/70 focus:border-fog focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-fog">{d.details.name}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="mt-2 h-12 w-full rounded-xl border border-line-strong bg-ink-900 px-4 text-sm text-snow focus:border-fog focus:outline-none"
              />
            </label>
            <fieldset>
              <legend className="text-sm text-fog">{d.details.drivable}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["yes", "no", "unsure"] as const).map((v) => (
                  <label key={v} className={`${chip} cursor-pointer ${drivable === v ? chipOn : chipOff}`}>
                    <input type="radio" name="drivable" value={v} checked={drivable === v} onChange={() => setDrivable(v)} className="sr-only" />
                    {d.details[v]}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="dg-send" className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 id="dg-send" className="font-display text-xl text-snow">
                {d.send.title}
              </h2>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-mist">{d.send.preview}</p>
              <pre
                dir={garage.messageLocale === "ar" ? "rtl" : "ltr"}
                lang={garage.messageLocale}
                className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-line bg-ink-900 p-5 font-sans text-sm leading-relaxed text-fog"
                data-testid="wa-message"
              >
                {message}
              </pre>
            </div>
            <div className="lg:pt-10">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                data-event="whatsapp_click"
                data-testid="wa-link"
                className="inline-flex h-13 items-center gap-3 rounded-full bg-snow px-7 text-sm font-medium text-ink-950 transition-colors hover:bg-accent-strong"
              >
                <WhatsAppIcon className="size-5" />
                {d.send.button}
              </a>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">{d.send.disclaimer}</p>
              {garage.isPlaceholder && <p className="mt-3 text-xs text-accent-dim">{d.send.placeholderWarning}</p>}
            </div>
          </section>
        )}
      </div>

      {step > 0 && (
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
          <button type="button" onClick={() => go(step - 1)} className={`${chip} ${chipOff}`}>
            <span aria-hidden className="rtl:-scale-x-100">←</span>&nbsp;{d.back}
          </button>
          {step < 3 && (
            <button type="button" onClick={() => go(step + 1)} className={`${chip} ${chipOn}`}>
              {d.next}&nbsp;<span aria-hidden className="rtl:-scale-x-100">→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
