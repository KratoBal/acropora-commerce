/**
 * AZ EGYSEGAR A TERMEK NEVEBOL (commerce-audit-p1, P1/3, acrobot 36825:
 * "a nev vegi mintabol szamolj, pontosan egy mennyisegnel, a teljes szamolt
 * lista ellenorzesre megy; csak a teszt kirakatra es a teszt feedre").
 *
 * A kiszereles ma csak a termek nevében áll szövegként ("Aquaforest Pro Bio F
 * 25g"); strukturált mennyiség-mező nincs a Commerce-ben. Éles egységárat
 * találgatásból nem írunk, ezért a szabály szűk, és ami nem egyértelmű, az
 * KIMARAD (nincs egységár), nem kap kitalált értéket:
 *
 *   - pontosan EGY `<szám><egység>` mennyiség a névben (g, gr, kg, ml, l);
 *     kettő vagy több ("5 l / 1 kg", "4x25g") bizonytalan: kimarad;
 *   - szorzó ("4x25g", "2 x 50 ml", "25g x 4") kimarad;
 *   - az `mg` és a `cl` nem kiszerelés-egység itt (2000mg hatóanyag-tartalom,
 *     nem a csomag tartalma): a `g` előtt betű nem állhat;
 *   - a méretek ("180x90cm", "90cm*4m") nem g/ml/l egységek, nem számítanak;
 *   - a nulla vagy a negatív mennyiség kimarad.
 *
 * AZ ALAP MERTEK a kilogramm és a liter (a magyar szabály az egységárat Ft/kg
 * vagy Ft/l alakban kéri). Az egységár egész forintra kerekítve.
 *
 * EZ A FAJL KET HELYEN ALL, SZO SZERINT UGYANAZ: a kirakaton (a terméklap
 * egységár-sora) es a hatterben (a Merchant feed `unit_pricing_measure`-je).
 * Az alkalmazások nem importálják egymást, ezért az egyik egy másolat, és a
 * hátteri `unit-price.unit.spec.ts` szerződés-tesztje a kettőt összeveti.
 */
export type Egysegar = {
  /** Az alap: kilogramm vagy liter. */
  alap: "kg" | "l"
  /** Forint az alapegységre, egész számra kerekítve. */
  ar: number
  /** A csomag tartalma a névből, szóközzel: "25 g", "3,785 l" helyett a névbeli alakban. */
  kiszereles: string
  /**
   * A Merchant feed `unit_pricing_measure` értéke: "25g", "3785ml" (szám +
   * egység, szóköz nélkül; a Google legfeljebb két tizedest enged). `null`,
   * ha a névbeli szám ennél pontosabb: akkor a feed nem kap értéket.
   */
  feedMertek: string | null
}

/*
  A regex NEM hasznal `u` jelzot es lookbehindot (a kirakat forditasi celja
  regebbi): a betu az `A-Za-z` es a Latin-1/Latin-bovitett tartomany
  (`\u00C0-\u017F`, benne az o es u hosszu es rovid alakjai), az elozo karaktert
  a talalat maga viszi (`(^|...)`).
*/
const MENNYISEG =
  /(^|[^A-Za-z\u00C0-\u017F\d.,])(\d+(?:[.,]\d+)?)\s*(kg|gr|g|ml|l)(?![A-Za-z\u00C0-\u017F\d])/gi

/** Szorzó a mennyiség előtt vagy után: "4x25g", "2 x 50 ml", "25g x 4", "25g*4". */
const SZORZO_ELOTT =
  /\d\s*[x×*]\s*\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)(?![A-Za-z\u00C0-\u017F\d])/i
const SZORZO_UTAN =
  /(^|[^A-Za-z\u00C0-\u017F\d.,])\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)\s*[x×*]\s*\d/i

const szam = (szoveg: string) => Number(szoveg.replace(",", "."))

export function egysegarNevbol(
  nev: string | null | undefined,
  /** A termék ára forintban (a Medusa v2 összege főegységben, nem fillérben). */
  ar: number | null | undefined,
): Egysegar | null {
  if (!nev || typeof ar !== "number" || !Number.isFinite(ar) || ar <= 0)
    return null
  if (SZORZO_ELOTT.test(nev) || SZORZO_UTAN.test(nev)) return null

  const talalatok = Array.from(nev.matchAll(MENNYISEG))
  if (talalatok.length !== 1) return null

  const [, , ertekSzoveg, egysegSzoveg] = talalatok[0] as unknown as [
    string,
    string,
    string,
    string,
  ]
  const ertek = szam(ertekSzoveg)
  if (!Number.isFinite(ertek) || ertek <= 0) return null

  const egyseg = egysegSzoveg.toLowerCase()
  const tomeg = egyseg === "kg" || egyseg === "g" || egyseg === "gr"
  const alapban = tomeg
    ? egyseg === "kg"
      ? ertek
      : ertek / 1000
    : egyseg === "l"
      ? ertek
      : ertek / 1000
  const kerekitett = Math.round(ar / alapban)
  if (!Number.isFinite(kerekitett) || kerekitett <= 0) return null

  const feedEgyseg = egyseg === "gr" ? "g" : egyseg
  const tizedesek = (ertekSzoveg.split(/[.,]/)[1] ?? "").length
  return {
    alap: tomeg ? "kg" : "l",
    ar: kerekitett,
    kiszereles: `${ertekSzoveg} ${feedEgyseg}`,
    feedMertek: tizedesek <= 2 ? `${ertek}${feedEgyseg}` : null,
  }
}
