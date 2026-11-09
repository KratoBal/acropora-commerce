import { assertNoForeignHold, holdOnAdd, holderOf, isLockTimeout, pieceHolds } from "../cart-hold"

/**
 * THE CART HOLD'S MEDUSA WIRING (V2.3, card 52024fc0), on a container without a database. What must fail: two carts
 * both holding one piece when they add at once; a piece another cart holds added or ordered; a removed or ordered
 * piece still in the way; the pickup half seen as a stranger; the limit missed by one call adding many pieces; the
 * switch off and anything still happening; a failing lookup stopping a sale.
 */

type Row = { id: string; variant_id: string; cart_id: string; expires_at: Date; updated_at: Date }
type Cart = {
  id: string
  completed_at?: string | null
  metadata?: Record<string, unknown> | null
  items: { variant_id: string; title?: string; product_handle?: string; unique?: boolean }[]
}

const tick = () => new Promise((resolve) => setImmediate(resolve))

const world = (carts: Cart[], unique: string[] = ["v_piece", "v_piece2", "v_piece3"]) => {
  const rows: Row[] = []
  let n = 0
  const warnings: string[] = []
  const locks = new Map<string, Promise<unknown>>()
  const query = {
    graph: async ({ entity, filters }: any) => {
      await tick()
      const ids: string[] = Array.isArray(filters.id) ? filters.id : [filters.id]
      if (entity === "cart")
        return {
          data: carts
            .filter((cart) => ids.includes(cart.id))
            .map((cart) => ({
              ...cart,
              items: cart.items.map((item) => ({
                variant_id: item.variant_id,
                title: item.title ?? item.variant_id,
                product_handle: item.product_handle ?? item.variant_id,
                product: { metadata: unique.includes(item.variant_id) ? { unique_piece: true } : {} },
              })),
            })),
        }
      if (entity === "variant")
        return {
          data: ids.map((id) => ({
            id,
            product: {
              title: `Title ${id}`,
              handle: `handle-${id}`,
              metadata: unique.includes(id) ? { unique_piece: "true" } : null,
            },
          })),
        }
      throw new Error(`unexpected entity ${entity}`)
    },
  }
  const holds = {
    listCartHolds: async (filters: any) => {
      await tick()
      return rows
        .filter((row) =>
          Object.entries(filters).every(([key, value]) =>
            Array.isArray(value) ? value.includes((row as any)[key]) : (row as any)[key] === value
          )
        )
        .map((row) => ({ ...row }))
    },
    createCartHolds: async (data: any[]) => {
      await tick()
      for (const item of data) {
        if (rows.some((row) => row.variant_id === item.variant_id)) throw new Error("unique violation")
        rows.push({ id: `chold_${++n}`, ...item, updated_at: new Date() })
      }
    },
    updateCartHolds: async (data: any[]) => {
      await tick()
      for (const item of data) Object.assign(rows.find((row) => row.id === item.id)!, item, { updated_at: new Date() })
    },
  }
  // one job at a time per key, like the Redis provider
  const locking = {
    execute: async (keys: string[], job: () => Promise<unknown>) => {
      const prior = Promise.all(keys.map((key) => locks.get(key) ?? Promise.resolve()))
      const run = prior.then(() => job())
      const settled = run.catch(() => undefined)
      for (const key of keys) locks.set(key, settled)
      return run
    },
  }
  const container = {
    resolve: (key: string) => {
      if (key === "query") return query
      if (key === "cart_hold") return holds
      if (key === "locking") return locking
      if (key === "logger") return { warn: (message: string) => warnings.push(message) }
      throw new Error(`unexpected ${key}`)
    },
  }
  return { container, rows, warnings, carts, query, locking }
}

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000)
const longAgo = new Date(Date.now() - 60 * 60 * 1000)

const envBefore = { ...process.env }
beforeEach(() => {
  process.env.ACROPORA_CART_HOLD = "on"
  delete process.env.ACROPORA_CART_HOLD_MINUTES
  delete process.env.ACROPORA_CART_HOLD_MAX_PER_CART
})
afterEach(() => {
  process.env = { ...envBefore }
})

