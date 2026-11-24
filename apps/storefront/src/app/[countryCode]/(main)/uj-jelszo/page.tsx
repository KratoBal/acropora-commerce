import { Metadata } from "next"

import { vevoiForditas } from "@lib/i18n/vevoi-forditas"
import { localeOf } from "@lib/i18n/locale"
import UjJelszo from "@modules/account/components/uj-jelszo"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * AZ UJ JELSZO LAPJA, A LEVELBEN KULDOTT LINKE (kartya 7bfca4eb). A lap statikus keret: a token a cimbol a bongeszoben
 * olvasodik, es csak az urlap elkuldesekor megy a bolthoz (`UjJelszo`), tehat a lap gyorsitotarazhato, es egy levelszkenner,
 * ami megnyitja a linket, nem ment semmit. Keresobe nem kerul, a tokenes cim nem megy tovabb hivatkozokent.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = await vevoiForditas(localeOf(countryCode))
  return {
    title: t("account.auth.reset.title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  }
}

export const revalidate = 300

// statikus keret (a token a bongeszoben olvasodik): ISR, mint a tobbi publikus lap
export async function generateStaticParams() {
  return []
}

export default function UjJelszoPage() {
  return <UjJelszo />
}
