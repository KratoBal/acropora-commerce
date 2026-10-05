"use client"

import {
  fejezdBeLinkFizetest,
  inditsLinkFizetest,
} from "@lib/data/rendeles-fizetese"
import { convertToLocale } from "@lib/util/money"
import {
  linkVisszateresiCim,
  LINK_FIZETES_MOST_NEM_SIKERULT,
  stripeVisszateresSikeres,
} from "@lib/util/rendeles-fizetese"
import {
  type StripeAllapot,
  STRIPE_BIZALMI_SZOVEG,
  stripeHibaFajta,
} from "@lib/util/stripe-allapot"
import { stripeEgyseg } from "@lib/util/stripe-egyseg"
import { STRIPE_FIZETESI_MEZO } from "@lib/util/stripe-megjelenes"
import ErrorMessage from "@modules/checkout/components/error-message"
import { stripePromise } from "@modules/checkout/components/payment-wrapper"
import { StripeHalasztott } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import StripeAllapotPanel from "@modules/checkout/components/stripe-allapot"
import { Button } from "@modules/common/components/ui"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type Props = { token: string; osszeg: number; countryCode: string }

export const LINK_ELUTASITVA =
  "A kártyás fizetés nem sikerült. Próbáld újra, vagy próbálj másik kártyát."

export const linkGombFelirat = (
  allapot: StripeAllapot,
  osszeg: number,
): string =>
  allapot === "feldolgozas"
    ? "Feldolgozás…"
    : allapot === "ellenorzes"
      ? "Ellenőrzés…"
      : allapot === "elutasitva"
        ? "Próbáld újra"
        : `Fizetés: ${convertToLocale({ amount: osszeg, currency_code: "huf" })}`

/**
 * A „RENDELÉS FIZETÉSE” FIZETESI RESZE: UGYANAZ, MINT A PENZTARBAN (a terv
 * 2.2): a halasztott kartyamezo (`StripeHalasztott`, kartya, Apple Pay,
 * Google Pay, kezi levonas), a bizalmi mondat es a Stripe allapot-panelje.
 *
 * A sorrend a penztare:
 * 1. `elements.submit()`: a mezo ellenorzese;
 * 2. a hatter most kesziti a PaymentIntentet a link osszegere (`session`);
 * 3. `confirmPayment` a titokkal;
 * 4. `complete`: a hatter levonja, es a rendeles fizetett lesz.
 *
 * A 3-D Secure utan a Stripe ide ter vissza; a lap ilyenkor maga fejezi be.
 */
export default function LinkFizetes(props: Props) {
  if (!stripePromise) {
    return (
      <p className="text-[14px] text-acr-slate">
        A kártyás fizetés most nem érhető el. Írj nekünk, és segítünk.
      </p>
    )
  }
  return (
    <StripeHalasztott
      osszeg={stripeEgyseg(props.osszeg, "huf")}
      penznem="huf"
      stripePromise={stripePromise}
    >
      <LinkFizetesMezo {...props} />
    </StripeHalasztott>
  )
}

const zarolva = (allapot?: string) =>
  allapot === "requires_capture" || allapot === "succeeded"

function LinkFizetesMezo({ token, osszeg, countryCode }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [allapot, setAllapot] = useState<StripeAllapot>("alap")
  const [hiba, setHiba] = useState<string | null>(null)
  const [mezoKesz, setMezoKesz] = useState(false)
  const fut = useRef(false)

  const befejez = async () => {
    setAllapot("ellenorzes")
    const eredmeny = await fejezdBeLinkFizetest(token)
    if (eredmeny.ok) {
      // a lap ujrarajzolva a „Köszönjük” allapotot mutatja
      router.replace(`/${countryCode}/rendeles-fizetese/${token}`)
      router.refresh()
      return
    }
    setHiba(eredmeny.uzenet)
    setAllapot("alap")
  }

  // a 3-D Secure utan: a Stripe parameterei a cimben
  useEffect(() => {
    const sikeres = stripeVisszateresSikeres(
      new URLSearchParams(window.location.search),
    )
    if (sikeres === null) return
    if (sikeres) {
      void befejez()
    } else {
      setAllapot("elutasitva")
    }
    // csak a betolteskor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fizet = async () => {
    if (!stripe || !elements || fut.current) return
    fut.current = true
    setHiba(null)
    setAllapot("feldolgozas")
    elements.getElement("payment")?.update({ readOnly: true })
    try {
      const ellenorzes = await elements.submit()
      if (ellenorzes.error) {
        if (stripeHibaFajta(ellenorzes.error) !== "validacio") {
          setHiba(ellenorzes.error.message ?? LINK_FIZETES_MOST_NEM_SIKERULT)
        }
        setAllapot("alap")
        return
      }

      const inditas = await inditsLinkFizetest(token)
      if (!inditas.ok) {
        setHiba(inditas.uzenet)
        setAllapot("alap")
        return
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: inditas.titok,
        confirmParams: {
          return_url: linkVisszateresiCim(
            window.location.origin,
            countryCode,
            token,
          ),
          // a mezo az orszagot nem kerdezi (STRIPE_FIZETESI_MEZO); a bolt regioja Magyarorszag
          payment_method_data: {
            billing_details: { address: { country: "HU" } },
          },
        },
        redirect: "if_required",
      })

      if (
        zarolva(error ? error.payment_intent?.status : paymentIntent?.status)
      ) {
        await befejez()
        return
      }
      if (error && stripeHibaFajta(error) !== "elutasitas") {
        if (stripeHibaFajta(error) !== "validacio")
          setHiba(error.message ?? LINK_FIZETES_MOST_NEM_SIKERULT)
        setAllapot("alap")
        return
      }
      setAllapot("elutasitva")
    } finally {
      fut.current = false
      elements.getElement("payment")?.update({ readOnly: false })
    }
  }

  return (
    <div className="flex flex-col gap-y-4" data-testid="link-fizetes">
      <div className="relative">
        <PaymentElement
          options={STRIPE_FIZETESI_MEZO}
          onChange={(e) => setMezoKesz(e.complete)}
        />
        <StripeAllapotPanel
          allapot={allapot === "elutasitva" ? "alap" : allapot}
        />
      </div>
      <p className="text-[12px] leading-[17px] text-acr-slate">
        {STRIPE_BIZALMI_SZOVEG}
      </p>
      {allapot === "elutasitva" && (
        <p
          role="alert"
          className="border border-red-700 bg-red-50 px-3 py-2 text-[12px] leading-[17px] text-red-700"
          data-testid="link-elutasitva"
        >
          {LINK_ELUTASITVA}
        </p>
      )}
      <Button
        size="large"
        onClick={fizet}
        disabled={
          !stripe ||
          !elements ||
          !mezoKesz ||
          allapot === "feldolgozas" ||
          allapot === "ellenorzes"
        }
        aria-busy={allapot === "feldolgozas" || allapot === "ellenorzes"}
        data-testid="link-fizetes-gomb"
        data-allapot={allapot}
        className="w-full !rounded-none !bg-acr-heritage !text-acr-white hover:!opacity-90 disabled:!bg-acr-slate"
      >
        {linkGombFelirat(allapot, osszeg)}
      </Button>
      <ErrorMessage error={hiba} data-testid="link-fizetes-hiba" />
    </div>
  )
}
