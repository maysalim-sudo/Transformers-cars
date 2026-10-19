"use client";

import type { ReactNode } from "react";
import type { WheelStyle } from "../palette";
import { useArt } from "./context";
import { polar, sector } from "./geometry";

const GAP = "rgba(0,0,0,0.72)";

/** A painted body panel: paint + light sweep + creases, clipped to the silhouette. */
export function Panel({
  id,
  d,
  clip = "sil",
  creases,
  paint = "paint",
  children,
}: {
  id: string;
  d: string;
  clip?: string;
  creases?: string[];
  paint?: string;
  children?: ReactNode;
}) {
  const art = useArt();
  const own = art.id(`pc-${id}`);
  const lines = creases ?? art.geo.creases;
  return (
    <g clipPath={art.url(clip)}>
      <clipPath id={own}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={art.url(paint)} />
      <path d={d} fill={art.url("sweep")} />
      <g clipPath={`url(#${own})`} fill="none">
        {lines.map((c) => (
          <g key={c}>
            <path d={c} stroke="rgba(0,0,0,0.45)" strokeWidth="2.4" transform="translate(0 1.6)" />
            <path d={c} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          </g>
        ))}
        {children}
      </g>
      <path d={d} fill="none" stroke={GAP} strokeWidth="1.8" />
    </g>
  );
}

/** Tinted glass with a reflection streak and an optional bright trim line. */
export function Glass({ d, clip = "sil", trim, children }: { d: string; clip?: string; trim?: string; children?: ReactNode }) {
  const art = useArt();
  return (
    <g clipPath={clip ? art.url(clip) : undefined}>
      <path d={d} fill={art.url("glass")} />
      <path d={d} fill="#000" style={{ opacity: "calc(var(--tint, 0) * 0.55)" }} />
      <path d={d} fill={art.url("glass-streak")} />
      {children}
      {trim && <path d={trim} fill="none" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.4" />}
      <path d={d} fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="1.2" />
    </g>
  );
}

function SplitSpokes({ cx, cy }: { cx: number; cy: number }) {
  const art = useArt();
  const spoke = "M-2.2 -17 L-10 -60 L-3.4 -60 L0 -28 L3.4 -60 L10 -60 L2.2 -17 Z";
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <g key={a} transform={`translate(${cx} ${cy}) rotate(${a})`}>
          <path d={spoke} fill={art.url("rim")} stroke="rgba(0,0,0,0.55)" strokeWidth="0.8" />
          <path d="M-1.4 -20 L-7.6 -58" stroke="rgba(255,255,255,0.45)" strokeWidth="0.7" />
        </g>
      ))}
    </g>
  );
}

