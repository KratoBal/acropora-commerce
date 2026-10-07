import { Metadata } from "next"
import { keresesMetaadat } from "@lib/seo/oldal-metaadat"

import { keresesSzovege } from "@lib/util/kereses"
import { GYOKER_PARAM } from "@lib/util/kereses-talalatok"
import { storeCanonical } from "@lib/util/lap-canonical"
import { MARKA_PARAM, markaAzonositok } from "@lib/util/marka-szuro"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"
import { lapozottCim } from "@lib/util/belso-lap-metaadat"
import { listProducts } from "@lib/data/products"
import { csakLapszam, lapszamLetezik } from "@lib/util/lapszam"
import { notFound } from "next/navigation"
import { lapozoKeres } from "@modules/store/components/pagination/lap-href"

/**
 * A STORE-LAP TORZSE ES METAADATA, HAROM UTNAK (FE-7 3. resz). Ugyanaz a
 * felosztas, mint a kategoria-lapnal (`kategoria-lap-torzs.tsx`): `/store` es
 * `/_p/N/store` ISR, a `/_szurt/store` (kereses, rendezes, szurok) dinamikus.
 * A torzs es a metaadat csak azt olvassa, amit kap.
 */
export type StoreKeres = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  /**
   * A KERESES SZOVEGE. Egyetlen ertek, nem tomb: ket `q` parameter eseten a
   * masodikat eldobjuk ahelyett, hogy osszefuznenk oket -- egy osszefuzott
   * kereses NEM hibazna, csak mast keresne.
   */
  q?: string | string[]
}

/*
 * A STATIKUS `metadata` HELYETT `generateMetadata`, ES CSAK EZERT: a kanonikus
 * cim tartalmazza az orszagkodot, azt pedig egy statikus objektum nem lathatja.
 */
export function storeMetaadat(
  countryCode: string,
  searchParams: StoreKeres,
): Metadata {
  const oldal = Number.parseInt(String(searchParams.page ?? ""), 10)

  // a kereses noindexe a roadmap FE-4-e; itt a magyar cim es leiras (FE-1, #519)
  const { cim, leiras } = keresesMetaadat(
    typeof searchParams.q === "string" ? searchParams.q : null,
  )
  const lapozott = Number.isFinite(oldal) && oldal > 1
  return {
    // a lapozott lap cime a lapszammal (`belso-lap-metaadat.ts`)
    title: lapozott ? lapozottCim(cim, oldal) : cim,
    description: leiras,
    alternates: {
      canonical: storeCanonical(
        countryCode,
        Number.isFinite(oldal) ? oldal : null,
      ),
    },
  }
}

export async function storeLapTorzs(
  params: { countryCode: string },
  searchParams: StoreKeres,
) {
  // a nem letezo lapszam 404 (`lapszam.ts`); a lista 12-es lapokat mutat
  const lap = csakLapszam(searchParams)
  if (lap !== null) {
    const darab = await listProducts({
      countryCode: params.countryCode,
      queryParams: { limit: 1 },
    }).then(({ response }) => response.count)
    if (!lapszamLetezik(lap, darab, 12)) notFound()
  }

  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const kereses = keresesSzovege(searchParams.q)
  const gyokerErtek = searchParams[GYOKER_PARAM]
  const gyoker =
    (Array.isArray(gyokerErtek) ? gyokerErtek[0] : gyokerErtek)?.trim() ||
    undefined

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      kereses={kereses}
      gyoker={gyoker}
      markak={markaAzonositok(searchParams[MARKA_PARAM])}
      lapozoKeres={lapozoKeres(searchParams)}
    />
  )
}
