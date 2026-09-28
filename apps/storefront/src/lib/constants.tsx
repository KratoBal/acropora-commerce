import { BuildingStorefront, Cash, CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"

/* Map of payment provider_id to their title and icon. Add in any payment providers you want to use. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  /*
    A KET SAJAT SZEREP, PD-002 (Balazs, 2026-09-28) szerint:
      pp_system_default  KIZAROLAG a bolti fizetes, szemelyes atvetelnel
      pp_acropora_cod    KIZAROLAG az utanvet, kiszallitasnal
    A penztar a feliratot a SZEREPBOL veszi (fizetesi-modok.ts); ez a terkep
    ott csak ikont ad. A rendeles visszaigazolo lapja viszont csak a szolgaltato
    azonositojat latja, es itt keres - ezert kell a ket bejegyzes, ugyanazzal a
    szoveggel. Eddig a bolti fizetes itt "Manual Payment" volt, az utanvet
    pedig hianyzott, es a lap a .title-on hibara futott volna.
  */
  pp_system_default: {
    title: "Fizetés átvételkor",
    icon: <BuildingStorefront />,
  },
  pp_acropora_cod: {
    title: "Utánvét",
    icon: <Cash />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
