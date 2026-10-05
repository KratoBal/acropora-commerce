import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

/**
 * A FORINT EGESZBEN JELENIK MEG, ES EZT A HIVAS MONDJA KI, NEM A KORNYEZET.
 *
 * Mérve 2026-10-05: ugyanaz a `new Intl.NumberFormat("hu-HU", { style:
 * "currency", currency: "HUF" })` a Node 22-ben (ICU 78) `45 190 Ft`-ot ad
 * (0 tizedes), a Chromium 130-ban `45 190,00 Ft`-ot (2 tizedes). A tizedesek
 * szamat tehat a futtato ICU-adata donti el, ha a hivas nem nevezi meg.
 * Balazs kepe (12:48 UTC, a teszt kirakat "Egy fizetés" sora) a bongeszoet
 * mutatta; a Node alatt futo teszt kozben zold volt.
 */
const EGESZ_DEVIZAK = new Set(["huf"])

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  /**
   * EGY NYELV, EGY DEVIZA: a bolt magyar, tehat a szam- es penznem-alak is az.
   *
   * A starter alapertelmezese `en-US` volt, es EGYETLEN hivo sem ad at mast --
   * merve 2026-09-07 a futo kirakaton: a termeklap `HUF 1,200` alakot irt ki
   * `1200 Ft` helyett. Nem hibazott semmi: az `Intl` pontosan azt csinalta,
   * amit kertunk tole.
   *
   * A parameter MEGMARAD: ha egyszer tobb nyelv lesz, itt kell atadni, es nem
   * kell megkeresni a hivokat.
   */
  locale = "hu-HU",
}: ConvertToLocaleParams) => {
  const egesz = EGESZ_DEVIZAK.has(currency_code?.toLowerCase())
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits: minimumFractionDigits ?? (egesz ? 0 : undefined),
        maximumFractionDigits: maximumFractionDigits ?? (egesz ? 0 : undefined),
      }).format(amount)
    : amount.toString()
}
