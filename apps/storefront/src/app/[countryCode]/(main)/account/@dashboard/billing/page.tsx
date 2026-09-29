import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import SzamlazasiUrlap from "@modules/account/components/szamlazasi-urlap"

export const metadata: Metadata = {
  title: "Számlázási adatok",
  description: "A számlázáshoz használt név, cím és adószám.",
}

/** A SZAMLAZASI ADATOK (P5, 257:102): a vevo alapertelmezett szamlazasi cime. */
export default async function Billing() {
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  const cim =
    (customer.addresses ?? []).find((c) => c.is_default_billing) ?? null

  return <SzamlazasiUrlap cim={cim} />
}
