"use client";

import { useState } from "react";
import type { Listing } from "@/config/inventory";
import type { Locale } from "@/i18n/config";
import type { Strings } from "@/i18n/strings";
import { ListingCard } from "./ListingCard";

type Filter = "all" | Listing["kind"];

/** The full showroom: sale / rental filter chips over the listing grid. */
export function ShowroomGrid({ listings, locale, t }: { listings: Listing[]; locale: Locale; t: Strings }) {
  const s = t.inventory;
  const [filter, setFilter] = useState<Filter>("all");
  const shown = listings.filter((l) => filter === "all" || l.kind === filter);

  return (
    <>
      <div className="flex gap-2" role="group" aria-label={s.kicker}>
        {(["all", "sale", "rental"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`inline-flex h-9 items-center rounded-full border px-4 text-[13px] transition-colors ${
              filter === f ? "border-snow bg-snow text-ink-950" : "border-line-strong text-fog hover:border-fog"
            }`}
          >
            {s[f]}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((l) => (
            <ListingCard key={l.id} listing={l} locale={locale} t={t} />
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-sm text-mist">{s.empty}</p>
      )}
    </>
  );
}
