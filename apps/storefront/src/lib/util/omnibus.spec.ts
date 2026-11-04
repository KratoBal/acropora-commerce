import { describe, expect, it } from "vitest"

import { OMNIBUS_METADATA_KEY, omnibusReferenceOf } from "./omnibus"

/*
  WHAT TURNS THIS RED (V0.2, slice 3). A line shown without a reduction (the paid price is not below the
  reference); a currency mismatch ignored; a malformed or half-filled text read as a reference (a guess
  stands in for a number); a cleared key ("") read as a value; a zero or negative amount accepted.
*/
const text = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    amount: "1500",
    currency: "HUF",
    complete: true,
    history_begins: "2026-09-01",
    reduction_start: "2026-11-01",
    ...over,
  })
const meta = (value: string) => ({ [OMNIBUS_METADATA_KEY]: value })
const shown = { amount: 1000, currencyCode: "huf" }

describe("omnibusReferenceOf", () => {
  it("reads a complete reference when the paid price is below it", () => {
    expect(omnibusReferenceOf(meta(text()), shown)).toEqual({
      amount: 1500,
      currencyCode: "huf",
      complete: true,
      historyBegins: "2026-09-01",
    })
  })

  it("carries the incomplete flag and the first day through", () => {
    expect(
      omnibusReferenceOf(
        meta(text({ complete: false, history_begins: "2026-10-20" })),
        shown,
      ),
    ).toMatchObject({ complete: false, historyBegins: "2026-10-20" })
  })

  it("is null when the paid price is NOT below the reference (equal or higher): no reduction is shown", () => {
    expect(
      omnibusReferenceOf(meta(text()), { ...shown, amount: 1500 }),
    ).toBeNull()
    expect(
      omnibusReferenceOf(meta(text()), { ...shown, amount: 1600 }),
    ).toBeNull()
  })

  it("is null on a currency mismatch, and the match ignores case", () => {
    expect(
      omnibusReferenceOf(meta(text({ currency: "EUR" })), shown),
    ).toBeNull()
    expect(
      omnibusReferenceOf(meta(text({ currency: "huf" })), shown),
    ).not.toBeNull()
  })

  it("is null without a key, with the cleared key, without metadata and without a shown price", () => {
    expect(omnibusReferenceOf({}, shown)).toBeNull()
    expect(omnibusReferenceOf(meta(""), shown)).toBeNull()
    expect(omnibusReferenceOf(null, shown)).toBeNull()
    expect(omnibusReferenceOf(undefined, shown)).toBeNull()
    expect(omnibusReferenceOf(meta(text()), null)).toBeNull()
    expect(
      omnibusReferenceOf({ [OMNIBUS_METADATA_KEY]: 1500 }, shown),
    ).toBeNull()
  })

  it.each([
    ["not JSON", "nem json"],
    ["a JSON scalar", "1500"],
    ["null", "null"],
    ["a number amount", text({ amount: 1500 })],
    ["a zero amount", text({ amount: "0" })],
    ["a negative amount", text({ amount: "-5" })],
    ["a non-numeric amount", text({ amount: "1 500" })],
    ["no currency", text({ currency: undefined })],
    ["a text complete flag", text({ complete: "true" })],
    ["a missing complete flag", text({ complete: undefined })],
    ["a malformed first day", text({ history_begins: "2026.09.01" })],
    ["a missing first day", text({ history_begins: undefined })],
  ])("is null for %s", (_name, value) => {
    expect(omnibusReferenceOf(meta(value), shown)).toBeNull()
  })
})
