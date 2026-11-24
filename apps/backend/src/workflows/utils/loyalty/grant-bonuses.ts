import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { LOYALTY_MODULE } from "../../../modules/loyalty"
import type LoyaltyModuleService from "../../../modules/loyalty/service"
import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import { loadLoyaltyAccrualSettings } from "./loyalty-accrual"
import type { BonusKind } from "./ledger-rules"

type Container = { resolve: <T = unknown>(key: string) => T }
type Logger = { info: (message: string) => void; error: (message: string) => void }

export type BonusOutcome =
  | { status: "off" }
  | { status: "no_account" }
  | { status: "none_due" }
  | { status: "credited"; points: number; repeated: boolean }
  | { status: "failed"; message: string }

export type BonusOutcomes = { signup: BonusOutcome; newsletter: BonusOutcome }

type CustomerRow = { id: string; email?: string | null; has_account?: boolean | null }

/**
 * THE ONE-TIME BONUSES OF A CUSTOMER, whichever is due now (card dfb79916; the old shop: 500 points after registering, 500 after
 * confirming the newsletter). Called from the two places that can make one due: the registration (`customer.created`) and the
 * newsletter confirmation. So the ORDER does not matter: a newsletter confirmed before the customer registered pays at the
 * registration, one confirmed after pays at the confirmation. Each is credited ONCE (the ledger key is `bonus:<kind>:<customer>`).
 *
 * UNDER THE ACCRUAL'S MASTER SWITCH: while `loyalty_accrual_enabled` is off nothing is credited, and a customer who registered
 * while it was off gets no signup bonus later on its own (the registration event has passed). ONLY A CUSTOMER WITH AN ACCOUNT
 * (`has_account`): a guest checkout makes a customer record too, and nobody can spend points on it.
 *
 * NEVER THROWS (registration and the confirmation link must not fail on points): a failure is logged with the customer and the
 * points, so it can be credited by hand (the OS has the manual credit).
 */
export async function grantLoyaltyBonuses(container: Container, customerId: string): Promise<BonusOutcomes> {
  let logger: Logger | undefined
  try {
    logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  } catch {
    logger = undefined
  }
  const failed = (message: string): BonusOutcomes => ({
    signup: { status: "failed", message },
    newsletter: { status: "failed", message },
  })
  let settings
  try {
    settings = (await loadLoyaltyAccrualSettings(container)).settings
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error))
  }
  if (!settings.enabled) return { signup: { status: "off" }, newsletter: { status: "off" } }

  let customer: CustomerRow
  try {
    const customers = container.resolve<{
      retrieveCustomer: (id: string, config: { select: string[] }) => Promise<CustomerRow>
    }>(Modules.CUSTOMER)
    customer = await customers.retrieveCustomer(customerId, { select: ["id", "email", "has_account"] })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger?.error(`Loyalty bonuses for customer ${customerId} could not be checked: ${message}. Credit them by hand if due.`)
    return failed(message)
  }
  if (customer.has_account !== true) return { signup: { status: "no_account" }, newsletter: { status: "no_account" } }

  const grant = async (kind: BonusKind, points: number, due: () => Promise<boolean>): Promise<BonusOutcome> => {
    if (!(points > 0)) return { status: "none_due" }
    try {
      if (!(await due())) return { status: "none_due" }
      const loyalty = container.resolve<LoyaltyModuleService>(LOYALTY_MODULE)
      const result = await loyalty.grantBonus({ customer_id: customerId, kind, points })
      logger?.info(
        `Loyalty ${kind} bonus: ${result.points} points to customer ${customerId}${result.repeated ? " (already done)" : ""}.`,
      )
      return { status: "credited", points: result.points, repeated: result.repeated }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger?.error(
        `Loyalty ${kind} bonus (${points} points, customer ${customerId}) could not be credited: ${message}. Credit it by hand.`,
      )
      return { status: "failed", message }
    }
  }

  const signup = await grant("signup", settings.signupBonusPoints, async () => true)
  const newsletter = await grant("newsletter", settings.newsletterBonusPoints, async () => {
    const email = customer.email?.trim().toLowerCase()
    if (!email) return false
    const subscribers = container.resolve<{
      listNewsletterSubscribers: (filters: { email: string; status: string }, config: { take: number }) => Promise<unknown[]>
    }>(NEWSLETTER_MODULE)
    return (await subscribers.listNewsletterSubscribers({ email, status: "confirmed" }, { take: 1 })).length > 0
  })
  return { signup, newsletter }
}

/**
 * The newsletter confirmation's side: the customer WITH an account that has this address, if there is one. A confirmation for an
 * address that has no account (yet) credits nothing here; the registration pays it later (`grantLoyaltyBonuses`). NEVER THROWS.
 */
export async function grantNewsletterBonusForEmail(container: Container, email: string): Promise<BonusOutcomes | null> {
  try {
    const customers = container.resolve<{
      listCustomers: (filters: { email: string; has_account: boolean }, config: { take: number; select: string[] }) => Promise<
        { id: string }[]
      >
    }>(Modules.CUSTOMER)
    const [customer] = await customers.listCustomers(
      { email: email.trim().toLowerCase(), has_account: true },
      { take: 1, select: ["id"] },
    )
    if (!customer) return null
    return await grantLoyaltyBonuses(container, customer.id)
  } catch {
    return null
  }
}
