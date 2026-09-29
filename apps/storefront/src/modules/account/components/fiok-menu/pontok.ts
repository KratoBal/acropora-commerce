/**
 * A FIOK MENUJE (P5, 257:21; mobilon a fulsor, 257:219), egy helyen.
 *
 * A keret sorrendje: Profil, Rendeléseim, Címek, Számlázási adatok,
 * Hűségpontok, Beállítások. Itt CSAK a mar letezo oldal kap pontot: egy
 * menupont, ami nem letezo lapra visz, rosszabb a hianyzonal. A Számlázási
 * adatok es a Beállítások a sajat PR-jukkal kerulnek ide (P5 5. es 6.
 * pont); a Hűségpontok moge nincs adat (docs/P5-LEFT-OUT.md).
 */
export type FiokPont = {
  /** Az asztali menu felirata. */
  cimke: string
  /** A mobil ful felirata; a keret rovidit (257:225: "Számlázás"). */
  mobilCimke: string
  href: string
  testId: string
  /** A fej leirasa a cim alatt, ha a keret ad ilyet (249:215). */
  leiras?: string
}

export const FIOK_PONTOK: readonly FiokPont[] = [
  {
    cimke: "Profil",
    mobilCimke: "Profil",
    href: "/account/profile",
    testId: "profile-link",
  },
  {
    cimke: "Rendeléseim",
    mobilCimke: "Rendeléseim",
    href: "/account/orders",
    testId: "orders-link",
    // A mobil keret mondata (249:215). Az asztali (249:20) szallitasi
    // csoportokat es elo allatos atvetelt igerne, ami a P4 hattere.
    leiras: "Aktuális és korábbi rendeléseid egy helyen.",
  },
  {
    cimke: "Címek",
    mobilCimke: "Címek",
    href: "/account/addresses",
    testId: "addresses-link",
  },
] as const

/** A pont aktiv-e az adott utvonalon (a rendeles reszletei a Rendeléseim ala tartozik). */
export function aktivPont(utvonal: string, countryCode: string): string | null {
  const helyi = utvonal.replace(new RegExp(`^/${countryCode}(?=/|$)`), "")
  const pont = FIOK_PONTOK.find(
    (p) => helyi === p.href || helyi.startsWith(`${p.href}/`),
  )
  return pont?.href ?? null
}

/**
 * A lap cime a fejben (257:19). A fiok nyitolapja ("/account") a meglevo
 * attekintes; a rendeles reszletei sajat cimet kapnak a 4. pontban.
 */
/** A fej leirasa az utvonalhoz, ha van. */
export function fiokLeiras(
  utvonal: string,
  countryCode: string,
): string | undefined {
  const aktiv = aktivPont(utvonal, countryCode)
  return FIOK_PONTOK.find((p) => p.href === aktiv)?.leiras
}

export function fiokCim(utvonal: string, countryCode: string): string {
  const aktiv = aktivPont(utvonal, countryCode)
  const pont = FIOK_PONTOK.find((p) => p.href === aktiv)
  return pont?.cimke ?? "Áttekintés"
}
