import { vevoiSzovegek } from "@lib/data/vevoi-szovegek"
import { translator, type Translate } from "./dictionary"
import type { Locale } from "./locale"

/**
 * A SZERVEROLDALI FORDÍTÓ AZ OS-BEN ÁTÍRT VEVŐI SZÖVEGEKKEL (kártya 7bfca4eb). Szerver-komponens, `generateMetadata` és
 * szerver-akció ezt hívja, ha vevői szöveget ír ki; a böngészőben a `useTranslate` adja ugyanezt (a lap keretének providere).
 * A `vevoi-szoveg-hivok.spec.ts` piros, ha egy vevői kulcsot használó fájl a felülírás nélküli `translator(locale)`-t hívja.
 */
export const vevoiForditas = async (locale: Locale): Promise<Translate> =>
  translator(locale, await vevoiSzovegek(locale))
