"use client"

import { isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import {
  inditsStripeKozosFizetest,
  stripeVisszarendezes,
} from "@lib/data/stripe"
import {
  FIZETES_MOST_NEM_SIKERULT,
  RENDELES_MOST_NEM_SIKERULT,
} from "@lib/util/penztar-uzenet"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { unstable_rethrow, useParams } from "next/navigation"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  /**
   * AMIVEL A KOSAR FIZET, A HATTER SZAVAVAL.
   *
   * Azert kell, mert a szolgaltato AZONOSITOJA nem mondja meg: a sajat
   * utanvet-szolgaltatonk azonositoja kornyezeti beallitas a hatteren
   * (`ACROPORA_PP_COD`), es egy ide irt masolat ugyanannak a dontesnek a
   * masodik forrasa lenne. E nelkul a gomb a `default:` agra esne, es a vevo
   * egy letiltott gombot latna egy ervenyes fizetesi mod mellett.
   */
  fizetesiSzerep?: "ONLINE_CARD" | "COD" | "PAY_AT_STORE" | null
  /** Vegyes kosar, Stripe: a kozos fizetes a leadaskor keszul. */
  stripeKozos?: boolean
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  fizetesiSzerep,
  stripeKozos,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case !!stripeKozos:
      return (
        <StripeKozosGomb
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <KozvetlenRendelesGomb notReady={notReady} data-testid={dataTestId} />
      )
    /*
      UTANVET: ugyanaz a gomb, mint a bolti fizetesnel -- nincs mit beszedni a
      penztarban, a rendeles egyszeruen leadodik. A dij ekkorra MAR a kosaron
      van (a fizetesi lepes tette fel az egyeztetessel), tehat itt nincs mit
      szamolni, es nem is szabad: a rendeles lezarasa a hatteren ellenorzi, hogy
      a dij es a valasztott mod osszeillik-e.
    */
    case fizetesiSzerep === "COD" && !!paymentSession:
      return (
        <KozvetlenRendelesGomb notReady={notReady} data-testid={dataTestId} />
      )
    default:
      return <Button disabled>Válassz fizetési módot</Button>
  }
}

/** A Stripe visszatérési címe (3-D Secure és átirányításos módok után). */
const visszateresiCim = (cartId: string, countryCode: unknown) =>
  `${window.location.origin}/api/payment-return?cart_id=${cartId}&country_code=${countryCode}`

/** A vevő számlázási adatai a kártya megerősítéséhez, a kosárból. */
const szamlazasiAdatok = (cart: HttpTypes.StoreCart) => ({
  name:
    cart.billing_address?.first_name + " " + cart.billing_address?.last_name,
  address: {
    city: cart.billing_address?.city ?? undefined,
    country: cart.billing_address?.country_code ?? undefined,
    line1: cart.billing_address?.address_1 ?? undefined,
    line2: cart.billing_address?.address_2 ?? undefined,
    postal_code: cart.billing_address?.postal_code ?? undefined,
    state: cart.billing_address?.province ?? undefined,
  },
  email: cart.email,
  phone: cart.billing_address?.phone ?? undefined,
})

/**
 * VEGYES KOSÁR, STRIPE (Balázs 2026-10-01, 1-es út): a két rendelés EGY
 * Stripe-fizetése a leadáskor készül.
 *
 * A sorrend kötött:
 * 1. `elements.submit()`: a halasztott kártyamező ellenőrzése, mielőtt bármi
 *    változna a háttérben;
 * 2. `stripe-start`: a háttér most bontja a kosarat, és most készíti a közös
 *    PaymentIntentet (a két kosár együttes összegére, csak kártyára);
 * 3. `confirmPayment` ezzel a titokkal: a zárolás a kártyán;
 * 4. a leadás (`complete-split`, a „közösen fizetett” ágon mindkét rendelés).
 *
 * Ha a kártya nem ment át, a háttér visszarendezi a kosarat, és a zárolást
 * elengedi (`stripe-rejoin`), hogy a vevő újra próbálhasson vagy mást
 * választhasson. A 3-D Secure átirányítás után a `payment-return` útvonal
 * fejezi be ugyanígy.
 */
