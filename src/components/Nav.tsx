import Image from "next/image";
import Link from "next/link";
import { garage } from "@/config/garage";
import type { Locale } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Nav({ locale, t }: { locale: Locale; t: Strings }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href={`/${locale}`} className="flex min-w-0 items-center" aria-label={garage.name}>
          <Image
            src={garage.logo.src}
            alt={garage.name}
            width={garage.logo.width}
            height={garage.logo.height}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-mist md:flex" aria-label="Main">
          <Link href={`/${locale}#services`} className="transition-colors hover:text-snow">
            {t.nav.services}
          </Link>
          <Link href={`/${locale}/showroom`} className="transition-colors hover:text-snow">
            {t.nav.showroom}
          </Link>
          <Link href={`/${locale}/diagnose`} className="transition-colors hover:text-snow">
            {t.nav.diagnose}
          </Link>
          <Link href={`/${locale}#contact`} className="transition-colors hover:text-snow">
            {t.nav.contact}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher locale={locale} label={t.nav.language} />
          <Link
            href={`/${locale}/diagnose`}
            className="hidden h-9 items-center rounded-full bg-snow px-4 text-[13px] font-medium text-ink-950 transition-colors hover:bg-accent-strong sm:inline-flex md:hidden"
          >
            {t.nav.diagnoseShort}
          </Link>
        </div>
      </div>
    </header>
  );
}
