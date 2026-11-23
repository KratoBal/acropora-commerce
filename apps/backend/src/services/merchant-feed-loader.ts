import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  QueryContext,
  getVariantAvailability,
} from "@medusajs/framework/utils"

import { resolveBrandService } from "../api/admin/brands/helpers"
import { COMMERCE_SETTINGS_MODULE } from "../modules/commerce-settings"
import {
  FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY,
  normalizeCommerceSettingValue,
} from "../modules/commerce-settings/definitions"
import {
  inExcludedCategory,
  toMerchantItem,
  type MerchantFeedContext,
  type MerchantFeedProduct,
  type MerchantItem,
} from "./merchant-feed-item"

type Query = Parameters<typeof getVariantAvailability>[0]
export type BrandReader = {
  listProductBrands(
    filters: { product_id: string[] },
    config: { take: number | null }
  ): Promise<{ product_id: string; os_brand_id: string }[]>
  listBrands(
    filters: { os_brand_id: string[] },
    config: { take: number | null }
  ): Promise<{ os_brand_id: string; name: string }[]>
}

/** The feed reads one setting: the restock lead time (card 69d18bff). */
export type FeedSettingsReader = {
  listCommerceSettings(
    filters: { key: string },
    config: { take: number }
  ): Promise<{ key: string; value: unknown }[]>
}

/**
 * The lead time in days, or null when it is not set (no default, on purpose). A stored value that is not one (a hand
 * write past the Admin's validator) stops the feed as a configuration error, a 503 that names the setting, not a bare
 * 500 (barracuda, #812).
 */
export async function backorderLeadTimeDays(
  settings: FeedSettingsReader
): Promise<number | null> {
  const [row] = await settings.listCommerceSettings(
    { key: FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY },
    { take: 1 }
  )
  if (!row) return null
  try {
    return normalizeCommerceSettingValue(FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY, row.value)
  } catch (error) {
    throw new MerchantFeedConfigError(
      `The stored ${FEED_BACKORDER_LEAD_TIME_DAYS_SETTING_KEY} is not usable: ${(error as Error).message}`
    )
  }
}

const PAGE = 200

export const PRODUCT_FIELDS = [
  "id",
  "handle",
  "title",
  "description",
  "thumbnail",
  "metadata",
  "images.url",
  "collection.title",
  "categories.id",
  "sales_channels.id",
  "variants.id",
  "variants.sku",
  "variants.ean",
  "variants.upc",
  "variants.weight",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.value",
  "variants.calculated_price.*",
]

export class MerchantFeedConfigError extends Error {}

/**
 * THE FEED'S READ SIDE (SEO P1-13): every published product of the store's
 * default sales channel, priced in the store's default region, with the
 * channel's sellable quantities, the brand module's names and the category
 * tree; then the mapper. The default region and channel come from the store
 * record, the same ones the storefront sells in, so no new setting is needed.
 */
export async function loadMerchantItems(
  deps: {
    query: Query
    brands: BrandReader
    settings: FeedSettingsReader
    logger?: { info(message: string): void }
  },
  env: {
    storefrontUrl?: string
    now?: Date
    keepBackorder?: boolean
    excludedCategoryHandles?: readonly string[]
  }
): Promise<MerchantItem[]> {
  const storefrontUrl = env.storefrontUrl?.trim().replace(/\/+$/, "") ?? ""
  if (!/^https?:\/\//.test(storefrontUrl))
    throw new MerchantFeedConfigError(
      "ACROPORA_STOREFRONT_URL is not set: the feed has no product links."
    )
  const { query } = deps

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["default_region_id", "default_sales_channel_id"],
  })
  const regionId = stores[0]?.default_region_id
  const salesChannelId = stores[0]?.default_sales_channel_id
  if (!regionId || !salesChannelId)
    throw new MerchantFeedConfigError(
      "The store has no default region or sales channel."
    )
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { id: regionId },
  })
  const currency = regions[0]?.currency_code
  if (!currency)
    throw new MerchantFeedConfigError("The default region has no currency.")

  const products: MerchantFeedProduct[] = []
  for (let skip = 0; ; skip += PAGE) {
    const { data } = await query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { status: "published" },
      // the id breaks created_at ties: a batch import writes one created_at
      // for a whole batch, and offset paging on equal keys can repeat or
      // skip a product between pages (barracuda, #539)
      pagination: { skip, take: PAGE, order: { created_at: "ASC", id: "ASC" } },
      context: {
        variants: {
          calculated_price: QueryContext({
            region_id: regionId,
            currency_code: currency,
          }),
        },
      },
    })
    for (const product of data as (MerchantFeedProduct & {
      sales_channels?: { id: string }[] | null
    })[])
      if (product.sales_channels?.some((c) => c?.id === salesChannelId))
        products.push(product)
    if (data.length < PAGE) break
  }

  const variantIds = products.flatMap((p) => (p.variants ?? []).map((v) => v.id))
  const availability: Record<string, number> = {}
  if (variantIds.length) {
    const result = await getVariantAvailability(query, {
      variant_ids: variantIds,
      sales_channel_id: salesChannelId,
    })
    for (const [id, row] of Object.entries(result))
      availability[id] = Number(row.availability) || 0
  }

  const context: MerchantFeedContext = {
    storefrontUrl,
    availability,
    brands: await brandNames(
      deps.brands,
      products.map((p) => p.id)
    ),
    categories: await categoryTree(query),
    backorderLeadTimeDays: await backorderLeadTimeDays(deps.settings),
    now: env.now ?? new Date(),
    keepBackorder: env.keepBackorder === true,
    excludedCategoryHandles: new Set(env.excludedCategoryHandles ?? []),
    exclusionCategories: await exclusionTree(query, env.excludedCategoryHandles ?? []),
  }
  const left = products.filter((product) => inExcludedCategory(product, context))
  if (left.length)
    deps.logger?.info(
      `merchant feed: ${left.length} products left out by the excluded categories (${[
        ...context.excludedCategoryHandles!,
      ].join(", ")})`
    )
  return products.flatMap((product) =>
    (product.variants ?? [])
      .map((variant) => toMerchantItem(product, variant, context))
      .filter((item): item is MerchantItem => item !== null)
  )
}

