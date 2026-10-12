import { Metadata } from "next"

import { szurtMetaadat } from "@lib/seo/oldal-metaadat"
import { valogatasLapTorzs } from "@modules/valogatas/valogatas-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../valogatas/[handle]/page"

/**
 * A SZŰRT VÁLOGATÁS, BELSŐ ÚT: a válogatásnak nincs saját szűrője, de egy
 * idegen szűrő-paraméter (`?sortBy=`) ide fut be, és noindex-et kap, ahelyett
 * hogy 404-et adna.
 */
type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  return szurtMetaadat(await alapMetaadat({ params: props.params }))
}

export default async function ValogatasSzurt(props: Props) {
  return valogatasLapTorzs(await props.params, await props.searchParams)
}
