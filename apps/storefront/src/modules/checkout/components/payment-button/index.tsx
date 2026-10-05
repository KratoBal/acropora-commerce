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
import React, { useRef, useState } from "react"
import {
  ELUTASITOTT_KARTYA,
  type StripeAllapot,
  stripeGombFelirat,
  stripeHibaFajta,
} from "@lib/util/stripe-allapot"
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
export const visszateresiCim = (cartId: string, countryCode: unknown) =>
  `${window.location.origin}/api/payment-return?cart_id=${cartId}&country_code=${countryCode}`

/** A vevő számlázási adatai a kártya megerősítéséhez, a kosárból. */
const szamlazasiAdatok = (cart: HttpTypes.StoreCart) => ({
  name:
    cart.billing_address?.first_name + " " + cart.billing_address?.last_name,
  address: {
    city: cart.billing_address?.city ?? undefined,
    // a Stripe ISO-kodot var; a mezoben az orszagot nem kerdezzuk (`STRIPE_FIZETESI_MEZO`)
    country: cart.billing_address?.country_code?.toUpperCase() ?? undefined,
    line1: cart.billing_address?.address_1 ?? undefined,
    line2: cart.billing_address?.address_2 ?? undefined,
    postal_code: cart.billing_address?.postal_code ?? undefined,
    state: cart.billing_address?.province ?? undefined,
  },
  email: cart.email,
  phone: cart.billing_address?.phone ?? undefined,
})

type StripeGombProps = {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
  /** A fizetesi lepes allapot-panelje ebbol tudja, mit mutasson. */
  onAllapot?: (allapot: StripeAllapot) => void
  /** Az indulo allapot (a 3DS utani elutasitas: "Próbáld újra"). */
  kezdoAllapot?: StripeAllapot
  className?: string
}

/**
 * A FIZETESI LEPES LEADO GOMBJA A KERETEK SZERINT: heritage hatter, feher
 * felirat, mobilon teljes szelesseg. A `!` azert kell, mert a UI-gomb a sajat
 * fekete hatteret is kiteszi, es a ketto kozott csak a CSS sorrendje dontene.
 */
export const STRIPE_CTA_OSZTALY =
  "w-full !rounded-none !bg-acr-heritage !text-acr-white hover:!opacity-90 disabled:!bg-acr-slate whitespace-nowrap !px-4 !text-[15px] !font-semibold small:w-auto small:!px-6 small:!text-lg small:!font-normal small:min-w-[260px]"

/**
 * A MEZO NEM SZERKESZTHETO, AMIG A FIZETES FUT (a prompt 8. pontja). A Payment
 * Element sajat `readOnly` beallitasa; a kartyaadathoz igy sem nyulunk.
 */
const mezoZarolasa = (
  elements: ReturnType<typeof useElements>,
  zarva: boolean,
) => {
  elements?.getElement("payment")?.update({ readOnly: zarva })
}

/**
 * A ket Stripe-gomb kozos allapota: a felirat, a zarolas es a jelzes a
 * fizetesi lepes fele. Dupla kattintas nem indit masodik fizetest: amig fut,
 * a kezelo azonnal visszater.
 */
