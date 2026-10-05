import { STRIPE_PROVIDER_ID } from "./stripe-config"
import { PAYMENT_ROLES, PaymentRole } from "./payment-eligibility"

/**
 * Which Medusa payment provider stands for which payment role.
 *
 * Filled from the environment, and an unset role stays unmapped on purpose.
 *
 * Cash on delivery is the Acropora COD provider registered in medusa-config.ts,
 * and its id is a historical constant rather than a choice
 * (CASH_ON_DELIVERY_PROVIDER_ID). Pay-at-store can only be the built-in system
 * provider today. Online card is Stripe, the only card provider (Balázs,
 * 2026-10-05: SimplePay goes), registered when STRIPE_API_KEY is set:
 *
 *   ACROPORA_PP_ONLINE_CARD=pp_stripe_stripe
 *   ACROPORA_PP_COD=pp_acropora_cod
 *   ACROPORA_PP_PAY_AT_STORE=pp_system_default
 *
 * A variable may name several ids separated by commas, in the offer's order
 * (the first is the default); an id belongs to the first role that names it.
 */
export const PAYMENT_ROLE_PROVIDER_ENV: Record<PaymentRole, string> = {
  ONLINE_CARD: "ACROPORA_PP_ONLINE_CARD",
  COD: "ACROPORA_PP_COD",
  PAY_AT_STORE: "ACROPORA_PP_PAY_AT_STORE",
}

/** The ids a variable names: one, or several separated by commas, in order. */
export const providerIdsOf = (value: string | undefined): string[] =>
  Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )

/** The online card providers, in the offer's order (the first is the default). */
export const onlineCardProviderIds = (
  env: NodeJS.ProcessEnv = process.env
): string[] => providerIdsOf(env[PAYMENT_ROLE_PROVIDER_ENV.ONLINE_CARD])

export const buildProviderRoleMap = (
  env: NodeJS.ProcessEnv = process.env
): Map<string, PaymentRole> => {
  const map = new Map<string, PaymentRole>()

  for (const [role, variable] of Object.entries(PAYMENT_ROLE_PROVIDER_ENV)) {
    for (const providerId of providerIdsOf(env[variable])) {
      if (!map.has(providerId)) {
        map.set(providerId, role as PaymentRole)
      }
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
 * than an omission: without STRIPE_API_KEY, ONLINE_CARD has no registered id. A
 * cart whose only allowed role is unmapped therefore gets an EMPTY list, which
 * is what "there is nothing you can pay with here" looks
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

/**
 * The offer for a cart that will be split: card only where a split can be
 * paid. Stripe pays a mixed cart with one PaymentIntent for both orders
 * (`stripe-start` moves the pickup lines BEFORE the card is confirmed,
 * captured together at Kiszállítás; Balázs 2026-10-01), once its lock is open.
 * Any other card payment would be confirmed on the whole cart first, and the
 * split at completion would re-create the session, discarding it.
 */
export const providersForMixedCart = (
  providers: AllowedPaymentProvider[],
  mixed: boolean,
  env: NodeJS.ProcessEnv = process.env
): AllowedPaymentProvider[] =>
  mixed
    ? providers.filter(
        (provider) =>
          provider.role !== "ONLINE_CARD" ||
          (provider.id === STRIPE_PROVIDER_ID && stripeMixedCartEnabled(env))
      )
    : providers

/**
 * THE LOCK ON STRIPE FOR MIXED CARTS (acrobot 25507: it stays until the new
 * way is complete and tested). Off unless ACROPORA_STRIPE_MIXED_CART is exactly
 * "true": the shared Stripe payment (one intent for both orders) needs the
 * capture at shipment for both, which comes in a later part.
 */
export const stripeMixedCartEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.ACROPORA_STRIPE_MIXED_CART?.trim() === "true"
