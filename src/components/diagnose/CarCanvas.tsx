"use client";

import { type ComponentType, type CSSProperties, Fragment, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { ArtProvider } from "@/car/art/context";
import { CarDefs } from "@/car/art/Defs";
import { sideArt } from "@/car/art/side";
import { VIEW_CLIPS } from "@/car/art/views";
import { type CarModelId, carModels } from "@/car/models";
import { finishVars, type Livery, liveryColor, type WheelStyle } from "@/car/palette";
import { getPart, mirrorPartId, parts } from "@/car/registry";
import { getView, type ViewId } from "@/car/views";
import { type Locale, pick } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";

/** Walking around the car: swipe / arrow keys move along this ring. */
const ORBIT: ViewId[] = ["front", "left", "rear", "right"];
export function stepView(v: ViewId, dir: 1 | -1): ViewId {
  const i = ORBIT.indexOf(v);
  if (i < 0) return "front";
  return ORBIT[(i + dir + ORBIT.length) % ORBIT.length];
}

const MAX_ZOOM = 3;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Props = {
  model: CarModelId;
  view: ViewId;
  onView: (v: ViewId) => void;
  selected: ReadonlySet<string>;
  onToggle: (partId: string) => void;
  paint: string;
  tint: string;
  wheel: WheelStyle["id"];
  livery?: Livery["id"];
  locale: Locale;
  t: Strings;
};

type Hover = { id: string; x: number; y: number } | null;

/**
 * The interactive inspection canvas.
 * Flat views: hover highlight + label, tap to flag, swipe / drag to walk around, pinch / ctrl-wheel zoom and pan.
 * Side views can switch to an exploded 3D view: drag to orbit, slider for separation, tap any part.
 */
export function CarCanvas({ model, view, onView, selected, onToggle, paint, tint, wheel, livery = "none", locale, t }: Props) {
  const p = t.diagnose.parts;
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [exploded, setExploded] = useState(false);
  const [sep, setSep] = useState(1);
  const [orbit, setOrbit] = useState({ y: -10, x: 6 });

  const isSide = view === "left" || view === "right";
  const explodedNow = exploded && isSide;

  // gesture state lives in refs: it changes on every pointer move
  const drag = useRef({ active: false, moved: false, x: 0, y: 0, sx: 0, panX: 0, panY: 0, ox: 0, oy: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  // reset framing when the car or view changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHover(null);
  }, [view, model]);

  // ctrl + wheel / trackpad pinch zoom (needs a non-passive listener)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || explodedNow) return;
      e.preventDefault();
      setZoom((z) => clamp(z * Math.exp(-e.deltaY * 0.01), 1, MAX_ZOOM));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [explodedNow]);

  // keep the pan inside the drawing
  const w = 1200 / zoom;
  const h = 480 / zoom;
  const maxX = (1200 - w) / 2;
  const maxY = (480 - h) / 2;
  const px = clamp(pan.x, -maxX, maxX);
  const py = clamp(pan.y, -maxY, maxY);
  const viewBox = `${maxX + px} ${maxY + py} ${w} ${h}`;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
    drag.current = { active: true, moved: false, x: e.clientX, y: e.clientY, sx: e.clientX, panX: px, panY: py, ox: orbit.y, oy: orbit.x };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size === 2 && !explodedNow) {
      const [a, b] = [...pointers.current.values()];
      setZoom(clamp((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist, 1, MAX_ZOOM));
      return;
    }
    const d = drag.current;
    if (d.active) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 6) {
        d.moved = true;
        box.current?.setPointerCapture(e.pointerId);
        setHover(null);
      }
      if (d.moved && rect) {
        if (explodedNow) {
          setOrbit({ y: clamp(d.ox + dx * 0.25, -45, 45), x: clamp(d.oy - dy * 0.15, -12, 24) });
        } else if (zoom > 1) {
          const k = 1200 / zoom / rect.width;
          setPan({ x: d.panX - dx * k, y: d.panY - dy * k });
        }
      }
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (d.active && d.moved && !explodedNow && zoom === 1) {
      const dx = e.clientX - d.sx;
      if (Math.abs(dx) > 60) onView(stepView(view, dx < 0 ? 1 : -1));
    }
    d.active = false;
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") onView(stepView(view, 1));
    if (e.key === "ArrowLeft") onView(stepView(view, -1));
  };

  /** pointer-tracked hover label */
  const track = (id: string) => ({
    onPointerEnter: (e: PointerEvent) => placeHover(id, e),
    onPointerMove: (e: PointerEvent) => placeHover(id, e),
    onPointerLeave: () => setHover((h) => (h?.id === id ? null : h)),
  });
  function placeHover(id: string, e: PointerEvent) {
    if (e.pointerType === "touch" || drag.current.moved) return;
    const r = box.current?.getBoundingClientRect();
    if (r) setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top });
  }

  const tap = (id: string) => {
    if (drag.current.moved) return;
    onToggle(id);
  };

  /** One drawn layer, interactive when its part is selectable. (A plain function, not a component, so layers keep their identity across renders.) */
  const layer = (partId: string, resolved: string, Art: ComponentType) => {
    const part = getPart(resolved);
    if (!part.selectable) {
      return (
        <g aria-hidden style={{ pointerEvents: "none" }}>
          <Art />
        </g>
      );
    }
    const on = selected.has(resolved);
    const hot = hover?.id === resolved;
    return (
      <g
        role="checkbox"
        aria-checked={on}
        aria-label={pick(part.label, locale)}
        tabIndex={0}
        className="dg-part"
        data-part={resolved}
        data-layer={partId}
        filter={on ? "url(#dg-selected)" : hot ? "url(#dg-hover)" : undefined}
        style={{ pointerEvents: "auto" }}
        onClick={() => tap(resolved)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(resolved);
          }
        }}
        onFocus={() => {
          const r = box.current?.getBoundingClientRect();
          if (r) setHover({ id: resolved, x: r.width / 2, y: 24 });
        }}
        onBlur={() => setHover(null)}
        {...track(resolved)}
      >
        <Art />
      </g>
    );
  };

  const v = getView(view, model);
  const m = carModels[model];
  const btn =
    "grid size-9 place-items-center rounded-full border border-line-strong bg-ink-950/80 text-snow backdrop-blur transition-colors hover:bg-ink-800 disabled:opacity-40";

  // parts for the exploded stage: everything drawn from the side on this class
  const stageParts = parts.filter((x) => sideArt[x.id] && !m.missing.has(x.id)).sort((a, b) => a.z - b.z);

  return (
    <ArtProvider value={{ prefix: "dg", wheel, geo: m.side, livery: livery === "stripes" ? liveryColor(paint) : undefined }}>
      <div style={finishVars(paint, tint)}>
        <CarDefs extraClips={VIEW_CLIPS} />
        <div
          ref={box}
          tabIndex={0}
          role="group"
          aria-label={`${t.views[view]} · ${explodedNow ? p.orbitHint : p.swipeHint}`}
          onKeyDown={onKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative select-none overflow-hidden rounded-2xl ${zoom > 1 || explodedNow ? "touch-none" : "touch-pan-y"} ${
            zoom > 1 ? "cursor-grab active:cursor-grabbing" : explodedNow ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          {explodedNow ? (
            <div className="mx-auto w-[88%] pb-16 pt-16 sm:w-[80%]" style={{ transform: view === "right" ? "scaleX(-1)" : undefined }}>
              <div
                className="car-frame"
                style={{ "--e": sep, "--orbit": `${orbit.y}deg`, "--tilt": `${orbit.x}deg` } as CSSProperties}
              >
                <div className="car-stage">
                  <div className="car-rig">
                    {stageParts.map((x) => {
                      const Art = sideArt[x.id];
                      const resolved = view === "right" ? mirrorPartId(x.id) : x.id;
                      return (
                        <div
                          key={x.id}
                          className="car-part"
                          style={
                            {
                              "--z": x.z,
                              "--dx": x.explode.dx,
                              "--dy": x.explode.dy,
                              "--dz": x.explode.dz,
                              "--rot": x.explode.rot ?? 0,
                              "--s": x.start,
                              "--d": Math.max(0.01, x.end - x.start),
                            } as CSSProperties
                          }
                        >
                          <svg viewBox="0 0 1200 480">
                            {layer(x.id, resolved, Art)}
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div key={`${model}-${view}`} className="dg-enter px-2 pb-11 pt-12 sm:px-14 sm:pb-12 sm:pt-12">
              <svg viewBox={viewBox} className="block h-auto w-full" style={{ aspectRatio: "1200 / 480" }}>
                <ellipse cx="600" cy="424" rx="540" ry="22" fill="url(#dg-shadow)" opacity={view === "top" || view === "underside" ? 0 : 0.8} />
                <g transform={v.mirror ? "translate(1200 0) scale(-1 1)" : v.transform}>
                  {v.layers.map(({ partId, Art }, i) => (
                    <Fragment key={`${partId}-${i}`}>{layer(partId, v.resolve(partId), Art)}</Fragment>
                  ))}
                </g>
              </svg>
            </div>
          )}

          {/* hover label */}
          {hover && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-full border border-line-strong bg-ink-950/90 px-3 py-1.5 text-xs text-snow shadow-lg backdrop-blur"
              style={{ left: hover.x, top: hover.y }}
              role="status"
            >
              <span className="font-medium">{pick(getPart(hover.id).label, locale)}</span>
              <span className="ms-2 text-mist">{selected.has(hover.id) ? p.tapToRemove : p.tapToFlag}</span>
            </div>
          )}

          {/* view stepping */}
          <button type="button" aria-label={p.prevView} title={p.prevView} onClick={() => onView(stepView(view, -1))} className={`${btn} absolute start-3 top-1/2 hidden -translate-y-1/2 sm:grid`}>
            <span aria-hidden className="rtl:-scale-x-100">‹</span>
          </button>
          <button type="button" aria-label={p.nextView} title={p.nextView} onClick={() => onView(stepView(view, 1))} className={`${btn} absolute end-3 top-1/2 hidden -translate-y-1/2 sm:grid`}>
            <span aria-hidden className="rtl:-scale-x-100">›</span>
          </button>

          {/* top-end controls */}
          <div className="absolute end-3 top-3 flex gap-2">
            {isSide && (
              <button
                type="button"
                aria-pressed={explodedNow}
                onClick={() => setExploded((x) => !x)}
                className="h-9 rounded-full border border-line-strong bg-ink-950/80 px-3 text-xs text-snow backdrop-blur transition-colors hover:bg-ink-800 aria-pressed:border-accent aria-pressed:text-accent-strong"
              >
                {explodedNow ? p.flat : p.explode}
              </button>
            )}
            {!explodedNow && (
              <>
                <button type="button" aria-label={p.zoomOut} title={p.zoomOut} disabled={zoom <= 1} onClick={() => setZoom((z) => clamp(z / 1.5, 1, MAX_ZOOM))} className={btn}>
                  −
                </button>
                <button type="button" aria-label={p.zoomIn} title={p.zoomIn} disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((z) => clamp(z * 1.5, 1, MAX_ZOOM))} className={btn}>
                  +
                </button>
              </>
            )}
            {(zoom > 1 || (explodedNow && (orbit.y !== -10 || orbit.x !== 6))) && (
              <button
                type="button"
                aria-label={p.resetView}
                title={p.resetView}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setOrbit({ y: -10, x: 6 });
                }}
                className={btn}
              >
                ⟲
              </button>
            )}
          </div>

          {/* bottom: hint or separation slider */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-14">
            {explodedNow ? (
              <label className="pointer-events-auto flex w-full max-w-xs items-center gap-3 rounded-full border border-line bg-ink-950/80 px-4 py-1.5 text-[11px] text-mist backdrop-blur">
                <span className="shrink-0">{p.separation}</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={sep}
                  onChange={(e) => setSep(Number(e.target.value))}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
            ) : (
              <p className="rounded-full bg-ink-950/70 px-3 py-1 text-[11px] text-mist backdrop-blur">{p.swipeHint}</p>
            )}
          </div>
        </div>
      </div>
    </ArtProvider>
  );
}
