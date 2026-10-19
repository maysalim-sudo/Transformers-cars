import { defaults, liveries, paints, tints, wheelStyles } from "@/car/palette";
import { getPart } from "@/car/registry";
import type { CarModelId } from "@/car/models";
import type { ViewId } from "@/car/views";
import { type Locale, pick } from "@/i18n/config";
import { getStrings } from "@/i18n/strings";

export type RequestInput = {
  model: CarModelId;
  views: ViewId[];
  parts: string[];
  mechanical: boolean;
  notes: string;
  name: string;
  drivable: "" | "yes" | "no" | "unsure";
  paint: string;
  wheel: string;
  tint: string;
  livery?: string;
};

export function hasCustomization(r: Pick<RequestInput, "paint" | "wheel" | "tint" | "livery">): boolean {
  return r.paint !== defaults.paint || r.wheel !== defaults.wheel || r.tint !== defaults.tint || (r.livery ?? defaults.livery) !== defaults.livery;
}

/**
 * The WhatsApp message, written in the language the workshop reads (not the visitor's).
 * It describes a request; it never states a diagnosis.
 */
export function buildRequestMessage(r: RequestInput, locale: Locale): string {
  const t = getStrings(locale);
  const m = t.message;
  const lines: string[] = [`*${m.heading}*`, ""];

  lines.push(`${m.model}: ${t.diagnose.vehicle[r.model]} (${t.diagnose.vehicle[`${r.model}Note`]})`);
  if (r.name.trim()) lines.push(`${m.name}: ${r.name.trim()}`);
  if (r.views.length) lines.push(`${m.views}: ${r.views.map((v) => t.views[v].toLowerCase()).join(", ")}`);

  const partNames = r.parts.map((id) => pick(getPart(id).label, locale));
  lines.push(`${m.parts}: ${partNames.length ? partNames.join(", ") : m.none}`);
  if (r.mechanical) lines.push(`• ${m.mechanical}`);
  if (r.drivable) {
    const d = { yes: t.diagnose.details.yes, no: t.diagnose.details.no, unsure: t.diagnose.details.unsure }[r.drivable];
    lines.push(`${m.drivable}: ${d}`);
  }
  if (r.notes.trim()) lines.push(`${m.notes}: ${r.notes.trim()}`);

  if (hasCustomization(r)) {
    const paint = paints.find((p) => p.id === r.paint);
    const wheel = wheelStyles.find((w) => w.id === r.wheel);
    const tint = tints.find((x) => x.id === r.tint);
    const livery = r.livery && r.livery !== defaults.livery ? liveries.find((x) => x.id === r.livery) : undefined;
    const bits = [
      paint && `${m.paint} ${pick(paint.label, locale)}`,
      wheel && `${m.wheels} ${pick(wheel.label, locale)}`,
      tint && `${m.tint} ${pick(tint.label, locale)}`,
      livery && `${m.livery} ${pick(livery.label, locale)}`,
    ].filter(Boolean);
    lines.push(`${m.customization}: ${bits.join(", ")}`);
  }

  return lines.join("\n");
}
