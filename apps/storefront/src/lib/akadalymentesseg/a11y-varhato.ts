/**
 * AZ AKADALYMENTESSEG ISMERT HIBAI, LAPONKENT (FE-9, elso kor: meres).
 *
 * Ugyanaz a ket iranyu kotes, mint az FE-8 `varhato.ts`-jeben:
 * - egy itt allo hiba, ami a lapon megvan: KIHAGYOTT, az okkal;
 * - egy itt allo hiba, ami MAR NINCS a lapon: PIROS ("vedd ki innen");
 * - egy hiba, ami NINCS itt: PIROS (uj regresszio).
 *
 * A `szabaly` az axe szabaly-azonositoja, vagy a billentyuzetes bejaras sajat
 * ellenorzese (`bill:` elotaggal). A `lap` a `LAPOK` kulcsa.
 *
 * A PENZTAR HIBAI CSAK JELENTVE (acrobot 27450, 2026-10-07): a penztar
 * atrajzolasara nincs engedely, tehat ott a javitas nem ennek a PR-nek a resze.
 * A marka-szin kontrasztja design-dontes (a Figma tokenje), nem kod-hiba.
 */
export type A11yVarhato = {
  lap: string
  szabaly: string
  gazda: string
  ok: string
}

const PENZTAR = "pénztár: csak jelentve, az átrajzolásra nincs engedély"
const MARKASZIN =
  "a márkaszín (#d5782f) kontrasztja fehéren 3,09:1, a határ 4,5:1: design-döntés (Figma token)"

/**
 * A FEJLEC KOSAR-GOMBJA (`layout/components/cart-dropdown`): a `PopoverButton` egy
 * linket (`KosarLink`) fog kozre, tehat ket fokuszalhato elem van egymasban, minden
 * lapon. A kosar-gombot murena irja at kliensoldalira (FE-7), ezert ott javul.
 */
const FEJLEC_KOSAR =
  "a fejléc kosár-gombja (PopoverButton a link körül): az FE-7 átírja"
const LAPOK_KOZOS = [
  "kezdolap",
  "termek",
  "kategoria",
  "marka",
  "kereses",
  "kosar",
]

/**
 * A PENZTAR MERT HIBAI (2026-10-07, a teszt boltban, FE-1 + FE-8 + FE-9 build):
 * - (JAVITVA ebben a PR-ben, acrobot 27463: a kozos `Input` cimkeje es mezoje
 *   ossze van kotve; a cim-urlap 8 mezoje nevet kapott);
 * - az orszag `select`-je nev nelkul, es a fokusza nem latszik;
 * - a szallitasi es fizetesi mod radiojaban egy belso, nev nelkuli `button` is
 *   kap Tab-allomast, lathato fokusz nelkul (20x20 px celpont);
 * - a "Szerkesztés" gombok kontrasztja 3,67:1; nincs H1.
 */
const penztar = (lap: string, szabalyok: string[]): A11yVarhato[] =>
  szabalyok.map((szabaly) => ({ lap, szabaly, gazda: "jelentve", ok: PENZTAR }))

export const A11Y_VARHATO: readonly A11yVarhato[] = [
  ...LAPOK_KOZOS.flatMap((lap) => [
    { lap, szabaly: "nested-interactive", gazda: "FE-7", ok: FEJLEC_KOSAR },
    { lap, szabaly: "color-contrast", gazda: "design", ok: MARKASZIN },
  ]),
  ...penztar("penztar-cim", [
    "color-contrast",
    "page-has-heading-one",
    "select-name",
    "bill:lathato-fokusz",
    "bill:nev",
  ]),
  ...penztar("penztar-szallitas", [
    "button-name",
    "color-contrast",
    "nested-interactive",
    "page-has-heading-one",
    "target-size",
    "bill:lathato-fokusz",
    "bill:nev",
  ]),
  ...penztar("penztar-fizetes", [
    "button-name",
    "color-contrast",
    "nested-interactive",
    "target-size",
    "bill:lathato-fokusz",
    "bill:nev",
  ]),
]

export function a11yVarhato(lap: string, szabaly: string): A11yVarhato | null {
  return (
    A11Y_VARHATO.find((v) => v.lap === lap && v.szabaly === szabaly) ?? null
  )
}