describe("putting a unique piece in a cart", () => {
  it("CHW-HOLD: the first cart gets a 30-minute hold, an ordinary product none", async () => {
    const w = world([{ id: "cart_a", items: [] }])
    await holdOnAdd(w.container, "cart_a", ["v_piece", "v_plain"])
    expect(w.rows).toHaveLength(1)
    expect(w.rows[0]).toMatchObject({ variant_id: "v_piece", cart_id: "cart_a" })
    const minutes = (w.rows[0]!.expires_at.getTime() - Date.now()) / 60000
    expect(minutes).toBeGreaterThan(29.9)
    expect(minutes).toBeLessThanOrEqual(30)
  })

  it("CHW-REFUSE: another cart holding it, live and with the piece, refuses with its end", async () => {
    const w = world([
      { id: "cart_a", items: [{ variant_id: "v_piece" }] },
      { id: "cart_b", items: [] },
    ])
    const until = minutesFromNow(12)
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: until, updated_at: longAgo })
    const refused = holdOnAdd(w.container, "cart_b", ["v_piece"])
    await expect(refused).rejects.toMatchObject({ type: "not_allowed" })
    const message = await refused.catch((error) => error.message)
    expect(message.startsWith("unique_piece_held:")).toBe(true)
    expect(JSON.parse(message.slice("unique_piece_held:".length))).toEqual([
      { title: "Title v_piece", handle: "handle-v_piece", until: until.toISOString() },
    ])
    expect(w.rows[0]!.cart_id).toBe("cart_a")
  })

  it("CHW-RACE: two carts adding the same piece at once, exactly one holds it", async () => {
    const w = world([
      { id: "cart_a", items: [] },
      { id: "cart_b", items: [] },
    ])
    const results = await Promise.allSettled([
      holdOnAdd(w.container, "cart_a", ["v_piece"]),
      holdOnAdd(w.container, "cart_b", ["v_piece"]),
    ])
    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"])
    expect(w.rows).toHaveLength(1)
    const winner = results[0]!.status === "fulfilled" ? "cart_a" : "cart_b"
    expect(w.rows[0]!.cart_id).toBe(winner)
    expect(w.warnings).toEqual([])
  })

  it("CHW-REMOVED: a live hold whose cart no longer has the piece is taken over", async () => {
    const w = world([
      { id: "cart_a", items: [] },
      { id: "cart_b", items: [] },
    ])
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(20), updated_at: longAgo })
    await holdOnAdd(w.container, "cart_b", ["v_piece"])
    expect(w.rows).toHaveLength(1)
    expect(w.rows[0]).toMatchObject({ id: "chold_x", cart_id: "cart_b" })
  })

  it("CHW-ORDERED: a hold whose cart became an order is taken over", async () => {
    const w = world([
      { id: "cart_a", completed_at: "2026-11-09T17:00:00.000Z", items: [{ variant_id: "v_piece" }] },
      { id: "cart_b", items: [] },
    ])
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(20), updated_at: longAgo })
    await holdOnAdd(w.container, "cart_b", ["v_piece"])
    expect(w.rows[0]!.cart_id).toBe("cart_b")
  })

  it("CHW-EXPIRED: a hold past its end is taken over, though its cart still has the piece", async () => {
    const w = world([
      { id: "cart_a", items: [{ variant_id: "v_piece" }] },
      { id: "cart_b", items: [] },
    ])
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(-1), updated_at: longAgo })
    await holdOnAdd(w.container, "cart_b", ["v_piece"])
    expect(w.rows[0]!.cart_id).toBe("cart_b")
  })

  it("CHW-NO-EXTEND: adding it again to the same cart leaves the end alone", async () => {
    const w = world([{ id: "cart_a", items: [{ variant_id: "v_piece" }] }])
    const end = minutesFromNow(4)
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: end, updated_at: longAgo })
    await holdOnAdd(w.container, "cart_a", ["v_piece"])
    expect(w.rows[0]!.expires_at).toEqual(end)
  })

  it("CHW-PICKUP-HALF: the split moving a line to the pickup half asks for no hold", async () => {
    const w = world([
      { id: "cart_a", metadata: { acropora_pickup_cart_id: "cart_p" }, items: [] },
      { id: "cart_p", metadata: { acropora_parent_cart_id: "cart_a" }, items: [] },
    ])
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(-1), updated_at: longAgo })
    await holdOnAdd(w.container, "cart_p", ["v_piece"])
    expect(w.rows).toEqual([expect.objectContaining({ cart_id: "cart_a" })])
  })

  it("CHW-LIMIT-ONE-CALL: one call adding more pieces than the limit is refused at the limit", async () => {
    process.env.ACROPORA_CART_HOLD_MAX_PER_CART = "2"
    const w = world([{ id: "cart_a", items: [] }])
    await expect(holdOnAdd(w.container, "cart_a", ["v_piece", "v_piece2", "v_piece3"])).rejects.toThrow(
      'cart_hold_limit:{"max":2}'
    )
    expect(w.rows.map((row) => row.variant_id)).toEqual(["v_piece", "v_piece2"])
  })

  it("CHW-LIMIT-REMOVED: a piece taken out of the cart no longer counts", async () => {
    process.env.ACROPORA_CART_HOLD_MAX_PER_CART = "1"
    const w = world([{ id: "cart_a", items: [] }])
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(20), updated_at: longAgo })
    await holdOnAdd(w.container, "cart_a", ["v_piece2"])
    expect(w.rows.map((row) => row.variant_id).sort()).toEqual(["v_piece", "v_piece2"])
    const kept = world([{ id: "cart_a", items: [{ variant_id: "v_piece" }] }])
    kept.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(20), updated_at: longAgo })
    await expect(holdOnAdd(kept.container, "cart_a", ["v_piece2"])).rejects.toThrow("cart_hold_limit:")
  })

  it("CHW-OFF: without the switch nothing is read or written", async () => {
    delete process.env.ACROPORA_CART_HOLD
    const w = world([{ id: "cart_a", items: [] }])
    w.container.resolve = () => {
      throw new Error("must not be called")
    }
    await holdOnAdd(w.container, "cart_a", ["v_piece"])
    expect(w.rows).toEqual([])
  })

  it("CHW-FAIL-OPEN: a lookup that throws lets the line in, with a warning", async () => {
    const w = world([{ id: "cart_a", items: [] }])
    w.query.graph = async () => {
      throw new Error("db down")
    }
    await holdOnAdd(w.container, "cart_a", ["v_piece"])
    expect(w.warnings).toEqual([expect.stringContaining("db down")])
  })
})

