import type { LoyaltyEntryRow, NewLoyaltyEntry } from "../../../../modules/loyalty/service"
import { sumPoints } from "../../../../modules/loyalty/balance"
import {
  adjustLoyalty,
  adminEntryView,
  readLoyalty,
  RECENT_ORDER,
  storeEntryView,
  type LoyaltyOperations,
} from "../loyalty"

/*
  WHAT TURNS THIS RED (loyalty ledger, first PR). A credit or debit stored for a customer that does not exist; a debit
  that takes the balance below zero; the same key stored twice (a retry doubling the points) or a DIFFERENT movement
  answered as a replay; a lost race on the key not answered with the winner; the customer's own view carrying the reason
  or the actor; the balance not being the sum of the rows.

  THE FAKE IS THE MODULE'S CONTRACT, NOT A SHORTCUT: it refuses a second row under a used key the way the unique index
  does, and measures a debit against the balance the way `addEntryChecked_` does. A test that stubbed those away would
  pass on any implementation.
*/
type Store = { rows: LoyaltyEntryRow[]; customers: Set<string>; clock: number }

const fakeOps = (customers: string[] = ["cus_1"]): { ops: LoyaltyOperations; store: Store } => {
  const store: Store = { rows: [], customers: new Set(customers), clock: 0 }
  const ops: LoyaltyOperations = {
    customerExists: async (id) => store.customers.has(id),
    balanceOf: async (id) => sumPoints(store.rows.filter((r) => r.customer_id === id)),
    recent: async (id, limit) =>
      store.rows
        .filter((r) => r.customer_id === id)
        .sort((a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)))
        .slice(0, limit),
    findByReference: async (reference) => store.rows.find((r) => r.reference === reference) ?? null,
    addEntryChecked: async (input: NewLoyaltyEntry) => {
      const balance = sumPoints(store.rows.filter((r) => r.customer_id === input.customer_id))
      if (input.points < 0 && balance + input.points < 0) return { status: "overdraw", balance }
      if (input.reference && store.rows.some((r) => r.reference === input.reference)) throw new Error("unique violation")
      store.clock += 1
      const entry: LoyaltyEntryRow = {
        id: `loyent_${store.clock}`,
        customer_id: input.customer_id,
        kind: input.kind,
        points: input.points,
        order_id: input.order_id ?? null,
        reference: input.reference ?? null,
        reason: input.reason,
        actor: input.actor,
        created_at: new Date(Date.UTC(2026, 10, 19, 0, 0, store.clock)),
      }
      store.rows.push(entry)
      return { status: "ok", entry }
    },
  }
  return { ops, store }
}

const credit = (points: number, extra: Record<string, unknown> = {}) => ({
  customer_id: "cus_1",
  points,
  reason: "kompenzáció",
  ...extra,
})

