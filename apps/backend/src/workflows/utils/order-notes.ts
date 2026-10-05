import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { updateCartWorkflow, updateOrderWorkflow } from "@medusajs/medusa/core-flows"

/**
 * THE CUSTOMER'S TWO NOTES (the order page's Figma 494:386, "Megjegyzések";
 * card d3b54954): a note to the shop, and one to the courier. Asked in the
 * checkout, kept on the cart's metadata and carried to the order by Medusa
 * (`completeCartWorkflow`: `metadata: cart.metadata`); a mixed cart's pickup
 * half inherits them with the rest (`pickupCartMetadata`). The OS reads and
 * edits them on the order; the courier note goes on the label (the OS's
 * parcel step).
 *
 * Only these two keys are written here, never the rest of the metadata: the
 * browser cannot reach `aszf_elfogadas` or the split keys through this door.
 */
export const CUSTOMER_NOTE_KEY = "acropora_customer_note" as const
export const CARRIER_NOTE_KEY = "acropora_carrier_note" as const

export const CUSTOMER_NOTE_MAX = 1000
/**
 * The courier reads it on the label, so it must fit there uncut: Foxpost's
 * `deliveryNote` takes 50 characters (nautilus 26570, measured on the test
 * spec v1.2.14); GLS's limit is not measured, and the OS puts the note after
 * the order number in `Content`.
 */
export const CARRIER_NOTE_MAX = 50

export type NotesInput = { customer_note?: string | null; carrier_note?: string | null }

/**
 * A note as stored: control characters out (a line break stays), each line
 * trimmed of trailing space, no more than one empty line in a row, trimmed.
 * Empty means no note (null): the key is removed.
 */
export const cleanNote = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null
  const text = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/** The metadata after the notes: only the keys given change; an empty one is removed. */
export const withNotes = (
  metadata: Record<string, unknown> | null | undefined,
  input: NotesInput
): Record<string, unknown> => {
  const next = { ...(metadata ?? {}) }
  const set = (key: string, value: string | null | undefined) => {
    if (value === undefined) return
    const cleaned = cleanNote(value)
    if (cleaned === null) delete next[key]
    else next[key] = cleaned
  }
  set(CUSTOMER_NOTE_KEY, input.customer_note)
  set(CARRIER_NOTE_KEY, input.carrier_note)
  return next
}

/** What the OS and the success page read back. */
export const notesOf = (metadata: Record<string, unknown> | null | undefined) => {
  const read = (key: string) => {
    const value = metadata?.[key]
    return typeof value === "string" && value.trim() ? value : null
  }
  return { customer_note: read(CUSTOMER_NOTE_KEY), carrier_note: read(CARRIER_NOTE_KEY) }
}

export type CartNotesResult =
  | { status: "saved"; notes: ReturnType<typeof notesOf> }
  | { status: "not_found" }
  | { status: "completed" }

/** The checkout's write: the cart's metadata, before the order exists. */
export const saveCartNotes = async (
  container: MedusaContainer,
  cartId: string,
  input: NotesInput
): Promise<CartNotesResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "metadata", "completed_at"],
  })
  const cart = data?.[0] as { id: string; metadata?: Record<string, unknown> | null; completed_at?: unknown } | undefined
  if (!cart) return { status: "not_found" }
  if (cart.completed_at) return { status: "completed" }
  const metadata = withNotes(cart.metadata, input)
  await updateCartWorkflow(container).run({ input: { id: cartId, metadata } })
  return { status: "saved", notes: notesOf(metadata) }
}

export type OrderNotesResult =
  | { status: "saved"; notes: ReturnType<typeof notesOf> }
  | { status: "not_found" }
  | { status: "label_out" }

/**
 * The OS's write (the two pencils). The courier note cannot change once the
 * order has a fulfillment: the label it was printed on is out.
 */
export const saveOrderNotes = async (
  container: MedusaContainer,
  orderId: string,
  input: NotesInput,
  /** The admin user: Medusa records the change (old and new metadata) under this id. */
  userId: string
): Promise<OrderNotesResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId },
    fields: ["id", "metadata", "fulfillments.id", "fulfillments.canceled_at"],
  })
  const order = data?.[0] as
    | {
        id: string
        metadata?: Record<string, unknown> | null
        fulfillments?: Array<{ id: string; canceled_at?: unknown } | null> | null
      }
    | undefined
  if (!order) return { status: "not_found" }
  const labelOut = (order.fulfillments ?? []).some((f) => f && !f.canceled_at)
  if (labelOut && input.carrier_note !== undefined && cleanNote(input.carrier_note) !== notesOf(order.metadata).carrier_note) {
    return { status: "label_out" }
  }
  const metadata = withNotes(order.metadata, input)
  await updateOrderWorkflow(container).run({ input: { id: orderId, metadata, user_id: userId } })
  return { status: "saved", notes: notesOf(metadata) }
}
