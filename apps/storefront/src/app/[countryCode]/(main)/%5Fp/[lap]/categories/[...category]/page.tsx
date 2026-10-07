import { Metadata } from "next"

import { lapozottMetaadat } from "@lib/util/belso-lap-metaadat"
import { kategoriaLapTorzs } from "@modules/categories/templates/kategoria-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../../categories/[...category]/page"

/**
 * A KATEGORIA N. LAPJA, BELSO UT (FE-7 3. resz). A publikus cim
 * `/categories/a?page=N`; a `next.config` ide irja at (`belso-utvonalak.js`),
 * kivulrol a middleware 404-et ad. A lapszam utvonal-szegmens, tehat a lap ISR.
 */
type Props = {
  params: Promise<{ lap: string; category: string[]; countryCode: string }>
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

export default async function KategoriaLapozott(props: Props) {
  const { lap, ...params } = await props.params
  return kategoriaLapTorzs(params, { page: lap })
}
