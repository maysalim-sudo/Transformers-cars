import type { ReactNode } from "react";
import { useReveal } from "../hooks/useScrollDrive";
import { cn } from "../utils/cn";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "translate-y-8 opacity-0 transition-all duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)]",
        "[&.is-visible]:translate-y-0 [&.is-visible]:opacity-100",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-gold-300 sm:text-[11px]",
        className,
      )}
    >
      <span className="h-px w-6 bg-gold-400/70" />
      {children}
    </span>
  );
}

export function Button({
  children,
  href,
  onClick,
  variant = "solid",
  className,
  target,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "ghost" | "wa";
  className?: string;
  target?: string;
}) {
  const base =
    "group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 py-3 font-display text-[13px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 active:scale-[0.98]";
  const styles = {
    solid:
      "bg-gold-400 text-ink-950 hover:bg-gold-300 shadow-[0_10px_40px_-14px_rgba(223,174,85,0.8)]",
    ghost:
      "border border-white/15 bg-white/[0.03] text-white/90 backdrop-blur hover:border-gold-400/60 hover:text-gold-100",
    wa: "bg-[#1f9e57] text-white hover:bg-[#23b463] shadow-[0_10px_40px_-14px_rgba(37,211,102,0.8)]",
  }[variant];
  const Comp: any = href ? "a" : "button";
  return (
    <Comp
      href={href}
      target={target}
      rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={cn(base, styles, className)}
    >
      {children}
    </Comp>
  );
}

export function Panel({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.055] to-white/[0.015] backdrop-blur-md",
        hover &&
          "transition-all duration-500 hover:-translate-y-1 hover:border-gold-400/35 hover:from-gold-400/[0.09]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-white sm:text-4xl">
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
    </div>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
