import { withPickupOnlyDerived } from "../pickup-only-derived"

/*
  WHAT TURNS THIS RED (card c603774e). The OS's mark kept on a pickup that is off; the OS taking over a value somebody set by hand
  by sending the same value with the mark (barracuda, #724: it would later take that value off); a hand-set change of
  pickup_only (the admin widget) leaving the "derived" label on; a widget save that only repeats the current pickup_only losing
  the label; a write that does not touch pickup_only touching the mark; the mark lost on a new row or on a row the OS already
  owns; the reviewed adoption not able to mark a value that was on before the mark existed.
*/
const derived = { pickup_only: true, pickup_only_derived: true }
const manual = { pickup_only: true, pickup_only_derived: false }
const off = { pickup_only: false, pickup_only_derived: false }

describe("withPickupOnlyDerived", () => {
  it("the OS's mark is kept when the OS switches pickup_only on itself, or the row is already its own", () => {
    expect(withPickupOnlyDerived(null, { pickup_only: true, pickup_only_derived: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: true,
    })
    expect(withPickupOnlyDerived(off, { pickup_only: true, pickup_only_derived: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: true,
    })
    // the row is already the OS's: it sends the same value again every round
    expect(withPickupOnlyDerived(derived, { pickup_only: true, pickup_only_derived: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: true,
    })
    expect(withPickupOnlyDerived(derived, { pickup_only_derived: true })).toEqual({ pickup_only_derived: true })
  })

  it("the OS does NOT take over a value that is on by hand: the same value with the mark leaves the mark false", () => {
    expect(withPickupOnlyDerived(manual, { pickup_only: true, pickup_only_derived: true })).toEqual({
      pickup_only: true,
      pickup_only_derived: false,
    })
    expect(withPickupOnlyDerived(manual, { pickup_only_derived: true })).toEqual({ pickup_only_derived: false })
  })

  it("the reviewed adoption marks a value that was on before the mark existed, and only a value that is on", () => {
    expect(withPickupOnlyDerived(manual, { pickup_only_derived: true }, true)).toEqual({ pickup_only_derived: true })
    expect(withPickupOnlyDerived(manual, { pickup_only: true, pickup_only_derived: true }, true)).toEqual({
      pickup_only: true,
      pickup_only_derived: true,
    })
    expect(withPickupOnlyDerived(off, { pickup_only_derived: true }, true)).toEqual({ pickup_only_derived: false })
    // adopt without the mark changes nothing
    const flags = { is_heavy: true } as never
    expect(withPickupOnlyDerived(manual, flags, true)).toBe(flags)
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
