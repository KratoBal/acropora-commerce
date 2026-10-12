import { Metadata } from "next"

import { lapozottMetaadat } from "@lib/util/belso-lap-metaadat"
import { markaLapTorzs } from "@modules/collections/templates/marka-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../../marka/[handle]/page"

/** A MARKAOLDAL N. LAPJA, BELSO UT (SEO P0 PR 11); a gyujtemeny parja mintajara. */
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
  return markaLapTorzs(
    params,
    { page: lap },
    `/${params.countryCode}/marka/${params.handle}`,
  )
}
