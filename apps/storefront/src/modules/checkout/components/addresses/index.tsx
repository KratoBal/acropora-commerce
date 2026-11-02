"use client"
import { setAddresses } from "@lib/data/cart"
import useToggleState from "@lib/hooks/use-toggle-state"
import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import compareAddresses from "@lib/util/compare-addresses"
import { orszagNev, teljesNev, varosSor } from "@lib/util/penztar-cim"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import { PenztarGomb } from "../penztar-mezo"
import ShippingAddress from "../shipping-address"

const CIM_CIM =
  "flex flex-row items-center gap-x-2 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]"
const KICSI_CIM =
  "mb-1 text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate"
const SOR = "text-[14px] leading-[22px] text-acr-ink"

/** A cím lépés: nyitva az űrlap (`?step=address`), zárva az összefoglaló. A beküldés és a mezők nevei változatlanok. */
const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const t = useTranslate()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true,
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <section className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6">
      <div className="mb-4 flex flex-row items-center justify-between">
        <h2 className={CIM_CIM}>
          {t("checkoutPage.shippingAddress")}
          {!isOpen && <CheckCircleSolid />}
        </h2>
        {!isOpen && cart?.shipping_address && (
          <button
            onClick={handleEdit}
            className="text-[14px] font-medium leading-[22px] text-acr-ocean underline"
            data-testid="edit-address-button"
          >
            {t("checkoutPage.edit")}
          </button>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <ShippingAddress
            customer={customer}
            checked={sameAsBilling}
            onChange={toggleSameAsBilling}
            cart={cart}
          />

          {!sameAsBilling && (
            <div>
              <h2 className={CIM_CIM + " pb-4 pt-6"}>
                {t("checkoutPage.billingAddress")}
              </h2>

              <BillingAddress cart={cart} />
            </div>
          )}
          <PenztarGomb className="mt-6" data-testid="submit-address-button">
            {t("checkoutPage.toShipping")}
          </PenztarGomb>
          <ErrorMessage error={message} data-testid="address-error-message" />
        </form>
      ) : cart && cart.shipping_address ? (
        <div className="grid grid-cols-1 gap-6 small:grid-cols-3">
          <div data-testid="shipping-address-summary">
            <p className={KICSI_CIM}>{t("checkoutPage.shippingAddress")}</p>
            <p className={SOR}>
              {teljesNev(
                cart.shipping_address.first_name,
                cart.shipping_address.last_name,
                locale,
              )}
            </p>
            <p className={SOR}>
              {cart.shipping_address.address_1}{" "}
              {cart.shipping_address.address_2}
            </p>
            <p className={SOR}>
              {varosSor(
                cart.shipping_address.postal_code,
                cart.shipping_address.city,
              )}
            </p>
            <p className={SOR}>
              {orszagNev(cart.shipping_address.country_code, locale)}
            </p>
          </div>

          <div data-testid="shipping-contact-summary">
            <p className={KICSI_CIM}>{t("checkoutPage.contact")}</p>
            <p className={SOR}>{cart.shipping_address.phone}</p>
            <p className={SOR}>{cart.email}</p>
          </div>

          <div data-testid="billing-address-summary">
            <p className={KICSI_CIM}>{t("checkoutPage.billingAddress")}</p>
            {sameAsBilling ? (
              <p className={SOR}>{t("checkoutPage.sameAddress")}</p>
            ) : (
              <>
                <p className={SOR}>
                  {teljesNev(
                    cart.billing_address?.first_name,
                    cart.billing_address?.last_name,
                    locale,
                  )}
                </p>
                <p className={SOR}>
                  {cart.billing_address?.address_1}{" "}
                  {cart.billing_address?.address_2}
                </p>
                <p className={SOR}>
                  {varosSor(
                    cart.billing_address?.postal_code,
                    cart.billing_address?.city,
                  )}
                </p>
                <p className={SOR}>
                  {orszagNev(cart.billing_address?.country_code, locale)}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Spinner />
        </div>
      )}
    </section>
  )
}

export default Addresses
