import { buildCashOnDeliveryFeeLineItem } from "../../cod-fee-line-item"
import { type SplitOrder, planSplit, splitBlock } from "../plan"
import { type SplitOperations, type SplitSource, splitOrder } from "../split"

const line = (id: string, quantity: number, total: number, extra: Partial<SplitOrder["items"][number]> = {}) => ({
  id,
  variant_id: `var_${id}`,
  title: `Termék ${id}`,
  quantity,
  unit_price: total / quantity,
  total,
  discount_total: 0,
  metadata: null,
  ...extra,
})

const order = (extra: Partial<SplitSource> = {}): SplitSource => ({
  id: "order_A",
  status: "pending",
  display_id: 101,
  business_status: "stocking",
  metadata: { aszf_elfogadas: { verzio: "1" }, acropora_customer_note: "Délután", egyeb: 1 },
  fulfillments: [],
  items: [line("i1", 3, 3000), line("i2", 1, 5000)],
  payment_role: "COD",
  paid: false,
  payment_state: "none",
  reservation_locations: { i1: "sloc_1", i2: "sloc_1" },
  reservations: [
    { line_item_id: "i1", inventory_item_id: "iitem_1", location_id: "sloc_1", quantity: 3, allow_backorder: false },
  ],
  ...extra,
})

describe("splitBlock", () => {
  it("only before Kiszállítás, never canceled, shipped, paid, or the pickup half of a mixed cart", () => {
    expect(splitBlock(order(), false)).toBeNull()
    for (const status of ["pending_processing", "confirmed", "stocking"] as const) {
      expect(splitBlock(order({ business_status: status }), false)).toBeNull()
    }
    for (const status of ["out_for_delivery", "ready_for_pickup", "closed", "closed_unsuccessfully"] as const) {
      expect(splitBlock(order({ business_status: status }), false)).toBe("status")
    }
    expect(splitBlock(order({ business_status: null }), false)).toBe("status")
    expect(splitBlock(order({ status: "canceled" }), false)).toBe("canceled")
    expect(splitBlock(order({ fulfillments: [{ id: "f1", canceled_at: null }] }), false)).toBe("fulfilled")
    expect(splitBlock(order({ fulfillments: [{ id: "f1", canceled_at: new Date() }] }), false)).toBeNull()
    expect(splitBlock(order({ metadata: { acropora_parent_order_id: "order_X" } }), false)).toBe("pickup_half")
    expect(splitBlock(order(), true)).toBe("paid")
  })
})

describe("planSplit", () => {
  it("moves the selected quantities at the line's own price per unit, and says what stays", () => {
    expect(planSplit(order(), [{ item_id: "i1", quantity: 2 }])).toEqual({
      status: "ok",
      moved: [{ from_item_id: "i1", variant_id: "var_i1", title: "Termék i1", quantity: 2, unit_price: 1000, metadata: null }],
      remaining: [{ item_id: "i1", quantity: 1 }],
    })
  })
  it("a line given twice adds up, and is checked against its quantity", () => {
    expect(planSplit(order(), [{ item_id: "i1", quantity: 1 }, { item_id: "i1", quantity: 1 }])).toMatchObject({
      status: "ok",
      remaining: [{ item_id: "i1", quantity: 1 }],
    })
    expect(planSplit(order(), [{ item_id: "i1", quantity: 2 }, { item_id: "i1", quantity: 2 }])).toEqual({
      status: "invalid",
      message: "A(z) „Termék i1” tételből csak 3 db van a rendelésben.",
    })
  })
  it("refuses what is not a split: nothing, an unknown line, a bad quantity, a fee, a discounted line, everything", () => {
    const fee = line("fee", 1, 990, { variant_id: null, metadata: buildCashOnDeliveryFeeLineItem(990).metadata })
    const withFee = order({ items: [...order().items, fee] })
    expect(planSplit(order(), []).status).toBe("invalid")
    expect(planSplit(order(), [{ item_id: "x", quantity: 1 }])).toEqual({ status: "invalid", message: "A kijelölt tétel nincs ebben a rendelésben." })
    expect(planSplit(order(), [{ item_id: "i1", quantity: 0 }]).status).toBe("invalid")
    expect(planSplit(withFee, [{ item_id: "fee", quantity: 1 }])).toEqual({
      status: "invalid",
      message: "Az utánvét díja nem tétel, nem vihető át.",
    })
    expect(planSplit(order({ items: [line("i1", 2, 1800, { discount_total: 200 }), line("i2", 1, 5000)] }), [{ item_id: "i1", quantity: 1 }]).status).toBe(
      "invalid"
    )
    // every unit of every product: an empty A would stay, even with the fee line left
    expect(planSplit(withFee, [{ item_id: "i1", quantity: 3 }, { item_id: "i2", quantity: 1 }])).toEqual({
      status: "invalid",
      message: "Minden tétel átkerülne, és üres rendelés maradna; ez nem szétbontás.",
    })
  })
})

