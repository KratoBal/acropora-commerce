import { type CapturePaymentSide, type SharedCaptureOperations, captureOnTransitionUnderLock } from "../../shared-stripe-capture"
import { STRIPE_PROVIDER_ID } from "../../stripe-config"
import { type OrderPaymentLock, orderPaymentLock } from "../lock"
import { type ReleaseHoldOperations, releaseHoldUnderLock } from "../release-hold"

/*
  THE ORDER'S PAYMENT LOCK ON THE CAPTURE AND THE HOLD'S RELEASE (card efcd5add; barracuda on #905). The switch to bank transfer
  runs under `order-payment:<id>`; the two other paths that change an order's payment take the same lock. MI PIROSÍT: Kiszállítás or
  the close takes the money outside the order's lock (a switch side by side cancels the hold it is taking); "Csúszik a szállítás"
  cancels the hold outside it; a status that takes no money waits for the lock all the same.
*/
const lockDouble = () => {
  const held = new Set<string>()
  const taken: string[] = []
  const lock: OrderPaymentLock = async (orderId, job) => {
    taken.push(orderId)
    held.add(orderId)
    try {
      return await job()
    } finally {
      held.delete(orderId)
    }
  }
  return { lock, held, taken }
}

const cardOrder: CapturePaymentSide = {
  order_id: "order_card",
  total: 14000,
  currency_code: "huf",
  payment: {
    id: "pay_card",
    amount: 14000,
    captured: 0,
    provider_id: STRIPE_PROVIDER_ID,
    data: { id: "pi_card" },
  },
}

const captureOps = (held: Set<string>) => {
  const log: string[] = []
  const ops: SharedCaptureOperations = {
    loadPair: async () => ({ shipped: cardOrder, pickup: null }),
    setPaymentData: async () => undefined,
    capture: async (id, amount) => void log.push(`capture ${id} ${amount} ${held.has("order_card") ? "locked" : "UNLOCKED"}`),
  }
  return { ops, log }
}

describe("the order's payment lock on the other payment paths", () => {
  const allowed = async () => undefined

  it("Kiszállítás and the close capture inside the order's lock", async () => {
    for (const to of ["out_for_delivery", "closed"]) {
      const { lock, held, taken } = lockDouble()
      const { ops, log } = captureOps(held)
      await captureOnTransitionUnderLock({ order_id: "order_card", to }, ops, allowed, lock)
      expect(taken).toEqual(["order_card"])
      expect(log).toEqual(["capture pay_card 14000 locked"])
    }
  })

  it("a status that takes no money takes no lock", async () => {
    const { lock, held, taken } = lockDouble()
    const { ops } = captureOps(held)
    expect(await captureOnTransitionUnderLock({ order_id: "order_card", to: "stocking" }, ops, allowed, lock)).toBeNull()
    expect(taken).toEqual([])
  })

  it("'Csúszik a szállítás' cancels the hold inside the order's lock", async () => {
    const { lock, held, taken } = lockDouble()
    const log: string[] = []
    const ops: ReleaseHoldOperations = {
      loadPair: async () => ({
        primary: {
          order_id: "order_card",
          display_id: 41,
          metadata: {},
          payments: [
            {
              id: "pay_card",
              provider_id: STRIPE_PROVIDER_ID,
              amount: 14000,
              created_at: "2026-11-25T08:00:00.000Z",
              canceled_at: null,
              captured: 0,
              captured_at: null,
              data: { id: "pi_card" },
              collection_id: "pay_col_card",
              collection_status: "authorized",
            },
          ],
        },
        pickup: null,
      }),
      cancelPayment: async (id) => void log.push(`cancel ${id} ${held.has("order_card") ? "locked" : "UNLOCKED"}`),
      cancelCollection: async () => undefined,
      setMetadata: async () => undefined,
    }
    const result = await releaseHoldUnderLock("order_card", ops, lock, () => new Date("2026-11-25T12:00:00Z"))
    expect(result.released).toBe(true)
    expect(taken).toEqual(["order_card"])
    expect(log).toEqual(["cancel pay_card locked"])
  })
})

/*
  THE KEY IS THE PAYMENT'S OWNER (barracuda on #907). MI PIROSÍT: "Csúszik a szállítás" called with a mixed cart's pickup half
  takes the pickup's key while the parent's Kiszállítás takes the parent's, so the two paths on the ONE shared payment do not run
  one at a time; a plain order locks anything but its own id.
*/
describe("the order's payment lock key", () => {
  const container = (metadata: Record<string, Record<string, unknown> | null>) => {
    const keys: string[] = []
    const resolve = (name: string) =>
      name === "query"
        ? { graph: async ({ filters }: { filters: { id: string } }) => ({ data: [{ id: filters.id, metadata: metadata[filters.id] ?? null }] }) }
        : { execute: async (key: string, job: () => Promise<unknown>) => (keys.push(key), job()) }
    return { container: { resolve } as never, keys }
  }

  it("a mixed cart's pickup half locks its parent: the release on the pickup and the parent's Kiszállítás take one key", async () => {
    const { container: scope, keys } = container({
      order_ship: { acropora_pickup_order_id: "order_pick" },
      order_pick: { acropora_parent_order_id: "order_ship" },
    })
    const lock = orderPaymentLock(scope)
    await lock("order_pick", async () => undefined)
    await lock("order_ship", async () => undefined)
    expect(keys).toEqual(["order-payment:order_ship", "order-payment:order_ship"])
  })

  it("a plain order locks its own id", async () => {
    const { container: scope, keys } = container({ order_1: null })
    await orderPaymentLock(scope)("order_1", async () => undefined)
    expect(keys).toEqual(["order-payment:order_1"])
  })
})
