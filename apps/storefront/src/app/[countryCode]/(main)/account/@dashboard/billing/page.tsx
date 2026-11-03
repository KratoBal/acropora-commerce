import { Metadata } from "next"
import { localeOf } from "@lib/i18n/locale"
import { translator } from "@lib/i18n/dictionary"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import SzamlazasiUrlap from "@modules/account/components/szamlazasi-urlap"

type Props = { params: Promise<{ countryCode: string }> }

// the page's title and description follow its language (`hu`, `en-hu`)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return {
    title: t("account.billing.metaTitle"),
    description: t("account.billing.metaDescription"),
  }
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
