import { Radio as RadioGroupOption } from "@headlessui/react"
import { clx } from "@modules/common/components/ui"
import React, { useContext, type JSX } from "react"

import Radio from "@modules/common/components/radio"

import { isManual } from "@lib/constants"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { STRIPE_FIZETESI_MEZO } from "@lib/util/stripe-megjelenes"
import { PaymentElement } from "@stripe/react-stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"
import StripeLogo from "../stripe-logo"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  /** A cim alatti sor (a keret szerint: "Kártya · Apple Pay · Google Pay"). */
  alcim?: string
  /** A jobb oldali jel: a bankkartyanal a Stripe szovegjele, kulonben az ikon. */
  jel?: React.ReactNode
  children?: React.ReactNode
}

/**
 * EGY FIZETESI MOD KARTYAJA (a "Checkout Payment" keretek, desktop 209:3,
 * mobil 209:133): radio, cim, alcim, a kivalasztottnal heritage keret es a
 * "KIVÁLASZTVA" cimke, jobb oldalt a jel.
 */
const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  alcim,
  jel,
  children,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"
  const kivalasztva = selectedPaymentOptionId === paymentProviderId

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "mb-3 flex cursor-pointer flex-col gap-y-2 bg-acr-white px-4 py-4 small:px-5",
        kivalasztva
          ? "border-2 border-acr-heritage"
          : "border border-acr-line hover:border-acr-slate",
        { "cursor-not-allowed opacity-60": disabled },
      )}
      data-testid={`fizetesi-mod-${paymentProviderId}`}
    >
      <div className="flex items-center justify-between gap-x-3">
        <div className="flex min-w-0 items-center gap-x-3">
          <Radio checked={kivalasztva} />
          <div className="min-w-0">
            <p className="text-[15px] leading-[20px] text-acr-ink small:text-[16px]">
              {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
            </p>
            {alcim && (
              <p className="text-[13px] leading-[18px] text-acr-slate">
                {alcim}
              </p>
            )}
          </div>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-x-3">
          {kivalasztva && (
            <span
              className="hidden bg-acr-heritage px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.08em] text-acr-white small:inline-block"
              data-testid="kivalasztva-cimke"
            >
              Kiválasztva
            </span>
          )}
          <span className="text-acr-ink">
            {jel ?? paymentInfoMap[paymentProviderId]?.icon}
          </span>
        </div>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="small:hidden text-[10px]" />
      )}
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

/** A bizalmi mondat, szo szerint a prompt 4. pontja szerint. */
export const STRIPE_BIZALMI_SZOVEG =
  "A kártyaadatokat a Stripe biztonságos fizetési rendszere kezeli; az Acropora nem fér hozzá a kártyaadataidhoz."

/**
 * A BANKKARTYAS MOD: a kartya, alatta KOZVETLENUL a Stripe mezo (a keret
 * sorrendje: bankkartya, mezo, utana a tobbi mod), a bizalmi mondattal es az
 * "Egy fizetés" sorral. A mezo a Stripe iframe-je: kartyaadatot a kirakat nem
 * lat. A walletet (Apple Pay, Google Pay) a Stripe maga jeleniti meg, ha az
 * eszkoz, a bongeszo, a domain es a fiok engedi (`STRIPE_FIZETESI_MEZO`).
 */
export const StripePaymentContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setError,
  setPaymentComplete,
  egyFizetes,
  allapot,
}: Omit<PaymentContainerProps, "children" | "alcim" | "jel"> & {
  setError: (error: string | null) => void
  setPaymentComplete: (complete: boolean) => void
  /** Az "Egy fizetés · …" sor szovege (a teljes fizetendo osszeggel). */
  egyFizetes?: string
  /** A mezo alatti allapot-panel (feldolgozas, elutasitas). */
  allapot?: React.ReactNode
}) => {
  const stripeReady = useContext(StripeContext)
  const kivalasztva = selectedPaymentOptionId === paymentProviderId

  return (
    <>
      <PaymentContainer
        paymentProviderId={paymentProviderId}
        selectedPaymentOptionId={selectedPaymentOptionId}
        paymentInfoMap={paymentInfoMap}
        disabled={disabled}
        alcim="Kártya · Apple Pay · Google Pay"
        jel={<StripeLogo className="h-[22px] w-auto small:h-[24px]" />}
      />
      {kivalasztva && (
        <div
          className="relative mb-3 border border-acr-line bg-acr-white px-3 py-4 small:px-4"
          data-testid="stripe-panel"
        >
          {stripeReady ? (
            <PaymentElement
              options={STRIPE_FIZETESI_MEZO}
              onChange={(e) => {
                setError(null)
                setPaymentComplete(e.complete)
              }}
              // Without a handler Stripe.js reports a failed mount as an
              // unhandled "payment Element loaderror" and the option renders
              // blank with no explanation. Surface it in the checkout's own
              // error slot instead.
              onLoadError={(e) => {
                setPaymentComplete(false)
                setError(
                  e.error?.message ??
                    "Nem sikerült betölteni a fizetési módokat.",
                )
              }}
            />
          ) : (
            <SkeletonCardDetails />
          )}
          <p
            className="mt-3 text-[12px] leading-[17px] text-acr-slate"
            data-testid="stripe-bizalmi-szoveg"
          >
            {STRIPE_BIZALMI_SZOVEG}
          </p>
          {egyFizetes && (
            <p
              className="mt-1 text-[12px] leading-[17px] text-acr-slate"
              data-testid="egy-fizetes"
            >
              {egyFizetes}
            </p>
          )}
          {allapot}
        </div>
      )}
    </>
  )
}
