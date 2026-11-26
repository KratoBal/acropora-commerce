import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * THE OMNIBUS REFERENCE OF A CART LINE, KEPT ON THE LINE (card 90c54873, acrobot 62358, 2026-11-26).
 *
 * An order confirmation and the order history are documents: they may not change because a price reduction starts or ends
 * later. The storefront decides "is this line a reduction" from the variant's metadata key `omnibus_lowest_price_30d` (the OS
 * writes it while a reduction runs and clears it when it ends), and for a placed order that is the LIVE variant, not the one the
 * customer bought under. So the key's text is copied onto the cart LINE (`items.metadata`), in every cart refresh, right after the
 * line's price is recalculated: price and reference are then written in the same step, and `completeCartWorkflow` (and the split
 * completion, which copies line metadata) carries the line metadata onto the order line. The order pages read the line's copy;
 * a line without it (every order placed before this) is shown without a strike.
 *
 * ONLY THE ONE KEY IS SENT, the rest of the line's metadata is not in the update (the module merges key by key). A variant without
 * the key (no reduction, or it has ended) sends the key as an empty text, which is how the merge deletes it. A line that is already
 * right is not written, so a refresh that changes nothing writes nothing.
 *
 * WHAT IT DOES NOT DO: it does not decide whether the line is a reduction (that stays the storefront's pure function over the
 * line's `unit_price` and this text), and it does not re-read at completion: the order carries what the last refresh wrote,
 * the same moment as the line's `unit_price`.
 */
export const OMNIBUS_LINE_KEY = "omnibus_lowest_price_30d"

type Metadata = Record<string, unknown> | null | undefined

export type OmnibusSnapshotLine = {
  id?: string | null
  metadata?: Metadata
  variant?: { metadata?: Metadata } | null
}

export type OmnibusSnapshotUpdate = {
  id: string
  metadata: Record<string, unknown>
}

const textOf = (metadata: Metadata): string | null => {
  const value = metadata?.[OMNIBUS_LINE_KEY]
  return typeof value === "string" && value !== "" ? value : null
}

/** The line updates that make every line's copy equal its variant's key (and nothing else). Pure. */
export const planOmnibusSnapshots = (
  lines: readonly OmnibusSnapshotLine[] | null | undefined
): OmnibusSnapshotUpdate[] => {
  const updates: OmnibusSnapshotUpdate[] = []

  for (const line of lines ?? []) {
    if (!line.id) {
      continue
    }

    const wanted = textOf(line.variant?.metadata)
    const current = textOf(line.metadata)

    if (wanted === current) {
      continue
    }

    // ONLY OUR KEY GOES IN THE UPDATE (barracuda, #913 CHANGES): the cart module's `updateLineItems` MERGES metadata key by key
    // (`mergeMetadata`, @medusajs/utils: a key that is absent from the update stays, only an empty text "" deletes it), so a copy
    // of the rest would overwrite a key someone wrote meanwhile, and leaving our key out would not remove it
    updates.push({
      id: line.id,
      metadata: { [OMNIBUS_LINE_KEY]: wanted ?? "" },
    })
  }

  return updates
}

type Container = { resolve: <T = unknown>(key: string) => T }

type CartLines = {
  updateLineItems(
    data: { id: string; metadata: Record<string, unknown> }[]
  ): Promise<unknown>
}

/**
 * Reads the cart's lines with their variants' metadata and writes the planned copies. NEVER THROWS, for the reason of the other
 * refresh-hook steps: every cart operation passes here, and an error would fail adding an item. A line it could not write keeps
 * its old copy; the logged line names the cart.
 */
export const snapshotOmnibusReferences = async (
  cartId: string,
  container: Container,
  logger: Pick<Logger, "error">
): Promise<void> => {
  try {
    const query = container.resolve<{
      graph: (input: {
        entity: string
        filters: Record<string, unknown>
        fields: string[]
      }) => Promise<{ data?: { items?: OmnibusSnapshotLine[] }[] }>
    }>(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
      entity: "cart",
      filters: { id: cartId },
      fields: ["id", "items.id", "items.metadata", "items.variant.metadata"],
    })

    const updates = planOmnibusSnapshots(data?.[0]?.items)

    if (updates.length === 0) {
      return
    }

    await container.resolve<CartLines>(Modules.CART).updateLineItems(updates)
  } catch (error) {
    logger.error(
      `Cart ${cartId}: could not keep the Omnibus reference on its lines. ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}
