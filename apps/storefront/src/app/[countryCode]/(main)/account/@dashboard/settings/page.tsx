import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import JelszoUrlap from "@modules/account/components/jelszo-urlap"

export const metadata: Metadata = {
  title: "Beállítások",
  description: "A fiók jelszavának módosítása.",
}

/**
 * A BEALLITASOK (P5, 257:159). Csak a jelszo modositasa epul; az Értesítések
 * kartya kimarad, mert levelkuldes nincs (docs/P5-LEFT-OUT.md).
 */
export default async function Settings() {
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  return <JelszoUrlap />
}
