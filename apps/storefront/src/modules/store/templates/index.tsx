import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  kereses,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  /** A kereses szovege. Ures kereses eseten `undefined`, nem ures string. */
  kereses?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        {/*
          A CIM MEGMONDJA, MIT KERESETT A VEVO -- ES EZ NEM DISZ.

          Egy kereses utan a lista MAGA nem arulja el, mire szurtunk. Ha a vevo
          elgepel egy szot, a cim nelkul csak annyit lat, hogy keves termek van,
          es nincs mibol rajonnie, hogy a sajat keresese szukitette le.
        */}
        <div className="mb-8 text-2xl-semi">
          <h1 data-testid="store-page-title">
            {kereses ? `Keresés: ${kereses}` : "Minden termék"}
          </h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            kereses={kereses}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
