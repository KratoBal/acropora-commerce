import { MedusaContainer } from "@medusajs/framework"

import { CUSTOMER_TEXTS_MODULE } from "../../../modules/customer-texts"
import CustomerTextModuleService from "../../../modules/customer-texts/service"

export const resolveCustomerTextService = (
  scope: MedusaContainer
): CustomerTextModuleService => scope.resolve(CUSTOMER_TEXTS_MODULE)

/** The storefront's cache tag for the edited texts (the storefront's /api/revalidate knows it). */
export const CUSTOMER_TEXTS_TAG = "customer-texts"
