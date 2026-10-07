"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback } from "react"

import { aktualisKeres } from "@lib/util/aktualis-keres"

import { OPTION_VALUE_QUERY_KEY } from "@lib/util/product-option-filters"
import OptionsPicker from "./options-picker"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  /**
   * A kivalasztott opcio-ertekek, a SZERVERTOL (a lap mar ertelmezte a
   * cimet). FE-7: a render nem olvas `useSearchParams`-t, mert az egy
   * statikus lapon kivenne a komponenst a HTML-bol.
   */
  selectedOptionValueIds?: string[]
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  hideOptionsPicker = false,
  selectedOptionValueIds = [],
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      // FE-7: a cimet itt olvassuk, nem `useSearchParams`-szal (`aktualis-keres.ts`).
      const params = aktualisKeres()
      const currentQuery = params.toString()
      updater(params)

      params.delete("page")

      const queryString = params.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
      }
    },
    [pathname, router],
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) =>
        params.append(OPTION_VALUE_QUERY_KEY, valueId),
      )
    })

  return (
    <div className="flex flex-col gap-12 py-4 mb-8 small:px-0 pl-6 small:min-w-[250px] small:ml-[1.675rem]">
      <SortProducts
        sortBy={sortBy}
        setQueryParams={setQueryParams}
        data-testid={dataTestId}
      />
      {!hideOptionsPicker && (
        <OptionsPicker
          selectedValueIds={selectedOptionValueIds}
          setOptionValueIds={setOptionValueIds}
        />
      )}
    </div>
  )
}

export default RefinementList
