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
 * A PENZTAR HIBAI 2026-10-07-en CSAK JELENTVE voltak (acrobot 27450); azota a penztar atrajzolhato (2026-11-02), es a hibak sorra
 * javulnak (lasd lent). Az eredeti szoveg: a penztar
 * atrajzolasara nincs engedely, tehat ott a javitas nem ennek a PR-nek a resze.
 * A marka-szin kontrasztja design-dontes (a Figma tokenje), nem kod-hiba.
 */
export type A11yVarhato = {
  lap: string
  szabaly: string
  gazda: string
  ok: string
}

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
 * - (JAVITVA a pénztár 1. szeletében, 2026-11-02: az ország `select`-je a pénztár
 *   saját mezője, látható fókusszal; a cím- és szállítás-oldalnak van H1-e, a
 *   CI mérte: `page-has-heading-one` és `bill:lathato-fokusz` már nincs a lapon);
 * - (JAVITVA a #523-ban, barracuda atvetele: a szallitasi es fizetesi mod
 *   radiojanak belso, nev nelkuli gombja jelzo lett, nem vezerlo; a `button-name`
 *   kritikus volt, es kritikus hiba nem allhat ezen a listan);
 * - (JAVITVA 2026-11-16, task t-20261116-penztar-link-nev: az osszesito termek-kepenek linkje `aria-label`-t kapott a termek nevebol;
 *   a CI-naplo a nevtelen allomast `a#flex.w-full`-ként mondta meg; a penztar-cim es penztar-szallitas lapnak igy nincs varhato hibaja);
 * - (JAVITVA a #754-ben, 2026-11-13: a `color-contrast` mindharom penztar-lapon eltunt, mert a Kedvezmenykod link a Medusa
 *   alapertelmezett elenk kekje helyett a kirakat sotetkek, alahuzott link-stilusat viseli (`text-acr-ocean`); a CI mondta:
 *   "mar nincs a lapon, vedd ki"; a penztar-fizetes lapnak igy nincs varhato hibaja).
 */
export const A11Y_VARHATO: readonly A11yVarhato[] = [
  ...LAPOK_KOZOS.map((lap) => ({
    lap,
    szabaly: "nested-interactive",
    gazda: "FE-7",
    ok: FEJLEC_KOSAR,
  })),
  /*
    A `color-contrast` CSAK A KEZDOLAPON MARADT ISMERT (2026-11-19, a #831 CI-ja mondta: "mar nincs a lapon, vedd ki" az otodik lapon: termek,
    kategoria, marka, kereses, kosar). A forras minden lapon a fejlec info-savjanak "MINTA ADAT" jelzoje volt (`.inline-flex.px-2.py-1`,
    a marka-szin fehéren): a #831 a sav szovegeit a lablec valodi adatara (CEG) allitotta, tehat a sav mar nem minta, a jelzo nem jelenik meg,
    es vele a kontraszt-hiba sem. A kezdolapon tovabbra is minta-jelzok allnak (velemenyek, markak ...), ott a hiba marad.
  */
  {
    lap: "kezdolap",
    szabaly: "color-contrast",
    gazda: "design",
    ok: MARKASZIN,
  },
]

export function a11yVarhato(lap: string, szabaly: string): A11yVarhato | null {
  return (
    A11Y_VARHATO.find((v) => v.lap === lap && v.szabaly === szabaly) ?? null
  )
}
