import type { HttpTypes } from "@medusajs/types"

import { listCategories } from "@lib/data/categories"
import { listProductsWithSort } from "@lib/data/products"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import { termeklistaMezok } from "@lib/util/termeklista-mezok"
import { LAP_MERET } from "@modules/categories/templates/commerce/lista-lap"
import { vilagaTermeknek } from "@modules/products/components/lap-vaz/vilag-valto"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * THE PRODUCTS OF A LIST PAGE THAT IS NOT A CATEGORY (all products, a brand).
 *
 * One page of `LAP_MERET` products with the fields the cards read (the list
 * fields, the brand, and the categories: the card choice needs them), and the
 * function that picks the card per product. The card is the product page's
 * own decision (`vilagaTermeknek`: the roots from the product, else from the
 * catalogue), so a live animal keeps the live-animal card wherever it is
 * listed. `szuro` narrows the list: a brand (`collection_id`) or fixed
 * products (`id`).
 */
export async function listaTermekek({
  countryCode,
  page,
  sortBy,
  optionValueIds,
  szuro = {},
}: {
  countryCode: string
  page: number
  sortBy?: SortOptions
  optionValueIds?: OptionValueIds
  szuro?: { collection_id?: string[]; id?: string[] }
}): Promise<{
  products: HttpTypes.StoreProduct[]
  count: number
  eloAllatKartya: (product: HttpTypes.StoreProduct) => boolean
}> {
  const [
    {
      response: { products, count },
    },
    katalogus,
  ] = await Promise.all([
    listProductsWithSort({
      page,
      queryParams: {
        limit: LAP_MERET,
        fields: termeklistaMezok,
        ...(szuro.collection_id?.length
          ? { collection_id: szuro.collection_id }
          : {}),
        ...(szuro.id?.length ? { id: szuro.id } : {}),
      },
      sortBy,
      countryCode,
      optionValueIds,
    }),
    listCategories({ fields: "id,name,handle,parent_category_id" }),
  ])
  return {
    products,
    count,
    eloAllatKartya: (termek) =>
      vilagaTermeknek(termek, katalogus ?? []) === "sotet",
  }
}
