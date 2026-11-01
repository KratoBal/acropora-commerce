import { notFound } from "next/navigation"

import { OptionValueIds } from "@lib/util/product-option-filters"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { categoryPageKind, categoryPageMode } from "./category-page-data"
import CommerceKategoriaLap from "./commerce/kategoria-lap"

/**
 * THE CATEGORY PAGE: one page for both kinds (2026-11-01).
 *
 * The technical branch has had the new page since P2 (117:30). The live-animal
 * branch (coral, fish, invertebrate) kept the old template until now; it takes
 * the same page, with the live-animal card and the pickup note (`kind`). The
 * old template, its own token set and its 12-item pager are gone.
 */
export default function CategoryTemplate({
  category,
  nevek,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  markak,
}: {
  category: HttpTypes.StoreProductCategory
  /**
   * A MEGJELENITENDO NEVEK, AZONOSITO SZERINT -- A LAPTOL, NEM ITT SZAMOLVA.
   *
   * A rovidites eddig FELTETEL NELKUL vagott. A betoltes utan az pont azt a
   * szulo-utotagot vinne el a 77 UTKOZO kategoriarol, amit a dontes
   * szandekosan megtart. Az egyedisegrol csak a teljes katalogus tud
   * dontenni, es az ennek a komponensnek nincs a kezeben: a sajat lancat es a
   * gyerekeit kapja.
   *
   * A TARTALEK A TELJES NEV, nem a rovid. Hianyzo terkepnel a rovid alakra
   * esni vissza azt jelentene, hogy a feltetel nelkuli vagas csendben
   * visszajon.
   */
  nevek?: Map<string, string>
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  markak?: string[]
}) {
  if (!category || !countryCode) notFound()

  const pageNumber = Math.max(Number.parseInt(page ?? "1", 10) || 1, 1)

  return (
    /*
      NEM main elem: a gyoker elrendezes (`app/layout.tsx`) mar abba teszi az
      oldalt, es egy masodik main a lapon ket fo tartalmat allitana (merve a
      teszt kirakaton 2026-10-07, SEO frontend FE-1).
    */
    <div
      data-testid="category-container"
      /*
        A FEJLEC MODJA (P1b): Reef a korall, hal es gerinctelen agon. NEM
        data-vilag, mert az a globals.css szabalyan at a lap torzset is
        atszinezne; ezt a jelolot csak a fejlec olvassa.
      */
      data-acr-mod={categoryPageMode(category)}
    >
      <CommerceKategoriaLap
        category={category}
        nevek={nevek}
        sortBy={sortBy}
        page={pageNumber}
        countryCode={countryCode}
        optionValueIds={optionValueIds}
        markak={markak}
        kind={categoryPageKind(category)}
      />
    </div>
  )
}
