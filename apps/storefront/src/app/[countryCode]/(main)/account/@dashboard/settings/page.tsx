import { Metadata } from "next"
import { vevoiForditas } from "@lib/i18n/vevoi-forditas"
import { localeOf } from "@lib/i18n/locale"
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import JelszoUrlap from "@modules/account/components/jelszo-urlap"

type Props = { params: Promise<{ countryCode: string }> }

// the page's title and description follow its language (`hu`, `en-hu`)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = await vevoiForditas(localeOf(countryCode))
  return {
    title: t("account.password.metaTitle"),
    description: t("account.password.metaDescription"),
  }
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
