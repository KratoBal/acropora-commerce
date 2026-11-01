import { HttpTypes } from "@medusajs/types"

import { translator, type Translate } from "@lib/i18n/dictionary"
import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import {
  anyVariantPurchasable,
  availabilityOf,
  inventoryKnownOf,
  uniquePieceOf,
} from "@modules/products/components/stock-state/availability"

/**
 * THE LIVE-ANIMAL PRODUCT CARD (coral, fish, invertebrate lists).
 *
 * The same family as the technical card (`termek-kartya.tsx`): the light
 * `acr-` tokens, a bordered card, the image on top, the name, the price and
 * one button. What differs is what a live animal needs on the list:
 *
 *   - the badge on the photo: "Sold" (a unique piece that is gone), "1 pc ·
 *     Unique piece", or "{n} left" at exactly two pieces. Same rules as the
 *     old list (`category-products.tsx`), only drawn in the new tokens;
 *   - the subtitle in italics (the Latin name), not a brand line;
 *   - no quick add to cart: a live animal is bought on its page, where the
 *     pickup promise and the unique-piece sentence are, so the button is
 *     "Details", or "Find a similar one" for a sold piece.
 *
 * A sold piece stays on the list, dimmed, with its price struck through: the
 * visitor sees what the shop had, and the card still leads to the product page.
 */
export default function EloAllatKartya({
  product,
  elso = false,
  t = translator("hu"),
}: {
  product: HttpTypes.StoreProduct
  /** The first card of the list: its image is not lazy (FE-3). */
  elso?: boolean
  /** The page's translator (Hungarian when the caller has none). */
  t?: Translate
}) {
  const firstVariant = product.variants?.[0]
  const egyedi = uniquePieceOf(product.metadata)
  const eladva =
    availabilityOf({
      inStock: anyVariantPurchasable(product),
      uniquePiece: egyedi,
      inventoryKnown: inventoryKnownOf(product),
    }) === "ELADVA"
  const { cheapestPrice } = getProductPrice({ product })
  const href = `/termek/${product.handle}`

  // one badge at most, in the order the old list used
  const jelveny = eladva
    ? t("category.sold")
    : egyedi
      ? t("category.uniquePiece")
      : firstVariant?.inventory_quantity === 2
        ? t("category.piecesLeft", { count: 2 })
        : null

  return (
    <article
      className="flex h-full flex-col border border-acr-line bg-acr-shell"
      data-testid="category-product-card-livestock"
    >
      <LocalizedClientLink href={href} className="group flex flex-1 flex-col">
        <div className={eladva ? "opacity-55" : ""}>
          <div className="relative aspect-square overflow-hidden bg-acr-white">
            <Thumbnail
              alt={product.title ?? ""}
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              className="h-full rounded-none p-0 shadow-none"
              prioritas={elso}
            />
            {jelveny ? (
              <span
                className={
                  "absolute left-3 top-3 z-10 inline-flex h-[28px] items-center px-3 text-[10px] font-medium uppercase tracking-[1.8px] " +
                  (eladva
                    ? "bg-acr-white text-acr-ink"
                    : "bg-acr-heritage text-acr-white")
                }
                data-testid="kartya-jelveny"
              >
                {jelveny}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col px-[14px] pt-[14px]">
          <h2 className="text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-acr-ink">
            {product.title}
          </h2>
          {product.subtitle ? (
            <p className="mt-[6px] text-[14px] italic leading-[20px] text-acr-slate">
              {product.subtitle}
            </p>
          ) : null}
          <div className="min-h-[18px] flex-1" />
          {cheapestPrice ? (
            <p
              className={
                "text-[24px] leading-[30px] tracking-[-0.3px] text-acr-ink " +
                (eladva ? "font-normal line-through" : "font-bold")
              }
              data-testid="kartya-ar"
            >
              {cheapestPrice.calculated_price}
            </p>
          ) : null}
        </div>
      </LocalizedClientLink>
      <div className="px-[14px] pb-[14px] pt-3">
        <LocalizedClientLink
          href={href}
          className={
            "flex h-[44px] items-center justify-center text-[14px] font-medium " +
            (eladva
              ? "border border-acr-line bg-acr-white text-acr-ink"
              : "bg-acr-heritage text-acr-white")
          }
          data-testid="kartya-reszletek"
        >
          {eladva ? t("category.findSimilar") : t("category.details")}
        </LocalizedClientLink>
      </div>
    </article>
  )
}
