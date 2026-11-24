import type { LoyaltyEntryRow, NewLoyaltyEntry } from "../../../../modules/loyalty/service"
import { accrueReference, accrueRule, bonusReference, bonusRule, redeemReference, redeemRule, reverseReference, reverseRule, voidRule, type LedgerTx } from "../ledger-rules"

/**
 * THE POINTS LEDGER'S REDEMPTION RULES against an in-memory ledger (card dfb79916). What must fail: points taken from a
 * balance that does not cover them; the same cart taking twice; a completion that retried with other points leaving
 * the first amount taken; a rolled-back completion not giving the points back (or giving a reversed order's back);
 * a cancelled order giving back twice, or giving back what was never taken, or to the wrong customer; a movement without
 * the customer lock; a soft-deleted redemption still counting.
 */
type Row = LoyaltyEntryRow & { deleted: boolean }
const make = (initial: { customer_id: string; points: number }[] = []) => {
  const rows: Row[] = []
  let n = 0
  const locks: string[] = []
  const add = (r: NewLoyaltyEntry): Row => {
    const row: Row = {
      id: `row_${++n}`,
      customer_id: r.customer_id,
      kind: r.kind,
      points: r.points,
      order_id: r.order_id ?? null,
      reference: r.reference ?? null,
      reason: r.reason,
      actor: r.actor,
      created_at: new Date(2026, 10, 19, 0, 0, n),
      deleted: false,
    }
    // the unique index on the reference (live rows only)
    if (row.reference && rows.some((x) => !x.deleted && x.reference === row.reference)) throw new Error("duplicate reference")
    rows.push(row)
    return row
  }
  for (const i of initial) add({ ...i, kind: "adjustment", reason: "seed", actor: "t" })
  const tx: LedgerTx = {
    lock: async (c) => void locks.push(c),
    rows: async (c) => rows.filter((r) => !r.deleted && r.customer_id === c),
    byReference: async (ref) => rows.find((r) => !r.deleted && r.reference === ref) ?? null,
    create: async (i) => add(i),
    remove: async (id) => void (rows.find((r) => r.id === id)!.deleted = true),
  }
  const balance = (c: string) => rows.filter((r) => !r.deleted && r.customer_id === c).reduce((s, r) => s + r.points, 0)
  return { tx, rows, locks, balance }
}
const A = { customer_id: "cus_a" }

describe("redeemRule", () => {
  it("takes the points as one negative row keyed by the cart, and answers the new balance", async () => {
    const l = make([{ ...A, points: 5_000 }])
    expect(await redeemRule(l.tx, { ...A, points: 1_200, cart_id: "cart_1" })).toEqual({ balance: 3_800, repeated: false })
    const row = l.rows.find((r) => r.reference === redeemReference("cart_1"))!
    expect(row).toMatchObject({ kind: "redemption", points: -1_200 })
    expect(l.balance("cus_a")).toBe(3_800)
  })

  it("refuses a balance that does not cover it, and writes nothing", async () => {
    const l = make([{ ...A, points: 100 }])
    await expect(redeemRule(l.tx, { ...A, points: 101, cart_id: "c" })).rejects.toThrow(/Nincs elég hűségpontod/)
    expect(l.rows).toHaveLength(1)
  })

  it("a repeated completion of the same cart takes nothing a second time", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    expect(await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })).toEqual({ balance: 4_000, repeated: true })
    expect(l.balance("cus_a")).toBe(4_000)
  })

  it("the same cart with OTHER points gives the first back, then takes the new amount", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    expect(await redeemRule(l.tx, { ...A, points: 600, cart_id: "c" })).toEqual({ balance: 4_400, repeated: false })
    expect(l.balance("cus_a")).toBe(4_400)
    expect(l.rows.filter((r) => !r.deleted && r.kind === "redemption")).toHaveLength(1)
  })

  it("another amount after a cancellation is refused: that order was cancelled", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    await reverseRule(l.tx, { ...A, cart_id: "c", order_id: "order_1" })
    await expect(redeemRule(l.tx, { ...A, points: 600, cart_id: "c" })).rejects.toThrow(/már volt visszavont beváltás/)
  })

  it("another customer's points on a cart already redeemed by someone else are refused", async () => {
    const l = make([{ ...A, points: 5_000 }, { customer_id: "cus_b", points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 500, cart_id: "c" })
    await expect(redeemRule(l.tx, { customer_id: "cus_b", points: 500, cart_id: "c" })).rejects.toThrow(/más vevő/)
    expect(l.balance("cus_b")).toBe(5_000)
  })

  it("only whole positive points", async () => {
    const l = make([{ ...A, points: 5_000 }])
    for (const p of [0, -1, 1.5, Number.NaN]) await expect(redeemRule(l.tx, { ...A, points: p, cart_id: "c" })).rejects.toThrow(/pozitív egész/)
  })

  it("serializes the customer before it reads the balance", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 500, cart_id: "c" })
    expect(l.locks).toEqual(["cus_a"])
  })
})

describe("voidRule", () => {
  it("gives the points back and frees the cart's key, so a retry can redeem again", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    expect(await voidRule(l.tx, { ...A, cart_id: "c" })).toEqual({ balance: 5_000, voided: true })
    expect(await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })).toEqual({ balance: 4_000, repeated: false })
  })

  it("nothing to undo is a no-op, not an error", async () => {
    const l = make([{ ...A, points: 5_000 }])
    expect(await voidRule(l.tx, { ...A, cart_id: "none" })).toEqual({ balance: null, voided: false })
    expect(l.balance("cus_a")).toBe(5_000)
  })

  it("another customer's void cannot take a redemption away", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    expect(await voidRule(l.tx, { customer_id: "cus_b", cart_id: "c" })).toEqual({ balance: null, voided: false })
    expect(l.balance("cus_a")).toBe(4_000)
  })

  it("a redemption whose order was cancelled is not voided", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    await reverseRule(l.tx, { ...A, cart_id: "c", order_id: "o" })
    await expect(voidRule(l.tx, { ...A, cart_id: "c" })).rejects.toThrow(/már visszavonva/)
    expect(l.balance("cus_a")).toBe(5_000)
  })
})

