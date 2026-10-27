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

/**
 * SEBESSEG ("16000 l/h", "600l/h", "(9500l/h)", "~ 15142 l/h"): a mennyiseg utan
 * allo `/` es betu mas nagysag (aramlas), nem a csomag tartalma. Egy aramoltato
 * nem kaphat Ft/l egysegarat (a #595 review mert nevei).
 */
const SEBESSEG = /\d\s*(kg|gr|g|ml|l)\s*\/\s*[A-Za-z\u00C0-\u017F]/i
/**
 * TARTOMANY ("300-900l", "100-400l", "200 - 500 l"): a `-`, `–`, `—` elott allo
 * szam masik vegpontot jelent, a "900l" nem egy csomag tartalma.
 */
const TARTOMANY =
  /\d\s*[-–—]\s*\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)(?![A-Za-z\u00C0-\u017F\d])/i
/**
 * EZRES-ELVALASZTO ("19.000 l", "1.000 g", "19 000 ml"): a magyar szoveg tizedes
 * vesszot hasznal, a pont es a szokoz itt az ezreseket valasztja el -- a "19.000"
 * tehat 19000, nem 19. Bizonytalan, nincs egysegar.
 */
const EZRES = /\d{1,3}[.\s]\d{3}\s*(kg|gr|g|ml|l)(?![A-Za-z\u00C0-\u017F\d])/i

/**
 * MODELLKOD ("CUH-18L", "FX-1500L"): a betu es kotojel utan allo szam+egyseg a
 * termek AZONOSITOJA, nem a tartalma ("CUH-18L - 18W-os UVC potizzo" 183 Ft/l
 * egysegarat kapott volna).
 */
const KOD =
  /[A-Za-z\u00C0-\u017F]-\d+(?:[.,]\d+)?\s*(kg|gr|g|ml|l)(?![A-Za-z\u00C0-\u017F\d])/i
/**
 * KEPZO ("1500L-es kulso szuro", "100ml-s tarto"): az egyseg utan kotojellel allo
 * toldalek a termek MERETET mondja, nem a tartalmat.
 */
const KEPZO = /\d\s*(kg|gr|g|ml|l)-[A-Za-z\u00C0-\u017F]/i
/**
 * EDENY, ESZKOZ, KESZLET: a nev egy edenyt vagy eszkozt ad el, amelynek a
 * mennyisege a KAPACITASA ("szurőanyagtarto zsak 1000ml", "pipetta 50ml", "reactor
 * - 2,5 L - tartaly", "UVC potizzo"), vagy tobb osszetevos csomagot ("ComboPack",
 * "szett"), amelyben a nevben allo mennyiseg egy resze. Heurisztika a TELJES teszt-
 * katalogus atnezesebol (1447 termek), nem teljes lista: ami igy is atcsuszik, azt
 * az ellenorzo lista fogja meg.
 */
const EDENY =
  /zs[aá]k|pipett|tart[aá]ly|reaktor|reactor|tart[oó](?![A-Za-z\u00C0-\u017F])|sz[uű]r[oő](?![A-Za-z\u00C0-\u017F])|izz[oó]|combo|szett|(^|[^A-Za-z\u00C0-\u017F])(set|kit)([^A-Za-z\u00C0-\u017F]|$)|csomag|pack(?![A-Za-z\u00C0-\u017F])/i

const szam = (szoveg: string) => Number(szoveg.replace(",", "."))

export function egysegarNevbol(
  nev: string | null | undefined,
  /** A termék ára forintban (a Medusa v2 összege főegységben, nem fillérben). */
  ar: number | null | undefined,
): Egysegar | null {
  if (!nev || typeof ar !== "number" || !Number.isFinite(ar) || ar <= 0)
    return null
  if (SZORZO_ELOTT.test(nev) || SZORZO_UTAN.test(nev)) return null
  // SEBESSEG, TARTOMANY, EZRES-ELVALASZTO: a #595 review (barracuda) mert esetei
  if (SEBESSEG.test(nev) || TARTOMANY.test(nev) || EZRES.test(nev)) return null
  // MODELLKOD, -es/-s KEPZO, EDENY/KESZLET szo: a teljes teszt-katalogus atnezese talalta
  if (KOD.test(nev) || KEPZO.test(nev) || EDENY.test(nev)) return null

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
