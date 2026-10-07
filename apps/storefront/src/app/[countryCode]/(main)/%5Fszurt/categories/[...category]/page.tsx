import { Metadata } from "next"

import { szurtMetaadat } from "@lib/seo/oldal-metaadat"

import {
  kategoriaLapTorzs,
  type KategoriaKeres,
} from "@modules/categories/templates/kategoria-lap-torzs"

import { generateMetadata as alapMetaadat } from "../../../categories/[...category]/page"

/**
 * A SZURT KATEGORIA-LAP, BELSO UT (FE-7 3. resz). A rendezes, a marka es az
 * opcio-szuro kombinacioi korlatlanok, ezert ez a lap DINAMIKUS marad: a
 * gyorsitotar csak a tarat toltene. A publikus cim valtozatlan
 * (`?sortBy=...`); a `next.config` ide irja at, kivulrol 404.
 */
type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<KategoriaKeres>
}

export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  return szurtMetaadat(await alapMetaadat({ params: props.params }))
}

export default async function KategoriaSzurt(props: Props) {
  return kategoriaLapTorzs(await props.params, await props.searchParams)
}
