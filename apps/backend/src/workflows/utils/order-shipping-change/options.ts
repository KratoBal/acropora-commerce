import type { ShippingPricingSettings } from "../../../modules/commerce-settings/accessor"
import type { ShippingClass } from "../compute-shipping-class"
import type { PaymentRole } from "../payment-eligibility"
import { SHIPPING_ROLE_PAYMENTS } from "../payment-eligibility"
import { isRoleAllowedFor } from "../shipping-eligibility"
import { calculateShippingPrice } from "../shipping-pricing"
import { glsPointOptionOf, resolveShippingOptionRoleBindings } from "../shipping-option-roles"

/**
 * THE COURIER METHODS A PLACED ORDER MAY CHANGE TO (card 0a14f739, C/2), by
 * the checkout's own rules: the order's shipping class (`ROLE_ELIGIBILITY`),
 * its payment (`SHIPPING_ROLE_PAYMENTS`: cash on delivery only where allowed),
 * and the checkout's price calculator (role, goods total, the settings, the
 * free-shipping threshold). In-store pickup is not offered in this round: it
 * would make a different kind of order (its payments, its mails).
 */
export type CourierOption = {
  id: string
  name: string
  /** The order's shipping fee with this method, forint. */
  amount: number
  carrier: "gls" | "foxpost"
  needs_point: boolean
  heavy: boolean
}

export const courierOptions = (input: {
  shippingClass: ShippingClass
  paymentRole: PaymentRole | null
  goodsTotalHuf: number
  settings: ShippingPricingSettings
  /** The options' names as the shop shows them, by id; an option without a name is not offered. */
  names: Record<string, string>
  env?: NodeJS.ProcessEnv
}): CourierOption[] => {
  const env = input.env ?? process.env
  return resolveShippingOptionRoleBindings(env)
    .filter((binding) => binding.role !== "PICKUP")
    .filter((binding) => isRoleAllowedFor(binding.role, input.shippingClass))
    .filter((binding) => !input.paymentRole || SHIPPING_ROLE_PAYMENTS[binding.role].includes(input.paymentRole))
    .filter((binding) => typeof input.names[binding.id] === "string")
    .map((binding) => {
      const glsPoint = glsPointOptionOf(binding.id, env)
      return {
        id: binding.id,
        name: input.names[binding.id],
        amount: calculateShippingPrice({ role: binding.role, goodsTotalHuf: input.goodsTotalHuf, settings: input.settings }),
        carrier: binding.role === "FOXPOST" ? ("foxpost" as const) : ("gls" as const),
        needs_point: binding.role === "FOXPOST" || !!glsPoint,
        heavy: binding.role === "GLS_HEAVY",
      }
    })
}
