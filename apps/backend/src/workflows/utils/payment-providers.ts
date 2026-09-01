import { PaymentRole } from "./payment-eligibility"

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

/**
 * An unmapped provider is NOT treated as any role. Guessing here would mean
 * charging a cash-on-delivery fee to a card payment.
 */
export const resolvePaymentRole = (
  providerId: string | null | undefined,
  providerRoles: Map<string, PaymentRole>
): PaymentRole | null =>
  (providerId && providerRoles.get(providerId)) || null
