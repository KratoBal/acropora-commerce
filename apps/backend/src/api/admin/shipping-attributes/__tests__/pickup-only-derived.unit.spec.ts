import { withPickupOnlyDerived } from "../pickup-only-derived"

/*
  WHAT TURNS THIS RED (card c603774e). The OS's mark kept on a pickup that is off; a hand-set change of pickup_only (the admin
  widget) leaving the "derived" label on, so the OS would clear a value someone set by hand; a widget save that only repeats the
  current pickup_only losing the label; a write that does not touch pickup_only touching the mark; the mark lost on a new row.
*/
const derived = { pickup_only: true, pickup_only_derived: true }
const manual = { pickup_only: true, pickup_only_derived: false }

describe("withPickupOnlyDerived", () => {
  it("the OS's mark is kept while pickup_only is on, in the same write or on the stored value", () => {
    expect(withPickupOnlyDerived(null, { pickup_only: true, pickup_only_derived: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: true,
    })
    expect(withPickupOnlyDerived(manual, { pickup_only: true, pickup_only_derived: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: true,
    })
    // the mark alone on a row whose pickup_only is already on
    expect(withPickupOnlyDerived(manual, { pickup_only_derived: true })).toEqual({ pickup_only_derived: true })
  })

  it("the mark is false whenever the resulting pickup_only is off (a derived mark on an off pickup is meaningless)", () => {
    expect(withPickupOnlyDerived(derived, { pickup_only: false, pickup_only_derived: true })).toEqual({
      pickup_only: false,
      pickup_only_derived: false,
    })
    expect(withPickupOnlyDerived(null, { pickup_only_derived: true })).toEqual({ pickup_only_derived: false })
    expect(withPickupOnlyDerived({ pickup_only: false, pickup_only_derived: false }, { pickup_only_derived: true })).toEqual({
      pickup_only_derived: false,
    })
  })

  it("a hand-set change of pickup_only (no mark in the write) makes the mark false", () => {
    expect(withPickupOnlyDerived(derived, { pickup_only: false })).toEqual({
      pickup_only: false,
      pickup_only_derived: false,
    })
    expect(withPickupOnlyDerived({ pickup_only: false, pickup_only_derived: false }, { pickup_only: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: false,
    })
    // a new row written by hand
    expect(withPickupOnlyDerived(null, { pickup_only: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: false,
    })
  })

  it("a write that repeats the current pickup_only (the widget saving the other flags) leaves the mark as it was", () => {
    expect(withPickupOnlyDerived(derived, { pickup_only: true, is_heavy: true } as never)).toEqual({
      pickup_only: true,
      is_heavy: true,
    })
    expect(withPickupOnlyDerived(null, { pickup_only: false })).toEqual({ pickup_only: false })
  })

  it("a write that does not touch pickup_only does not touch the mark", () => {
    const flags = { is_heavy: true } as never
    expect(withPickupOnlyDerived(derived, flags)).toBe(flags)
    expect(withPickupOnlyDerived(null, flags)).toBe(flags)
  })
})
