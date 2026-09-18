import { PAYMENT_ROLES, PaymentRole } from "./payment-eligibility"

/**
 * Which Medusa payment provider stands for which payment role.
 *
 * Filled from the environment, and an unset role stays unmapped on purpose.
 *
 * Cash on delivery is wired: the Acropora COD provider is registered in
 * medusa-config.ts, and its id is a historical constant rather than a choice
 * (CASH_ON_DELIVERY_PROVIDER_ID). Pay-at-store can only be the built-in system
 * provider today. Online card is still unwired: no SimplePay provider is
 * registered, so there is no id to name, and naming a provider that does not
 * exist has the same effect as a typo.
 *
 *   ACROPORA_PP_ONLINE_CARD=              (blocked on the SimplePay integration)
 *   ACROPORA_PP_COD=pp_acropora_cod
 *   ACROPORA_PP_PAY_AT_STORE=pp_system_default
 *
 * This is the SimplePay integration point. Nothing else in the codebase names a
 * payment provider.
 */
export const PAYMENT_ROLE_PROVIDER_ENV: Record<PaymentRole, string> = {
  ONLINE_CARD: "ACROPORA_PP_ONLINE_CARD",
  COD: "ACROPORA_PP_COD",
  PAY_AT_STORE: "ACROPORA_PP_PAY_AT_STORE",
}

export const buildProviderRoleMap = (
  env: NodeJS.ProcessEnv = process.env
): Map<string, PaymentRole> => {
  const map = new Map<string, PaymentRole>()

  for (const [role, variable] of Object.entries(PAYMENT_ROLE_PROVIDER_ENV)) {
    const providerId = env[variable]?.trim()

    if (providerId) {
      map.set(providerId, role as PaymentRole)
    }
  }

  return map
}

export type AllowedPaymentProvider = { id: string; role: PaymentRole }

/**
 * The concrete payment providers a cart may use, for the roles it is allowed.
 *
 * WHY THE BACKEND NAMES THE PROVIDERS AND NOT JUST THE ROLES: the storefront
 * has no way to turn a role into a provider id. The mapping lives in this
 * process's environment, and a second copy in the storefront would be a
 * second source of truth for the same decision - the kind that drifts without
 * anything failing, because both halves keep working on their own.
 *
 * A role with no provider yields nothing, and that is the honest answer rather
 * than an omission: ONLINE_CARD has no id today, because no SimplePay provider
 * is registered. A cart whose only allowed role is unmapped therefore gets an
 * EMPTY list, which is what "there is nothing you can pay with here" looks
 * like. The caller has to render that, not skip it.
 *
 * The order follows PAYMENT_ROLES rather than the map's insertion order, so
 * the response does not change shape when an environment variable is added.
 */
export const allowedPaymentProvidersFor = (
  allowedRoles: PaymentRole[],
  providerRoles: Map<string, PaymentRole>
): AllowedPaymentProvider[] =>
  PAYMENT_ROLES.filter((role) => allowedRoles.includes(role)).flatMap((role) =>
    Array.from(providerRoles.entries())
      .filter(([, mapped]) => mapped === role)
      .map(([id]) => ({ id, role }))
  )

/**
 * An unmapped provider is NOT treated as any role. Guessing here would mean
 * charging a cash-on-delivery fee to a card payment.
 */
export const resolvePaymentRole = (
  providerId: string | null | undefined,
  providerRoles: Map<string, PaymentRole>
): PaymentRole | null =>
  (providerId && providerRoles.get(providerId)) || null
