import { MedusaContainer } from "@medusajs/framework"

import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

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
