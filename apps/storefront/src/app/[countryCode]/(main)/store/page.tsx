import { Metadata } from "next"

import {
  storeLapTorzs,
  storeMetaadat,
} from "@modules/store/templates/store-lap-torzs"

/*
 * FE-7 3. resz: az alaplap nem olvas `searchParams`-t, tehat ISR. A `?page`,
 * a kereses es a szurok belso utra mennek (`belso-utvonalak.js`); a torzs es
 * a metaadat kozos (`store-lap-torzs.tsx`).
 *
 * A `generateStaticParams` az `[countryCode]` szegmens miatt kell: nelkule a
 * Next 15 a lapot minden keresre ujrarenderelne (`private, no-store`, merve
 * 2026-10-07); az ures lista igeny szerinti ISR.
 */
type Props = { params: Promise<{ countryCode: string }> }

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  return storeMetaadat(countryCode, {})
}

export default async function StorePage(props: Props) {
  return storeLapTorzs(await props.params, {})
}
