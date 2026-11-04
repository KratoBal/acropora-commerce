import { describe, expect, it } from "vitest"

import {
  carrierName,
  guestFormErrors,
  isSplitPurchase,
  lookupErrorKey,
  lookupKindOfStatus,
  orderedForPage,
  paymentTextKeys,
  safeTrackingUrl,
  statusTextKeys,
  type GuestOrder,
} from "./guest-order"
import { en } from "@lib/i18n/dictionary/en"
import { hu } from "@lib/i18n/dictionary/hu"

/*
  WHAT TURNS THIS RED (V1.1, the guest order page). A seven-status code with no text (the page would
  show a bare code); a payment state a customer would not understand getting a line; a non-https
  tracking link accepted (javascript: or http:); a failure kind giving the wrong message (a lockout
  shown as "not found"); the form letting a malformed number or address leave the browser; the split
  purchase detected for two ordinary orders, or the store pickup order drawn first.
*/
const order = (
  over: Partial<GuestOrder> & { display_id: number },
): GuestOrder => ({
  created_at: null,
  total: 1000,
  currency_code: "huf",
  payment_status: null,
  business_status: null,
  items: [],
  shipping: { method_name: "GLS", pickup_point: null, store_pickup: false },
  tracking: null,
  ...over,
})

const dig = (dictionary: unknown, key: string): unknown =>
  key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)?.[part],
      dictionary,
    )

describe("the status and payment texts", () => {
  it.each([
    "pending_processing",
    "confirmed",
    "stocking",
    "out_for_delivery",
    "ready_for_pickup",
    "closed",
    "closed_unsuccessfully",
  ])(
    "the business status %s has a label and a text in both languages",
    (code) => {
      const keys = statusTextKeys(code)!
      expect(keys).not.toBeNull()
      for (const dictionary of [hu, en]) {
        expect(typeof dig(dictionary, keys.label)).toBe("string")
        expect(typeof dig(dictionary, keys.text)).toBe("string")
      }
    },
  )

  it("an unknown status code has no keys (the page falls back to the backend's label)", () => {
    expect(statusTextKeys("something_new")).toBeNull()
  })

  it.each([
    ["not_paid", "awaiting"],
    ["awaiting", "awaiting"],
    ["captured", "paid"],
    ["partially_captured", "paid"],
    ["refunded", "refunded"],
    ["partially_refunded", "partiallyRefunded"],
  ])("the payment state %s says %s", (state, name) => {
    const keys = paymentTextKeys(state)!
    expect(keys.label).toBe(`guestOrder.payment.${name}.label`)
    for (const dictionary of [hu, en]) {
      expect(typeof dig(dictionary, keys.label)).toBe("string")
      expect(typeof dig(dictionary, keys.text)).toBe("string")
    }
  })

  it("a payment state a customer would not understand has no line", () => {
    for (const state of [
      "authorized",
      "requires_action",
      "canceled",
      "something_new",
      null,
    ])
      expect(paymentTextKeys(state)).toBeNull()
  })
})

describe("the tracking link and the carrier", () => {
  it("only an https link may stand", () => {
    expect(safeTrackingUrl("https://carrier.example/t/1")).toBe(
      "https://carrier.example/t/1",
    )
    for (const bad of [
      "http://carrier.example/t/1",
      "javascript:alert(1)",
      "//carrier.example",
      "https://a b",
      "",
      null,
    ])
      expect(safeTrackingUrl(bad)).toBeNull()
  })

  it("names the two carriers, and shows an unknown one as stored", () => {
    expect(carrierName("foxpost")).toBe("Foxpost")
    expect(carrierName("GLS")).toBe("GLS")
    expect(carrierName("dhl")).toBe("dhl")
  })
})

describe("the failures", () => {
  it("each kind has its own message; a lockout is never 'not found'", () => {
    expect(lookupErrorKey("not_found")).toBe("guestOrder.errorNotFound")
    expect(lookupErrorKey("too_many")).toBe("guestOrder.errorTooMany")
    expect(lookupErrorKey("unavailable")).toBe("guestOrder.errorUnavailable")
    expect(lookupErrorKey("invalid")).toBe("guestOrder.errorNotFound")
  })

  it("maps the backend's HTTP status to a kind", () => {
    expect(lookupKindOfStatus(404)).toBe("not_found")
    expect(lookupKindOfStatus(400)).toBe("invalid")
    expect(lookupKindOfStatus(429)).toBe("too_many")
    for (const status of [500, 502, 503, undefined])
      expect(lookupKindOfStatus(status)).toBe("unavailable")
  })
})

describe("the form's own checks", () => {
  it("lets a number (with or without '#') and an address through", () => {
    expect(
      guestFormErrors({ orderNumber: "1042", email: "vevo@example.hu" }),
    ).toEqual({})
    expect(
      guestFormErrors({ orderNumber: " #1042 ", email: " vevo@example.hu " }),
    ).toEqual({})
  })

  it("flags an empty field, a non-number and a malformed address, each with its own message", () => {
    expect(guestFormErrors({ orderNumber: "", email: "" })).toEqual({
      orderNumber: "guestOrder.errorRequired",
      email: "guestOrder.errorRequired",
    })
    expect(
      guestFormErrors({ orderNumber: "12ab", email: "vevo@example.hu" })
        .orderNumber,
    ).toBe("guestOrder.errorNumber")
    expect(
      guestFormErrors({ orderNumber: "12345678901", email: "vevo@example.hu" })
        .orderNumber,
    ).toBe("guestOrder.errorNumber")
    for (const email of ["nem-cim", "a@b", "a b@c.hu", "@c.hu"])
      expect(guestFormErrors({ orderNumber: "1", email }).email, email).toBe(
        "guestOrder.errorEmail",
      )
  })
})

describe("a split purchase", () => {
  const shipped = order({ display_id: 1042 })
  const pickup = order({
    display_id: 1041,
    shipping: {
      method_name: "Bolti átvétel",
      pickup_point: null,
      store_pickup: true,
    },
  })

  it("is two orders with exactly one store pickup, and the pickup order is drawn last", () => {
    expect(isSplitPurchase([pickup, shipped])).toBe(true)
    expect(orderedForPage([pickup, shipped]).map((o) => o.display_id)).toEqual([
      1042, 1041,
    ])
  })

  it("is not detected for one order, for two ordinary orders, or for two pickup orders", () => {
    expect(isSplitPurchase([shipped])).toBe(false)
    expect(isSplitPurchase([shipped, order({ display_id: 1043 })])).toBe(false)
    expect(
      isSplitPurchase([
        pickup,
        order({ display_id: 1044, shipping: pickup.shipping }),
      ]),
    ).toBe(false)
  })

  it("does not touch the caller's array", () => {
    const input = [pickup, shipped]
    orderedForPage(input)
    expect(input.map((o) => o.display_id)).toEqual([1041, 1042])
  })
})
