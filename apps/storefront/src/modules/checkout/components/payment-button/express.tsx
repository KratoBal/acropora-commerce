"use client"

import { placeOrder } from "@lib/data/cart"
import {
  inditsStripeKozosFizetest,
  stripeVisszarendezes,
} from "@lib/data/stripe"
import { RENDELES_MOST_NEM_SIKERULT } from "@lib/util/penztar-uzenet"
import { type StripeAllapot, stripeHibaFajta } from "@lib/util/stripe-allapot"
import { HttpTypes } from "@medusajs/types"
import {
  ExpressCheckoutElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import type {
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementOptions,
  StripeExpressCheckoutElementReadyEvent,
} from "@stripe/stripe-js"
import { unstable_rethrow, useParams } from "next/navigation"
import { useRef, useState } from "react"

import { visszateresiCim } from "./index"

/**
 * CSAK APPLE PAY ES GOOGLE PAY (Balazs, 2026-10-05 09:33 UTC: kartya, Apple
 * Pay, Google Pay; Link nem). A tobbi tarca kifejezetten ki van zarva.
 */
export const EXPRESS_BEALLITAS: StripeExpressCheckoutElementOptions = {
  buttonType: { applePay: "buy", googlePay: "buy" },
  buttonHeight: 48,
  paymentMethods: {
    applePay: "auto",
    googlePay: "auto",
    link: "never",
    amazonPay: "never",
    paypal: "never",
    klarna: "never",
  },
}

/** Mutat-e a Stripe legalabb egy tarcat ezen az eszkozon (a `ready` esemeny szerint). */
export const vanTarca = (esemeny: StripeExpressCheckoutElementReadyEvent) =>
  !!esemeny.availablePaymentMethods &&
  Object.values(esemeny.availablePaymentMethods).some(Boolean)

/**
 * A NAGY APPLE PAY / GOOGLE PAY GOMBOK A KARTYAMEZO FOLOTT (Figma 209:3
 * "Gyors fizetés", Balazs 2026-10-05 12:54 UTC). A Stripe Express Checkout
 * Elementje; ugyanabban az Elements-ben el, mint a kartyamezo, tehat ugyanazt
 * a fizetest erositi meg.
 *
 * CSAK AKKOR LATSZIK, HA VAN MIT MUTATNI: a Stripe dont arrol, melyik tarca
 * jelenhet meg (eszkoz, bongeszo, regisztralt domain, fiok). Tarca nelkul a
 * "Gyors fizetés" es a "vagy bankkártya" sor sem jelenik meg.
 *
 * AZ UT UGYANAZ, MINT A GOMBOKE: nem bontott kosarnal a meglevo munkamenet
 * megerositese; vegyes kosarnal `elements.submit()`, a kozos fizetes
 * inditasa (`stripe-start`), megerosites a titokkal, hiba eseten
 * visszarendezes. Siker utan a leadas (`placeOrder` atiranyit).
 *
 * AZ ASZF PIPA NELKUL TILTVA: a gombok folott egy reteg all, ami a kattintast
 * elnyeli, es kimondja, mi hianyzik.
 */
export default function ExpressFizetes({
  cart,
  vegyes,
  tiltva,
  onAllapot,
  onHiba,
}: {
  cart: HttpTypes.StoreCart
  vegyes: boolean
  tiltva: boolean
  onAllapot: (allapot: StripeAllapot) => void
  onHiba: (uzenet: string | null) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams()
  const [lathato, setLathato] = useState(false)
  const fut = useRef(false)

  const lead = async () => {
    try {
      const eredmeny = await placeOrder()
      if (!eredmeny.ok) {
        onHiba(eredmeny.uzenet)
        onAllapot("alap")
      }
    } catch (hiba) {
      unstable_rethrow(hiba)
      onHiba(RENDELES_MOST_NEM_SIKERULT)
      onAllapot("alap")
    }
  }

  const megerosit = async (
    esemeny: StripeExpressCheckoutElementConfirmEvent,
  ) => {
    if (!stripe || !elements || fut.current) return
    fut.current = true
    onHiba(null)
    onAllapot("feldolgozas")
    try {
      let titok: string | undefined
      if (vegyes) {
        const ellenorzes = await elements.submit()
        if (ellenorzes.error) {
          esemeny.paymentFailed({ reason: "fail" })
          onAllapot("alap")
          return
        }
        const inditas = await inditsStripeKozosFizetest(cart.id)
        if (!inditas.ok) {
          esemeny.paymentFailed({ reason: "fail" })
          onHiba(inditas.uzenet)
          onAllapot("alap")
          return
        }
        titok = inditas.titok
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        ...(titok ? { clientSecret: titok } : {}),
        confirmParams: { return_url: visszateresiCim(cart.id, countryCode) },
        redirect: "if_required",
      })
      const zarolva = (allapot?: string) =>
        allapot === "requires_capture" || allapot === "succeeded"

      if (
        zarolva(error ? error.payment_intent?.status : paymentIntent?.status)
      ) {
        await lead()
        return
      }
      if (vegyes) await stripeVisszarendezes(cart.id)
      onAllapot(
        error && stripeHibaFajta(error) !== "elutasitas"
          ? "alap"
          : "elutasitva",
      )
      if (error && stripeHibaFajta(error) === "egyeb")
        onHiba(error.message ?? null)
    } finally {
      fut.current = false
    }
  }

  return (
    <div
      className={lathato ? "mb-4" : "invisible h-0 overflow-hidden"}
      data-testid="express-fizetes"
      data-lathato={lathato}
    >
      <p className="mb-2 text-[11px] text-acr-slate">Gyors fizetés</p>
      <div className="relative">
        <ExpressCheckoutElement
          options={EXPRESS_BEALLITAS}
          onReady={(esemeny) => setLathato(vanTarca(esemeny))}
          onConfirm={megerosit}
        />
        {tiltva ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--acr-color-white)_85%,transparent)] px-3 text-center text-[12px] text-acr-ink"
            data-testid="express-tiltva"
          >
            A gyors fizetéshez előbb fogadd el az ÁSZF-et (lent).
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-center text-[11px] text-acr-slate">
        vagy bankkártya
      </p>
    </div>
  )
}
