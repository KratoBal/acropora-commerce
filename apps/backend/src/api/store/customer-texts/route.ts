import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { CUSTOMER_TEXT_LOCALES } from "../../../modules/customer-texts/catalog"
import { resolveCustomerTextService } from "../../admin/customer-texts/helpers"

/**
 * The edited customer texts of one language, as `{ key: text }` (card 7bfca4eb). Only the overrides: the storefront lays them on
 * its dictionary, so an empty answer means "the dictionary as it is". An unknown or missing `locale` is Hungarian.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const asked = String(req.query.locale ?? "hu")
  const locale = (CUSTOMER_TEXT_LOCALES as readonly string[]).includes(asked)
    ? (asked as (typeof CUSTOMER_TEXT_LOCALES)[number])
    : "hu"
  const rows = await resolveCustomerTextService(req.scope).listOverrides(locale)
  res.json({
    customer_texts: Object.fromEntries(rows.map((row) => [row.key, row.value])),
  })
}
