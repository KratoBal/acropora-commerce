import {
  CART_HOLD_ENV,
  DEFAULT_HOLD_MINUTES,
  DEFAULT_MAX_PER_CART,
  IN_FLIGHT_MS,
  cartHoldOn,
  decideHold,
  heldMessage,
  holdBlocks,
  holdMinutes,
  holdStands,
  limitMessage,
  maxHoldsPerCart,
} from "../policy"

/**
 * THE CART HOLD'S RULES (V2.3, card 52024fc0). What must fail: a live hold of another cart taken over, a hold that
 * stands for a piece its cart no longer has, an own hold extended by re-adding, a dead hold in the way, the limit
 * counted wrong, or a broken setting making a hold of zero or of a day.
 */
const NOW = new Date("2026-11-09T18:00:00.000Z")
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60 * 1000)
const row = (cart_id: string, endsInMinutes: number, madeMinutesAgo = 10) => ({
  id: "chold_1",
  cart_id,
  expires_at: at(endsInMinutes),
  updated_at: at(-madeMinutesAgo),
})
const base = { holder: "cart_me", now: NOW, minutes: 30, max: 5, otherCartHasPiece: false, standingOwnHolds: 0 }

describe("the switch and the two numbers", () => {
  it("CH-SWITCH: only the exact word on", () => {
    expect(cartHoldOn({ [CART_HOLD_ENV]: "on" } as NodeJS.ProcessEnv)).toBe(true)
    expect(cartHoldOn({ [CART_HOLD_ENV]: " on " } as NodeJS.ProcessEnv)).toBe(true)
    for (const value of [undefined, "", "yes", "true", "ON"])
      expect(cartHoldOn({ [CART_HOLD_ENV]: value } as NodeJS.ProcessEnv)).toBe(false)
  })

  it("CH-NUMBERS: within bounds as given, anything else the plan's defaults", () => {
    expect(holdMinutes({ ACROPORA_CART_HOLD_MINUTES: "45" } as NodeJS.ProcessEnv)).toBe(45)
    expect(maxHoldsPerCart({ ACROPORA_CART_HOLD_MAX_PER_CART: "3" } as NodeJS.ProcessEnv)).toBe(3)
    for (const value of [undefined, "", "0", "4", "241", "1440", "30.5", "x"])
      expect(holdMinutes({ ACROPORA_CART_HOLD_MINUTES: value } as NodeJS.ProcessEnv)).toBe(DEFAULT_HOLD_MINUTES)
    for (const value of [undefined, "", "0", "51", "2.5", "-1"])
      expect(maxHoldsPerCart({ ACROPORA_CART_HOLD_MAX_PER_CART: value } as NodeJS.ProcessEnv)).toBe(DEFAULT_MAX_PER_CART)
    expect(DEFAULT_HOLD_MINUTES).toBe(30)
    expect(DEFAULT_MAX_PER_CART).toBe(5)
  })
})

describe("does a hold stand", () => {
  it("CH-STANDS: live and its cart has the piece", () => {
    expect(holdStands(row("cart_other", 10), NOW, true)).toBe(true)
  })

  it("CH-DEAD-BY-TIME: past its end, whatever the cart has", () => {
    expect(holdStands(row("cart_other", -1), NOW, true)).toBe(false)
    expect(holdStands(row("cart_other", 0), NOW, true)).toBe(false)
  })

  it("CH-DEAD-BY-LINE: live, but the piece left its cart (removed, or ordered)", () => {
    expect(holdStands(row("cart_other", 10, 5), NOW, false)).toBe(false)
  })

  it("CH-IN-FLIGHT: a hold younger than its line still stands without the line", () => {
    const fresh = { ...row("cart_other", 30), updated_at: new Date(NOW.getTime() - IN_FLIGHT_MS + 1000) }
    expect(holdStands(fresh, NOW, false)).toBe(true)
    const older = { ...row("cart_other", 30), updated_at: new Date(NOW.getTime() - IN_FLIGHT_MS) }
    expect(holdStands(older, NOW, false)).toBe(false)
    expect(holdStands({ ...row("cart_other", 30), updated_at: null }, NOW, false)).toBe(false)
  })
})

