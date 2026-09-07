import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount: number
  currency_code: string
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

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
  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits,
        maximumFractionDigits,
      }).format(amount)
    : amount.toString()
}