describe("placing the order", () => {
  it("CHW-ORDER-REFUSED: another cart's standing hold on a piece of this cart refuses", async () => {
    const w = world([
      { id: "cart_a", items: [{ variant_id: "v_piece", title: "WYSIWYG Acropora", product_handle: "wysiwyg-acropora" }] },
      { id: "cart_b", items: [{ variant_id: "v_piece" }, { variant_id: "v_plain" }] },
    ])
    const until = minutesFromNow(9)
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: until, updated_at: longAgo })
    await expect(assertNoForeignHold(w.container, { id: "cart_b", metadata: null })).rejects.toThrow(
      `unique_piece_held:${JSON.stringify([{ title: "v_piece", handle: "v_piece", until: until.toISOString() }])}`
    )
  })

  it("CHW-ORDER-OWN-OR-DEAD: its own hold, a dead one, or one whose cart dropped the piece is no obstacle", async () => {
    const w = world([
      { id: "cart_a", items: [] },
      { id: "cart_b", items: [{ variant_id: "v_piece" }, { variant_id: "v_piece2" }, { variant_id: "v_piece3" }] },
    ])
    w.rows.push(
      { id: "c1", variant_id: "v_piece", cart_id: "cart_b", expires_at: minutesFromNow(-10), updated_at: longAgo },
      { id: "c2", variant_id: "v_piece2", cart_id: "cart_a", expires_at: minutesFromNow(10), updated_at: longAgo },
      { id: "c3", variant_id: "v_piece3", cart_id: "cart_c", expires_at: minutesFromNow(-1), updated_at: longAgo }
    )
    await expect(assertNoForeignHold(w.container, { id: "cart_b", metadata: null })).resolves.toBeUndefined()
  })

  it("CHW-ORDER-SPLIT: either half of a mixed cart is checked over both, and its own hold is the parent's", async () => {
    const w = world([
      { id: "cart_a", metadata: { acropora_pickup_cart_id: "cart_p" }, items: [{ variant_id: "v_plain" }] },
      { id: "cart_p", metadata: { acropora_parent_cart_id: "cart_a" }, items: [{ variant_id: "v_piece" }] },
      { id: "cart_x", items: [{ variant_id: "v_piece2" }] },
    ])
    w.rows.push({ id: "c1", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(10), updated_at: longAgo })
    await expect(
      assertNoForeignHold(w.container, { id: "cart_p", metadata: { acropora_parent_cart_id: "cart_a" } })
    ).resolves.toBeUndefined()
    w.rows[0]!.cart_id = "cart_x"
    w.carts[2]!.items.push({ variant_id: "v_piece" })
    // the shipped half is refused for the pickup half's piece, before anything becomes an order
    await expect(
      assertNoForeignHold(w.container, { id: "cart_a", metadata: { acropora_pickup_cart_id: "cart_p" } })
    ).rejects.toThrow("unique_piece_held:")
  })

  it("CHW-ORDER-OFF: without the switch nothing is read", async () => {
    delete process.env.ACROPORA_CART_HOLD
    const container = {
      resolve: () => {
        throw new Error("must not be called")
      },
    }
    await expect(assertNoForeignHold(container, { id: "cart_b" })).resolves.toBeUndefined()
  })

  it("CHW-ORDER-FAIL-OPEN: a lookup that throws lets the order go on, with a warning", async () => {
    const w = world([{ id: "cart_b", items: [{ variant_id: "v_piece" }] }])
    w.query.graph = async () => {
      throw new Error("db down")
    }
    await expect(assertNoForeignHold(w.container, { id: "cart_b" })).resolves.toBeUndefined()
    expect(w.warnings).toEqual([expect.stringContaining("db down")])
  })

  it("CHW-HOLDER: a pickup half holds through its parent", () => {
    expect(holderOf({ id: "cart_p", metadata: { acropora_parent_cart_id: "cart_a" } })).toBe("cart_a")
    expect(holderOf({ id: "cart_a", metadata: null })).toBe("cart_a")
    expect(holderOf({ id: "cart_a", metadata: { acropora_parent_cart_id: "" } })).toBe("cart_a")
  })
})

