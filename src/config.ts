export const GARAGE = {
  name: "Transformer Tuning Cars",
  /** matches the wordmark in the logo */
  wordmark: "TRANSFORMER",
  tagline: "Cars Tuning Tunisie",
  phoneDisplay: "+216 53 008 080",
  /** international format, digits only — used for wa.me deep links */
  whatsapp: "21653008080",
  /** not supplied by the client yet — left empty rather than invented */
  email: "",
  address: "Sousse, Tunisie",
  instagram: "https://www.instagram.com/transformer_tuning_cars/",
  instagramHandle: "@transformer_tuning_cars",
  tiktok: "https://www.tiktok.com/@transformertuningcars",
  tiktokHandle: "@transformertuningcars",
  /** placeholder — confirm the real opening hours with the client */
  hours: [
    { d: "Lun – Sam", h: "09:00 – 19:00" },
    { d: "Dimanche", h: "Sur rendez-vous" },
  ],
};

export function whatsappLink(message: string) {
  return `https://wa.me/${GARAGE.whatsapp}?text=${encodeURIComponent(message)}`;
}

export type DiagnoseSelection = {
  model: string;
  views: string[];
  parts: string[];
  paint: string;
  glass: string;
  severity: string;
  drivable: string;
  notes: string;
  name: string;
  phone: string;
};

export function buildDiagnosisMessage(s: DiagnoseSelection) {
  const lines = [
    `*${GARAGE.name} — Demande de devis / Quote request*`,
    ``,
    `Véhicule / Vehicle: *${s.model}*`,
    s.name ? `Nom / Name: ${s.name}` : null,
    s.phone ? `Tél / Phone: ${s.phone}` : null,
    ``,
    `Points signalés / Flagged:`,
    ...(s.parts.length ? s.parts.map((p) => `• ${p}`) : ["• (rien sélectionné / none)"]),
    ``,
    `Vues vérifiées / Views: ${s.views.length ? s.views.join(", ") : "—"}`,
    `Urgence / Urgency: ${s.severity}`,
    `Roulant / Drivable: ${s.drivable}`,
    ``,
    `Aperçu / Preview: ${s.paint} / ${s.glass}`,
    s.notes ? `Notes: ${s.notes}` : null,
    ``,
    `Merci de confirmer le créneau et un devis estimatif.`,
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}
