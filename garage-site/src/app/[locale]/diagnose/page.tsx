import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiagnoseTool } from "@/components/diagnose/DiagnoseTool";
import { isLocale } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getStrings(locale);
  return { title: `${t.diagnose.kicker} — ${t.meta.title}` };
}

export default async function DiagnosePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DiagnoseTool locale={locale} t={getStrings(locale)} />;
}