const fakeOps = (start: SplitSource) => {
  const orders = new Map<string, SplitSource>([[start.id, start]])
  const calls: string[] = []
  const created: Array<{ moved: unknown; metadata: Record<string, unknown> }> = []
  const ops: SplitOperations & { failReduce?: boolean; failCreate?: boolean; stock?: string | null } = {
    stockProblem: async () => {
      calls.push("stock")
      return ops.stock ?? null
    },
    loadOrder: async (id) => {
      const o = orders.get(id)
      return o ? JSON.parse(JSON.stringify(o)) : null
    },
    setMetadata: async (id, metadata) => {
      calls.push(`metadata:${id}`)
      orders.get(id)!.metadata = metadata
    },
    reduceLines: async (id, remaining) => {
      calls.push(`reduce:${id}`)
      if (ops.failReduce) throw new Error("edit failed")
      const o = orders.get(id)!
      for (const r of remaining) {
        const item = o.items.find((i) => i.id === r.item_id)!
        item.total = (item.total / item.quantity) * r.quantity
        item.quantity = r.quantity
      }
      o.items = o.items.filter((i) => i.quantity > 0)
    },
    createSplitOrder: async (_source, moved, metadata) => {
      calls.push("create")
      if (ops.failCreate) throw new Error("create failed")
      created.push({ moved, metadata })
      const id = `order_B${created.length}`
      orders.set(id, order({ id, display_id: 200 + created.length, metadata, items: [] }))
      return { id }
    },
    startBusinessStatus: async (id) => {
      calls.push(`status:${id}`)
    },
    notifySplit: async (id, splitId, payment) => {
      calls.push(`notify:${id}:${splitId}:${payment}`)
    },
    orderSummary: async (id) => {
      const o = orders.get(id)!
      return { display_id: o.display_id, total: o.id === "order_A" ? o.items.reduce((s, i) => s + i.total, 0) : 2000 }
    },
  }
  return { ops, orders, calls, created }
}

const ask = { lines: [{ item_id: "i1", quantity: 2 }], request_id: "req-1", actor: "Kovács Anna" }

