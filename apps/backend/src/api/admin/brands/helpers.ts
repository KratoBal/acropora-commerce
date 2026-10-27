import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"
import {
  revalidateCoalescer,
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../../../workflows/utils/storefront-revalidate"

export const resolveBrandService = (
  scope: MedusaContainer
): BrandModuleService => scope.resolve(BRAND_MODULE)

/** The fields a buyer may see: no OS id, no timestamps but `updated_at`. */
export const forStore = (brand: {
  name: string
  handle: string
  description: string | null
  intro: string | null
  seo_title: string | null
  meta_description: string | null
  logo_url: string | null
  website_url: string | null
  updated_at?: Date | string | null
}) => ({
  name: brand.name,
  handle: brand.handle,
  description: brand.description,
  intro: brand.intro,
  seo_title: brand.seo_title,
  meta_description: brand.meta_description,
  logo_url: brand.logo_url,
  website_url: brand.website_url,
  updated_at: brand.updated_at ?? null,
})

/**
 * THE STOREFRONT'S BRAND CACHE, EMPTIED AFTER A BRAND WRITE (kezdolap-marka-sav,
 * 2026-10-27). The storefront keeps the brand list and the brand pages under
 * the `brands` tag for 300 s, and nothing emptied it: after the OS wrote the
 * brands and the product links, the home page's logo strip showed the old
 * names until the cached empty list expired (measured on the test shop).
 *
 * Both writers call this: the brand record (`PUT /admin/brands/:os_brand_id`)
 * and the product link (`PUT /admin/product-brands/:product_id`), since the
 * store list offers only brands with products. One brand-links run writes
 * hundreds of links, so the calls are coalesced into one per window, as the
 * product events are. Without ACROPORA_STOREFRONT_URL and
 * STOREFRONT_REVALIDATE_SECRET it does nothing; a failed call is logged and
 * never thrown (the cache expires on its own).
 */
export const BRANDS_REVALIDATE_WINDOW_MS = 3_000

let brandsCoalescer: ReturnType<typeof revalidateCoalescer> | null = null

export const requestBrandsRevalidate = (
  scope: MedusaContainer,
  env: NodeJS.ProcessEnv = process.env
): void => {
  const config = storefrontRevalidateConfig(env)
  if (!config) return
  const logger = scope.resolve(ContainerRegistrationKeys.LOGGER)
  brandsCoalescer ??= revalidateCoalescer(
    () => sendStorefrontRevalidate(config, logger, undefined, ["brands"]),
    BRANDS_REVALIDATE_WINDOW_MS
  )
  brandsCoalescer.request()
}

/** For tests: forget the window, so each case starts with none. */
export const resetBrandsRevalidate = (): void => {
  brandsCoalescer = null
}
