import type { Translate } from "@lib/i18n/dictionary"
import type { Locale } from "@lib/i18n/locale"

import type { Adag } from "./adagolas"

/**
 * AZ ADAG SZOVEGES ALAKJAI (V3.1, kartya 7fdbb15d), korall szovegei szerint
 * (exchange/otletek-2026-11-04/v3-1-adagolo-kalkulator-szovegek.md): a szam a
 * lap nyelven (magyarul tizedesvesszo es szokozos ezres tagolas), az egyseg
 * kiirva, a gyakorisag szavakkal. Tiszta fuggvenyek: a kalkulator es a
 * muszaki lap "Adagolás" sora ugyanezt hasznalja.
 */

/**
 * Egy szam a lap nyelven, legfeljebb ket tizedessel. A negyjegyu szam is tagolva ("1 000 liter"), ahogy a
 * kirakat az osszegeket is irja (money.ts, MINDIG_TAGOL): a magyar locale-adat alapbol csak otjegytol tagol.
 */
const MINDIG_TAGOL = { useGrouping: "always" } as unknown as Pick<
  Intl.NumberFormatOptions,
  "useGrouping"
>

export function szam(ertek: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "hu" ? "hu-HU" : "en-GB", {
    maximumFractionDigits: 2,
    ...MINDIG_TAGOL,
  }).format(ertek)
}

/** "12,5 ml", "3 csepp", "1 drop", "3 drops". */
export function adagSzoveg(
  mennyiseg: number,
  egyseg: Adag["egyseg"],
  t: Translate,
  locale: Locale,
): string {
  const nev =
    egyseg === "ml"
      ? "ml" // mertekegyseg-jel, mindket nyelven ugyanaz (a szotar-or a kozos szoveget forditatlannak latna)
      : mennyiseg === 1
        ? t("product.doseCalc.dropOne")
        : t("product.doseCalc.dropMany")
  return `${szam(mennyiseg, locale)} ${nev}`
}

/**
 * A gyakorisag: "naponta egyszer", "hetente 1-2 alkalommal". A rovid alak a
 * gyartoi sore: "naponta", "hetente 3 alkalommal".
 */
export function gyakorisagSzoveg(
  adag: Pick<Adag, "gyakorisag" | "idoszak">,
  t: Translate,
  rovid = false,
): string {
  const { min, max } = adag.gyakorisag
  const egyszer = min === 1 && max === 1
  const n = min === max ? String(min) : `${min}-${max}`
  if (adag.idoszak === "nap")
    return egyszer
      ? t(rovid ? "product.doseCalc.shortDayOnce" : "product.doseCalc.dayOnce")
      : t(
          rovid
            ? "product.doseCalc.shortDayTimes"
            : "product.doseCalc.dayTimes",
          { n },
        )
  return egyszer
    ? t(rovid ? "product.doseCalc.shortWeekOnce" : "product.doseCalc.weekOnce")
    : t(
        rovid
          ? "product.doseCalc.shortWeekTimes"
          : "product.doseCalc.weekTimes",
        { n },
      )
}

/** A gyarto adagolasa olvashatoan: "5 ml / 100 liter, naponta" (a nyers "5 ml/100 L/day" helyett). */
export function gyartoiAdagSzoveg(
  adag: Adag,
  t: Translate,
  locale: Locale,
): string {
  const liter =
    adag.literre === 1
      ? t("product.doseCalc.litreOne")
      : t("product.doseCalc.litreMany")
  return `${adagSzoveg(adag.mennyiseg, adag.egyseg, t, locale)} / ${szam(adag.literre, locale)} ${liter}, ${gyakorisagSzoveg(adag, t, true)}`
}

/** Ennyi liter folott a kalkulator figyelmeztet (de szamol); a literOlvas 100 000 folott nem fogad el. */
export const SZOKATLANUL_NAGY_LITER = 5000

export type LiterAllapot =
  | { liter: number; szokatlan: boolean }
  | { hiba: "ures" | "nemSzam" | "nemPozitiv" | "tulNagy" }

/** A beirt liter osztalyozva: a hibauzenet ebbol valaszt. */
export function literAllapot(
  beirt: string,
  olvas: (beirt: string) => number | null,
): LiterAllapot {
  const szoveg = beirt.trim()
  if (szoveg === "") return { hiba: "ures" }
  const liter = olvas(szoveg)
  if (liter !== null)
    return { liter, szokatlan: liter > SZOKATLANUL_NAGY_LITER }
  const szam = Number(szoveg.replace(",", "."))
  if (Number.isFinite(szam) && /^-?\d+(?:[.,]\d+)?$/.test(szoveg))
    return { hiba: szam <= 0 ? "nemPozitiv" : "tulNagy" }
  return { hiba: "nemSzam" }
}