function AeroFace({ cx, cy }: { cx: number; cy: number }) {
  const art = useArt();
  return (
    <g>
      <circle cx={cx} cy={cy} r="61" fill={art.url("rim-dark")} />
      {Array.from({ length: 7 }, (_, i) => i * (360 / 7)).map((a) => (
        <g key={a} transform={`translate(${cx} ${cy}) rotate(${a})`}>
          <path d="M6 -24 C18 -34 22 -46 18 -58 C12 -56 6 -46 2 -26 Z" fill="#07080a" />
          <path d="M18 -58 C22 -46 18 -34 6 -24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r="61" fill="none" stroke={art.url("rim")} strokeWidth="2" />
    </g>
  );
}

function MeshSpokes({ cx, cy }: { cx: number; cy: number }) {
  const art = useArt();
  const n = 12;
  return (
    <g stroke={art.url("rim")} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => (i * 360) / n).map((a) => {
        const [x0, y0] = polar(cx, cy, 17, a);
        const [x1, y1] = polar(cx, cy, 60, a + 16);
        const [x2, y2] = polar(cx, cy, 60, a - 16);
        return (
          <g key={a}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth="2.6" />
            <line x1={x0} y1={y0} x2={x2} y2={y2} strokeWidth="2.6" />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="40" fill="none" strokeWidth="1.6" />
    </g>
  );
}

/** Factory wheel: deep tyre sidewall (small-looking rim), five plain flat spokes, flat cap. */
function StockFace({ cx, cy }: { cx: number; cy: number }) {
  const art = useArt();
  return (
    <g>
      <circle cx={cx} cy={cy} r="60" fill="none" stroke={art.url("tire")} strokeWidth="12" />
      {[0, 72, 144, 216, 288].map((a) => (
        <g key={a} transform={`translate(${cx} ${cy}) rotate(${a})`}>
          <path d="M-5 -12 L-7 -52 L7 -52 L5 -12 Z" fill="#b8bdc4" stroke="rgba(0,0,0,0.5)" strokeWidth="0.8" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r="54" fill="none" stroke="#9aa0a8" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="12" fill="#a9aeb5" stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
    </g>
  );
}

/** Wheel seen from the side: tyre ring, rim lip, spokes, hub. The centre stays open to show the brake. */
export function Wheel({ cx, cy, style, dim = false }: { cx: number; cy: number; style?: WheelStyle["id"]; dim?: boolean }) {
  const art = useArt();
  const s = style ?? art.wheel;
  return (
    <g opacity={dim ? 0.55 : 1}>
      <circle cx={cx} cy={cy} r="76" fill="none" stroke={art.url("tire")} strokeWidth="24" />
      <circle cx={cx} cy={cy} r="83" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="69" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="62.5" fill="none" stroke="#08090b" strokeWidth="3" />
      {s === "split" && <SplitSpokes cx={cx} cy={cy} />}
      {s === "aero" && <AeroFace cx={cx} cy={cy} />}
      {s === "mesh" && <MeshSpokes cx={cx} cy={cy} />}
      {s === "stock" ? (
        <StockFace cx={cx} cy={cy} />
      ) : (
        <>
          <circle cx={cx} cy={cy} r="63.5" fill="none" stroke={art.url("rim")} strokeWidth="3" />
          <circle cx={cx} cy={cy} r="17" fill={art.url("rim")} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
          {[0, 72, 144, 216, 288].map((a) => {
            const [x, y] = polar(cx, cy, 11, a - 90);
            return <circle key={a} cx={x} cy={y} r="2" fill="#2a2d32" />;
          })}
          <circle cx={cx} cy={cy} r="6.5" fill="#0d0e10" stroke="var(--accent)" strokeOpacity="0.6" strokeWidth="1" />
        </>
      )}
    </g>
  );
}

export function BrakeDisc({ cx, cy }: { cx: number; cy: number }) {
  const art = useArt();
  return (
    <g>
      <circle cx={cx} cy={cy} r="57" fill={art.url("disc")} />
      <g fill="#1a1c20">
        {Array.from({ length: 24 }, (_, i) => i * 15).flatMap((a) => {
          const [x0, y0] = polar(cx, cy, 39, a);
          const [x1, y1] = polar(cx, cy, 47, a + 7.5);
          return [<circle key={`a${a}`} cx={x0} cy={y0} r="1.5" />, <circle key={`b${a}`} cx={x1} cy={y1} r="1.5" />];
        })}
      </g>
      <circle cx={cx} cy={cy} r="57" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r="25" fill="#1d2024" stroke="#41464d" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r="12" fill="#2b2f34" />
    </g>
  );
}

/** Caliper wraps the disc edge; rearward (to the right) on the side view. Bare metal when stock, accent when tuned. */
export function Caliper({ cx, cy }: { cx: number; cy: number }) {
  const art = useArt();
  return (
    <g>
      <path d={sector(cx, cy, 40, 63, -62, 8)} fill={art.variant === "stock" ? "#3a3f46" : art.url("accent")} stroke="rgba(0,0,0,0.6)" strokeWidth="1" />
      <path d={sector(cx, cy, 46, 57, -52, -2)} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      {[-48, -6].map((a) => {
        const [x, y] = polar(cx, cy, 52, a);
        return <circle key={a} cx={x} cy={y} r="2.2" fill="#1b1d21" />;
      })}
    </g>
  );
}

/** Coil-over: damper body, coil spring, top mount. */
export function Spring({ cx, top = 214, bottom = 300 }: { cx: number; top?: number; bottom?: number }) {
  const art = useArt();
  const coils = 6;
  const h = (bottom - top - 16) / coils;
  let d = `M${cx - 15} ${top + 10}`;
  for (let i = 0; i < coils; i++) {
    const y = top + 10 + i * h;
    d += ` C${cx + 22} ${y + h * 0.15} ${cx + 22} ${y + h * 0.35} ${cx + 15} ${y + h * 0.5}`;
    d += ` C${cx - 22} ${y + h * 0.65} ${cx - 22} ${y + h * 0.85} ${cx - 15} ${y + h}`;
  }
  return (
    <g>
      <rect x={cx - 6} y={top} width="12" height={bottom - top + 18} rx="3" fill="#202328" stroke="#3b4047" />
      <rect x={cx - 3} y={top - 8} width="6" height="12" fill="#5c626b" />
      <rect x={cx - 19} y={top + 2} width="38" height="7" rx="2" fill={art.url("metal")} />
      <path d={d} fill="none" stroke={art.url("accent")} strokeWidth="4.2" strokeLinecap="round" />
      <rect x={cx - 17} y={bottom - 4} width="34" height="6" rx="2" fill={art.url("metal")} />
    </g>
  );
}
