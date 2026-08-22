import {
  PaymentRole,
  allowedPaymentRolesFor,
} from "./payment-eligibility"
import { ShippingOptionRole } from "./shipping-eligibility"
import { buildShippingOptionRoleMap } from "./shipping-option-roles"
import { buildProviderRoleMap, resolvePaymentRole } from "./payment-providers"
import {
  getCashOnDeliveryFee,
  resolveCashOnDeliveryFeeAmount,
} from "./cod-fee"

export type CartPaymentContext = {
  shipping_roles: ShippingOptionRole[]
  allowed_payment_roles: PaymentRole[]
  selected_payment_role: PaymentRole | null
  cash_on_delivery_fee: number
}

/**
 * Nullable entries everywhere, because Medusa's generated Query types return
 * `Maybe<T>[]`. Accepting that shape here means no caller has to cast, and the
 * functions below drop the nulls once.
 */
export type CartForPayment = {
  id?: string
  shipping_methods?:
    | ({ id?: string | null; shipping_option_id?: string | null } | null)[]
    | null
  payment_collection?: {
    payment_sessions?: ({ provider_id?: string | null } | null)[] | null
  } | null
}

/**
 * Turns the selected shipping options into shipping roles.
 *
 * An option that is not in the role table yields no role. That is not an error:
 * the demo options shipped with the Medusa starter are deliberately outside the
 * Acropora logic. It does mean an unknown option offers no payment method,
 * which fails closed.
 */
export const resolveShippingRoles = (
  cart: CartForPayment,
  roleMap: Map<string, ShippingOptionRole>
): ShippingOptionRole[] => {
  const roles = (cart?.shipping_methods ?? [])
    .map((method) => method?.shipping_option_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((id) => roleMap.get(id))
    .filter((role): role is ShippingOptionRole => !!role)

  return Array.from(new Set(roles))
}

/**
 * The selected payment method, taken from the payment sessions on the cart.
 *
 * More than one distinct role among the sessions means the selection is
 * ambiguous, and an ambiguous selection must not trigger a fee, so it resolves
 * to nothing.
 */
export const resolveSelectedPaymentRole = (
  cart: CartForPayment,
  providerRoles: Map<string, PaymentRole>
): PaymentRole | null => {
  const roles = Array.from(
    new Set(
      (cart?.payment_collection?.payment_sessions ?? [])
        .map((session) => resolvePaymentRole(session?.provider_id, providerRoles))
        .filter((role): role is PaymentRole => !!role)
    )
  )

  return roles.length === 1 ? roles[0] : null
}

/**
 * The one place that answers "what may this cart pay with, and does it owe a
 * cash-on-delivery fee". Every caller, the store route and the cart hook alike,
 * goes through here.
 */
export const resolveCartPaymentContext = async (
  cart: CartForPayment,
  container: { resolve: (key: string) => any },
  env: NodeJS.ProcessEnv = process.env
): Promise<CartPaymentContext> => {
  const shipping_roles = resolveShippingRoles(
    cart,
    buildShippingOptionRoleMap(env)
  )
  const allowed_payment_roles = allowedPaymentRolesFor(shipping_roles)
  const selected_payment_role = resolveSelectedPaymentRole(
    cart,
    buildProviderRoleMap(env)
  )

  // Only read the setting when it can actually matter.
  const feeHuf =
    selected_payment_role === "COD" && allowed_payment_roles.includes("COD")
      ? await getCashOnDeliveryFee(container)
      : 0

  return {
    shipping_roles,
    allowed_payment_roles,
    selected_payment_role,
    cash_on_delivery_fee: resolveCashOnDeliveryFeeAmount({
      selectedPaymentRole: selected_payment_role,
      allowedPaymentRoles: allowed_payment_roles,
      feeHuf,
    }),
  }
}
