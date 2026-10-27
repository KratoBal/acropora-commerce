import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"

import { ASZF_METADATA_KEY } from "./split-completion"

/**
 * THE ÁSZF ACCEPTANCE RECORD IS THE SERVER'S (audit A4, barracuda's spec
 * a4-spec.md; acrobot 36739). Until now the storefront wrote `aszf_elfogadas`
 * on the cart through Medusa's stock `POST /store/carts/:id`, so anyone holding
 * a cart id could put any time and any version there, and the order carries
 * whatever stood on the cart (`completeCartWorkflow`: `metadata: cart.metadata`).
 *
 * Now the time is the server's clock and the version and document are the
 * server's own setting; the request says only that the customer accepts. The
 * stock cart and line-item writes refuse `metadata` altogether
 * (refuse-client-cart-metadata.ts), so this is the one door.
 *
 * WHICH DOCUMENT IS ONE SETTING, NOT TWO. The record must say what the
 * customer was shown (the 2026-10-06 mismatch in the storefront's aszf.ts).
 * Today the Fogyasztóbarát switch is off (Balázs, 2026-10-05) and the shop's
 * current ÁSZF is the document, so that is what is recorded. If the switch
 * is on (`FOGYASZTOBARAT_ENABLED`, read here exactly as the storefront reads
 * its own), this refuses with a plain message instead of recording a document
 * the customer may not have been shown: the backend has no way yet to take
 * the Fogyasztóbarát effective date and content hash, and a guess would be
 * the very mismatch this closes.
 */
export const ASZF_VERZIO_MAI_BOLT = "unas-shop-2026-09-29"
export const ASZF_FORRAS_MAI_BOLT = "https://shop.acropora.hu/shop_help.php?tab=terms"

export type AszfRecord = {
  idopont: string
  verzio: string
  dokumentum: string
}

export const fogyasztobaratEnabled = (
  value: string | undefined = process.env.FOGYASZTOBARAT_ENABLED
) => value === "true"

/** The record for this moment; the clock is the caller's, so a test can hold it still. */
export const buildAszfRecord = (now: Date): AszfRecord => ({
  idopont: now.toISOString(),
  verzio: ASZF_VERZIO_MAI_BOLT,
  dokumentum: ASZF_FORRAS_MAI_BOLT,
})

export type SaveAszfResult =
  | { status: "saved"; record: AszfRecord }
  | { status: "not_found" }
  | { status: "completed" }
  | { status: "unsupported_document" }

export const saveAszfAcceptance = async (
  container: MedusaContainer,
  cartId: string,
  now: Date = new Date()
): Promise<SaveAszfResult> => {
  if (fogyasztobaratEnabled()) return { status: "unsupported_document" }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "metadata", "completed_at"],
  })
  const cart = data?.[0] as
    | { id: string; metadata?: Record<string, unknown> | null; completed_at?: unknown }
    | undefined
  if (!cart) return { status: "not_found" }
  if (cart.completed_at) return { status: "completed" }

  const record = buildAszfRecord(now)
  // the other keys stay as they are: only this one is written
  await updateCartWorkflow(container).run({
    input: { id: cartId, metadata: { ...(cart.metadata ?? {}), [ASZF_METADATA_KEY]: record } },
  })
  return { status: "saved", record }
}
