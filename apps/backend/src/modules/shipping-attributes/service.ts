import { MedusaService } from "@medusajs/framework/utils"

import ShippingAttribute from "./models/shipping-attribute"

/**
 * Generated surface used by the admin routes today and by the Acropora OS
 * synchronization later:
 *
 * - listShippingAttributes / listAndCountShippingAttributes
 * - retrieveShippingAttribute
 * - createShippingAttributes
 * - updateShippingAttributes
 * - deleteShippingAttributes / softDeleteShippingAttributes / restoreShippingAttributes
 *
 * Verified against the compiled module rather than assumed.
 */
class ShippingAttributesModuleService extends MedusaService({
  ShippingAttribute,
}) {}

export default ShippingAttributesModuleService
