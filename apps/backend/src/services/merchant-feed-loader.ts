import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  QueryContext,
  getVariantAvailability,
} from "@medusajs/framework/utils"

import { resolveBrandService } from "../api/admin/brands/helpers"
import {
  toMerchantItem,
  type MerchantFeedContext,
  type MerchantFeedProduct,
  type MerchantItem,
} from "./merchant-feed-item"

type Query = Parameters<typeof getVariantAvailability>[0]
type BrandReader = {
  listProductBrands(
    filters: { product_id: string[] },
    config: { take: number | null }
  ): Promise<{ product_id: string; os_brand_id: string }[]>
  listBrands(
    filters: { os_brand_id: string[] },
    config: { take: number | null }
  ): Promise<{ os_brand_id: string; name: string }[]>
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
  deps: { query: Query; brands: BrandReader },
  env: { storefrontUrl?: string }
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
  }
  return products.flatMap((product) =>
    (product.variants ?? [])
      .map((variant) => toMerchantItem(product, variant, context))
      .filter((item): item is MerchantItem => item !== null)
  )
}

/** The default dependencies from the request scope. */
export function merchantFeedDeps(scope: MedusaContainer) {
  return {
    query: scope.resolve(ContainerRegistrationKeys.QUERY) as Query,
    brands: resolveBrandService(scope) as unknown as BrandReader,
  }
}

async function brandNames(
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

async function categoryTree(
  query: Query
): Promise<MerchantFeedContext["categories"]> {
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
    // what the Store API hands the storefront: an internal or inactive
    // category's name is not for buyers (barracuda, #539)
    filters: { is_active: true, is_internal: false },
  })
  const tree: MerchantFeedContext["categories"] = {}
  for (const row of data as {
    id: string
    name: string
    parent_category_id: string | null
  }[])
    tree[row.id] = { name: row.name, parentId: row.parent_category_id }
  return tree
}
