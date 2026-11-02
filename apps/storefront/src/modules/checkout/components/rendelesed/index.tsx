import { HttpTypes } from "@medusajs/types"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { tetelSor } from "@lib/util/fizetesi-oldal"
import { arSzoveg } from "@lib/util/ar-szoveg"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** A cselekvo gomb helye az osszesitoben: a fizetesi resz ide rajzolja (portal). */
export const PENZTAR_CTA_HELY = "penztar-cta-hely"

/**
 * "Rendelésed" (Figma 209:3 jobb oszlop, mobilon "Összesítés"): a tetelek, a
 * termekek es a szallitas brutto osszege, a fizetendo, es a CTA helye. Az
 * osszegek ugyanabbol a mezokbol jonnek, mint a kosar-osszegzoben (brutto:
 * reszosszeg + ado), a szam itt sem talalgatas.
 */
export default function Rendelesed({
  cart,
  countryCode,
  ertesites,
}: {
  cart: HttpTypes.StoreCart
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
  /**
   * A TÁJÉKOZTATÓ A MEGRENDELÉS GOMB KÖZVETLEN FÖLÖTT (acrobot 40220, P4-2: „a
   * leadásnál is jól láthatóan”): a gomb helye (`PENZTAR_CTA_HELY`) közvetlenül
   * utána áll, asztalin és telefonon is. Ha nincs mit mondani, nincs sáv.
   */
  ertesites?: React.ReactNode
}) {
  const t = translator(localeOf(countryCode))
  const penz = (amount: number) =>
    convertToLocale({ amount, currency_code: cart.currency_code })
  const termekek = (cart.item_subtotal ?? 0) + (cart.item_tax_total ?? 0)
  const szallitas =
    (cart.shipping_subtotal ?? 0) + (cart.shipping_tax_total ?? 0)
  // ugyanaz a mezo, amit a kosar-osszegzo olvas (a Store tipus nem nevezi meg)
  const kedvezmeny =
    (cart as { discount_subtotal?: number | null }).discount_subtotal ?? 0

  return (
    <section
      className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6"
      data-testid="rendelesed"
    >
      <h2 className="mb-4 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]">
        <span className="small:hidden">
          {t("checkoutPayment.summaryShort")}
        </span>
        <span className="hidden small:inline">
          {t("checkoutPayment.yourOrder")}
        </span>
      </h2>
      <ul className="flex flex-col gap-3 text-[13px] text-acr-slate">
        {(cart.items ?? []).map((tetel) => (
          <li
            key={tetel.id}
            className="flex justify-between gap-4"
            data-testid="rendelesed-tetel"
          >
            <span className="min-w-0">{tetelSor(tetel)}</span>
            <span className="shrink-0 text-acr-ink">
              {penz(Number(tetel.total ?? 0))}
            </span>
          </li>
        ))}
      </ul>
      <div className="my-4 h-px bg-acr-line" />
      <dl className="flex flex-col gap-3 text-[13px] text-acr-slate">
        <div className="flex justify-between">
          <dt>{t("checkoutPayment.products")}</dt>
          <dd className="text-acr-ink">{penz(termekek)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("checkoutPayment.shipping")}</dt>
          <dd className="text-acr-ink">
            {arSzoveg(szallitas, cart.currency_code, t)}
          </dd>
        </div>
        {kedvezmeny > 0 ? (
          <div className="flex justify-between">
            <dt>{t("checkoutPayment.discount")}</dt>
            <dd className="text-acr-ink">- {penz(kedvezmeny)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="my-4 h-px bg-acr-line" />
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium text-acr-ink">
          {t("checkoutPayment.payable")}
        </span>
        <span
          className="text-[26px] font-semibold text-acr-ink"
          data-testid="rendelesed-fizetendo"
        >
          {penz(cart.total ?? 0)}
        </span>
      </div>
      {ertesites ? <div className="mt-4">{ertesites}</div> : null}
      <div id={PENZTAR_CTA_HELY} className="mt-4 flex flex-col gap-3" />
      <LocalizedClientLink
        href="/checkout?step=delivery"
        className="mt-3 flex h-11 items-center justify-center border border-acr-line text-[14px] font-medium text-acr-ink hover:border-acr-slate"
        data-testid="vissza-az-adatokhoz"
      >
        {t("checkoutPayment.backToDetails")}
      </LocalizedClientLink>
      <p className="mt-3 text-[12px] leading-[17px] text-acr-slate">
        {t("checkoutPayment.totalFixed")}
      </p>
    </section>
  )
}
