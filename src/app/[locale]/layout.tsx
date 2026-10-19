import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono, Sora } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { isLocale, localeDir, locales } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";
import "../globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["300", "400", "500", "600"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", weight: ["400", "500"] });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["300", "400", "500", "600"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getStrings(locale);
  return {
    title: t.meta.title,
    description: t.meta.description,
    // Pitch preview: keep it out of search engines.
    robots: { index: false, follow: false },
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    openGraph: { title: t.meta.title, description: t.meta.description, locale },
  };
}

export const viewport: Viewport = { themeColor: "#06070a", colorScheme: "dark" };

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getStrings(locale);

  return (
    <html
      lang={locale}
      dir={localeDir[locale]}
      className={`${sora.variable} ${inter.variable} ${mono.variable} ${arabic.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          {t.nav.home}
        </a>
        <Nav locale={locale} t={t} />
        <main id="main">{children}</main>
        <Footer locale={locale} t={t} />
        <WhatsAppFloat locale={locale} t={t} />
      </body>
    </html>
  );
}