describe("adjustLoyalty", () => {
  it("stores a credit and answers the new balance", async () => {
    const { ops, store } = fakeOps()
    const result = await adjustLoyalty(ops, credit(500), "user_1")
    expect(result).toMatchObject({ status: "created", balance: 500 })
    expect(store.rows).toHaveLength(1)
    expect(store.rows[0]).toMatchObject({ kind: "adjustment", points: 500, actor: "user_1", reason: "kompenzáció" })
  })

  it("refuses a customer that does not exist, and stores nothing", async () => {
    const { ops, store } = fakeOps()
    expect(await adjustLoyalty(ops, credit(5, { customer_id: "cus_typo" }), "user_1")).toEqual({ status: "customer_not_found" })
    expect(store.rows).toHaveLength(0)
  })

  it("lets a debit down to exactly zero, and refuses one below it with the balance it measured", async () => {
    const { ops, store } = fakeOps()
    await adjustLoyalty(ops, credit(300), "user_1")
    expect(await adjustLoyalty(ops, credit(-301), "user_1")).toEqual({ status: "overdraw", balance: 300 })
    expect(store.rows).toHaveLength(1)
    expect(await adjustLoyalty(ops, credit(-300), "user_1")).toMatchObject({ status: "created", balance: 0 })
  })

  it("answers a retry with the stored row and stores nothing a second time", async () => {
    const { ops, store } = fakeOps()
    const first = await adjustLoyalty(ops, credit(100, { reference: "os-1" }), "user_1")
    const second = await adjustLoyalty(ops, credit(100, { reference: "os-1" }), "user_1")
    expect(first.status).toBe("created")
    expect(second).toMatchObject({ status: "replayed", balance: 100 })
    expect(store.rows).toHaveLength(1)
  })

  it("does not call a different movement under a used key a replay", async () => {
    const { ops, store } = fakeOps(["cus_1", "cus_2"])
    await adjustLoyalty(ops, credit(100, { reference: "os-1" }), "user_1")
    expect(await adjustLoyalty(ops, credit(200, { reference: "os-1" }), "user_1")).toEqual({ status: "reference_conflict" })
    expect(await adjustLoyalty(ops, credit(100, { reference: "os-1", customer_id: "cus_2" }), "user_1")).toEqual({
      status: "reference_conflict",
    })
    expect(store.rows).toHaveLength(1)
  })

  it("answers the winner when two identical requests race on the key", async () => {
    const { ops, store } = fakeOps()
    // the key looks free to the loser's first look, and the winner's row stands by the time the insert is refused
    let looked = 0
    const racing: LoyaltyOperations = {
      ...ops,
      findByReference: async (reference) => {
        looked += 1
        return looked === 1 ? null : ops.findByReference(reference)
      },
    }
    await adjustLoyalty(ops, credit(100, { reference: "os-2" }), "user_1")
    const loser = await adjustLoyalty(racing, credit(100, { reference: "os-2" }), "user_2")
    expect(loser).toMatchObject({ status: "replayed", balance: 100 })
    expect(store.rows).toHaveLength(1)
  })

  it("rethrows a failure that is not a lost race on the key", async () => {
    const { ops } = fakeOps()
    const broken: LoyaltyOperations = { ...ops, addEntryChecked: async () => Promise.reject(new Error("db down")) }
    await expect(adjustLoyalty(broken, credit(5, { reference: "os-3" }), "user_1")).rejects.toThrow("db down")
    await expect(adjustLoyalty(broken, credit(5), "user_1")).rejects.toThrow("db down")
  })
})

describe("the order of the newest rows", () => {
  it("is newest first, with the id as the tie-breaker", () => {
    expect(Object.entries(RECENT_ORDER)).toEqual([
      ["created_at", "DESC"],
      ["id", "DESC"],
    ])
  })
})

describe("readLoyalty and the two views", () => {
  it("is the sum of the rows, newest first, limited", async () => {
    const { ops } = fakeOps()
    for (const points of [10, 20, 30]) await adjustLoyalty(ops, credit(points), "user_1")
    const result = await readLoyalty(ops, "cus_1", { limit: 2, checkCustomer: true })
    if (result.status !== "ok") throw new Error("expected ok")
    expect(result.balance).toBe(60)
    expect(result.entries.map((e) => e.points)).toEqual([30, 20])
  })

  it("answers not found for an unknown customer only where it asks", async () => {
    const { ops } = fakeOps()
    expect(await readLoyalty(ops, "cus_none", { limit: 5, checkCustomer: true })).toEqual({ status: "customer_not_found" })
    expect(await readLoyalty(ops, "cus_none", { limit: 5, checkCustomer: false })).toEqual({ status: "ok", balance: 0, entries: [] })
  })

  it("keeps the reason and the actor from the customer's view, and shows them to the OS", async () => {
    const { ops } = fakeOps()
    const created = await adjustLoyalty(ops, credit(50, { reason: "belső megjegyzés" }), "user_9")
    if (created.status !== "created") throw new Error("expected created")
    const store = storeEntryView(created.entry)
    expect(Object.keys(store).sort()).toEqual(["created_at", "id", "kind", "order_id", "points"])
    expect(JSON.stringify(store)).not.toContain("belső")
    expect(JSON.stringify(store)).not.toContain("user_9")
    expect(adminEntryView(created.entry)).toMatchObject({ reason: "belső megjegyzés", actor: "user_9", created_at: "2026-11-19T00:00:01.000Z" })
  })
})
