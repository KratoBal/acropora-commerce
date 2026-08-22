import { PaymentRole } from "./payment-eligibility"

/**
 * Which Medusa payment provider stands for which payment role.
 *
 * EMPTY BY DEFAULT, and that is the whole point of this phase: the eligibility
 * architecture is complete, but no real provider is wired, so nothing in the
 * live checkout changes. SimplePay, cash on delivery and pay-at-store providers
 * are introduced in a later phase; when they exist, this map is filled from the
 * environment and the rest of the code needs no change.
 *
 *   ACROPORA_PP_ONLINE_CARD=pp_simplepay_simplepay
 *   ACROPORA_PP_COD=pp_system_default
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
