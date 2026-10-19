"use client";

import { type RefObject, useEffect, useRef } from "react";
import { type Spark, spawn, step } from "./physics";

/** Emits sparks at a horizontal position (0–1 of the canvas width) with an intensity (0–1). */
export type EmitSparks = (xFraction: number, intensity: number) => void;

/**
 * Canvas overlay for workshop sparks. The parent drives it through `emitRef`;
 * the canvas runs its own rAF only while sparks are alive. No-op under reduced motion.
 */
export function Sparks({ emitRef }: { emitRef: RefObject<EmitSparks | null> }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let pool: Spark[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(el.clientWidth * dpr);
      el.height = Math.round(el.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const draw = (now: number) => {
      const dt = last ? Math.min(48, now - last) : 16;
      last = now;
      pool = step(pool, dt);
      ctx.clearRect(0, 0, el.clientWidth, el.clientHeight);
      ctx.lineCap = "round";
      for (const s of pool) {
        const t = s.age / s.life;
        ctx.strokeStyle = `rgba(${255}, ${Math.round(210 - 70 * t)}, ${Math.round(122 - 100 * t)}, ${1 - t})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 18, s.y - s.vy * 18);
        ctx.stroke();
      }
      raf = pool.length ? requestAnimationFrame(draw) : 0;
      if (!raf) last = 0;
    };

    emitRef.current = (xFraction, intensity) => {
      if (reduced.matches || intensity <= 0) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const n = Math.max(1, Math.round(intensity * 14));
      for (let i = 0; i < n; i++) {
        pool = spawn(pool, 1, xFraction * w, h * (0.35 + Math.random() * 0.5));
      }
      if (!raf) raf = requestAnimationFrame(draw);
    };

    return () => {
      emitRef.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [emitRef]);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
