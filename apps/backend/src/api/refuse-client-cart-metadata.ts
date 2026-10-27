import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

/**
 * THE CART METADATA A CLIENT MAY SEND: NONE (audit A4, barracuda's a4-spec.md).
 *
 * Medusa's stock cart writes take `metadata` from the browser: creating a cart
 * (its own and each item's), updating it, adding a line, updating a line. The
 * cart's metadata is where the shop keeps its own state (`aszf_elfogadas`, the
 * split pair's cart ids, the two notes) and a line's metadata marks a fee line
 * (`acropora_line_item_kind`), so a client that can write them can forge the
 * acceptance record, point a split at another cart, or turn a product line
 * into a fee. The shop writes these through its own routes
 * (`aszf-elfogadas`, `cart-notes`) and its own workflows; the storefront
 * sends no cart or line metadata anywhere else.
 *
 * A REFUSAL AND NOT A QUIET FILTER: a filter hides it when someone (or a later
 * piece of storefront code) tries to write. `{}` and `null` are refused too:
 * when Medusa replaces the metadata instead of merging it, an empty object
 * wipes the shop's keys.
 *
 * The check is on the raw body, so it holds whatever order Medusa's own
 * validation runs in.
 */
const hasMetadata = (value: unknown): boolean =>
  !!value && typeof value === "object" && "metadata" in (value as object)
  && (value as { metadata?: unknown }).metadata !== undefined

export const refuseClientCartMetadata = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const body = req.body as { items?: unknown } | undefined
  const items = Array.isArray(body?.items) ? body.items : []
  if (hasMetadata(body) || items.some(hasMetadata)) {
    res.status(400).json({
      type: "invalid_data",
      message: "The cart's and its lines' metadata are set by the shop, not the client.",
    })
    return
  }
  next()
}
