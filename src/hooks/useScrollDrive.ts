import { useEffect, useRef, useState } from "react";

export type Phase = "assembled" | "exploding" | "exploded" | "reassembling";

const ease = (t: number) => t * t * (3 - 2 * t);
const span = (v: number, a: number, b: number) =>
  Math.min(1, Math.max(0, (v - a) / (b - a)));

type Anchors = { start: number; full: number; hold: number; end: number };

function measure(): Anchors | null {
  const s = document.getElementById("car-explode-start");
  const f = document.getElementById("car-explode-full");
  const h = document.getElementById("car-reassemble");
  const e = document.getElementById("services");
  if (!s || !f || !h || !e) return null;
  const vh = window.innerHeight;
  const top = (el: HTMLElement, factor: number) =>
    el.getBoundingClientRect().top + window.scrollY - vh * factor;
  return {
    start: top(s, 0.72),
    full: top(f, 0.5),
    hold: top(h, 0.55),
    end: top(e, 0.8),
  };
}

/** 0 → assembled … 1 → fully exploded, anchored to real page sections. */
export function mapExplode(y: number, a: Anchors) {
  if (a.end <= a.hold) return 0;
  if (y <= a.start) return 0;
  if (y < a.full) return ease(span(y, a.start, a.full));
  if (y <= a.hold) return 1;
  if (y < a.end) return 1 - ease(span(y, a.hold, a.end));
  return 0;
}

/** Writes the explode target into a ref (no re-render) and reports the phase. */
export function useScrollDrive() {
  const targetRef = useRef(0);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("assembled");

  useEffect(() => {
    let raf = 0;
    let last = "";
    let anchors = measure();
    let dirty = true;

    const recheck = () => {
      dirty = true;
    };
    const onResize = () => {
      anchors = measure();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("load", recheck);
    const slow = window.setInterval(recheck, 1200);

    const tick = () => {
      const y = window.scrollY;
      const doc = document.documentElement;
      const h = doc.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
      progressRef.current = p;

      if (dirty || !anchors) {
        anchors = measure();
        dirty = false;
      }
      let e = 0;
      if (anchors) {
        const a = anchors;
        if (a.full <= a.start || a.hold <= a.full || a.end <= a.hold) {
          // fall back to a pure progress curve if layout is unusual
          e = p < 0.16 ? 0 : p < 0.4 ? ease(span(p, 0.16, 0.4)) : p < 0.55 ? 1 : p < 0.68 ? 1 - ease(span(p, 0.55, 0.68)) : 0;
        } else {
          e = mapExplode(y, a);
        }
      }

      targetRef.current = e;
      const root = document.documentElement;
      root.style.setProperty("--p", p.toFixed(4));
      root.style.setProperty("--e", e.toFixed(4));

      const ph: Phase =
        e <= 0.001
          ? p > 0.5
            ? "reassembling"
            : "assembled"
          : e >= 0.999
            ? "exploded"
            : p < 0.5
              ? "exploding"
              : "reassembling";
      if (ph !== last) {
        last = ph;
        setPhase(ph);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", recheck);
      window.clearInterval(slow);
    };
  }, []);

  return { targetRef, progressRef, phase };
}

/** Adds `is-visible` once the element enters the viewport. */
export function useReveal<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}
