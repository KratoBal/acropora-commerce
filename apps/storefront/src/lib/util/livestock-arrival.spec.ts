import { describe, expect, it } from "vitest"

import {
  arrivalDayText,
  arrivalIsLate,
  arrivalShown,
  LIVESTOCK_ARRIVAL_KEY,
  livestockArrivalOf,
  shopDay,
} from "./livestock-arrival"

/*
  WHAT TURNS THIS RED (V2.6 S3b, the product page's reader of the OS's `livestock_arrival` key). A text that is not exactly the
  contract still read (an unknown version, a stage this page has no words for, a day that is not a real calendar day, an
  extra key, text that is not JSON, a non-string value): the page would tell a customer when a living animal will be here on
  a guess; the key name differing from the OS's (the page silently shows nothing); a day already past worded as a date in the
  past, or today's own day worded as late; the shop's day taken from the machine's timezone instead of Budapest's (around
  midnight the page would call the arrival late a day early or late); the arrival shown on a product that is buyable now.
*/
const text = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    v: 1,
    expected_on: "2026-11-13",
    status: "in_transit",
    ...over,
  })
const meta = (value: unknown) => ({ [LIVESTOCK_ARRIVAL_KEY]: value })

describe("the key and the contract", () => {
  it("the key is the OS's, to the letter", () => {
    expect(LIVESTOCK_ARRIVAL_KEY).toBe("livestock_arrival")
  })

  it("reads exactly the contract, both stages", () => {
    expect(livestockArrivalOf(meta(text()))).toEqual({
      expectedOn: "2026-11-13",
      stage: "in_transit",
    })
    expect(livestockArrivalOf(meta(text({ status: "ordered" })))).toEqual({
      expectedOn: "2026-11-13",
      stage: "ordered",
    })
  })

  it("reads nothing for anything else: no metadata, no key, an empty or non-string value", () => {
    expect(livestockArrivalOf(null)).toBeNull()
    expect(livestockArrivalOf(undefined)).toBeNull()
    expect(livestockArrivalOf({})).toBeNull()
    expect(livestockArrivalOf(meta(""))).toBeNull()
    expect(livestockArrivalOf(meta(7))).toBeNull()
    expect(livestockArrivalOf(meta({ v: 1 }))).toBeNull()
  })

  it("reads nothing for a text that is not exactly the contract", () => {
    for (const bad of [
      "not json",
      "[]",
      "null",
      text({ v: 2 }),
      text({ v: "1" }),
      text({ status: "arrived" }),
      text({ status: "ORDERED" }),
      text({ expected_on: "2026-02-31" }),
      text({ expected_on: "2026-11-13T00:00:00Z" }),
      text({ expected_on: 20261113 }),
      text({ note: "internal" }),
      JSON.stringify({ v: 1, expected_on: "2026-11-13" }),
    ])
      expect(livestockArrivalOf(meta(bad)), bad).toBeNull()
  })
})

describe("the words and the days", () => {
  it("says the day in the page's language", () => {
    expect(arrivalDayText("2026-11-13", "hu")).toBe("2026. november 13.")
    expect(arrivalDayText("2026-11-13", "en")).toBe("13 November 2026")
  })

  it("is late only when the expected day is before the shop's today (the day itself is still expected)", () => {
    const arrival = { expectedOn: "2026-11-13", stage: "ordered" as const }
    expect(arrivalIsLate(arrival, "2026-11-12")).toBe(false)
    expect(arrivalIsLate(arrival, "2026-11-13")).toBe(false)
    expect(arrivalIsLate(arrival, "2026-11-14")).toBe(true)
  })

  it("the shop's day is Budapest's, not the machine's", () => {
    // 23:30 UTC on the 12th is 00:30 on the 13th in Budapest (winter time, +1)
    expect(shopDay(new Date("2026-11-12T23:30:00.000Z"))).toBe("2026-11-13")
    // 22:30 UTC on the 12th is 23:30 on the 12th
    expect(shopDay(new Date("2026-11-12T22:30:00.000Z"))).toBe("2026-11-12")
  })

  it("is shown on a product that is not buyable now, and not on one that is", () => {
    const arrival = { expectedOn: "2026-11-13", stage: "ordered" as const }
    expect(arrivalShown(arrival, "ELADVA")).toBe(true)
    expect(arrivalShown(arrival, "ELFOGYOTT")).toBe(true)
    expect(arrivalShown(arrival, "KAPHATO")).toBe(false)
    expect(arrivalShown(null, "ELADVA")).toBe(false)
  })
})
