"use client"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useParams } from "next/navigation"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

/**
 * AZ ÖSSZEGZÉS A KOSÁR JOBB OLDALÁN. A sorok számolása a közös `CartTotals`-é
 * volt (a pénztár összegzése is azt használja, az külön kör); a kosár a saját,
 * szótáras és világos kirajzolását adja, UGYANAZOKKAL a `data-testid` és
 * `data-value` jelölőkkel, hogy a mérések és a végpont-tesztek ne változzanak.
 */
const Summary = ({ cart }: SummaryProps) => {
  const { countryCode } = useParams() as { countryCode: string }
  const t = translator(localeOf(countryCode))
  const step = getCheckoutStep(cart)

  const currency_code = cart.currency_code
  const itemGross = (cart.item_subtotal ?? 0) + (cart.item_tax_total ?? 0)
  const shippingGross =
    (cart.shipping_subtotal ?? 0) + (cart.shipping_tax_total ?? 0)
  // a kosár végpontja hozza, a típus nem nevezi meg (a közös `CartTotals` is így olvasta)
  const discount =
    (cart as { discount_subtotal?: number | null }).discount_subtotal ?? 0
  const penz = (amount: number) => convertToLocale({ amount, currency_code })

  return (
    <div className="flex flex-col gap-y-4 border border-acr-line bg-acr-white p-[22px]">
      <h2 className="text-[28px] font-light leading-[34px] tracking-[-0.5px] text-acr-ink">
        {t("cartPage.summaryHeading")}
      </h2>
      <DiscountCode cart={cart} />
      <div className="flex flex-col gap-y-2 border-t border-acr-line pt-4 text-[14px] leading-[22px] text-acr-slate">
        <div className="flex items-center justify-between">
          <span>{t("cartPage.subtotal")}</span>
          <span data-testid="cart-subtotal" data-value={itemGross}>
            {penz(itemGross)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("cartPage.shipping")}</span>
          <span data-testid="cart-shipping" data-value={shippingGross}>
            {penz(shippingGross)}
          </span>
        </div>
        {!!discount && (
          <div className="flex items-center justify-between">
            <span>{t("cartPage.discount")}</span>
            <span
              className="text-acr-ocean"
              data-testid="cart-discount"
              data-value={discount}
            >
              - {penz(discount)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>{t("cartPage.vat")}</span>
          <span data-testid="cart-taxes" data-value={cart.tax_total || 0}>
            {penz(cart.tax_total ?? 0)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-acr-line pt-4 text-acr-ink">
        <span className="text-[16px] font-medium leading-[26px]">
          {t("cartPage.payable")}
        </span>
        <span
          className="text-[24px] leading-[30px]"
          data-testid="cart-total"
          data-value={cart.total || 0}
        >
          {penz(cart.total ?? 0)}
        </span>
      </div>
      <LocalizedClientLink
        href={"/checkout?step=" + step}
        className="flex h-[48px] w-full items-center justify-center bg-acr-navy text-[14px] font-medium text-acr-white"
        data-testid="checkout-button"
      >
        {t("cartPage.toCheckout")}
      </LocalizedClientLink>
    </div>
  )
}

export default Summary
