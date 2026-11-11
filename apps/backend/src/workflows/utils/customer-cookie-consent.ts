import type { ICustomerModuleService, MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * THE SIGNED-IN CUSTOMER'S COOKIE CONSENT, ON THE SERVER TOO (card d5515c7d).
 *
 * The storefront keeps the decision in its own first-party cookie; when the
 * customer is signed in it also sends it here
 * (`POST /store/customers/me/suti-hozzajarulas`), and it lands on the
 * customer's metadata under `suti_hozzajarulas`.
 *
 * THE TIME IS THE SERVER'S CLOCK, as for the ÁSZF record
 * (customer-aszf-record.ts). The VERSION is the banner's, and only the
 * storefront knows it (the banner text and the category set live there), so
 * it is recorded as the storefront says, bounded by the validator.
 *
 * OVERWRITTEN, NOT WRITTEN ONCE (unlike the ÁSZF): the customer may change or
 * withdraw the decision at any time from the footer, and the record is the
 * decision in force. "Szükséges" is not stored: it cannot be refused.
 *
 * The stock customer writes refuse the key (refuse-client-customer-metadata.ts).
 */
export const COOKIE_CONSENT_METADATA_KEY = "suti_hozzajarulas"

export type CookieConsentClaim = {
  verzio: string
  statisztika: boolean
  marketing: boolean
}

export type CookieConsentRecord = CookieConsentClaim & { idopont: string }

export type SaveCookieConsentResult =
  | { status: "saved"; record: CookieConsentRecord }
  | { status: "not_found" }

export const saveCustomerCookieConsent = async (
  container: MedusaContainer,
  customerId: string,
  claim: CookieConsentClaim,
  now: Date = new Date()
): Promise<SaveCookieConsentResult> => {
  const customers = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)
  const customer = await customers
    .retrieveCustomer(customerId, { select: ["id"] })
    .catch(() => null)
  if (!customer) return { status: "not_found" }

  const record: CookieConsentRecord = {
    verzio: claim.verzio,
    statisztika: claim.statisztika,
    marketing: claim.marketing,
    idopont: now.toISOString(),
  }
  // only this key is sent: Medusa's customer update merges it into the
  // customer's metadata (see customer-aszf-record.ts), the other keys stay
  await customers.updateCustomers(customerId, {
    metadata: { [COOKIE_CONSENT_METADATA_KEY]: record },
  })
  return { status: "saved", record }
}
