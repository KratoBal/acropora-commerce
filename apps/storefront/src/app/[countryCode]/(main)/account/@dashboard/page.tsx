import { notFound, redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"

/**
 * A FIOK NYITOLAPJA A RENDELESEKRE VISZ (P5, 4. pont). A rendelesek kerete
 * (249:3) a menut "Áttekintés"-sel kezdi a rendelesek helyen, a regi
 * attekinto lapnak nincs kerete. Bejelentkezes nelkul ez a lap nem fut: a
 * fiok layoutja akkor a belepo lapot adja.
 */
export default async function AccountStart(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    notFound()
  }

  redirect(`/${countryCode}/account/orders`)
}
