import { translator, type Key, type Translate } from "@lib/i18n/dictionary"
import { DEFAULT_LOCALE } from "@lib/i18n/locale"

/**
 * A FIOK MENUJE (P5, 257:21; mobilon a fulsor, 257:219), egy helyen.
 *
 * A keret sorrendje: Profil, Rendeléseim, Címek, Számlázási adatok,
 * Hűségpontok, Beállítások. Itt CSAK a mar letezo oldal kap pontot: egy
 * menupont, ami nem letezo lapra visz, rosszabb a hianyzonal. A Hűségpontok
 * moge nincs adat, ezert kimarad (docs/P5-LEFT-OUT.md).
 */
export type FiokPont = {
  /** Az asztali menu felirata (szotar-kulcs, a lap nyelven). */
  cimke: Key
  /** A mobil ful felirata; a keret rovidit (257:225: "Számlázás"). */
  mobilCimke: Key
  href: string
  testId: string
  /** A fej leirasa a cim alatt, ha a keret ad ilyet (249:215). */
  leiras?: Key
}

export const FIOK_PONTOK: readonly FiokPont[] = [
  {
    cimke: "account.menu.profile",
    mobilCimke: "account.menu.profile",
    href: "/account/profile",
    testId: "profile-link",
  },
  {
    cimke: "account.menu.orders",
    mobilCimke: "account.menu.orders",
    href: "/account/orders",
    testId: "orders-link",
    // A mobil keret mondata (249:215). Az asztali (249:20) szallitasi
    // csoportokat es elo allatos atvetelt igerne, ami a P4 hattere.
    leiras: "account.menu.ordersDescription",
  },
  {
    cimke: "account.menu.addresses",
    mobilCimke: "account.menu.addresses",
    href: "/account/addresses",
    testId: "addresses-link",
  },
  {
    cimke: "account.menu.billing",
    mobilCimke: "account.menu.billingShort",
    href: "/account/billing",
    testId: "billing-link",
  },
  {
    cimke: "account.menu.settings",
    mobilCimke: "account.menu.settings",
    href: "/account/settings",
    testId: "settings-link",
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
  t: Translate = translator(DEFAULT_LOCALE),
): string | undefined {
  const aktiv = aktivPont(utvonal, countryCode)
  const kulcs = FIOK_PONTOK.find((p) => p.href === aktiv)?.leiras
  return kulcs ? t(kulcs) : undefined
}

export function fiokCim(
  utvonal: string,
  countryCode: string,
  t: Translate = translator(DEFAULT_LOCALE),
): string {
  const aktiv = aktivPont(utvonal, countryCode)
  const pont = FIOK_PONTOK.find((p) => p.href === aktiv)
  return t(pont?.cimke ?? "account.menu.overview")
}

/**
 * A RENDELES RESZLETEI SAJAT KERETBEN ALLNAK (249:96): menu es kozos fej
 * nelkul, a lap sajat fejevel ("RENDELÉSEM", a rendelesszam).
 */
export function reszletekUtvonal(
  utvonal: string,
  countryCode: string,
): boolean {
  const helyi = utvonal.replace(new RegExp(`^/${countryCode}(?=/|$)`), "")
  return helyi.startsWith("/account/orders/details/")
}
