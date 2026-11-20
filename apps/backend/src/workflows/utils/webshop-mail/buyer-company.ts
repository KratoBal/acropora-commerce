import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * THE COMPANY OF A COMPANY PURCHASE, FOR THE ORDER CONFIRMATION (card aba7120c, A15). The checkout puts the company name on the
 * billing address (`company`) and the Hungarian tax number on its metadata (`tax_id`, the key the OS reads for the invoice). The
 * confirmation names both, so the customer sees what the invoice will be written to. A private purchase has no company: null, and
 * the key is not sent at all (the request to the OS is byte for byte what it was).
 *
 * The read is a convenience for the mail, never a reason to hold the mail back (like the live animal kinds): everything that can
 * fail sits inside the guard, so a failure sends the confirmation without the line, and says so in the log.
 */
export type BuyerCompany = { name: string; tax_number: string | null }

/** The OS's limits (`safeBuyerCompany` in `webshop-mail.ts` there): beyond them it sends no sentence, so neither does the shop's own text. */
const MAX_NAME = 200
const MAX_TAX_NUMBER = 40

export const buyerCompanyOf = (
  address: { company?: string | null; metadata?: Record<string, unknown> | null } | null | undefined
): BuyerCompany | null => {
  const name = (address?.company ?? "").trim()
  // the same limits as the OS's reading (`safeBuyerCompany`), so the two renderers fall silent at the same place: a name over
  // 200 characters is no company, a tax number over 40 is dropped and the name stays
  if (!name || name.length > MAX_NAME) return null
  const tax = address?.metadata?.tax_id
  const taxNumber = typeof tax === "string" ? tax.trim() : ""
  return { name, tax_number: taxNumber && taxNumber.length <= MAX_TAX_NUMBER ? taxNumber : null }
}

export const buyerCompanyOfOrder = async (container: MedusaContainer, orderId: string): Promise<BuyerCompany | null> => {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: ["id", "billing_address.company", "billing_address.metadata"],
    })
    return buyerCompanyOf(
      (data?.[0] as { billing_address?: { company?: string | null; metadata?: Record<string, unknown> | null } } | undefined)
        ?.billing_address
    )
  } catch (error) {
    try {
      container
        .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
        .warn(`Order ${orderId}: the buyer company could not be read: ${error instanceof Error ? error.message : String(error)}`)
    } catch {
      // the log is a courtesy: with none to write to, the mail still goes
    }
    return null
  }
}

/** The sentence both renderers write (the OS has the same words): the company, and its tax number when there is one. */
export const buyerCompanySentence = (company: BuyerCompany): string =>
  company.tax_number
    ? `Számlázási adatok: ${company.name}, adószám: ${company.tax_number}.`
    : // a name that ends in a full stop ("Teszt Kft.") needs no second one
      `Számlázási adatok: ${company.name}${company.name.endsWith(".") ? "" : "."}`