describe("the decision for one piece", () => {
  it("CH-CREATE: no row yet, a hold of the configured length", () => {
    expect(decideHold({ ...base, row: null })).toEqual({ action: "create", expires_at: at(30) })
    expect(decideHold({ ...base, row: null, minutes: 45 })).toEqual({ action: "create", expires_at: at(45) })
  })

  it("CH-REFUSE-HELD: another cart's standing hold, with its end", () => {
    expect(decideHold({ ...base, row: row("cart_other", 12), otherCartHasPiece: true })).toEqual({
      action: "refuse_held",
      until: at(12),
    })
  })

  it("CH-TAKE-DEAD: another cart's hold past its end, or without the piece, becomes this cart's from now", () => {
    expect(decideHold({ ...base, row: row("cart_other", -1), otherCartHasPiece: true })).toEqual({
      action: "take",
      id: "chold_1",
      expires_at: at(30),
    })
    expect(decideHold({ ...base, row: row("cart_other", 12), otherCartHasPiece: false })).toEqual({
      action: "take",
      id: "chold_1",
      expires_at: at(30),
    })
  })

  it("CH-NO-EXTEND: re-adding to the same cart keeps the end where it was", () => {
    expect(decideHold({ ...base, row: row("cart_me", 3) })).toEqual({ action: "keep", expires_at: at(3) })
  })

  it("CH-OWN-DEAD: the cart's own dead hold starts again from now", () => {
    expect(decideHold({ ...base, row: row("cart_me", -5) })).toEqual({ action: "take", id: "chold_1", expires_at: at(30) })
  })

  it("CH-LIMIT: the max-th standing hold refuses a new one, a kept one is not new", () => {
    expect(decideHold({ ...base, row: null, standingOwnHolds: 5 })).toEqual({ action: "refuse_limit", max: 5 })
    expect(decideHold({ ...base, row: null, standingOwnHolds: 4 }).action).toBe("create")
    expect(decideHold({ ...base, row: row("cart_other", -1), standingOwnHolds: 5 }).action).toBe("refuse_limit")
    expect(decideHold({ ...base, row: row("cart_me", 3), standingOwnHolds: 9 }).action).toBe("keep")
  })

  it("CH-HELD-BEFORE-LIMIT: a full cart asking for a held piece hears that it is held", () => {
    expect(
      decideHold({ ...base, row: row("cart_other", 12), otherCartHasPiece: true, standingOwnHolds: 5 }).action
    ).toBe("refuse_held")
  })
})

describe("in the way of an order", () => {
  it("CH-BLOCKS: only another cart's standing hold", () => {
    expect(holdBlocks(row("cart_other", 10), "cart_me", NOW, true)).toBe(true)
    expect(holdBlocks(row("cart_other", -1), "cart_me", NOW, true)).toBe(false)
    expect(holdBlocks(row("cart_other", 10, 5), "cart_me", NOW, false)).toBe(false)
    expect(holdBlocks(row("cart_me", 10), "cart_me", NOW, true)).toBe(false)
    expect(holdBlocks(row("cart_me", -1), "cart_me", NOW, true)).toBe(false)
  })
})

describe("the refusals' messages", () => {
  it("CH-MESSAGE: a code, a colon, JSON the storefront can read", () => {
    const held = heldMessage([{ title: "WYSIWYG Acropora", handle: "wysiwyg-acropora", until: at(12).toISOString() }])
    expect(held.startsWith("unique_piece_held:")).toBe(true)
    expect(JSON.parse(held.slice("unique_piece_held:".length))).toEqual([
      { title: "WYSIWYG Acropora", handle: "wysiwyg-acropora", until: "2026-11-09T18:12:00.000Z" },
    ])
    expect(limitMessage(5)).toBe('cart_hold_limit:{"max":5}')
  })
})
