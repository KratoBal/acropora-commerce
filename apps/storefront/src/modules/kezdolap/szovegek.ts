/**
 * A KEZDOLAP SZERKESZTHETO SZOVEGEI: A KATALOGUS.
 *
 * Balazs, 2026-10-20: "az egesz oldalon az osszes szoveg kitalalt. en fogom
 * atirni vagy atiratni veled". Ezert a kezdolap egyetlen cime, gombfelirata
 * vagy blokk-szovege sincs beegetve a komponensbe: mind egy KULCSON at jon, a
 * kulcs erteket az Acropora OS szerkeszti (`GET /store/homepage-content`), a
 * kulcs `alap` erteke pedig a terv szovege, KEZDOERTEKKENT.
 *
 * === A HIANYZO KULCS NEM URES FOLT ===
 *
 * Amit az OS meg nem kuldott, annak az `alap` ertek all a helyen, tehat egy uj
 * kulcs (egy kovetkezo PR-ban felvett uj blokk) nem tori el a lapot attol, hogy
 * az OS meg nem ismeri. Egy KIFEJEZETTEN kuldott ures szoveg viszont URES: az a
 * szerkeszto dontese (a sor eltunik), nem hiany.
 *
 * === AZ OS EBBOL OLVASSA A LISTAT ===
 *
 * A `kulcs`, a `csoport`, a `cimke` es az `alap` az OS szerkesztojenek
 * bemenete is (3. PR). A lista ezert EGY helyen, adatkent all, nem a
 * komponensek kozott szetszorva.
 */
export type KezdolapSzoveg = {
  kulcs: string
  csoport: string
  cimke: string
  alap: string
}

export const KEZDOLAP_SZOVEGEK: readonly KezdolapSzoveg[] = [
  {
    kulcs: "hero.tenyek.1.cim",
    csoport: "Hero",
    cimke: "Első tény: címsor",
    alap: "Személyes átvétel",
  },
  {
    kulcs: "hero.tenyek.1.szoveg",
    csoport: "Hero",
    cimke: "Első tény: szöveg",
    alap: "a budapesti boltban",
  },
  {
    kulcs: "hero.tenyek.2.cim",
    csoport: "Hero",
    cimke: "Második tény: címsor",
    alap: "Szakmai tanácsadás",
  },
  {
    kulcs: "hero.tenyek.2.szoveg",
    csoport: "Hero",
    cimke: "Második tény: szöveg",
    alap: "vásárlás előtt és után",
  },
  {
    kulcs: "hero.tenyek.3.cim",
    csoport: "Hero",
    cimke: "Harmadik tény: címsor (értékelés)",
    alap: "4,9 / 5",
  },
  {
    kulcs: "hero.tenyek.3.szoveg",
    csoport: "Hero",
    cimke: "Harmadik tény: szöveg",
    alap: "312 vásárlói értékelés",
  },
]

const ALAPOK: ReadonlyMap<string, string> = new Map(
  KEZDOLAP_SZOVEGEK.map((sor) => [sor.kulcs, sor.alap]),
)

/**
 * A szoveg-kereso egy tartalomhoz. Az OS-tol kapott `texts` elsobbseget elvez,
 * akkor is, ha ures; ami nincs benne, annak a katalogus `alap` erteke all. Egy
 * ISMERETLEN kulcs hiba (nem ures szoveg): egy elgepelt kulcs ne tunjon el
 * csendben a lapon.
 */
export const szovegKereso = (texts: Record<string, string> | null) => {
  return (kulcs: string): string => {
    const kuldott =
      texts && Object.prototype.hasOwnProperty.call(texts, kulcs)
        ? texts[kulcs]
        : null
    if (typeof kuldott === "string") return kuldott
    const alap = ALAPOK.get(kulcs)
    if (alap === undefined) {
      throw new Error(`ismeretlen kezdolap-szoveg kulcs: ${kulcs}`)
    }
    return alap
  }
}
