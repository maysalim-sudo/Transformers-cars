"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Locale, localeNames, localeShort, locales } from "@/i18n/config";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav aria-label={label} className="flex items-center rounded-full border border-line p-0.5">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          title={localeNames[l]}
          className={`grid h-8 min-w-8 place-items-center rounded-full px-2 font-mono text-[11px] tracking-wider transition-colors ${
            l === locale ? "bg-snow text-ink-950" : "text-mist hover:text-snow"
          }`}
        >
          {localeShort[l]}
        </Link>
      ))}
    </nav>
  );
}