/** What both Medusa lock providers reject a wait past the timeout with (the Redis one as a MedusaError CONFLICT). */
const lockTimeout = () => new Error("Timed-out acquiring lock.")

describe("the lock's timeout is the race, not trouble (S2, barracuda's review of #703)", () => {
  it("CHW-BUSY: a lock still taken after a retry refuses with its own code, and holds nothing", async () => {
    const w = world([{ id: "cart_a", items: [] }])
    let calls = 0
    w.locking.execute = async () => {
      calls++
      throw lockTimeout()
    }
    await expect(holdOnAdd(w.container, "cart_a", ["v_piece"])).rejects.toMatchObject({
      type: "not_allowed",
      message: expect.stringMatching(/^unique_piece_busy:/),
    })
    expect(calls).toBe(2)
    expect(w.rows).toEqual([])
    expect(w.warnings).toEqual([])
    const lines = JSON.parse(
      (await holdOnAdd(w.container, "cart_a", ["v_piece"]).catch((e: Error) => e.message)).slice(
        "unique_piece_busy:".length
      )
    )
    expect(lines).toEqual([{ title: "Title v_piece", handle: "handle-v_piece" }])
  })

  it("CHW-BUSY-RETRY: one timeout and then the lock: the hold is made", async () => {
    const w = world([{ id: "cart_a", items: [] }])
    const real = w.locking.execute
    let calls = 0
    w.locking.execute = async (keys: string[], job: () => Promise<unknown>) => {
      calls++
      if (calls === 1) throw lockTimeout()
      return real(keys, job)
    }
    await holdOnAdd(w.container, "cart_a", ["v_piece"])
    expect(calls).toBe(2)
    expect(w.rows).toHaveLength(1)
  })

  it("CHW-LOCK-TROUBLE: any other lock failure (Redis down) still lets the line in, with a warning", async () => {
    const w = world([{ id: "cart_a", items: [] }])
    let calls = 0
    w.locking.execute = async () => {
      calls++
      throw new Error("Connection is closed.")
    }
    await expect(holdOnAdd(w.container, "cart_a", ["v_piece"])).resolves.toBeUndefined()
    expect(calls).toBe(1)
    expect(w.warnings).toEqual([expect.stringContaining("Connection is closed.")])
  })

  it("CHW-TIMEOUT-SHAPE: both providers' timeout is recognised, other messages are not", () => {
    expect(isLockTimeout(lockTimeout())).toBe(true)
    expect(isLockTimeout({ message: "Timed-out acquiring lock.", type: "conflict" })).toBe(true)
    expect(isLockTimeout(new Error("Connection is closed."))).toBe(false)
    expect(isLockTimeout(undefined)).toBe(false)
  })
})

