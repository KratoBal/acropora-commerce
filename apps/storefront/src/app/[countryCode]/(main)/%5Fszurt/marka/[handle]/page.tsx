import { Metadata } from "next"

import { szurtMetaadat } from "@lib/seo/oldal-metaadat"

import {
  markaLapTorzs,
  type MarkaKeres,
} from "@modules/collections/templates/marka-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../marka/[handle]/page"

/** A SZURT MARKAOLDAL, BELSO UT (SEO P0 PR 11); a gyujtemeny parja mintajara. */
type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<MarkaKeres>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  return szurtMetaadat(await alapMetaadat({ params: props.params }))
}

export default async function MarkaSzurt(props: Props) {
  const params = await props.params
  return markaLapTorzs(
    params,
    await props.searchParams,
    `/${params.countryCode}/marka/${params.handle}`,
  )
}
