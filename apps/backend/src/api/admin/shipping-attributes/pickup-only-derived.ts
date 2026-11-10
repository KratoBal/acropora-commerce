/**
 * WHO SET `pickup_only` (card c603774e, acrobot 2026-11-10): the OS derives `pickup_only` for a product under a live animal
 * category, and later has to take it off when the product leaves the categories. The shop row did not say who set the value,
 * and a value set by hand in the Medusa admin must never be cleared by the OS. `pickup_only_derived` is that mark, and
 * THIS rule keeps it true:
 *
 *   - a write that CARRIES the mark (the OS) can claim it only for a value the OS owns: the write itself switches
 *     `pickup_only` on (it was off), or the row is already marked, or the write says `adopt` (a reviewed one-time
 *     adoption of a value that was there before the mark existed). Anything else, above all a value somebody set by hand
 *     while the OS also computes it, stays unmarked: the OS never takes a hand-set value over by sending the same value.
 *     The mark is also false whenever the resulting `pickup_only` is off (a derived mark on an off pickup is meaningless);
 *   - a write that does NOT carry the mark and CHANGES `pickup_only` (the admin widget, or any other writer) is a decision
 *     by hand: the mark becomes false, and the OS never clears that value again;
 *   - a write that does not carry it and leaves `pickup_only` as it was (the widget saving the other four flags) is no new
 *     decision about pickup: the mark stays as it was;
 *   - a write that does not touch `pickup_only` leaves the mark alone.
 *
 * The price of "never take over": rows the OS set before this column existed start unmarked, and the OS does not take them
 * off until a one-time, reviewed adoption marks them. A missed take-off is one needless "pickup only" in the shop; a wrong
 * take-off silently overrides a hand decision.
 */
export type PickupOnlyRow = {
  pickup_only: boolean
  pickup_only_derived: boolean
}

export function withPickupOnlyDerived<T extends { pickup_only?: boolean; pickup_only_derived?: boolean }>(
  existing: PickupOnlyRow | null,
  flags: T,
  adopt = false
): T {
  const before = existing?.pickup_only ?? false
  const marked = existing?.pickup_only_derived ?? false
  const after = flags.pickup_only ?? before
  if (flags.pickup_only_derived !== undefined) {
    const mayClaim = (!before && after) || marked || adopt
    return { ...flags, pickup_only_derived: flags.pickup_only_derived && after && mayClaim }
  }
  if (flags.pickup_only === undefined) return flags
  if (flags.pickup_only === before) return flags
  return { ...flags, pickup_only_derived: false }
}
