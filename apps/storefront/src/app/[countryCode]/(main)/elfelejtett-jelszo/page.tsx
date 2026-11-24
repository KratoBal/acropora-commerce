import { Metadata } from "next"

import { vevoiForditas } from "@lib/i18n/vevoi-forditas"
import { localeOf } from "@lib/i18n/locale"
import ElfelejtettJelszo from "@modules/account/components/elfelejtett-jelszo"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * AZ ELFELEJTETT JELSZO LAPJA (kartya 7bfca4eb): statikus keret, az urlap kliens-komponens (szerveroldali akcioval megy a bolthoz).
 * Keresobe nem kerul: egy fiok-oldal, nem tartalom.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = await vevoiForditas(localeOf(countryCode))
  return {
    title: t("account.auth.forgot.title"),
    robots: { index: false, follow: false },
  }
}

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default function ElfelejtettJelszoPage() {
  return <ElfelejtettJelszo />
}
