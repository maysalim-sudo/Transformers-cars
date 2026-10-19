import { useEffect, useRef } from "react";
import { CAR_H, CAR_PARTS, CAR_VIEWBOX, CAR_W, type PartDef } from "./parts";
import { buildPartPaint, type Glass, type Paint } from "./paint";

type Props = {
  paint: Paint;
  glass: Glass;
  /** live value 0 → assembled, 1 → fully exploded (read every frame) */
  targetRef?: { current: number };
  /** static value when no scroll driving is needed */
  value?: number;
  showLabels?: boolean;
  interactive?: boolean;
  className?: string;
};

function LabelChip({ part }: { part: PartDef }) {
  const dir = part.label ?? "up";
  const pos: React.CSSProperties =
    dir === "up"
      ? { left: "50%", bottom: "26px", transform: "translateX(-50%)" }
      : dir === "down"
        ? { left: "50%", top: "26px", transform: "translateX(-50%)" }
        : dir === "left"
          ? { right: "26px", top: "50%", transform: "translateY(-50%)" }
          : { left: "26px", top: "50%", transform: "translateY(-50%)" };
  const stem: React.CSSProperties =
    dir === "up"
      ? { left: "50%", bottom: "10px", width: "1px", height: "16px" }
      : dir === "down"
        ? { left: "50%", top: "10px", width: "1px", height: "16px" }
        : dir === "left"
          ? { bottom: "50%", right: "10px", height: "1px", width: "16px" }
          : { bottom: "50%", left: "10px", height: "1px", width: "16px" };
  return (
    <div
      className="part-label pointer-events-none absolute z-10 hidden sm:block"
      style={{
        left: `${(part.anchor[0] / CAR_W) * 100}%`,
        top: `${(part.anchor[1] / CAR_H) * 100}%`,
        width: 0,
        height: 0,
      }}
    >
      <span className="absolute -left-[3px] -top-[3px] block h-[6px] w-[6px] rounded-full bg-gold-300 shadow-[0_0_10px_2px_rgba(236,197,121,0.6)]" />
      <span className="absolute bg-gold-300/50" style={stem} />
      <span
        className="absolute whitespace-nowrap rounded-[3px] border border-gold-300/30 bg-ink-950/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-gold-100 backdrop-blur-sm sm:text-[10px]"
        style={pos}
      >
        {part.name}
      </span>
    </div>
  );
}

export default function CarStage({
  paint,
  glass,
  targetRef,
  value = 0,
  showLabels = false,
  interactive = true,
  className = "",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const shown = useRef(value);
  const mouse = useRef({ x: 0, y: 0 });
  const parts = [...CAR_PARTS].sort((a, b) => a.z - b.z);
  const pp = buildPartPaint(paint, glass);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      mouse.current.x = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      mouse.current.y = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    };
    if (interactive) window.addEventListener("pointermove", onMove, { passive: true });

    const tick = (t: number) => {
      const tgt = targetRef ? targetRef.current : value;
      shown.current += (tgt - shown.current) * 0.11;
      if (Math.abs(tgt - shown.current) < 0.0004) shown.current = tgt;
      const e = shown.current;
      const sway = Math.sin(t / 2800) * 2.6;
      const ry = interactive ? mouse.current.x * 15 + sway : 0;
      const rx = interactive ? -mouse.current.y * 8 + e * 5 : e * 5;
      const inner = innerRef.current;
      if (inner) inner.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${(1 - e * 0.1).toFixed(3)})`;
      const root = rootRef.current;
      if (root) root.style.setProperty("--e", e.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [interactive, targetRef, value]);

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full ${className}`}
      style={{ ["--e" as string]: value, perspective: "1500px" }}
    >
      {/* floor glow / contact shadow */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-2xl"
        style={{
          bottom: "6%",
          width: "72%",
          height: "12%",
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(223,174,85,0.30), rgba(223,174,85,0.08) 55%, transparent 75%)",
          transform: "translateX(-50%) scaleY(calc(1 - var(--e) * 0.45))",
        }}
      />
      <div
        ref={innerRef}
        className="stage-3d absolute inset-0"
        style={{ transform: "rotateX(0deg) rotateY(0deg)" }}
      >
        {parts.map((p) => (
          <div
            key={p.id}
            className="absolute inset-0"
            style={{
              transform: `translate3d(calc(var(--e) * ${p.dx}px), calc(var(--e) * ${p.dy}px), calc(${p.z}px + var(--e) * ${p.dz}px))${p.rot ? ` rotate(calc(var(--e) * ${p.rot}deg))` : ""}`,
              willChange: "transform",
            }}
          >
            <svg
              viewBox={CAR_VIEWBOX}
              className="h-full w-full overflow-visible"
              aria-hidden="true"
            >
              {p.draw(pp, p.id)}
            </svg>
            {showLabels && p.label ? <LabelChip part={p} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
