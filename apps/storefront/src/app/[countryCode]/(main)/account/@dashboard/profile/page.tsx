import { Metadata } from "next"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { STORE_NAME } from "@lib/store"
import ProfilUrlap from "@modules/account/components/profil-urlap"

export const metadata: Metadata = {
  title: "Profil",
  description: `A(z) ${STORE_NAME} profilod: név, e-mail-cím, telefonszám.`,
}

export default async function Profile() {
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  return <ProfilUrlap customer={customer} />
}
