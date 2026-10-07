import { Metadata } from "next"

import { szurtMetaadat } from "@lib/seo/oldal-metaadat"

import {
  markaLapTorzs,
  type MarkaKeres,
} from "@modules/collections/templates/marka-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../collections/[handle]/page"

/**
 * A SZURT MARKA-LAP, BELSO UT (FE-7 3. resz): dinamikus, lasd a kategoria
 * parjat (`_szurt/categories`).
 */
type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<MarkaKeres>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  return szurtMetaadat(await alapMetaadat({ params: props.params }))
}

export default async function MarkaSzurt(props: Props) {
  return markaLapTorzs(await props.params, await props.searchParams)
}
