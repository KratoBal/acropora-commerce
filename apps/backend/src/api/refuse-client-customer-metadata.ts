import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { ASZF_METADATA_KEY } from "../workflows/utils/split-completion"

/**
 * THE CUSTOMER METADATA A CLIENT MAY SEND (audit A4, the customer twin of
 * refuse-client-cart-metadata.ts).
 *
 * The registration's ÁSZF record is the server's
 * (`POST /store/customers/me/aszf-elfogadas`, customer-aszf-record.ts). Two
 * stock doors would let a client forge or wipe it:
 *
 * - `POST /store/customers` (creating the record): the one server-owned key,
 *   `aszf_elfogadas`, is refused; other keys pass (a new customer has no record
 *   to lose, and a later client such as the ReefClub may bring its own fields).
 * - `POST /store/customers/me` (updating): `metadata` is refused altogether,
 *   `{}` and `null` included. Whether Medusa merges or replaces the metadata
 *   on update is not measured here, and a replace would let an empty object
 *   wipe the record; the storefront sends no customer metadata on updates
 *   (its updates are first name, last name and phone; the billing data lives
 *   on the ADDRESS metadata, a different route).
 *
 * A REFUSAL AND NOT A QUIET FILTER, on the raw body, as for the cart.
 */
const hasMetadata = (body: unknown): boolean =>
  !!body && typeof body === "object" && (body as { metadata?: unknown }).metadata !== undefined

const metadataOf = (body: unknown): Record<string, unknown> | null => {
  const metadata = (body as { metadata?: unknown } | undefined)?.metadata
  return metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null
}

export const refuseCustomerAszfRecord = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const metadata = metadataOf(req.body)
  if (metadata && ASZF_METADATA_KEY in metadata) {
    res.status(400).json({
      type: "invalid_data",
      message: "Az ÁSZF-elfogadás rekordját a szerver írja, nem a kliens.",
    })
    return
  }
  next()
}

export const refuseCustomerMetadataUpdate = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (hasMetadata(req.body)) {
    res.status(400).json({
      type: "invalid_data",
      message: "A vevő metaadatát a szerver kezeli, a kliens nem írhatja.",
    })
    return
  }
  next()
}
