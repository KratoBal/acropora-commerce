import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { updateCartWorkflow } from "@medusajs/medusa/core-flows"

import { LEGAL_DOCUMENT_KEYS, legalSource, readLegalConfig } from "./legal-documents"
import { ASZF_METADATA_KEY } from "./split-completion"
import { createHash } from "node:crypto"

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
 * With the Fogyasztóbarát switch off (`FOGYASZTOBARAT_ENABLED`, read here
 * exactly as the storefront reads its own) the shop's current ÁSZF is the
 * document. With it on, the record names the Fogyasztóbarát document the way
 * the storefront's record does: its source, the effective date its text states
 * and the sha256 of the text, asked for at the moment of acceptance (the
 * document is given only to the shop's registered domain, so the request
 * carries the shop's own Referer). If that request fails the order is not held
 * back: the record says `lenyomat: "nincs"` and the date is null, so what is
 * missing is written down, not guessed.
 *
 * The record names the HUNGARIAN document. Which language the customer read is
 * not part of the request yet (the English source is still open: see
 * legal-documents.ts).
 */
export const ASZF_VERZIO_MAI_BOLT = "unas-shop-2026-09-29"
export const ASZF_FORRAS_MAI_BOLT = "https://shop.acropora.hu/shop_help.php?tab=terms"

export type AszfRecord = {
  idopont: string
  verzio: string
  dokumentum: string
  /** Fogyasztóbarát only: the effective date the document's text states (ÉÉÉÉ-HH-NN), or null. */
  hatalyos?: string | null
  /** Fogyasztóbarát only: `sha256:<hex>` of the text, or `nincs`. */
  lenyomat?: string
}

export const LENYOMAT_NINCS = "nincs"
/** Waits this long for Fogyasztóbarát, then the record goes without a hash. */
export const FOGYASZTOBARAT_FETCH_MS = 4000

const referer = () => process.env.FOGYASZTOBARAT_REFERER?.trim() || "https://shop.acropora.hu/"

/** The effective date the ÁSZF's header states: "hatályos ettől a naptól: <span>2026-10-05</span>". */
export const aszfEffectiveDate = (html: string): string | null => {
  const match =
    /hat[aá]lyos\s+ett[oő]l\s+a\s+napt[oó]l:\s*(?:<[^>]*>\s*)*(\d{4}-\d{2}-\d{2})/i.exec(html)
  return match ? match[1]! : null
}

/**
 * The record of the Fogyasztóbarát document, for this moment. Fogyasztóbarát
 * answers an unregistered domain with a 200 and "Hibakód: <n>" in the body, so
 * the status alone is not enough.
 */
export const buildFogyasztobaratRecord = async (
  now: Date,
  shopId: string,
  fetcher: typeof fetch = fetch
): Promise<AszfRecord> => {
  const source = legalSource(LEGAL_DOCUMENT_KEYS.aszf, shopId)
  const base = { idopont: now.toISOString(), verzio: `fogyasztobarat-${shopId}`, dokumentum: source }
  try {
    const response = await fetcher(source, {
      headers: { Referer: referer() },
      signal: AbortSignal.timeout(FOGYASZTOBARAT_FETCH_MS),
      cache: "no-store",
    })
    const bytes = new Uint8Array(await response.arrayBuffer())
    const text = new TextDecoder("utf-8").decode(bytes)
    if (!response.ok || /Hibak[oó]d:\s*\d+/i.test(text)) return { ...base, hatalyos: null, lenyomat: LENYOMAT_NINCS }
    return {
      ...base,
      hatalyos: aszfEffectiveDate(text),
      lenyomat: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    }
  } catch {
    return { ...base, hatalyos: null, lenyomat: LENYOMAT_NINCS }
  }
}

/**
 * The record for the document the shop shows now: the Fogyasztóbarát one when
 * the switch is on, the shop's current ÁSZF when it is off. `null`: the switch
 * is on and the Hungarian shop id is not set, so there is no document to name.
 */
export const currentAszfRecord = async (now: Date, fetcher: typeof fetch = fetch): Promise<AszfRecord | null> => {
  const config = readLegalConfig()
  if (!config.enabled) return buildAszfRecord(now)
  return config.hu ? buildFogyasztobaratRecord(now, config.hu, fetcher) : null
}

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
  | { status: "not_configured" }

export const saveAszfAcceptance = async (
  container: MedusaContainer,
  cartId: string,
  now: Date = new Date(),
  fetcher: typeof fetch = fetch
): Promise<SaveAszfResult> => {
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

  const record = await currentAszfRecord(now, fetcher)
  if (!record) return { status: "not_configured" }
  // the other keys stay as they are: only this one is written
  await updateCartWorkflow(container).run({
    input: { id: cartId, metadata: { ...(cart.metadata ?? {}), [ASZF_METADATA_KEY]: record } },
  })
  return { status: "saved", record }
}
