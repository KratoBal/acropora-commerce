import { MedusaContainer } from "@medusajs/framework"

import { LANDING_PAGE_MODULE } from "../../../modules/landing-page"
import LandingPageModuleService from "../../../modules/landing-page/service"

export const resolveLandingPageService = (
  scope: MedusaContainer
): LandingPageModuleService => scope.resolve(LANDING_PAGE_MODULE)

/**
 * The fields a buyer may see: no OS landing id, no publish flag, `updated_at`
 * kept. The filter's `os_brand_ids` DO go out, on purpose, unlike the brand
 * route's `forStore`: the shop's product-brand link is keyed by the OS brand
 * id, so that is what the landing's product list filters on (barracuda, #541).
 */
export const forStore = (page: {
  handle: string
  title: string
  seo_title: string | null
  meta_description: string | null
  intro: string | null
  filter: unknown
  updated_at?: Date | string | null
}) => ({
  handle: page.handle,
  title: page.title,
  seo_title: page.seo_title,
  meta_description: page.meta_description,
  intro: page.intro,
  filter: page.filter,
  updated_at: page.updated_at ?? null,
})
