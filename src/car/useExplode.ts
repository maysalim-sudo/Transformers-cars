"use client";

import { type RefObject, useEffect, useRef } from "react";
import { clamp01, heroStep } from "./timeline";

export { explodeAt, SEQUENCE, transformAt } from "./timeline";

/** One animation frame of the hero, for effects that follow it (sparks, headlights). */
/** `snapped` = jumped straight to the target (first frame, off screen, reduced motion): effects should not fire. */
export type HeroFrame = { e: number; tx: number; dE: number; dTx: number; p: number; snapped: boolean };

/**
 * Drives two CSS variables on `target` from the scroll position of `track`:
 * --e (explosion) and --tx (transformation). Also writes --fade (car leaves after
 * the track) and --px/--py (pointer parallax). The rAF loop only runs while the
 * track is on screen and stops once settled. Reduced motion snaps both to 0 / 1.
 */
export function useExplode(
  track: RefObject<HTMLElement | null>,
  target: RefObject<HTMLElement | null>,
  onFrame?: (frame: HeroFrame) => void,
) {
  // a ref, so a new callback each render does not restart the loop
  const frameCb = useRef(onFrame);
  useEffect(() => {
    frameCb.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const trackEl = track.current;
    const el = target.current;
    if (!trackEl || !el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");

    let raf = 0;
    let visible = false;
    let e = 0;
    let tx = 0;
    let px = 0;
    let py = 0;
    let pointerX = 0;
    let pointerY = 0;

    const read = () => {
      const r = trackEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const travel = Math.max(1, r.height - vh);
      const p = clamp01(-r.top / travel);
      // fade out as the end of the track scrolls up past the viewport
      const fade = clamp01(r.bottom / vh - 0.15) / 0.85;
      return { p, fade: clamp01(fade) };
    };

    const write = (fade: number) => {
      el.style.setProperty("--e", e.toFixed(4));
      el.style.setProperty("--tx", tx.toFixed(4));
      el.style.setProperty("--fade", fade.toFixed(3));
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.dataset.phase = e < 0.02 ? "assembled" : e > 0.98 ? "exploded" : "moving";
    };

    let first = true;

    const tick = () => {
      const { p, fade } = read();
      const prevE = e;
      const prevTx = tx;
      const step = heroStep({ e, tx }, p, { visible, reduced: reduced.matches, first });
      first = false;
      e = step.e;
      tx = step.tx;
      if (reduced.matches) {
        px = py = 0;
      } else {
        px += (pointerX - px) * 0.06;
        py += (pointerY - py) * 0.06;
      }
      write(fade);
      frameCb.current?.({ e, tx, dE: e - prevE, dTx: tx - prevTx, p, snapped: step.snapped });
      // stop when settled; scroll / pointer events restart the loop
      const settled =
        e === step.eGoal && tx === step.txGoal && Math.abs(pointerX - px) < 0.002 && Math.abs(pointerY - py) < 0.002;
      raf = visible && !settled ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(trackEl);

    const onPointer = (ev: PointerEvent) => {
      if (!finePointer.matches || reduced.matches) return;
      pointerX = (ev.clientX / window.innerWidth) * 2 - 1;
      pointerY = (ev.clientY / window.innerHeight) * 2 - 1;
      if (visible) start();
    };
    const onScroll = () => {
      if (visible) start();
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [track, target]);
}
