import { Metadata } from "next"

import { localeOf } from "@lib/i18n/locale"
import { lapozottMetaadat } from "@lib/util/belso-lap-metaadat"
import { valogatasLapTorzs } from "@modules/valogatas/valogatas-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../../valogatas/[handle]/page"

/** A VÁLOGATÁS N. LAPJA, BELSŐ ÚT; a márkaoldal párja mintájára. */
type Props = {
  params: Promise<{ lap: string; handle: string; countryCode: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lap, ...params } = await props.params
  return lapozottMetaadat(
    await alapMetaadat({ params: Promise.resolve(params) }),
    lap,
    localeOf(params.countryCode),
  )
}

export default async function ValogatasLapozott(props: Props) {
  const { lap, ...params } = await props.params
  return valogatasLapTorzs(params, { page: lap })
}