const StripeKozosGomb = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams()

  const lead = async () => {
    try {
      const eredmeny = await placeOrder()
      if (!eredmeny.ok) {
        setErrorMessage(eredmeny.uzenet)
      }
    } catch (hiba) {
      // a sikeres leadas `redirect`-tel zarul (lasd fent): azt atengedjuk
      unstable_rethrow(hiba)
      setErrorMessage(RENDELES_MOST_NEM_SIKERULT)
    }
  }

  const handlePayment = async () => {
    if (!stripe || !elements) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const ellenorzes = await elements.submit()
      if (ellenorzes.error) {
        setErrorMessage(ellenorzes.error.message ?? FIZETES_MOST_NEM_SIKERULT)
        return
      }

      const inditas = await inditsStripeKozosFizetest(cart.id)
      if (!inditas.ok) {
        setErrorMessage(inditas.uzenet)
        return
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: inditas.titok,
        confirmParams: {
          return_url: visszateresiCim(cart.id, countryCode),
          payment_method_data: { billing_details: szamlazasiAdatok(cart) },
        },
        redirect: "if_required",
      })

      const zarolva = (allapot?: string) =>
        allapot === "requires_capture" || allapot === "succeeded"

      if (error) {
        if (zarolva(error.payment_intent?.status)) {
          await lead()
          return
        }
        await stripeVisszarendezes(cart.id)
        setErrorMessage(error.message ?? FIZETES_MOST_NEM_SIKERULT)
        return
      }

      if (zarolva(paymentIntent?.status)) {
        await lead()
        return
      }

      await stripeVisszarendezes(cart.id)
      setErrorMessage(FIZETES_MOST_NEM_SIKERULT)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={!stripe || !elements || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Rendelés leadása
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /*
    A HIBA A MUVELET VALASZABOL JON, NEM A KIVETELBOL.

    Itt korabban `.catch((err) => setErrorMessage(err.message))` allt.
    Produkcioban a Next a szerver-muveletbol DOBOTT hiba uzenetet lecsereli
    egy altalanos angol mondatra (#371); egy VISSZAADOTT ertek atmegy.

    A SIKER NEM IDE TER VISSZA: a `placeOrder` atiranyit a visszaigazolo
    lapra. Ha ez a fuggveny egyaltalan visszater, az kudarc.
  */
  const onPaymentCompleted = async () => {
    try {
      const eredmeny = await placeOrder()

      if (!eredmeny.ok) {
        setErrorMessage(eredmeny.uzenet)
      }
    } catch (hiba) {
      /*
        A VEZERLO-DOBAST ATENGEDJUK. A sikeres rendeles `redirect`-tel zarul,
        es a Next azt kivetelkent valositja meg. A szerver-muvelet valaszat a
        keret dolgozza fel, tehat ez a dobas VALOSZINULEG el sem jut idaig --
        de VALODI RENDELES NELKUL ezt nem tudom lemerni, es a regi
        `.catch(...)` alak ugyanezt a kockazatot vitte, csak orzo nelkul.
        Nem-Next hibara ez a hivas nem csinal semmit.
      */
      unstable_rethrow(hiba)
      setErrorMessage(RENDELES_MOST_NEM_SIKERULT)
    } finally {
      setSubmitting(false)
    }
  }

  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams()

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    if (!stripe || !elements || !cart) {
      return
    }

    setSubmitting(true)

    await stripe
      .confirmPayment({
        elements,
        confirmParams: {
          return_url: visszateresiCim(cart.id, countryCode),
          payment_method_data: { billing_details: szamlazasiAdatok(cart) },
        },
        // Only leave the site when the selected method actually requires it, so
        // card payments still complete inline.
        redirect: "if_required",
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
            return
          }

          setErrorMessage(error.message || null)
          setSubmitting(false)
          return
        }

        if (
          paymentIntent.status === "requires_capture" ||
          paymentIntent.status === "succeeded"
        ) {
          onPaymentCompleted()
          return
        }

        setSubmitting(false)
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Rendelés leadása
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const KozvetlenRendelesGomb = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /*
    A HIBA A MUVELET VALASZABOL JON, NEM A KIVETELBOL.

    Itt korabban `.catch((err) => setErrorMessage(err.message))` allt.
    Produkcioban a Next a szerver-muveletbol DOBOTT hiba uzenetet lecsereli
    egy altalanos angol mondatra (#371); egy VISSZAADOTT ertek atmegy.

    A SIKER NEM IDE TER VISSZA: a `placeOrder` atiranyit a visszaigazolo
    lapra. Ha ez a fuggveny egyaltalan visszater, az kudarc.
  */
  const onPaymentCompleted = async () => {
    try {
      const eredmeny = await placeOrder()

      if (!eredmeny.ok) {
        setErrorMessage(eredmeny.uzenet)
      }
    } catch (hiba) {
      /*
        A VEZERLO-DOBAST ATENGEDJUK. A sikeres rendeles `redirect`-tel zarul,
        es a Next azt kivetelkent valositja meg. A szerver-muvelet valaszat a
        keret dolgozza fel, tehat ez a dobas VALOSZINULEG el sem jut idaig --
        de VALODI RENDELES NELKUL ezt nem tudom lemerni, es a regi
        `.catch(...)` alak ugyanezt a kockazatot vitte, csak orzo nelkul.
        Nem-Next hibara ez a hivas nem csinal semmit.
      */
      unstable_rethrow(hiba)
      setErrorMessage(RENDELES_MOST_NEM_SIKERULT)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        Rendelés leadása
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
