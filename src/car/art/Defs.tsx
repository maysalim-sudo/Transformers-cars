"use client";

import { useArt } from "./context";


/**
 * Gradients, clips and filters for one car instance. Rendered once, inside the
 * element that carries the paint CSS variables, so recolouring is real.
 */
export function CarDefs({ extraClips }: { extraClips?: Record<string, string> }) {
  const { id, geo } = useArt();
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
      <defs>
        <clipPath id={id("sil")}>
          <path d={geo.sil} />
        </clipPath>
        {extraClips &&
          Object.entries(extraClips).map(([name, d]) => (
            <clipPath key={name} id={id(name)}>
              <path d={d} />
            </clipPath>
          ))}

        {/* body paint: sky reflection on top, crisp shoulder highlight, dark lower body, ground bounce */}
        <linearGradient id={id("paint")} gradientUnits="userSpaceOnUse" x1="0" y1="120" x2="0" y2="380">
          <stop offset="0" style={{ stopColor: "var(--paint-hi)" }} />
          <stop offset="0.2" style={{ stopColor: "var(--paint-base)" }} />
          <stop offset="0.39" style={{ stopColor: "var(--paint-base)" }} />
          <stop offset="0.425" style={{ stopColor: "var(--paint-hi)" }} />
          <stop offset="0.455" style={{ stopColor: "var(--paint-base)" }} />
          <stop offset="0.66" style={{ stopColor: "var(--paint-lo)" }} />
          <stop offset="0.9" style={{ stopColor: "var(--paint-deep)" }} />
          <stop offset="1" style={{ stopColor: "var(--paint-lo)" }} />
        </linearGradient>
        <linearGradient id={id("paint-flat")} gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="440">
          <stop offset="0" style={{ stopColor: "var(--paint-hi)" }} />
          <stop offset="0.35" style={{ stopColor: "var(--paint-base)" }} />
          <stop offset="0.75" style={{ stopColor: "var(--paint-lo)" }} />
          <stop offset="1" style={{ stopColor: "var(--paint-deep)" }} />
        </linearGradient>
        {/* studio light sweep across the side */}
        <linearGradient id={id("sweep")} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1200" y2="80">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.17" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.52" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.86" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.92" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("glass")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38404b" />
          <stop offset="0.45" stopColor="#11151a" />
          <stop offset="1" stopColor="#050608" />
        </linearGradient>
        <linearGradient id={id("glass-streak")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.44" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.58" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("tire")}>
          <stop offset="0.7" stopColor="#0d0e10" />
          <stop offset="0.86" stopColor="#1d1f23" />
          <stop offset="0.95" stopColor="#111214" />
          <stop offset="1" stopColor="#060708" />
        </radialGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f3f6" />
          <stop offset="0.35" stopColor="#9aa0a9" />
          <stop offset="0.62" stopColor="#3f444b" />
          <stop offset="1" stopColor="#c3c8cf" />
        </linearGradient>
        <linearGradient id={id("rim-dark")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b616a" />
          <stop offset="0.5" stopColor="#1e2125" />
          <stop offset="1" stopColor="#3b4047" />
        </linearGradient>
        <radialGradient id={id("disc")}>
          <stop offset="0.42" stopColor="#25282d" />
          <stop offset="0.47" stopColor="#9aa0a8" />
          <stop offset="0.75" stopColor="#6d737b" />
          <stop offset="0.96" stopColor="#4a4f56" />
          <stop offset="1" stopColor="#2a2d32" />
        </radialGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe2e7" />
          <stop offset="0.5" stopColor="#8a9099" />
          <stop offset="1" stopColor="#4d525a" />
        </linearGradient>
        <linearGradient id={id("accent")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--accent-strong)" }} />
          <stop offset="0.55" style={{ stopColor: "var(--accent)" }} />
          <stop offset="1" style={{ stopColor: "var(--accent-dim)" }} />
        </linearGradient>
        <linearGradient id={id("block")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3f47" />
          <stop offset="1" stopColor="#14161a" />
        </linearGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("floor")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c9ced6" stopOpacity="0.09" />
          <stop offset="1" stopColor="#c9ced6" stopOpacity="0" />
        </radialGradient>
        <filter id={id("glow")} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={id("hover")} x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="d" />
          <feFlood style={{ floodColor: "var(--accent)", floodOpacity: 0.55 }} result="c" />
          <feComposite in="c" in2="d" operator="in" result="o" />
          <feGaussianBlur in="o" stdDeviation="3" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={id("selected")} x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="d" />
          <feFlood style={{ floodColor: "var(--accent-strong)" }} result="c" />
          <feComposite in="c" in2="d" operator="in" result="o" />
          <feGaussianBlur in="o" stdDeviation="2.5" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="o" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
