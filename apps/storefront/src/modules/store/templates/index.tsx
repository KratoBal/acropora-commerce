import { OptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import KeresesLap from "./kereses/kereses-lap"
import StoreListaLap from "./store-lista-lap"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  kereses,
  gyoker,
  markak,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  /** A kereses szovege. Ures kereses eseten `undefined`, nem ures string. */
  kereses?: string
  /** A talalati lap gyoker-fule (`?gyoker=`), csak kereseskor. */
  gyoker?: string
  /** A marka-szuro (`?marka=`): a talalati lapon es a listan is. */
  markak?: string[]
}) => {
  const pageNumber = page ? parseInt(page) : 1

  /*
    KERESESKOR A TALALATI LAP ALL (P2, 4a, a 152:88 szerint), sajat fejjel,
    gyoker-fulekkel es Márka szurovel. Kereses nelkul a "Minden termék" lap
    a kozos lista-lapra kerul (`store-lista-lap.tsx`).
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
    <StoreListaLap
      countryCode={countryCode}
      sortBy={sortBy}
      page={Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1}
      optionValueIds={optionValueIds}
      markak={markak}
    />
  )
}

export default StoreTemplate