describe("the storefront's question: is this piece held, and until when (S2)", () => {
  it("CHR-FOREIGN: another cart's standing hold shows its end, not mine; an ordinary product is not unique", async () => {
    const w = world([
      { id: "cart_a", items: [{ variant_id: "v_piece" }] },
      { id: "cart_b", items: [] },
    ])
    await holdOnAdd(w.container, "cart_a", ["v_piece"])
    const answer = await pieceHolds(w.container, ["v_piece", "v_plain"], "cart_b")
    expect(answer).toEqual({
      on: true,
      pieces: [
        { variant_id: "v_piece", unique: true, hold: { until: w.rows[0].expires_at.toISOString(), mine: false } },
        { variant_id: "v_plain", unique: false, hold: null },
      ],
    })
    // without a cart, the same: the page of a visitor with no cart yet
    expect((await pieceHolds(w.container, ["v_piece"])).pieces[0].hold).toMatchObject({ mine: false })
  })

  it("CHR-DEAD: another cart's hold that no longer stands (piece dropped, or ended) shows nothing", async () => {
    const w = world([
      { id: "cart_a", items: [] },
      { id: "cart_c", items: [{ variant_id: "v_piece2" }] },
    ])
    w.rows.push(
      { id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: minutesFromNow(20), updated_at: longAgo },
      { id: "chold_y", variant_id: "v_piece2", cart_id: "cart_c", expires_at: longAgo, updated_at: longAgo }
    )
    const answer = await pieceHolds(w.container, ["v_piece", "v_piece2"], "cart_b")
    expect(answer.pieces.map((piece) => piece.hold)).toEqual([null, null])
  })

  it("CHR-MINE: the asking cart's own hold shows even after its end, and a pickup half asks as its parent", async () => {
    const w = world([
      { id: "cart_a", metadata: { acropora_pickup_cart_id: "cart_p" }, items: [{ variant_id: "v_piece" }] },
      { id: "cart_p", metadata: { acropora_parent_cart_id: "cart_a" }, items: [] },
    ])
    w.rows.push({ id: "chold_x", variant_id: "v_piece", cart_id: "cart_a", expires_at: longAgo, updated_at: longAgo })
    for (const asking of ["cart_a", "cart_p"]) {
      const answer = await pieceHolds(w.container, ["v_piece"], asking)
      expect(answer.pieces[0].hold).toEqual({ until: longAgo.toISOString(), mine: true })
    }
  })

  it("CHR-OFF: without the switch nothing is read", async () => {
    process.env.ACROPORA_CART_HOLD = ""
    const w = world([])
    const graph = jest.spyOn(w.query, "graph")
    expect(await pieceHolds(w.container, ["v_piece"], "cart_a")).toEqual({ on: false, pieces: [] })
    expect(graph).not.toHaveBeenCalled()
  })
})