/**
 * THE FEEDS' EXCLUDED CATEGORIES (card 87f351a3; acrobot 56923). The live animals by default: the three roots of the
 * shop's livestock tree. `MERCHANT_FEED_EXCLUDED_CATEGORY_HANDLES` overrides it (comma-separated handles), and `none`
 * leaves nothing out, so a policy reading that says otherwise is a setting, not a code change.
 */
export const DEFAULT_FEED_EXCLUDED_CATEGORY_HANDLES = ["halak", "korallok", "gerinctelenek"] as const

export function excludedCategoryHandlesFrom(env: Record<string, string | undefined>): string[] {
  const raw = env.MERCHANT_FEED_EXCLUDED_CATEGORY_HANDLES?.trim()
  if (!raw) return [...DEFAULT_FEED_EXCLUDED_CATEGORY_HANDLES]
  if (raw.toLowerCase() === "none") return []
  return raw
    .split(",")
    .map((handle) => handle.trim())
    .filter(Boolean)
}

/** The default dependencies from the request scope. */
export function merchantFeedDeps(scope: MedusaContainer) {
  return {
    query: scope.resolve(ContainerRegistrationKeys.QUERY) as Query,
    brands: resolveBrandService(scope) as unknown as BrandReader,
    settings: scope.resolve(COMMERCE_SETTINGS_MODULE) as FeedSettingsReader,
    logger: scope.resolve(ContainerRegistrationKeys.LOGGER) as { info(message: string): void },
  }
}

export async function brandNames(
  brands: BrandReader,
  productIds: string[]
): Promise<Record<string, string>> {
  if (!productIds.length) return {}
  const links = await brands.listProductBrands(
    { product_id: productIds },
    { take: null }
  )
  if (!links.length) return {}
  const rows = await brands.listBrands(
    { os_brand_id: [...new Set(links.map((l) => l.os_brand_id))] },
    { take: null }
  )
  const byOsId = new Map(rows.map((b) => [b.os_brand_id, b.name.trim()]))
  const names: Record<string, string> = {}
  for (const link of links) {
    const name = byOsId.get(link.os_brand_id)
    if (name) names[link.product_id] = name
  }
  return names
}

/**
 * THE WHOLE TREE FOR THE EXCLUSION (barracuda, #832): internal and inactive categories too, so a live animal under a
 * hidden sub-category is still caught. And every excluded handle must exist in it: a renamed or mistyped root would
 * otherwise empty the exclusion silently and send the live animals out, so it stops the feed as a configuration error
 * (503) instead. Not read when nothing is excluded.
 */
async function exclusionTree(
  query: Query,
  handles: readonly string[]
): Promise<MerchantFeedContext["exclusionCategories"]> {
  if (!handles.length) return undefined
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "parent_category_id"],
  })
  const tree: NonNullable<MerchantFeedContext["exclusionCategories"]> = {}
  for (const row of data as { id: string; handle?: string | null; parent_category_id: string | null }[])
    tree[row.id] = { parentId: row.parent_category_id, ...(row.handle ? { handle: row.handle } : {}) }
  const known = new Set(Object.values(tree).map((row) => row.handle))
  const unknown = handles.filter((handle) => !known.has(handle))
  if (unknown.length)
    throw new MerchantFeedConfigError(
      `MERCHANT_FEED_EXCLUDED_CATEGORY_HANDLES names categories the shop does not have (${unknown.join(", ")}): the feed would not leave them out.`
    )
  return tree
}

async function categoryTree(
  query: Query
): Promise<MerchantFeedContext["categories"]> {
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "parent_category_id"],
    // what the Store API hands the storefront: an internal or inactive
    // category's name is not for buyers (barracuda, #539)
    filters: { is_active: true, is_internal: false },
  })
  const tree: MerchantFeedContext["categories"] = {}
  for (const row of data as {
    id: string
    name: string
    handle?: string | null
    parent_category_id: string | null
  }[])
    tree[row.id] = {
      name: row.name,
      parentId: row.parent_category_id,
      ...(row.handle ? { handle: row.handle } : {}),
    }
  return tree
}
