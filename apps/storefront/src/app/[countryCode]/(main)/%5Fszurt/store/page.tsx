import { Metadata } from "next"

import { szurtMetaadat } from "@lib/seo/oldal-metaadat"

import {
  storeLapTorzs,
  storeMetaadat,
  type StoreKeres,
} from "@modules/store/templates/store-lap-torzs"

/**
 * A KERESES ES A SZURT STORE-LAP, BELSO UT (FE-7 3. resz): dinamikus, lasd a
 * kategoria parjat (`_szurt/categories`).
 */
type Props = {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<StoreKeres>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  return szurtMetaadat(storeMetaadat(countryCode, await props.searchParams))
}

export default async function StoreSzurt(props: Props) {
  return storeLapTorzs(await props.params, await props.searchParams)
}
