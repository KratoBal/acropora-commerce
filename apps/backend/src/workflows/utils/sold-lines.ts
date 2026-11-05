import { MedusaError } from "@medusajs/framework/utils"

/**
 * THE UNIQUE PIECE SOLD WHILE IT WAS IN THE CART (V2.5, card ffa5d8c6). At completion Medusa answers a shortage with one
 * sentence that names nothing: `Some variant does not have the required inventory` (type not_allowed, code
 * insufficient_inventory, core-flows 2.20.1 `confirm-inventory`). The storefront can only say "could not place the order" to
 * that. This file finds WHICH lines are the shortage, keeps only the unique pieces, and puts them in the error's message after a
 * code the storefront recognises (the way the split-discount and the legal-document codes already travel: the message is what
 * reaches the browser).
 *
 * ONLY UNIQUE PIECES: a shortage on an ordinary product keeps today's generic sentence. "It was sold meanwhile" is a statement
 * about the past that is only safe for a piece of which there was exactly one.
 *
 * THE DECISION IS PURE (`soldUniqueLines`), the Medusa wiring is thin (`probeLineInventory` in the route's helper): what turns
 * this red is a shortage mistaken for any other 400, an ordinary product named as sold, a line that still has stock named, or a
 * code that does not survive the message.
 */
export const SOLD_UNIQUE_CODE = "unique_piece_sold"

export type CartLineFacts = {
  title: string
  handle: string | null
  quantity: number
  /** the product's unique-piece flag (`metadata.unique_piece`, true or "true"): anything else is not unique */
  uniquePiece: unknown
}

export type SoldLine = { title: string; handle: string }

/** The flag as the OS projection writes it: boolean or the text "true"; everything else is false. */
export const isUniquePiece = (flag: unknown): boolean => flag === true || flag === "true"

/** Medusa's shortage error: type NOT_ALLOWED with the insufficient-inventory code (or its sentence). */
export const isInsufficientInventory = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false
  const { type, code, message } = error as { type?: unknown; code?: unknown; message?: unknown }
  if (code === MedusaError.Codes.INSUFFICIENT_INVENTORY) return true
  return type === MedusaError.Types.NOT_ALLOWED && typeof message === "string" && message.includes("does not have the required inventory")
}

/** The unique pieces among the lines that have no stock now. `hasStock` is the per-line check (the same one Medusa makes). */
export async function soldUniqueLines(
  lines: readonly CartLineFacts[],
  hasStock: (line: CartLineFacts) => Promise<boolean>
): Promise<SoldLine[]> {
  const sold: SoldLine[] = []
  for (const line of lines) {
    if (!isUniquePiece(line.uniquePiece) || !line.handle) continue
    if (!(await hasStock(line))) sold.push({ title: line.title, handle: line.handle })
  }
  return sold
}

/** The message that reaches the browser: the code, a colon, the lines as JSON (titles and handles, nothing else). */
export const soldMessage = (lines: readonly SoldLine[]): string => `${SOLD_UNIQUE_CODE}:${JSON.stringify(lines)}`
