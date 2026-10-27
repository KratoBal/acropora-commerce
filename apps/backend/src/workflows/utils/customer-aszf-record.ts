import type { ICustomerModuleService, MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { buildAszfRecord, fogyasztobaratEnabled, type AszfRecord } from "./aszf-record"
import { ASZF_METADATA_KEY } from "./split-completion"

/**
 * THE REGISTRATION'S ÁSZF RECORD IS THE SERVER'S TOO (audit A4, the customer
 * twin of the cart record; barracuda's a4-spec.md, "what does not belong in
 * this round"). Until now the storefront put `aszf_elfogadas` into the
 * `metadata` of `POST /store/customers`, so anyone holding a registration token
 * could write any time and any version there.
 *
 * Now the customer, once the customer record exists and the token is bound to
 * it, says only that they accepted (`POST /store/customers/me/aszf-elfogadas`);
 * the time is the server's clock and the version and document are the server's
 * own setting (`buildAszfRecord`, the same function as the cart record). The
 * stock customer writes refuse the key (refuse-client-customer-metadata.ts).
 *
 * THE TIME IS THE MOMENT OF RECORDING, not of the click: with email
 * verification the record is written after the customer confirmed and logged
 * in. The click's moment was only ever the client's word.
 *
 * WRITTEN ONCE. A second call finds the record and returns it unchanged: the
 * evidence of the first acceptance is not moved to a later time by a retry.
 * The other metadata keys stay as they are.
 *
 * The same refusal as the cart record while the Fogyasztóbarát switch is on:
 * the backend cannot yet take that document's effective date and hash.
 */
export type SaveCustomerAszfResult =
  | { status: "saved"; record: AszfRecord }
  | { status: "already"; record: unknown }
  | { status: "not_found" }
  | { status: "unsupported_document" }

export const saveCustomerAszfAcceptance = async (
  container: MedusaContainer,
  customerId: string,
  now: Date = new Date()
): Promise<SaveCustomerAszfResult> => {
  if (fogyasztobaratEnabled()) return { status: "unsupported_document" }

  const customers = container.resolve<ICustomerModuleService>(Modules.CUSTOMER)
  const customer = await customers
    .retrieveCustomer(customerId, { select: ["id", "metadata"] })
    .catch(() => null)
  if (!customer) return { status: "not_found" }

  const existing = customer.metadata?.[ASZF_METADATA_KEY]
  if (existing) return { status: "already", record: existing }

  const record = buildAszfRecord(now)
  await customers.updateCustomers(customerId, {
    metadata: { ...(customer.metadata ?? {}), [ASZF_METADATA_KEY]: record },
  })
  return { status: "saved", record }
}
