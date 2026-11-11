import { HttpTypes } from "@medusajs/types"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { szuroCim } from "@lib/util/marka-szuro"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import { kovetkezoLap } from "@modules/categories/templates/commerce/kategoria-lap"
import ListaLap, {
  LAP_MERET,
} from "@modules/categories/templates/commerce/lista-lap"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { listaTermekek } from "@modules/store/templates/lista-termekek"

/**
 * A BRAND'S (COLLECTION'S) PRODUCT LIST on the shared list page (2026-11-03).
 *
 * The brand page (`/marka/{handle}`) and the old collection path
 * (`/collections/{handle}`) share this template. It had its own old list (12
 * per page, the sort in a side column, a bare title). It now takes the
 * category page's frame (`ListaLap`): crumb ("Brands / the brand"), title, the
 * sort, the cards chosen per product and 18 per page with the "load more"
 * link. A brand has nothing to filter by, so the filter column is left out and
 * the grid takes the full width. The title, the description and the canonical
 * of the page come from the brand module (`generateMetadata`), as before.
 */
export default async function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
  optionValueIds,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  const t = translator(localeOf(countryCode))
  const pageNumber = Math.max(Number.parseInt(page ?? "1", 10) || 1, 1)

  const { products, count, eloAllatKartya } = await listaTermekek({
    countryCode,
    page: pageNumber,
    sortBy,
    optionValueIds,
    szuro: { collection_id: [collection.id] },
  })
  const tovabbi = count > pageNumber * LAP_MERET

  return (
    <ListaLap
      t={t}
      morzsa={[
        { id: "markak", nev: t("category.brands"), href: "/marka" },
        { id: collection.id, nev: collection.title },
      ]}
      cim={collection.title}
      eloAllat={false}
      sav={{ osszes: false, elemek: [] }}
      count={count}
      page={pageNumber}
      rendezes={sortBy ?? "created_at"}
      szuroAktiv={false}
      szuroNyitva={false}
      torlesHref=""
      keresoAction=""
      kategoriak={[]}
      markaLista={[]}
      markak={[]}
      markaLink={() => szuroCim({ sortBy, optionValueIds })}
      products={products}
      eloAllatKartya={eloAllatKartya}
      uresSzoveg={t("category.emptyBrand")}
      szuro={false}
      kovetkezoHref={
        tovabbi ? kovetkezoLap(pageNumber, sortBy, optionValueIds) : null
      }
    />
  )
}
