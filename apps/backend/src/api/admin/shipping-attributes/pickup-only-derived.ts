/**
 * WHO SET `pickup_only` (card c603774e, acrobot 2026-11-10): the OS derives `pickup_only` for a product under a live animal
 * category, and later has to take it off when the product leaves the categories. The shop row did not say who set the value,
 * and a value set by hand in the Medusa admin must never be cleared by the OS. `pickup_only_derived` is that mark, and
 * THIS rule keeps it true:
 *
 *   - a write that CARRIES the mark (the OS) sets it, but only while the resulting `pickup_only` is true: a derived mark on
 *     a pickup that is off is meaningless, so it is false then;
 *   - a write that does NOT carry it and CHANGES `pickup_only` (the admin widget, or any other writer) is a decision by
 *     hand: the mark becomes false, and the OS never clears that value again;
 *   - a write that does not carry it and leaves `pickup_only` as it was (the widget saving the other four flags) is no new
 *     decision about pickup: the mark stays as it was;
 *   - a write that does not touch `pickup_only` leaves the mark alone.
 */
export type PickupOnlyRow = {
  pickup_only: boolean
  pickup_only_derived: boolean
}

export function withPickupOnlyDerived<T extends { pickup_only?: boolean; pickup_only_derived?: boolean }>(
  existing: PickupOnlyRow | null,
  flags: T
): T {
  const before = existing?.pickup_only ?? false
  const after = flags.pickup_only ?? before
  if (flags.pickup_only_derived !== undefined)
    return { ...flags, pickup_only_derived: flags.pickup_only_derived && after }
  if (flags.pickup_only === undefined) return flags
  if (flags.pickup_only === before) return flags
  return { ...flags, pickup_only_derived: false }
}
