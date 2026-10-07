import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import KeresesLap from "./kereses/kereses-lap"
import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  kereses,
  gyoker,
  markak,
  lapozoKeres,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  /** A kereses szovege. Ures kereses eseten `undefined`, nem ures string. */
  kereses?: string
  /** A talalati lap gyoker-fule (`?gyoker=`), csak kereseskor. */
  gyoker?: string
  /** A talalati lap marka-szuroje (`?marka=`), csak kereseskor. */
  markak?: string[]
  /** A lapozo linkjeinek query-je (`lapozoKeres`, FE-7 3. resz). */
  lapozoKeres?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  /*
    KERESESKOR A TALALATI LAP ALL (P2, 4a, a 152:88 szerint), sajat fejjel,
    gyoker-fulekkel es Márka szurovel. Kereses nelkul a "Minden termék" lap
    valtozatlan.
  */
  if (kereses) {
    return (
      <KeresesLap
        kereses={kereses}
        countryCode={countryCode}
        sortBy={sortBy}
        page={Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1}
        gyoker={gyoker}
        markak={markak}
      />
    )
  }

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      <div className="w-full">
        <div className="mb-8 text-2xl-semi">
          <h1 data-testid="store-page-title">Minden termék</h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            lapozoKeres={lapozoKeres}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
