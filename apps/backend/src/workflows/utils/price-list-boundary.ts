/**
 * THE SALE PRICE LISTS' START AND END, SEEN FROM THE CACHE'S SIDE (card 54bb3779).
 *
 * Medusa switches a price list on and off by the clock: at `starts_at` and at `ends_at` no row is written and no event is
 * emitted. The storefront caches the product lookup under the `products` tag with no expiry, and only an event empties it
 * (`price-changed-revalidate`). So a sale that starts at 10:00 would show the old price, and one that ends at 18:00 would
 * keep its sale price, until the next unrelated price change. This is the pure half of the fix: did a boundary fall
 * between the last look and now.
 */
export type PriceListWindow = {
  starts_at?: Date | string | null
  ends_at?: Date | string | null
}

const instant = (value: Date | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const ms = (value instanceof Date ? value : new Date(value)).getTime()
  return Number.isNaN(ms) ? null : ms
}

/**
 * A boundary in the half-open window (since, now]: a start or an end that has passed since the last look and not before it.
 * `since` itself does not count (it was seen), `now` does. A boundary in the future does not count until it arrives; an
 * open end (null) is no boundary.
 */
export const crossedBoundary = (lists: readonly PriceListWindow[], since: Date, now: Date): boolean => {
  const from = since.getTime()
  const to = now.getTime()
  return lists.some((list) =>
    [instant(list.starts_at), instant(list.ends_at)].some((at) => at !== null && at > from && at <= to),
  )
}

export type BoundaryRunState = { last: Date | null }

export type BoundaryRunDeps = {
  /** the ACTIVE price lists' windows (a draft list is never switched on by the clock) */
  activeWindows(): Promise<PriceListWindow[]>
  /** empties the storefront's product cache; false: it did not go through */
  send(): Promise<boolean>
}

/**
 * ONE TICK OF THE JOB. The first tick after the process started empties the cache once without looking: the job's memory
 * is the process's, so a boundary that fell while the worker was down would otherwise be missed for good. A later tick
 * empties it only when a boundary was crossed. A FAILED CALL DOES NOT ADVANCE THE CLOCK: the same boundary is still inside
 * the window next minute, and the call is tried again until it goes through.
 */
export const runBoundaryTick = async (
  deps: BoundaryRunDeps,
  state: BoundaryRunState,
  now: Date,
): Promise<"purged-first" | "purged" | "idle" | "failed"> => {
  if (state.last === null) {
    if (!(await deps.send())) return "failed"
    state.last = now
    return "purged-first"
  }
  const windows = await deps.activeWindows()
  if (!crossedBoundary(windows, state.last, now)) {
    state.last = now
    return "idle"
  }
  if (!(await deps.send())) return "failed"
  state.last = now
  return "purged"
}