describe("reverseRule", () => {
  it("one positive row with all the redeemed points, naming the order", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    expect(await reverseRule(l.tx, { ...A, cart_id: "c", order_id: "order_9" })).toEqual({ balance: 5_000, points: 1_000, repeated: false })
    const row = l.rows.find((r) => r.reference === reverseReference("c"))!
    expect(row).toMatchObject({ kind: "reversal", points: 1_000, order_id: "order_9" })
  })

  it("a repeated cancellation event gives back once", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    await reverseRule(l.tx, { ...A, cart_id: "c", order_id: "o" })
    expect(await reverseRule(l.tx, { ...A, cart_id: "c", order_id: "o" })).toEqual({ balance: 5_000, points: 1_000, repeated: true })
    expect(l.balance("cus_a")).toBe(5_000)
  })

  it("a cart that was never redeemed has nothing to give back", async () => {
    const l = make([{ ...A, points: 5_000 }])
    await expect(reverseRule(l.tx, { ...A, cart_id: "never", order_id: "o" })).rejects.toThrow(/nincs mit visszaadni/)
    expect(l.balance("cus_a")).toBe(5_000)
  })

  it("the wrong customer gets nothing back and the right one is untouched", async () => {
    const l = make([{ ...A, points: 5_000 }, { customer_id: "cus_b", points: 0 + 1 }])
    await redeemRule(l.tx, { ...A, points: 1_000, cart_id: "c" })
    await expect(reverseRule(l.tx, { customer_id: "cus_b", cart_id: "c", order_id: "o" })).rejects.toThrow(/nincs mit visszaadni/)
    expect(l.balance("cus_a")).toBe(4_000)
  })
})

describe("accrueRule", () => {
  it("credits the earned points as one positive row keyed by the order, under the customer's lock", async () => {
    const l = make([{ ...A, points: 500 }])
    expect(await accrueRule(l.tx, { ...A, order_id: "ord_1", points: 240 })).toEqual({ balance: 740, points: 240, repeated: false })
    expect(l.rows.find((r) => r.reference === accrueReference("ord_1"))).toMatchObject({ kind: "accrual", points: 240, order_id: "ord_1" })
    expect(l.locks).toEqual(["cus_a"])
  })

  it("a repeated closing of the same order credits nothing a second time, and answers what the first credited", async () => {
    const l = make()
    await accrueRule(l.tx, { ...A, order_id: "ord_1", points: 240 })
    expect(await accrueRule(l.tx, { ...A, order_id: "ord_1", points: 999 })).toEqual({ balance: 240, points: 240, repeated: true })
    expect(l.balance("cus_a")).toBe(240)
  })

  it("an order that was credited to one customer is not credited to another", async () => {
    const l = make()
    await accrueRule(l.tx, { ...A, order_id: "ord_1", points: 240 })
    await expect(accrueRule(l.tx, { customer_id: "cus_b", order_id: "ord_1", points: 240 })).rejects.toThrow(/más vevőnek/)
    expect(l.balance("cus_b")).toBe(0)
  })

  it("refuses zero, negative and fractional points, and writes nothing", async () => {
    const l = make()
    for (const points of [0, -5, 1.5]) await expect(accrueRule(l.tx, { ...A, order_id: "o", points })).rejects.toThrow(/pozitív egész/)
    expect(l.rows).toHaveLength(0)
  })
})

describe("bonusRule", () => {
  it("credits a one-time bonus as one positive accrual row keyed by kind and customer, under the customer's lock, with no order", async () => {
    const l = make([{ ...A, points: 100 }])
    expect(await bonusRule(l.tx, { ...A, kind: "signup", points: 500 })).toEqual({ balance: 600, points: 500, repeated: false })
    const row = l.rows.find((r) => r.reference === bonusReference("signup", "cus_a"))!
    expect(row).toMatchObject({ kind: "accrual", points: 500, order_id: null, actor: "system" })
    expect(l.locks).toEqual(["cus_a"])
  })

  it("a repeated event, a retry or a second confirmation credits nothing again, and answers what the first credited", async () => {
    const l = make()
    await bonusRule(l.tx, { ...A, kind: "newsletter", points: 500 })
    expect(await bonusRule(l.tx, { ...A, kind: "newsletter", points: 900 })).toEqual({ balance: 500, points: 500, repeated: true })
    expect(l.balance("cus_a")).toBe(500)
  })

  it("the two kinds are two keys: a customer can have both, once each; another customer has his own", async () => {
    const l = make()
    await bonusRule(l.tx, { ...A, kind: "signup", points: 500 })
    await bonusRule(l.tx, { ...A, kind: "newsletter", points: 500 })
    await bonusRule(l.tx, { customer_id: "cus_b", kind: "signup", points: 500 })
    expect(l.balance("cus_a")).toBe(1000)
    expect(l.balance("cus_b")).toBe(500)
  })

  it("refuses zero, negative and fractional points, and writes nothing", async () => {
    const l = make()
    for (const points of [0, -5, 1.5]) await expect(bonusRule(l.tx, { ...A, kind: "signup", points })).rejects.toThrow(/pozitív egész/)
    expect(l.rows).toHaveLength(0)
  })
})
