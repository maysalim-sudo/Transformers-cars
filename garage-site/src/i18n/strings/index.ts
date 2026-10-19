import type { Locale } from "../config";
import ar from "./ar";
import en, { type Strings } from "./en";
import fr from "./fr";

const dictionaries: Record<Locale, Strings> = { fr, ar, en };

export function getStrings(locale: Locale): Strings {
  return dictionaries[locale];
}

export type { Strings };
