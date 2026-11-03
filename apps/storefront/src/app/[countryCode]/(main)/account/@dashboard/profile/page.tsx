import { Metadata } from "next"
import { localeOf } from "@lib/i18n/locale"
import { translator } from "@lib/i18n/dictionary"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { STORE_NAME } from "@lib/store"
import ProfilUrlap from "@modules/account/components/profil-urlap"

type Props = { params: Promise<{ countryCode: string }> }

// the page's title and description follow its language (`hu`, `en-hu`)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return {
    title: t("account.profile.metaTitle"),
    description: t("account.profile.metaDescription", { store: STORE_NAME }),
  }
}

export default async function Profile() {
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  return <ProfilUrlap customer={customer} />
}
