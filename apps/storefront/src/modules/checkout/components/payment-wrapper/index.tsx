"use client"

import { loadStripe } from "@stripe/stripe-js"
import React from "react"
import StripeWrapper, { StripeHalasztott } from "./stripe-wrapper"
import { stripeEgyseg } from "@lib/util/stripe-egyseg"
import { HttpTypes } from "@medusajs/types"
import { isStripeLike } from "@lib/constants"
import { STRIPE_PUBLIKUS_KULCS } from "@lib/util/stripe-kulcs"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  /** Vegyes kosár, és a háttér kínálja a Stripe-ot: halasztott kártyamező. */
  vegyesStripe?: boolean
  children: React.ReactNode
}

const stripeKey = STRIPE_PUBLIKUS_KULCS || undefined

const medusaAccountId = process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID
const stripePromise = stripeKey
  ? loadStripe(
      stripeKey,
      medusaAccountId ? { stripeAccount: medusaAccountId } : undefined,
    )
  : null

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({
  cart,
  vegyesStripe,
  children,
}) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending",
  )

  if (
    isStripeLike(paymentSession?.provider_id) &&
    paymentSession &&
    stripePromise
  ) {
    return (
      <StripeWrapper
        paymentSession={paymentSession}
        stripeKey={stripeKey}
        stripePromise={stripePromise}
      >
        {children}
      </StripeWrapper>
    )
  }

  /*
    VEGYES KOSÁR: HALASZTOTT KÁRTYAMEZŐ (Balázs 2026-10-01, 1-es út). A vevő
    a leadásig egy kosarat lát; a kosár bontása és a két
    rendelés közös PaymentIntentje csak a leadáskor készül (`stripe-start`),
    és a kártya azon erősítődik meg. A mező ezért intent nélkül áll, az
    intenttel egyező beállítással: a kosár összege, csak kártya, kézi levonás.
  */
  if (vegyesStripe && stripePromise) {
    return (
      <StripeHalasztott
        osszeg={stripeEgyseg(Number(cart.total ?? 0), cart.currency_code)}
        penznem={cart.currency_code}
        stripePromise={stripePromise}
      >
        {children}
      </StripeHalasztott>
    )
  }

  return <div>{children}</div>
}

export default PaymentWrapper
