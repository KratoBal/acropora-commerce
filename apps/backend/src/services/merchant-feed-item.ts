/**
 * THE MERCHANT FEED MAPPER (SEO P1-13, plan C11): one Medusa variant to one
 * Google Merchant item, or `null` when it cannot be listed. Pure: the loader
 * (`merchant-feed-loader.ts`) reads Medusa, this decides, and a transport
 * serializes it (today the XML route; later the Merchant API, on this same
 * mapper).
 *
 * The rules follow what the shop itself shows, so the feed never claims more
 * than the page: the price is the one the buyer sees in the default region,
 * the availability is the storefront's `inStock` rule, a used item is the
 * storefront's `hasznaltE` rule, and a GTIN is only an `ean`/`upc` with a
 * valid check digit (the storefront JSON-LD's `valtozatGtin`).
 *
 * NOT HERE, on purpose: `mpn` (a Medusa variant has no manufacturer part
 * number, and P0 PR 4 brought none); product facts (plan C2: only
 * `merchantVisible` facts may go, and the commerce fact model has no such
 * flag); `google_product_category` (optional, would need a taxonomy mapping);
 * shipping and tax (account settings, not feed fields).
 */

import { unitPriceFromName } from "./unit-price"

export type MerchantFeedVariant = {
  id: string
  sku?: string | null
  ean?: string | null
  upc?: string | null
  weight?: number | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  options?: { value?: string | null }[] | null
  calculated_price?: {
    calculated_amount?: number | null
    original_amount?: number | null
    currency_code?: string | null
  } | null
}

export type MerchantFeedProduct = {
  id: string
  handle: string
  title: string
  description?: string | null
  thumbnail?: string | null
  images?: { url?: string | null }[] | null
  collection?: { title?: string | null } | null
  categories?: { id: string }[] | null
  metadata?: Record<string, unknown> | null
  variants?: MerchantFeedVariant[] | null
}

export type MerchantFeedContext = {
  /** The storefront's base URL, without a trailing slash. */
  storefrontUrl: string
  /** The sellable quantity per variant id in the default sales channel. */
  availability: Record<string, number>
  /** The brand name per product id, from the brand module. */
  brands: Record<string, string>
  /** Every category by id, to build the path up to the root. */
  categories: Record<string, { name: string; parentId: string | null }>
  /**
   * The restock lead time in days (`feed_backorder_lead_time_days`), or null when it is not set: a
   * backorderable item at zero stock then goes as `out_of_stock` (card 69d18bff).
   */
  backorderLeadTimeDays: number | null
  /** When the feed is built: the base of a backorder item's `availability_date`. */
  now: Date
  /**
   * Keep a backorderable item at zero stock as `backorder` without a date (the Meta catalog, card 87f351a3): Meta
   * names it "available for order" and asks for no ship day, so the Google rule above does not apply there.
   */
  keepBackorder?: boolean
}

export type MerchantItem = {
  id: string
  item_group_id?: string
  title: string
  description: string
  link: string
  image_link: string
  additional_image_link: string[]
  price: string
  sale_price?: string
  availability: "in_stock" | "out_of_stock" | "backorder"
  /** Required by Google with `backorder`: the day it ships. Only with a set lead time. */
  availability_date?: string
  condition: "new" | "used"
  brand?: string
  gtin?: string
  identifier_exists?: "no"
  product_type?: string
  shipping_weight?: string
  /**
   * The pack size read from the name ("25g", "3785ml"), for Google's unit
   * price (`unit-price.ts`). Only where the name carries exactly one clear
   * quantity; Google computes the unit price from this and the price. The base
   * measure is not sent: its list of allowed values was not verified, and the
   * attribute is optional.
   */
  unit_pricing_measure?: string
}

const TITLE_MAX = 150
const DESCRIPTION_MAX = 5000
const ADDITIONAL_IMAGES_MAX = 10

/**
 * A product's own robots decision (card cc404355, t13): a hand-written UNAS
 * Meta block can say `noindex`, and the OS projects it as
 * `metadata.seo_robots`. A product we tell search engines not to index is
 * not offered to Google Shopping either; the storefront reads the same field
 * (`termekRobotsJel`).
 */
export function productIsNoindex(product: {
  metadata?: Record<string, unknown> | null
}): boolean {
  const value = product.metadata?.seo_robots
  // `none` is `noindex, nofollow` in the robots standard (barracuda #548)
  return typeof value === "string" && /\b(noindex|none)\b/i.test(value)
}