describe("splitOrder", () => {
  it("records the request first, reduces A before B exists, then links them and starts B's status", async () => {
    const w = fakeOps(order())
    const result = await splitOrder("order_A", ask, "user_key", w.ops)
    expect(w.calls).toEqual([
      "stock",
      "metadata:order_A",
      "reduce:order_A",
      "create",
      "metadata:order_A",
      "metadata:order_A",
      "status:order_B1",
      "notify:order_A:order_B1:cod",
    ])
    expect(result).toEqual({
      status: "done",
      order_id: "order_B1",
      display_id: 201,
      parent_order_id: "order_A",
      parent_total: 6000,
      total: 2000,
      payment_state: "none",
      resumed: false,
    })
    expect(w.created[0]).toEqual({
      moved: [
        {
          from_item_id: "i1",
          variant_id: "var_i1",
          title: "Termék i1",
          quantity: 2,
          unit_price: 1000,
          metadata: null,
          location_id: "sloc_1",
          allow_backorder: false,
        },
      ],
      metadata: { aszf_elfogadas: { verzio: "1" }, acropora_customer_note: "Délután", acropora_split_from_order_id: "order_A" },
    })
    const meta = w.orders.get("order_A")!.metadata!
    expect(meta.acropora_split_order_ids).toEqual(["order_B1"])
    expect(meta.egyeb).toBe(1)
    expect((meta.acropora_split_requests as Record<string, unknown>)["req-1"]).toMatchObject({ order_id: "order_B1", done: true })
  })

  it("the same request again answers the same B and changes nothing", async () => {
    const w = fakeOps(order())
    await splitOrder("order_A", ask, "user_key", w.ops)
    w.calls.length = 0
    const again = await splitOrder("order_A", ask, "user_key", w.ops)
    expect(again).toMatchObject({ status: "done", order_id: "order_B1" })
    expect(w.calls).toEqual([])
    expect(w.created).toHaveLength(1)
  })

  it("a split that stopped after A's edit is finished by the same request, from the recorded plan", async () => {
    const w = fakeOps(order())
    w.ops.failCreate = true
    await expect(splitOrder("order_A", ask, "user_key", w.ops)).rejects.toThrow("create failed")
    expect(w.orders.get("order_A")!.items.find((i) => i.id === "i1")!.quantity).toBe(1)
    w.ops.failCreate = false
    // the OS sends the same request: the lines are already gone from A, the recorded plan carries them
    const result = await splitOrder("order_A", ask, "user_key", w.ops)
    expect(result).toMatchObject({ status: "done", order_id: "order_B1" })
    expect(w.created).toHaveLength(1)
    expect((w.created[0].moved as Array<{ quantity: number }>)[0].quantity).toBe(2)
  })

  it("a split left half done is finished by the NEXT request too, whatever its id and lines (acrobot 26807, #52)", async () => {
    const w = fakeOps(order())
    w.ops.failCreate = true
    await expect(splitOrder("order_A", ask, "user_key", w.ops)).rejects.toThrow("create failed")
    w.ops.failCreate = false
    // the OS's dialog was closed: a new request id, and other lines
    const result = await splitOrder("order_A", { ...ask, request_id: "req-2", lines: [{ item_id: "i2", quantity: 1 }] }, "user_key", w.ops)
    expect(result).toMatchObject({ status: "done", order_id: "order_B1", resumed: true })
    expect(w.created).toHaveLength(1)
    expect((w.created[0].moved as Array<{ from_item_id: string; quantity: number }>)[0]).toMatchObject({ from_item_id: "i1", quantity: 2 })
    const requests = w.orders.get("order_A")!.metadata!.acropora_split_requests as Record<string, { done: boolean }>
    expect(Object.keys(requests)).toEqual(["req-1"])
    expect(requests["req-1"]!.done).toBe(true)
    // i2 was not touched by the second request
    expect(w.orders.get("order_A")!.items.find((i) => i.id === "i2")!.quantity).toBe(1)
  })

  it("a line B could not hold is refused before anything changes", async () => {
    const w = fakeOps(order())
    w.ops.stock = "A(z) „Termék i1” tételből nincs elég szabad készlet az új rendeléshez, ezért a rendelés nem bontható szét. Semmi nem változott."
    const result = await splitOrder("order_A", ask, "user_key", w.ops)
    expect(result).toEqual({ status: "invalid", message: w.ops.stock })
    expect(w.calls).toEqual(["stock"])
    expect(w.orders.get("order_A")!.metadata!.acropora_split_requests).toBeUndefined()
  })

  it("a split that stopped after B was made does not make a second B", async () => {
    const w = fakeOps(order())
    const start = w.ops.startBusinessStatus
    w.ops.startBusinessStatus = async () => {
      throw new Error("status failed")
    }
    await expect(splitOrder("order_A", ask, "user_key", w.ops)).rejects.toThrow("status failed")
    w.ops.startBusinessStatus = start
    expect(await splitOrder("order_A", ask, "user_key", w.ops)).toMatchObject({ status: "done", order_id: "order_B1" })
    expect(w.created).toHaveLength(1)
    expect(w.orders.get("order_A")!.metadata!.acropora_split_order_ids).toEqual(["order_B1"])
  })

  it("a link already on A is not written twice when an unfinished record is finished", async () => {
    const start = order()
    start.metadata = {
      ...start.metadata,
      acropora_split_order_ids: ["order_B1"],
      acropora_split_requests: {
        "req-1": { order_id: "order_B1", moved: [], remaining: [{ item_id: "i1", quantity: 1 }], done: false },
      },
    }
    const w = fakeOps(start)
    w.orders.set("order_B1", order({ id: "order_B1", display_id: 201, items: [] }))
    expect(await splitOrder("order_A", ask, "u", w.ops)).toMatchObject({ status: "done", order_id: "order_B1" })
    expect(w.orders.get("order_A")!.metadata!.acropora_split_order_ids).toEqual(["order_B1"])
    expect(w.created).toHaveLength(0)
  })

  it("a card order splits while its hold stands: B waits for its own link, and the notice says card", async () => {
    const w = fakeOps(order({ payment_role: "ONLINE_CARD", payment_state: "hold" }))
    expect(await splitOrder("order_A", ask, "u", w.ops)).toMatchObject({ status: "done", payment_state: "awaiting_payment" })
    expect(w.calls.at(-1)).toBe("notify:order_A:order_B1:card")
  })

  it("a card order whose hold no longer stands, or an order with no known payment, is refused and nothing is written", async () => {
    for (const payment_state of ["awaiting_payment", "link_sent", "paid", "expired"]) {
      const w = fakeOps(order({ payment_role: "ONLINE_CARD", payment_state }))
      expect(await splitOrder("order_A", ask, "u", w.ops)).toEqual({ status: "blocked", reason: "card_not_held" })
      expect(w.calls).toEqual([])
    }
    const unknown = fakeOps(order({ payment_role: null }))
    expect(await splitOrder("order_A", ask, "u", unknown.ops)).toEqual({ status: "blocked", reason: "unknown_payment" })
    expect(unknown.calls).toEqual([])
  })

  it("a blocked or invalid split writes nothing", async () => {
    const paid = fakeOps(order({ paid: true }))
    expect(await splitOrder("order_A", ask, "u", paid.ops)).toEqual({ status: "blocked", reason: "paid" })
    const all = fakeOps(order())
    expect(
      await splitOrder("order_A", { ...ask, lines: [{ item_id: "i1", quantity: 3 }, { item_id: "i2", quantity: 1 }] }, "u", all.ops)
    ).toMatchObject({ status: "invalid" })
    expect([...paid.calls, ...all.calls]).toEqual([])
    expect(await splitOrder("order_X", ask, "u", fakeOps(order()).ops)).toEqual({ status: "not_found" })
  })

  it("a pay-at-store order splits like cash on delivery", async () => {
    const w = fakeOps(order({ payment_role: "PAY_AT_STORE" }))
    expect(await splitOrder("order_A", ask, "u", w.ops)).toMatchObject({ status: "done", payment_state: "none" })
    expect(w.calls.at(-1)).toBe("notify:order_A:order_B1:store")
  })
})
