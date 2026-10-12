import { MedusaService } from "@medusajs/framework/utils"

import Brand from "./models/brand"
import ProductBrand from "./models/product-brand"

export type BrandInput = {
  name: string
  handle: string
  description: string | null
  intro: string | null
  seo_title: string | null
  meta_description: string | null
  logo_url: string | null
  website_url: string | null
}

class BrandModuleService extends MedusaService({ Brand, ProductBrand }) {
  /**
   * The whole record by the OS brand id. The unique index on `os_brand_id` is
   * the real guard; the lookup keeps the common path off a constraint error.
   */
  async upsertBrandByOsId(os_brand_id: string, input: BrandInput) {
    const [existing] = await this.listBrands({ os_brand_id }, { take: 1 })
    if (!existing) {
      const [created] = await this.createBrands([{ os_brand_id, ...input }])
      return created
    }
    const [updated] = await this.updateBrands([{ id: existing.id, ...input }])
    return updated
  }

  /** `null` removes the product's brand; the brand record itself stays. */
  async setProductBrand(product_id: string, os_brand_id: string | null) {
    const [existing] = await this.listProductBrands(
      { product_id },
      { take: 1 }
    )
    if (os_brand_id === null) {
      if (existing) await this.deleteProductBrands([existing.id])
      return null
    }
    if (!existing) {
      const [created] = await this.createProductBrands([
        { product_id, os_brand_id },
      ])
      return created
    }
    if (existing.os_brand_id === os_brand_id) return existing
    const [updated] = await this.updateProductBrands([
      { id: existing.id, os_brand_id },
    ])
    return updated
  }
}

export default BrandModuleService
