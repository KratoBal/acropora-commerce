"use client"

import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

import { useKosarAllapot } from "."

/**
 * A kosarhoz kotott ket elem, ami eddig a `(main)/layout`-ban szerveroldalon
 * renderelt (FE-7): a kosar-elteres jelzese es az ingyenes szallitas ajanloja.
 * Ugyanazok a komponensek, ugyanazzal a feltetellel, csak a kliens allapotabol.
 */
export default function KosarSziget() {
  const { customer, cart, shippingOptions } = useKosarAllapot()
  return (
    <>
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}
      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
    </>
  )
}
