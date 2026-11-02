import type { Locale } from "@lib/i18n/locale"

/**
 * A PÉNZTÁR CÍMEINEK MEGJELENÍTÉSE. Csak a kiírás: az űrlap mezőinek nevei és a
 * beküldés (`setAddresses`) nem függ ettől.
 */

/** Magyarul előbb a vezetéknév ("Vevő Minta"), angolul az utónév ("Minta Vevő"). */
export function teljesNev(
  utonev: string | null | undefined,
  vezeteknev: string | null | undefined,
  locale: Locale,
): string {
  const reszek = locale === "hu" ? [vezeteknev, utonev] : [utonev, vezeteknev]
  return reszek
    .map((r) => (r ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

/** "1111 Budapest": irányítószám és város szóközzel, vessző nélkül. */
export function varosSor(
  iranyitoszam: string | null | undefined,
  varos: string | null | undefined,
): string {
  return [iranyitoszam, varos]
    .map((r) => (r ?? "").trim())
    .filter(Boolean)
    .join(" ")
}

/**
 * Az ország neve az oldal nyelvén ("Magyarország" / "Hungary"), a böngésző és a
 * Node saját országnév-adatából, nem a régió rekordjából (az egy nyelvű). Ha a
 * kód ismeretlen, a nagybetűs kód marad: a hiány látszik, nem üres.
 */
export function orszagNev(
  kod: string | null | undefined,
  locale: Locale,
): string {
  const tiszta = (kod ?? "").trim().toUpperCase()
  if (!tiszta) return ""
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(tiszta) ?? tiszta
    )
  } catch {
    return tiszta
  }
}
