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
 * On a phone (below `small`) the list is two columns with a compact card, as the
 * old live-animal list was: eight square cards in one column are about 5000 px.
 *
 * A sold piece stays on the list, its photo dimmed and its price struck through: the
 * visitor sees what the shop had, and the card still leads to the product page.
 */
export default function EloAllatKartya({
  product,
  elso = false,
  t = translator("hu"),
  tomor = true,
}: {
  product: HttpTypes.StoreProduct
  /** The first card of the list: its image is not lazy (FE-3). */
  elso?: boolean
  /** The page's translator (Hungarian when the caller has none). */
  t?: Translate
  /**
   * COMPACT BELOW `small` (the default): the live-animal list is two columns
   * on a phone, so the card's type is small there. A list that mixes both
   * worlds (all products) keeps its one column and the technical card's sizes
   * at every width: it passes false, and the live card then reads the same.
   */
  tomor?: boolean
}) {
  /** The compact class below `small`, else the full-size one at every width. */
  const m = (tomorOsztaly: string, rendes: string) =>
    tomor ? tomorOsztaly : rendes
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
        <div className="relative aspect-square overflow-hidden bg-acr-white">
          {/* only the photo dims on a sold piece: the badge stays legible */}
          <div className={"h-full " + (eladva ? "opacity-55" : "")}>
            <Thumbnail
              alt={product.title ?? ""}
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              className="h-full rounded-none p-0 shadow-none"
              prioritas={elso}
            />
          </div>
          {jelveny ? (
            <span
              className={
                m(
                  "absolute left-2 top-2 z-10 inline-flex h-[22px] items-center px-2 text-[9.5px] font-medium uppercase tracking-[1px] small:left-3 small:top-3 small:h-[28px] small:px-3 small:text-[10px] small:tracking-[1.8px] ",
                  "absolute left-3 top-3 z-10 inline-flex h-[28px] items-center px-3 text-[10px] font-medium uppercase tracking-[1.8px] ",
                ) +
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
        <div
          className={
            "flex flex-1 flex-col " +
            m(
              "px-[10px] pt-[10px] small:px-[14px] small:pt-[14px]",
              "px-[14px] pt-[14px]",
            )
          }
        >
          <h2
            className={
              "text-acr-ink " +
              m(
                "text-[14px] font-semibold leading-[18px] small:text-[18px] small:font-bold small:leading-[22px] small:tracking-[-0.2px]",
                "text-[18px] font-bold leading-[22px] tracking-[-0.2px]",
              )
            }
          >
            {product.title}
          </h2>
          {product.subtitle ? (
            <p
              className={
                "italic text-acr-slate " +
                m(
                  "mt-1 text-[12px] leading-[16px] small:mt-[6px] small:text-[14px] small:leading-[20px]",
                  "mt-[6px] text-[14px] leading-[20px]",
                )
              }
            >
              {product.subtitle}
            </p>
          ) : null}
          <div className="min-h-[18px] flex-1" />
          {cheapestPrice ? (
            <p
              className={
                "text-acr-ink " +
                m(
                  "text-[16px] leading-[22px] small:text-[24px] small:leading-[30px] small:tracking-[-0.3px] ",
                  "text-[24px] leading-[30px] tracking-[-0.3px] ",
                ) +
                (eladva ? "font-normal line-through" : "font-bold")
              }
              data-testid="kartya-ar"
            >
              {cheapestPrice.calculated_price}
            </p>
          ) : null}
        </div>
      </LocalizedClientLink>
      <div
        className={m(
          "px-[10px] pb-[10px] pt-2 small:px-[14px] small:pb-[14px] small:pt-3",
          "px-[14px] pb-[14px] pt-3",
        )}
      >
        <LocalizedClientLink
          href={href}
          className={
            "flex items-center justify-center font-medium " +
            m(
              "h-[38px] text-[13px] small:h-[44px] small:text-[14px] ",
              "h-[44px] text-[14px] ",
            ) +
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
