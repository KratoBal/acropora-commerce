import { listNonEmptyRootCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { markaValtas, szuroCim, type MarkaSor } from "@lib/util/marka-szuro"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import {
  kategoriaMarkai,
  kovetkezoLap,
} from "@modules/categories/templates/commerce/kategoria-lap"
import ListaLap, {
  LAP_MERET,
} from "@modules/categories/templates/commerce/lista-lap"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import { listaTermekek } from "./lista-termekek"

/**
 * THE ALL-PRODUCTS LIST (`/store`, 2026-11-03) on the shared list page.
 *
 * It had its own old template (12 per page, the sort and the option picker in
 * a side column, a bare "Minden termék" title). It now takes the category
 * page's frame (`ListaLap`): crumb, title, the root categories as quick chips
 * and as the category list, the brand filter, 18 per page and the "load more"
 * link. The search results page is a separate template and does not change here.
 *
 * Two things differ from a category page, on purpose:
 *
 *   - the list mixes both worlds, so the card is chosen PER PRODUCT with the
 *     same function the product page uses (`vilagaTermeknek`): a live animal
 *     gets the live-animal card (no quick add to cart) wherever it appears;
 *   - there is no category to be "in": the chips are the shop's non-empty
 *     roots, the same list the header menu uses, with the same counts.
 *
 * The option picker of the old list is gone from the screen (the category
 * page never had one); the `optionValueIds` address parameter still filters.
 */
export default async function StoreListaLap({
  countryCode,
  sortBy,
  page,
  optionValueIds,
  markak = [],
}: {
  countryCode: string
  sortBy?: SortOptions
  page: number
  optionValueIds?: OptionValueIds
  markak?: string[]
}) {
  const t = translator(localeOf(countryCode))
  const region = await getRegion(countryCode)
  if (!region) return null

  const [
    { products, count, eloAllatKartya },
    { gyokerek, nevek, szamok },
    markaLista,
  ] = await Promise.all([
    listaTermekek({
      countryCode,
      page,
      sortBy,
      optionValueIds,
      szuro: { collection_id: markak },
    }),
    listNonEmptyRootCategories(region.id),
    kategoriaMarkai(undefined, countryCode),
  ])

  const nev = (elem: { id: string; name?: string | null }) =>
    nevek.get(elem.id) ?? (elem.name ?? "").trim()
  const markaLink = (id: string) =>
    szuroCim({ sortBy, optionValueIds, markak: markaValtas(markak, id) })
  const tovabbi = count > page * LAP_MERET

  return (
    <ListaLap
      t={t}
      morzsa={[{ id: "store", nev: t("category.allProducts") }]}
      cim={t("category.allProducts")}
      eloAllat={false}
      sav={{
        osszes: true,
        elemek: gyokerek.map((gyoker) => ({
          id: gyoker.id,
          nev: nev(gyoker),
          href: `/categories/${gyoker.handle}`,
          aktiv: false,
        })),
      }}
      count={count}
      page={page}
      rendezes={sortBy ?? "created_at"}
      szuroAktiv={
        Boolean(sortBy) ||
        (optionValueIds?.length ?? 0) > 0 ||
        markak.length > 0
      }
      torlesHref="/store"
      keresoAction={`/${countryCode}/store`}
      kategoriak={gyokerek.map((gyoker) => ({
        id: gyoker.id,
        nev: nev(gyoker),
        href: `/categories/${gyoker.handle}`,
        szam: szamok.get(gyoker.id) ?? null,
      }))}
      markaLista={markaLista as MarkaSor[]}
      markak={markak}
      markaLink={markaLink}
      products={products}
      eloAllatKartya={eloAllatKartya}
      uresSzoveg={t("category.emptyList")}
      kovetkezoHref={
        tovabbi ? kovetkezoLap(page, sortBy, optionValueIds, markak) : null
      }
    />
  )
}
