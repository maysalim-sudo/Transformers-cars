"use client";

import type { CSSProperties, ReactNode } from "react";
import { type Locale, pick } from "@/i18n/config";
import { ArtProvider } from "./art/context";
import { CarDefs } from "./art/Defs";
import { sideArt } from "./art/side";
import { sedanSide } from "./models/sideGeometry";
import { finishVars, TRANSFORM_FINISH } from "./palette";
import { parts, type VehiclePart } from "./registry";

const heroParts = parts.filter((p) => sideArt[p.id]).sort((a, b) => a.z - b.z);

/** Hidden mechanicals look the same before and after: one layer, never wiped. */
const noTwin = new Set(["engine", "transmission", "exhaust", "chassis_floor", "spring_front", "spring_rear"]);
/** Tuned body sits lower on its coilovers. */
const lowered = new Set<VehiclePart["group"]>(["body", "glass", "lighting", "aero"]);
const STANCE_DROP = 7;

const stock = TRANSFORM_FINISH.stock;
const tuned = TRANSFORM_FINISH.tuned;

function partStyle(p: VehiclePart): CSSProperties {
  return {
    "--z": p.z,
    "--dx": p.explode.dx,
    "--dy": p.explode.dy,
    "--dz": p.explode.dz,
    "--rot": p.explode.rot ?? 0,
    "--s": p.start,
    "--d": Math.max(0.01, p.end - p.start),
  } as CSSProperties;
}

/** Wheels spin as the transformation beam passes. */
function Spin({ id, children }: { id: string; children: ReactNode }) {
  if (!id.startsWith("wheel_")) return <>{children}</>;
  const cx = id.includes("front") ? sedanSide.wheel.front : sedanSide.wheel.rear;
  return (
    <g
      className="car-spin"
      style={{ transformOrigin: `${cx}px ${sedanSide.wheel.cy}px`, transformBox: "view-box" } as CSSProperties}
    >
      {children}
    </g>
  );
}

/**
 * The exploding, transforming car. Its parent sets --e (explosion) and --tx (transformation);
 * this component never re-renders on scroll. Each body part is drawn twice — stock and tuned —
 * and --tx wipes one into the other behind a glowing beam.
 */
export function CarStage({ locale }: { locale: Locale }) {
  return (
    <div className="car-frame" style={finishVars(stock.paint, stock.tint)} aria-hidden>
      <ArtProvider value={{ prefix: "hero", wheel: stock.wheel, variant: "stock" }}>
        <CarDefs />
      </ArtProvider>
      {/* the tuned gradients must live under the tuned finish variables */}
      <div style={finishVars(tuned.paint, tuned.tint)}>
        <ArtProvider value={{ prefix: "hero-t", wheel: tuned.wheel, variant: "tuned" }}>
          <CarDefs />
        </ArtProvider>
      </div>
      <div className="car-stage">
        <div className="car-rig">
          <div className="car-shadow">
            <svg viewBox="0 0 1200 480">
              <ellipse cx="600" cy="424" rx="560" ry="34" fill="url(#hero-floor)" />
              <ellipse cx="600" cy="418" rx="500" ry="14" fill="url(#hero-shadow)" />
              <ellipse cx="300" cy="418" rx="90" ry="8" fill="url(#hero-shadow)" />
              <ellipse cx="915" cy="418" rx="90" ry="8" fill="url(#hero-shadow)" />
            </svg>
          </div>
          {heroParts.map((p) => {
            const Art = sideArt[p.id];
            const twin = !noTwin.has(p.id);
            const drop = lowered.has(p.group) || p.id === "body_shell";
            return (
              <div key={p.id} className="car-part" style={partStyle(p)} data-part={p.id}>
                <ArtProvider value={{ prefix: "hero", wheel: stock.wheel, variant: "stock" }}>
                  <svg viewBox="0 0 1200 480" className={twin ? "car-stock" : undefined}>
                    <Spin id={p.id}>
                      <Art />
                    </Spin>
                  </svg>
                </ArtProvider>
                {twin && (
                  <ArtProvider value={{ prefix: "hero-t", wheel: tuned.wheel, variant: "tuned" }}>
                    <svg viewBox="0 0 1200 480" className="car-tuned" style={finishVars(tuned.paint, tuned.tint)}>
                      <g transform={drop ? `translate(0 ${STANCE_DROP})` : undefined}>
                        <Spin id={p.id}>
                          <Art />
                        </Spin>
                      </g>
                    </svg>
                  </ArtProvider>
                )}
                {p.labelSide && (
                  <span
                    className="car-callout"
                    style={{ left: `${(p.anchor[0] / 1200) * 100}%`, top: `${(p.anchor[1] / 480) * 100}%` }}
                  >
                    <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-ink-950/80 px-2 py-0.5 font-mono text-[max(9px,0.85cqw)] uppercase tracking-[0.14em] text-snow">
                      <span className="size-1 rounded-full bg-accent" />
                      {pick(p.callout ?? p.label, locale)}
                    </span>
                  </span>
                )}
              </div>
            );
          })}
          <div className="car-beam" />
        </div>
      </div>
    </div>
  );
}
