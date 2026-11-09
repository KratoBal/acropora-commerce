import { describe, expect, it } from "vitest"

import { en } from "@lib/i18n/dictionary/en"
import { hu } from "@lib/i18n/dictionary/hu"

import type { GuestOrder } from "./guest-order"
import {
  cleanedName,
  declaredItemIds,
  MAX_ITEMS,
  MAX_NAME,
  withdrawableItems,
  withdrawalFailureKey,
  withdrawalFailureOfStatus,
  withdrawalFormErrors,
  withdrawalOffer,
} from "./withdrawal"

/*
  WHAT TURNS THIS RED (V0.3, the withdrawal form's rules). A line a declaration already names offered again; the
  button drawn for an order with no lines, or for one whose every line is declared; the live animal (store pickup)
  order getting the button instead of the legal placeholder; an empty or oversize name, or no line, leaving the
  browser; a lockout or an already declared line shown as the generic error; a failure key or a form text that exists
  in one language only.
*/
const order = (over: Partial<GuestOrder> = {}): GuestOrder => ({
  display_id: 1043,
  created_at: null,
  total: 1000,
  currency_code: "huf",
  payment_status: null,
  business_status: null,
  items: [
    { id: "item_1", title: "Korall A", quantity: 1, total: 500 },
    { id: "item_2", title: "Korall B", quantity: 2, total: 500 },
  ],
  shipping: { method_name: "GLS", pickup_point: null, store_pickup: false },
  tracking: null,
  live_animal: false,
  ...over,
})

const declared = (...itemIds: string[]) => [
  { id: "ordwd_1", created_at: "2026-11-09T10:00:00.000Z", item_ids: itemIds },
]

const dig = (dictionary: unknown, key: string): unknown =>
  key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)?.[part],
      dictionary,
    )

describe("the lines a new declaration may name", () => {
  it("offers every line when the order has no declaration, or an older shop answer without the list", () => {
    expect(withdrawableItems(order()).map((i) => i.id)).toEqual([
      "item_1",
      "item_2",
    ])
    expect(withdrawableItems(order({ withdrawals: [] })).length).toBe(2)
  })

  it("leaves out the lines any declaration names, across declarations", () => {
    const o = order({
      withdrawals: [
        ...declared("item_1"),
        { id: "ordwd_2", created_at: "2026-11-09T11:00:00.000Z", item_ids: [] },
      ],
    })
    expect(Array.from(declaredItemIds(o))).toEqual(["item_1"])
    expect(withdrawableItems(o).map((i) => i.id)).toEqual(["item_2"])
  })
})

describe("what the order block draws", () => {
  it("draws the button for a shipped order with a free line", () => {
    expect(withdrawalOffer(order())).toBe("button")
    expect(withdrawalOffer(order({ withdrawals: declared("item_1") }))).toBe(
      "button",
    )
  })

  it("draws nothing when every line is declared, or the order has no lines", () => {
    expect(
      withdrawalOffer(order({ withdrawals: declared("item_1", "item_2") })),
    ).toBe("none")
    expect(withdrawalOffer(order({ items: [] }))).toBe("none")
  })

  it("draws the legal placeholder, not the button, for an order that holds a live animal", () => {
    expect(withdrawalOffer(order({ live_animal: true }))).toBe("live_animal")
  })

  it("keeps the button on an ordinary store pickup order: the pickup is offered for every cart, it is not a live animal", () => {
    expect(
      withdrawalOffer(
        order({
          shipping: {
            method_name: "Bolti átvétel",
            pickup_point: null,
            store_pickup: true,
          },
        }),
      ),
    ).toBe("button")
  })

  it("draws nothing when the shop's answer does not say whether there is a live animal (an older shop)", () => {
    expect(withdrawalOffer(order({ live_animal: undefined }))).toBe("none")
  })
})

describe("the form's own checks", () => {
  it("lets a complete form go on", () => {
    expect(
      withdrawalFormErrors({ itemIds: ["item_1"], name: "Kiss Anna" }),
    ).toEqual({})
  })

  it("names every missing part, and a name of only spaces is missing", () => {
    expect(withdrawalFormErrors({ itemIds: [], name: "   " })).toEqual({
      itemIds: "guestOrder.withdrawal.errorItems",
      name: "guestOrder.withdrawal.errorName",
    })
  })

  it("refuses a name over the bound and more lines than the shop takes", () => {
    expect(
      withdrawalFormErrors({ itemIds: ["a"], name: "x".repeat(MAX_NAME + 1) })
        .name,
    ).toBe("guestOrder.withdrawal.errorName")
    expect(
      withdrawalFormErrors({
        itemIds: Array.from({ length: MAX_ITEMS + 1 }, (_, i) => `i${i}`),
        name: "Kiss Anna",
      }).itemIds,
    ).toBe("guestOrder.withdrawal.errorItems")
  })

  it("sends the name with whitespace runs made one space", () => {
    expect(cleanedName("  Kiss \n  Anna ")).toBe("Kiss Anna")
  })
})

describe("the failures", () => {
  it.each([
    [404, "not_found"],
    [429, "too_many"],
    [400, "invalid"],
    [409, "duplicate"],
    [500, "unavailable"],
    [undefined, "unavailable"],
  ] as const)("status %s is %s", (status, failure) => {
    expect(withdrawalFailureOfStatus(status)).toBe(failure)
  })

  it("keeps a lockout, an unknown order and an already declared line apart from the generic error", () => {
    expect(withdrawalFailureKey("too_many")).toBe("guestOrder.errorTooMany")
    expect(withdrawalFailureKey("not_found")).toBe("guestOrder.errorNotFound")
    expect(withdrawalFailureKey("duplicate")).toBe(
      "guestOrder.withdrawal.errorDuplicate",
    )
    expect(withdrawalFailureKey("invalid")).toBe(
      "guestOrder.withdrawal.errorSend",
    )
    expect(withdrawalFailureKey("unavailable")).toBe(
      "guestOrder.withdrawal.errorSend",
    )
  })

  it("has every key the form uses in both languages", () => {
    const keys = [
      "errorItems",
      "errorName",
      "errorDuplicate",
      "errorSend",
      "openButton",
      "confirmButton",
      "liveAnimal",
      "done",
      "donePartial",
      "listTitle",
    ].map((k) => `guestOrder.withdrawal.${k}`)
    for (const key of keys) {
      expect(typeof dig(hu, key), key).toBe("string")
      expect(typeof dig(en, key), key).toBe("string")
    }
  })
})
