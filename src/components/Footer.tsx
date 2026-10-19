import { GARAGE, whatsappLink } from "../config";
import { Logo } from "./Nav";

export default function Footer({ onNavigate }: { onNavigate: (r: string) => void }) {
  return (
    <footer className="relative z-10 border-t border-white/[0.07] bg-ink-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
      <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/45">
              {GARAGE.tagline}. Showroom tuning for luxury and sports cars —
              accessories, performance work, plus consignment sales and rentals.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {[
                { href: GARAGE.instagram, label: GARAGE.instagramHandle },
                { href: GARAGE.tiktok, label: GARAGE.tiktokHandle },
              ].map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55 transition-colors hover:border-gold-400/60 hover:text-gold-200"
                >
                  {s.label}
                </a>
              ))}
            </div>
            <a
              href={whatsappLink(`Bonjour ${GARAGE.name}, une question sur ma voiture.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm text-[#8ef0b0] hover:underline"
            >
              {GARAGE.phoneDisplay}
            </a>
          </div>

          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-400/70">
              Showroom
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-white/50">
              {GARAGE.hours.map((h) => (
                <li key={h.d} className="flex justify-between gap-4">
                  <span>{h.d}</span>
                  <span className="font-mono text-[11px] text-white/70">{h.h}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-400/70">
              Services
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-white/50">
              {["Tuning & performance", "Accessories & parts", "Body kits & wraps", "Wheels & tyres", "Vente & location", "Diagnostics"].map(
                (s) => (
                  <li key={s}>{s}</li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-400/70">
              Explore
            </h4>
            <ul className="mt-5 space-y-3 text-sm text-white/50">
              {[
                { id: "home", l: "Home" },
                { id: "work", l: "The Build" },
                { id: "services", l: "Services" },
                { id: "diagnose", l: "Build Tool" },
              ].map((x) => (
                <li key={x.id}>
                  <button onClick={() => onNavigate(x.id)} className="hover:text-gold-200">
                    {x.l}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/[0.06] pt-7 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} {GARAGE.name}
          </span>
          <span className="font-mono uppercase tracking-[0.2em]">
            {GARAGE.address}
          </span>
        </div>
      </div>
    </footer>
  );
}
