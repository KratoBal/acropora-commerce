import { retrieveCartShippingClass } from "@lib/data/cart"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { HttpTypes } from "@medusajs/types"
import { splitNoticeProps } from "@modules/cart/components/pickup-notice/pickup-notice"
import SplitNotice from "@modules/cart/components/pickup-notice/split-notice"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"

/**
 * A PÉNZTÁR OLDALSÁVJA: a tételek, a kedvezménykód, az összegek, és UTÁNUK a
 * két rendelés tájékoztatója (acrobot 40169, a kosár sorrendje: előbb a vevő
 * a saját tételét látja, aztán a magyarázatot). A sáv eddig a bal oszlop
 * tetején állt; a szövege, a feltétele és a fizetési módhoz kötött mondata
 * változatlan.
 */
type SzallitasiOsztaly = Parameters<typeof splitNoticeProps>[1]

/** A kirajzolás: a szállítási osztályt a hívó adja (az oldal a háttértől kéri, a próba fix adatot ad). */
export function CheckoutSummaryView({
  cart,
  countryCode,
  szallitasiOsztaly,
  savMutat = true,
}: {
  cart: HttpTypes.StoreCart
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
  szallitasiOsztaly: SzallitasiOsztaly
  /** A két rendelés sávja az oldalsávban; az ellenőrzés lépésben a megrendelés gomb fölött áll, ott nem ismétlődik. */
  savMutat?: boolean
}) {
  const t = translator(localeOf(countryCode))

  return (
    <div className="flex flex-col gap-y-6 small:sticky small:top-4 small:self-start">
      <div
        className="flex flex-col gap-y-4 border border-acr-line bg-acr-white p-[22px]"
        data-testid="checkout-summary"
      >
        <h2 className="font-kiemelt text-[28px] font-normal leading-[34px] tracking-[-0.01em] text-acr-ink">
          {t("checkoutPage.summaryHeading")}
        </h2>
        <ItemsPreviewTemplate cart={cart} />
        <DiscountCode cart={cart} />
        <CartTotals totals={cart} />
      </div>
      {savMutat ? (
        <SplitNotice
          {...splitNoticeProps(
            cart.items ?? [],
            szallitasiOsztaly,
            cart.payment_collection?.payment_sessions?.find(
              (session) => session.status === "pending",
            )?.provider_id,
          )}
          countryCode={countryCode}
        />
      ) : null}
    </div>
  )
}

export default async function CheckoutSummary({
  cart,
  countryCode,
  savMutat = true,
}: {
  cart: HttpTypes.StoreCart
  countryCode: string
  savMutat?: boolean
}) {
  // P4-2: a két rendelés sávja a leadásnál is látszik (Balázs, 2026-09-29).
  const szallitasiOsztaly = await retrieveCartShippingClass()
  return (
    <CheckoutSummaryView
      cart={cart}
      countryCode={countryCode}
      szallitasiOsztaly={szallitasiOsztaly}
      savMutat={savMutat}
    />
  )
}
