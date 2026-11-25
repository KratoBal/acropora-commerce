/**
 * THE ORDER MODULE'S METADATA WRITE, AS A TEST DOUBLE (card d35290f2): `updateOrders` merges the keys it is given into the stored
 * metadata (`mergeMetadata`, @medusajs/utils: a key set to an empty string is removed, every other key given is set, every key not
 * given stays). A double that REPLACED the whole object hid the bug it was meant to catch: a write of the whole load-time object put
 * every other key back to its old value.
 */
export function mergedMetadata(
  stored: Record<string, unknown> | null | undefined,
  keys: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(stored ?? {}) }
  for (const [key, value] of Object.entries(keys)) {
    if (value === "") delete merged[key]
    else merged[key] = value
  }
  return merged
}

/**
 * The doubles' store: the fixtures' metadata as the base, every write merged into it. `written` holds only the orders written to
 * (their merged metadata), so "nothing was written" stays a measure.
 */
export function metadataStore(sides: readonly ({ order_id: string; metadata: Record<string, unknown> | null } | null | undefined)[]) {
  const base = new Map<string, Record<string, unknown>>()
  for (const side of sides) if (side) base.set(side.order_id, { ...(side.metadata ?? {}) })
  const written = new Map<string, Record<string, unknown>>()
  /** Every write as it was given: what keys the code wrote, not what the order holds after. */
  const writes: { id: string; keys: string[] }[] = []
  return {
    written,
    writes,
    write(id: string, keys: Record<string, unknown>) {
      writes.push({ id, keys: Object.keys(keys) })
      written.set(id, mergedMetadata(written.get(id) ?? base.get(id), keys))
    },
    /** Another writer (the deadlines job, an admin) changes the order meanwhile: not one of the code's own writes. */
    elsewhere(id: string, keys: Record<string, unknown>) {
      base.set(id, mergedMetadata(written.get(id) ?? base.get(id), keys))
      if (written.has(id)) written.set(id, mergedMetadata(written.get(id), keys))
    },
  }
}
