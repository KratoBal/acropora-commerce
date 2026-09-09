import { listProductsWithSort } from "@lib/data/products"
import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import UniquePieceBadge from "@modules/products/components/unique-piece-badge"
import {
  anyVariantPurchasable,
  availabilityOf,
  inventoryKnownOf,
  uniquePieceOf,
} from "@modules/products/components/stock-state/availability"
import { Pagination } from "@modules/store/components/pagination"
import { HttpTypes } from "@medusajs/types"

import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import type { CategoryPageKind } from "./category-page-data"

const PRODUCT_LIMIT = 12

function ProductCard({
  product,
  kind,
}: {
  product: HttpTypes.StoreProduct
  kind: CategoryPageKind
}) {
  const firstVariant = product.variants?.[0]
  const availability = availabilityOf({
    inStock: anyVariantPurchasable(product),
    uniquePiece: uniquePieceOf(product.metadata),
    inventoryKnown: inventoryKnownOf(product),
  })
  const sold = kind === "livestock" && availability === "ELADVA"
  const { cheapestPrice } = getProductPrice({ product })

  return (
    <article data-testid={`category-product-card-${kind}`}>
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group"
      >
        <div className={sold ? "opacity-55" : ""}>
          <div className="relative">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              className="aspect-square rounded-none p-0"
            />
            {kind === "livestock" &&
            uniquePieceOf(product.metadata) &&
            !sold ? (
              <UniquePieceBadge />
            ) : null}
            {kind === "livestock" && sold ? (
              <span
                className="absolute left-3 top-3 z-10 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--terv-hatter-lap)",
                  color: "var(--terv-szoveg)",
                }}
              >
                ELKELT
              </span>
            ) : null}
            {kind === "livestock" &&
            firstVariant?.inventory_quantity === 2 &&
            !sold ? (
              <span
                className="absolute left-3 top-3 z-10 px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--terv-kiemel)",
                  color: "var(--terv-kiemel-szoveg)",
                }}
              >
                2 db
              </span>
            ) : null}
          </div>
          <div className="mt-4 space-y-2">
            {kind === "technical" && firstVariant?.sku ? (
              <p
                className="text-xs uppercase tracking-wide"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {firstVariant.sku}
              </p>
            ) : null}
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--terv-szoveg)" }}
            >
              {product.title}
            </h2>
            {kind === "livestock" && product.subtitle ? (
              <p
                className="text-sm italic"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {product.subtitle}
              </p>
            ) : null}
            {kind === "technical" && product.subtitle ? (
              <p
                className="text-sm"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {product.subtitle}
              </p>
            ) : null}
            {cheapestPrice ? (
              <p
                className={
                  sold ? "text-base line-through" : "text-base font-semibold"
                }
                style={{ color: "var(--terv-szoveg)" }}
              >
                {cheapestPrice.calculated_price}
              </p>
            ) : null}
            {kind === "technical" ? (
              <p
                className="flex items-center gap-2 text-sm"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background:
                      availability === "KAPHATO"
                        ? "var(--terv-kiemel)"
                        : "var(--terv-szoveg-halvany)",
                  }}
                />
                {availability === "KAPHATO" ? "Elérhető" : "Nincs raktáron"}
              </p>
            ) : null}
          </div>
        </div>
        <span
          className="mt-4 inline-flex min-h-10 items-center justify-center border px-4 text-sm font-semibold"
          style={{
            borderColor: "var(--terv-kiemel)",
            color: "var(--terv-szoveg)",
          }}
        >
          {sold ? "Hasonlót keresek" : "Kosárba"}
        </span>
      </LocalizedClientLink>
    </article>
  )
}

export default async function CategoryProducts({
  categoryId,
  countryCode,
  page,
  sortBy,
  optionValueIds,
  kind,
}: {
  categoryId: string
  countryCode: string
  page: number
  sortBy?: SortOptions
  optionValueIds?: OptionValueIds
  kind: CategoryPageKind
}) {
  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams: { category_id: [categoryId], limit: PRODUCT_LIMIT },
    sortBy,
    countryCode,
    optionValueIds,
  })
  const totalPages = Math.ceil(count / PRODUCT_LIMIT)
  const remaining = Math.max(count - page * PRODUCT_LIMIT, 0)

  if (!products.length) {
    return (
      <p
        data-testid="category-products-empty"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        Ebben a kategóriában még nincs megjeleníthető termék.
      </p>
    )
  }

  return (
    <>
      <ul
        className="grid grid-cols-2 gap-x-4 gap-y-9 medium:grid-cols-3"
        data-testid="category-products-list"
      >
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} kind={kind} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <div className="hidden small:block">
          <Pagination
            data-testid="category-product-pagination"
            page={page}
            totalPages={totalPages}
          />
        </div>
      ) : null}
      {remaining > 0 ? (
        <a
          className="mt-8 flex min-h-12 items-center justify-center border text-sm font-semibold"
          style={{
            borderColor: "var(--terv-kiemel)",
            color: "var(--terv-szoveg)",
          }}
          href={`?page=${page + 1}`}
          data-testid="category-more-products"
        >
          További {remaining} tétel
        </a>
      ) : null}
    </>
  )
}
