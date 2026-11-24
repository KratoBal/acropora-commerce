import { MedusaService } from "@medusajs/framework/utils"

import type { CustomerTextLocale } from "./catalog"
import CustomerText from "./models/customer-text"

/**
 * The edited customer texts (card 7bfca4eb). The OS sets or removes one key in one language at a time; the catalog check and the
 * slot check are the route's (`api/admin/customer-texts`), the unique index on (key, locale) is the store's guard.
 */
class CustomerTextModuleService extends MedusaService({ CustomerText }) {
  /** Every override, optionally of one language. */
  async listOverrides(locale?: CustomerTextLocale) {
    return this.listCustomerTexts(locale ? { locale } : {}, { take: null })
  }

  /** Writes one override (`value`) or removes it (`null`: back to the dictionary text). */
  async setOverride(key: string, locale: CustomerTextLocale, value: string | null) {
    const [existing] = await this.listCustomerTexts({ key, locale }, { take: 1 })
    if (value === null) {
      if (existing) await this.deleteCustomerTexts(existing.id)
      return null
    }
    if (existing) return this.updateCustomerTexts({ id: existing.id, value })
    return this.createCustomerTexts({ key, locale, value })
  }
}

export default CustomerTextModuleService
