import { Metadata } from "next"

import {
  storeLapTorzs,
  storeMetaadat,
} from "@modules/store/templates/store-lap-torzs"

/**
 * A STORE N. LAPJA, BELSO UT (FE-7 3. resz); lasd a kategoria parjat
 * (`_p/[lap]/categories`). A canonical a `storeCanonical` sajat lapszamos
 * alakja.
 */
type Props = { params: Promise<{ lap: string; countryCode: string }> }

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lap, countryCode } = await props.params
  return storeMetaadat(countryCode, { page: lap })
}

export default async function StoreLapozott(props: Props) {
  const { lap, ...params } = await props.params
  return storeLapTorzs(params, { page: lap })
}
