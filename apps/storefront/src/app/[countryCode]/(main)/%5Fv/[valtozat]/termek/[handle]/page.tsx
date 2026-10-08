import { Metadata } from "next"

import { termekLapTorzs } from "@modules/products/templates/termek-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../../termek/[handle]/page"

/**
 * A TERMEKLAP EGY VALTOZATA, BELSO UT (FE-7 3. resz). A publikus cim
 * `/termek/h?v_id=<valtozat>`; a `next.config` ide irja at, ha az ertek
 * Medusa valtozat-azonosito (`belso-utvonalak.js`), kivulrol 404.
 *
 * A metaadat az alaplape, a canonicallal egyutt: Balazs SEO dontese szerint a
 * termekcsoport canonicalja a parameter nelkuli cim.
 */
type Props = {
  params: Promise<{ valtozat: string; handle: string; countryCode: string }>
}

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { valtozat: _valtozat, ...params } = await props.params
  return alapMetaadat({ params: Promise.resolve(params) })
}

export default async function TermekValtozat(props: Props) {
  const { valtozat, ...params } = await props.params
  return termekLapTorzs(params, valtozat)
}
