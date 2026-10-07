import { Metadata } from "next"

import { lapozottMetaadat } from "@lib/util/belso-lap-metaadat"
import { markaLapTorzs } from "@modules/collections/templates/marka-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../../collections/[handle]/page"

/**
 * A MARKA-LAP N. LAPJA, BELSO UT (FE-7 3. resz); lasd a kategoria parjat
 * (`_p/[lap]/categories`).
 */
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
  )
}

export default async function MarkaLapozott(props: Props) {
  const { lap, ...params } = await props.params
  return markaLapTorzs(params, { page: lap })
}
