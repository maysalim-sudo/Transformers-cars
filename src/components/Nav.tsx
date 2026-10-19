import { useEffect, useState } from "react";
import { GARAGE, whatsappLink } from "../config";
import { cn } from "../utils/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <img
        src="/logo.png"
        alt={`${GARAGE.name} — ${GARAGE.tagline}`}
        className="h-9 w-auto rounded-[5px] bg-white px-[5px] py-[4px] sm:h-11"
      />
    </span>
  );
}

const LINKS = [
  { id: "home", label: "Home" },
  { id: "work", label: "The Build" },
  { id: "services", label: "Services" },
  { id: "diagnose", label: "Build Tool" },
];

export default function Nav({
  route,
  onNavigate,
}: {
  route: string;
  onNavigate: (r: string) => void;
}) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (r: string) => {
    setOpen(false);
    onNavigate(r);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid
          ? "border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
        <button onClick={() => go("home")} className="cursor-pointer">
          <Logo />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className={cn(
                "relative rounded-full px-4 py-2 font-display text-[12px] font-medium uppercase tracking-[0.16em] transition-colors",
                route === l.id
                  ? "text-gold-200"
                  : "text-white/55 hover:text-white",
              )}
            >
              {l.label}
              {route === l.id && (
                <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={whatsappLink(
              `Bonjour ${GARAGE.name}, je voudrais des informations pour ma voiture.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full border border-[#25d366]/30 bg-[#25d366]/10 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8ef0b0] transition-all hover:border-[#25d366]/70 hover:bg-[#25d366]/20 sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.06c-.24.68-1.4 1.3-1.93 1.35-.53.05-1.02.24-3.44-.72-2.92-1.15-4.75-4.19-4.89-4.38-.15-.2-1.16-1.55-1.16-2.95 0-1.4.73-2.09 1-2.38.26-.29.57-.36.77-.36l.55.01c.17 0 .41-.07.63.48.24.58.8 1.98.87 2.13.07.14.12.31.02.5-.1.2-.15.32-.29.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.19-.29.39-.24.65-.15.27.1 1.67.79 1.96.93.29.15.48.22.55.34.07.13.07.75-.17 1.43Z" />
            </svg>
            WhatsApp
          </a>
          <button
            onClick={() => go("diagnose")}
            className="hidden rounded-full bg-gold-400 px-5 py-2.5 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-ink-950 transition-colors hover:bg-gold-300 lg:block"
          >
            Book a build
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/80 md:hidden"
            aria-label="Menu"
          >
            <span className="relative block h-3 w-4">
              <span className={cn("absolute left-0 h-px w-full bg-current transition-all", open ? "top-1.5 rotate-45" : "top-0")} />
              <span className={cn("absolute left-0 top-1.5 h-px w-full bg-current transition-all", open && "opacity-0")} />
              <span className={cn("absolute left-0 h-px w-full bg-current transition-all", open ? "top-1.5 -rotate-45" : "top-3")} />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.07] bg-ink-950/95 px-5 pb-6 pt-2 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="block w-full border-b border-white/[0.05] py-4 text-left font-display text-sm uppercase tracking-[0.18em] text-white/80"
            >
              {l.label}
            </button>
          ))}
          <a
            href={whatsappLink(`Bonjour ${GARAGE.name}, je voudrais des informations pour ma voiture.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block rounded-full bg-[#25d366] py-3 text-center text-sm font-bold uppercase tracking-[0.14em] text-ink-950"
          >
            Message on WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}
