import { garage } from "@/config/garage";
import type { Locale } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";

export function Footer({ t }: { locale: Locale; t: Strings }) {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-xs text-mist sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {new Date().getFullYear()} {garage.name} · {garage.tagline}. {t.footer.rights}
        </p>
        <nav aria-label={t.footer.social} className="flex gap-5">
          <a href={garage.instagram.url} target="_blank" rel="noopener noreferrer" className="hover:text-snow" dir="ltr">
            Instagram
          </a>
          <a href={garage.tiktok.url} target="_blank" rel="noopener noreferrer" className="hover:text-snow" dir="ltr">
            TikTok
          </a>
        </nav>
        <p className="font-mono uppercase tracking-[0.18em] text-accent-dim">{t.footer.concept}</p>
      </div>
    </footer>
  );
}
