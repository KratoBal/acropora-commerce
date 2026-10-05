"use client"

import { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { HttpTypes } from "@medusajs/types"
import {
  type StripeVilag,
  stripeElementsBeallitas,
  stripeVilagDokumentumbol,
} from "@lib/util/stripe-megjelenes"
import { createContext, useEffect, useState } from "react"

type StripeWrapperProps = {
  paymentSession: HttpTypes.StorePaymentSession
  stripeKey?: string
  stripePromise: Promise<Stripe | null> | null
  children: React.ReactNode
}

export const StripeContext = createContext(false)

/**
 * A penztar vilaga (Commerce vagy Reef) a lapbol olvasva, a megjelenes utan:
 * a szerveren nincs dokumentum, ott Commerce. A Stripe a megjelenest kesobb
 * is atveszi (`elements.update`).
 */
const useStripeVilag = (): StripeVilag => {
  const [vilag, setVilag] = useState<StripeVilag>("commerce")
  useEffect(() => setVilag(stripeVilagDokumentumbol(document)), [])
  return vilag
}

const StripeWrapper: React.FC<StripeWrapperProps> = ({
  paymentSession,
  stripeKey,
  stripePromise,
  children,
}) => {
  const vilag = useStripeVilag()
  const options: StripeElementsOptions = {
    clientSecret: paymentSession!.data?.client_secret as string | undefined,
    ...stripeElementsBeallitas(vilag),
  }

  if (!stripeKey) {
    throw new Error(
      "Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable.",
    )
  }

  if (!stripePromise) {
    throw new Error(
      "Stripe promise is missing. Make sure you have provided a valid Stripe key.",
    )
  }

  if (!paymentSession?.data?.client_secret) {
    throw new Error(
      "Stripe client secret is missing. Cannot initialize Stripe.",
    )
  }

  return (
    <StripeContext.Provider value={true}>
      <Elements options={options} stripe={stripePromise}>
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}

export default StripeWrapper

/**
 * A HALASZTOTT KÁRTYAMEZŐ: Elements PaymentIntent nélkül (a `@stripe/stripe-js`
 * 8.11 `StripeElementsOptionsMode` alakja). Az intent a leadáskor készül
 * (`stripe-start`), ugyanerre az összegre, csak kártyára, kézi levonással;
 * a megerősítés a `clientSecret`-tel megy (`StripeKozosGomb`).
 */
export const StripeHalasztott: React.FC<{
  osszeg: number
  penznem: string
  stripePromise: Promise<Stripe | null>
  children: React.ReactNode
}> = ({ osszeg, penznem, stripePromise, children }) => {
  const vilag = useStripeVilag()
  return (
    <StripeContext.Provider value={true}>
      <Elements
        stripe={stripePromise}
        options={{
          mode: "payment",
          amount: osszeg,
          currency: penznem.toLowerCase(),
          captureMethod: "manual",
          // a kartya: az Apple Pay es a Google Pay is ezen a tipuson fut
          paymentMethodTypes: ["card"],
          ...stripeElementsBeallitas(vilag),
        }}
      >
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}