export function toMerchantItem(
  product: MerchantFeedProduct,
  variant: MerchantFeedVariant,
  context: MerchantFeedContext
): MerchantItem | null {
  if (productIsNoindex(product)) return null
  const id = variant.sku?.trim()
  if (!id) return null
  const images = imagesOf(product)
  if (!images.length) return null
  const amount = variant.calculated_price?.calculated_amount
  const currency = variant.calculated_price?.currency_code
  if (typeof amount !== "number" || !currency) return null

  const multi = (product.variants?.length ?? 0) > 1
  const original = variant.calculated_price?.original_amount
  const onSale = typeof original === "number" && original > amount
  const path = categoryPath(product, context)
  const gtin = variantGtin(variant)
  const brand = context.brands[product.id] ?? product.collection?.title?.trim()
  const fullTitle = titleOf(product, variant, multi)
  const measure = unitPriceFromName(fullTitle, amount)?.feedMeasure

  return {
    id,
    ...(multi ? { item_group_id: product.handle } : {}),
    title: cut(fullTitle, TITLE_MAX),
    description: cut(
      plainText(product.description ?? "") || product.title,
      DESCRIPTION_MAX
    ),
    link: `${context.storefrontUrl}/hu/termek/${encodeURIComponent(product.handle)}`,
    image_link: images[0],
    additional_image_link: images.slice(1, 1 + ADDITIONAL_IMAGES_MAX),
    price: money(onSale ? original : amount, currency),
    ...(onSale ? { sale_price: money(amount, currency) } : {}),
    ...feedAvailability(
      availabilityOf(variant, context.availability[variant.id] ?? 0),
      context
    ),
    condition: path.some((name) => /haszn[aá]lt/i.test(name)) ? "used" : "new",
    ...(brand ? { brand } : {}),
    ...(gtin ? { gtin } : { identifier_exists: "no" as const }),
    ...(path.length ? { product_type: path.join(" > ") } : {}),
    ...(typeof variant.weight === "number" && variant.weight > 0
      ? { shipping_weight: `${variant.weight} g` }
      : {}),
    ...(measure ? { unit_pricing_measure: measure } : {}),
  }
}

/**
 * The storefront's rule (`availability.ts`, acrobot 15874): a variant is
 * sellable when its stock is not managed, when it has stock, or when it may
 * be ordered without stock. The last one is a backorder in Merchant terms.
 */
/**
 * WHAT THE FEED MAY SAY ABOUT A BACKORDERABLE ITEM (card 69d18bff; acrobot 56624). Google requires an
 * `availability_date` with `backorder` (support.google.com/merchants/answer/6324448), and the OS holds no lead
 * time anyone reads. So without the setting the item is `out_of_stock`; with it, `backorder` and the day that
 * many days after the feed is built, as an ISO 8601 date at midnight UTC.
 */
export function feedAvailability(
  availability: MerchantItem["availability"],
  context: Pick<MerchantFeedContext, "backorderLeadTimeDays" | "now" | "keepBackorder">
): Pick<MerchantItem, "availability" | "availability_date"> {
  if (availability !== "backorder") return { availability }
  if (context.keepBackorder) return { availability }
  const days = context.backorderLeadTimeDays
  if (!days) return { availability: "out_of_stock" }
  const day = new Date(context.now.getTime() + days * 24 * 60 * 60 * 1000)
  return {
    availability: "backorder",
    availability_date: `${day.toISOString().slice(0, 10)}T00:00Z`,
  }
}

export function availabilityOf(
  variant: Pick<MerchantFeedVariant, "manage_inventory" | "allow_backorder">,
  quantity: number
): MerchantItem["availability"] {
  if (variant.manage_inventory === false || quantity > 0) return "in_stock"
  return variant.allow_backorder ? "backorder" : "out_of_stock"
}

/**
 * A valid GTIN (GS1): 8, 12, 13 or 14 digits with a matching check digit.
 * The same rule as the storefront's `ervenyesGtin`.
 */
export function validGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false
  const digits = code.split("").map(Number)
  const check = digits.pop()!
  const sum = digits
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

/** The `ean`, then the `upc`: the first valid GTIN (P0 PR 4 fills them). */
export function variantGtin(
  variant: Pick<MerchantFeedVariant, "ean" | "upc">
): string | null {
  for (const raw of [variant.ean, variant.upc]) {
    const code = raw?.trim()
    if (code && validGtin(code)) return code
  }
  return null
}

function titleOf(
  product: MerchantFeedProduct,
  variant: MerchantFeedVariant,
  multi: boolean
): string {
  const values = (variant.options ?? [])
    .map((option) => option.value?.trim())
    .filter(Boolean)
  return multi && values.length
    ? `${product.title} (${values.join(", ")})`
    : product.title
}

function imagesOf(product: MerchantFeedProduct): string[] {
  const urls = [product.thumbnail, ...(product.images ?? []).map((i) => i.url)]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url && /^https?:\/\//.test(url)))
  return [...new Set(urls)]
}

/**
 * The storefront's classification path (`besorolasUt`): of the product's
 * categories, the longest chain up to the root, the first one on a tie. The
 * breadcrumb and the page's used/new come from this same path, so the feed's
 * `product_type` and `condition` say what the page says. Only categories in
 * the context count: the loader gives only active, public ones, as the Store
 * API does.
 */
function categoryPath(
  product: MerchantFeedProduct,
  context: MerchantFeedContext
): string[] {
  let longest: string[] = []
  for (const { id } of product.categories ?? []) {
    const path: string[] = []
    const seen = new Set<string>()
    let currentId: string | null = id
    while (currentId && !seen.has(currentId)) {
      const current: MerchantFeedContext["categories"][string] | undefined =
        context.categories[currentId]
      if (!current) break
      seen.add(currentId)
      path.unshift(current.name)
      currentId = current.parentId
    }
    if (path.length > longest.length) longest = path
  }
  return longest
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function money(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`
}

function cut(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd()
}
