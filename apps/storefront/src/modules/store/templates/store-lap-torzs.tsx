import { Metadata } from "next"

import { keresesSzovege } from "@lib/util/kereses"
import { GYOKER_PARAM } from "@lib/util/kereses-talalatok"
import { storeCanonical } from "@lib/util/lap-canonical"
import { MARKA_PARAM, markaAzonositok } from "@lib/util/marka-szuro"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

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
 *
 * A CIM ES A LEIRAS VALTOZATLAN MARAD, angolul. Az a starter szovege, es a
 * magyar bolton tenyleg furcsan all -- de a lecserelese TARTALMI dontes
 * (marketing), nem az enyem, es egy kitalalt mondat ugyanugy tovabbutazna, mint
 * a starter sajatja. Ugyanaz az indok, amiert a fooldal leirasa ma ures.
 * Kulon kartyan all.
 */
export function storeMetaadat(
  countryCode: string,
  searchParams: StoreKeres,
): Metadata {
  const oldal = Number.parseInt(String(searchParams.page ?? ""), 10)

  return {
    title: "Store",
    description: "Explore all of our products.",
    alternates: {
      canonical: storeCanonical(
        countryCode,
        Number.isFinite(oldal) ? oldal : null,
      ),
    },
  }
}

export function storeLapTorzs(
  params: { countryCode: string },
  searchParams: StoreKeres,
) {
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
    />
  )
}