const useStripeAllapot = (
  onAllapot: StripeGombProps["onAllapot"],
  kezdoAllapot: StripeAllapot | undefined,
) => {
  const [allapot, setAllapot] = useState<StripeAllapot>(kezdoAllapot ?? "alap")
  const fut = useRef(false)
  const jelez = (uj: StripeAllapot) => {
    setAllapot(uj)
    onAllapot?.(uj)
  }
  return { allapot, jelez, fut }
}

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
export const StripeKozosGomb = ({
  cart,
  notReady,
  "data-testid": dataTestId,
  onAllapot,
  kezdoAllapot,
  className,
}: StripeGombProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { allapot, jelez, fut } = useStripeAllapot(onAllapot, kezdoAllapot)
  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams()

  const lead = async () => {
    try {
      const eredmeny = await placeOrder()
      if (!eredmeny.ok) {
        setErrorMessage(eredmeny.uzenet)
        jelez("alap")
      }
    } catch (hiba) {
      // a sikeres leadas `redirect`-tel zarul (lasd fent): azt atengedjuk
      unstable_rethrow(hiba)
      setErrorMessage(RENDELES_MOST_NEM_SIKERULT)
      jelez("alap")
    }
  }

  const elutasitva = () => {
    if (onAllapot) {
      jelez("elutasitva")
    } else {
      setErrorMessage(ELUTASITOTT_KARTYA)
      jelez("elutasitva")
    }
  }

  const handlePayment = async () => {
    if (!stripe || !elements || fut.current) {
      return
    }

    fut.current = true
    setErrorMessage(null)
    jelez("feldolgozas")
    mezoZarolasa(elements, true)

    try {
      const ellenorzes = await elements.submit()
      if (ellenorzes.error) {
        if (stripeHibaFajta(ellenorzes.error) !== "validacio") {
          setErrorMessage(ellenorzes.error.message ?? FIZETES_MOST_NEM_SIKERULT)
        }
        jelez("alap")
        return
      }

      const inditas = await inditsStripeKozosFizetest(cart.id)
      if (!inditas.ok) {
        setErrorMessage(inditas.uzenet)
        jelez("alap")
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

      const zarolva = (allapotNev?: string) =>
        allapotNev === "requires_capture" || allapotNev === "succeeded"

      if (error) {
        if (zarolva(error.payment_intent?.status)) {
          await lead()
          return
        }
        await stripeVisszarendezes(cart.id)
        if (stripeHibaFajta(error) === "elutasitas") {
          elutasitva()
        } else {
          if (stripeHibaFajta(error) !== "validacio") {
            setErrorMessage(error.message ?? FIZETES_MOST_NEM_SIKERULT)
          }
          jelez("alap")
        }
        return
      }

      if (zarolva(paymentIntent?.status)) {
        await lead()
        return
      }

      await stripeVisszarendezes(cart.id)
      elutasitva()
    } finally {
      fut.current = false
      mezoZarolasa(elements, false)
    }
  }

  return (
    <>
      <Button
        disabled={
          !stripe ||
          !elements ||
          notReady ||
          allapot === "feldolgozas" ||
          allapot === "ellenorzes"
        }
        onClick={handlePayment}
        size="large"
        className={className}
        aria-busy={allapot === "feldolgozas" || allapot === "ellenorzes"}
        data-testid={dataTestId}
        data-allapot={allapot}
      >
        {stripeGombFelirat(allapot)}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

/**
 * A NEM BONTOTT KOSAR STRIPE-GOMBJA: a munkamenet a mod valasztasakor
 * keszult, itt a kartya megerositese es a leadas jon. Ugyanaz az allapotgep,
 * mint a vegyes kosarnal; a visszarendezes itt nem kell, mert nincs bontas.
 */
export const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
  onAllapot,
  kezdoAllapot,
  className,
}: StripeGombProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { allapot, jelez, fut } = useStripeAllapot(onAllapot, kezdoAllapot)

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
        jelez("alap")
      }
    } catch (hiba) {
      /*
        A VEZERLO-DOBAST ATENGEDJUK. A sikeres rendeles `redirect`-tel zarul,
        es a Next azt kivetelkent valositja meg. Nem-Next hibara ez a hivas
        nem csinal semmit.
      */
      unstable_rethrow(hiba)
      setErrorMessage(RENDELES_MOST_NEM_SIKERULT)
      jelez("alap")
    }
  }

  const stripe = useStripe()
  const elements = useElements()
  const { countryCode } = useParams()

  const handlePayment = async () => {
    if (!stripe || !elements || !cart || fut.current) {
      return
    }

    fut.current = true
    setErrorMessage(null)
    jelez("feldolgozas")
    mezoZarolasa(elements, true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: visszateresiCim(cart.id, countryCode),
          payment_method_data: { billing_details: szamlazasiAdatok(cart) },
        },
        // Only leave the site when the selected method actually requires it, so
        // card payments still complete inline.
        redirect: "if_required",
      })

      if (error) {
        const pi = error.payment_intent

        if (
          (pi && pi.status === "requires_capture") ||
          (pi && pi.status === "succeeded")
        ) {
          await onPaymentCompleted()
          return
        }

        const fajta = stripeHibaFajta(error)
        if (fajta === "elutasitas") {
          if (!onAllapot) setErrorMessage(ELUTASITOTT_KARTYA)
          jelez("elutasitva")
        } else {
          if (fajta !== "validacio") setErrorMessage(error.message || null)
          jelez("alap")
        }
        return
      }

      if (
        paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "succeeded"
      ) {
        await onPaymentCompleted()
        return
      }

      jelez("alap")
    } finally {
      fut.current = false
      mezoZarolasa(elements, false)
    }
  }

  return (
    <>
      <Button
        disabled={
          !stripe ||
          !elements ||
          notReady ||
          allapot === "feldolgozas" ||
          allapot === "ellenorzes"
        }
        onClick={handlePayment}
        size="large"
        className={className}
        aria-busy={allapot === "feldolgozas" || allapot === "ellenorzes"}
        data-testid={dataTestId}
        data-allapot={allapot}
      >
        {stripeGombFelirat(allapot)}
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
