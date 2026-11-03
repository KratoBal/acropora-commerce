import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

type Props = { params: Promise<{ countryCode: string }> }

// the page's title and description follow its language (`hu`, `en-hu`)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return {
    title: t("account.addresses.metaTitle"),
    description: t("account.addresses.metaDescription"),
  }
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <AddressBook
        customer={customer}
        region={region}
        locale={localeOf(countryCode)}
      />
    </div>
  )
}
