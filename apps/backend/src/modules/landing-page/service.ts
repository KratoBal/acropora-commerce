import { MedusaService } from "@medusajs/framework/utils"

import LandingPage from "./models/landing-page"

export type LandingPageFilter = {
  category_ids: string[]
  os_brand_ids: string[]
  attribute_filters: { key: string; op: string; value?: unknown }[]
}

export type LandingPageInput = {
  handle: string
  title: string
  seo_title: string | null
  meta_description: string | null
  intro: string | null
  filter: LandingPageFilter
  is_published: boolean
}

class LandingPageModuleService extends MedusaService({ LandingPage }) {
  /**
   * The whole record by the OS landing id. The unique index on
   * `os_landing_id` is the real guard; the lookup keeps the common path off a
   * constraint error.
   */
  async upsertLandingPageByOsId(os_landing_id: string, input: LandingPageInput) {
    const [existing] = await this.listLandingPages(
      { os_landing_id },
      { take: 1 }
    )
    if (!existing) {
      const [created] = await this.createLandingPages([
        { os_landing_id, ...input, filter: { ...input.filter } },
      ])
      return created
    }
    const [updated] = await this.updateLandingPages([
      { id: existing.id, ...input, filter: { ...input.filter } },
    ])
    return updated
  }

  /** The OS deleted the page: the record goes (soft), `false` if none. */
  async deleteLandingPageByOsId(os_landing_id: string) {
    const [existing] = await this.listLandingPages(
      { os_landing_id },
      { take: 1 }
    )
    if (!existing) return false
    await this.softDeleteLandingPages([existing.id])
    return true
  }
}

export default LandingPageModuleService
