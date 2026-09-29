import {
  PARENT_CART_METADATA_KEY,
  PICKUP_CART_METADATA_KEY,
  SplitCart,
  SplitLine,
  SplitOperations,
  completeSplitCart,
} from "../split-completion"

/**
 * THE SPLIT COMPLETION (P4-2a2). An in-memory shop stands in for Medusa: carts,
 * lines, payment choices and the orders made from them, with a log of every
 * call and a switch to make any one call fail.
 *
 * What must fail: the pickup lines not reaching their own order; the shipped
 * cart completed before its payment is re-made; a failed shipped completion
 * leaving the lines split; a failed pickup completion undoing the shipped
 * order; a repeated call making a third cart or a second order.
 */

const PAY_AT_STORE = "pp_system_default"
const COD = "pp_acropora_cod"

type Shop = {
  carts: Map<string, SplitCart>
  split: Map<string, string[]>
  log: string[]
  failOn: Set<string>
  links: [string, string][]
  warnings: string[]
  ops: SplitOperations
}

const line = (id: string, variant: string, quantity = 1): SplitLine => ({
  id,
  variant_id: variant,
  quantity,
})

const cart = (id: string, items: SplitLine[], extra: Partial<SplitCart> = {}): SplitCart => ({
  id,
  completed_at: null,
  order_id: null,
  metadata: {},
  items,
  payment_provider_id: COD,
  promo_codes: [],
  has_shipping_method: true,
  ...extra,
})

const makeShop = (carts: SplitCart[], split: Record<string, string[]>): Shop => {
  const shop = {
    carts: new Map(carts.map((c) => [c.id, structuredClone(c)])),
    split: new Map(Object.entries(split)),
    log: [] as string[],
    failOn: new Set<string>(),
    links: [] as [string, string][],
    warnings: [] as string[],
  } as Shop
  let lineSeq = 0
  let cartSeq = 0
  let orderSeq = 0
  const step = (name: string) => {
    shop.log.push(name)
    if (shop.failOn.has(name)) throw new Error(`${name} failed`)
  }
  const get = (id: string) => shop.carts.get(id)!

  shop.ops = {
    loadCart: async (id) => structuredClone(shop.carts.get(id) ?? null),
    splitLineIds: async (id) => {
      const lines = new Set(get(id).items.map((l) => l.id))
      return (shop.split.get(id) ?? []).filter((l) => lines.has(l))
    },
    createPickupCart: async (from) => {
      step(`createPickupCart ${from.id}`)
      const id = `cart_pickup_${++cartSeq}`
      shop.carts.set(
        id,
        cart(id, [], {
          metadata: { [PARENT_CART_METADATA_KEY]: from.id },
          payment_provider_id: null,
          has_shipping_method: false,
        })
      )
      get(from.id).metadata = {
        ...get(from.id).metadata,
        [PICKUP_CART_METADATA_KEY]: id,
      }
      return id
    },
    addLines: async (id, lines) => {
      step(`addLines ${id} ${lines.map((l) => l.variant_id).join(",")}`)
      for (const l of lines) get(id).items.push({ ...l, id: `line_new_${++lineSeq}` })
    },
    deleteLines: async (id, ids) => {
      step(`deleteLines ${id} ${ids.join(",")}`)
      get(id).items = get(id).items.filter((l) => !ids.includes(l.id))
      // Medusa drops the payment session when the total changes.
      if (ids.length) get(id).payment_provider_id = null
    },
    applyPromotions: async (id, codes) => {
      step(`applyPromotions ${id} ${codes.join(",")}`)
    },
    setStorePickup: async (id) => {
      step(`setStorePickup ${id}`)
      get(id).has_shipping_method = true
    },
    ensurePayment: async (id, provider) => {
      step(`ensurePayment ${id} ${provider}`)
      get(id).payment_provider_id = provider
    },
    complete: async (id) => {
      step(`complete ${id}`)
      const c = get(id)
      if (!c.payment_provider_id) throw new Error(`no payment on ${id}`)
      c.completed_at = "2026-09-29T18:30:00Z"
      c.order_id = `order_${++orderSeq}`
      return c.order_id
    },
    linkOrders: async (parent, pickup) => {
      step(`linkOrders ${parent} ${pickup}`)
      shop.links.push([parent, pickup])
    },
    warn: (message) => shop.warnings.push(message),
  }
  return shop
}

const config = { payAtStoreProviderId: PAY_AT_STORE }

const vegyes = () =>
  makeShop(
    [cart("cart_1", [line("l1", "v_eszkoz"), line("l2", "v_korall", 2)], { promo_codes: ["TAVASZ"] })],
    { cart_1: ["l2"] }
  )

describe("completing a mixed cart", () => {
  it("makes two orders: the shipped one first, then the pickup one, linked", async () => {
    const shop = vegyes()

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result).toEqual({ order_ids: ["order_1", "order_2"], pending_pickup_cart_id: null })
    expect(shop.carts.get("cart_1")!.items.map((l) => l.variant_id)).toEqual(["v_eszkoz"])
    const pickup = shop.carts.get("cart_pickup_1")!
    expect(pickup.items.map((l) => [l.variant_id, l.quantity])).toEqual([["v_korall", 2]])
    expect(pickup.payment_provider_id).toBe(PAY_AT_STORE)
    expect(shop.links).toEqual([["order_1", "order_2"]])
    expect(shop.log).toEqual([
      "createPickupCart cart_1",
      "addLines cart_pickup_1 v_korall",
      "deleteLines cart_1 l2",
      "applyPromotions cart_pickup_1 TAVASZ",
      "setStorePickup cart_pickup_1",
      `ensurePayment cart_1 ${COD}`,
      "complete cart_1",
      `ensurePayment cart_pickup_1 ${PAY_AT_STORE}`,
      "complete cart_pickup_1",
      "linkOrders order_1 order_2",
    ])
  })

  it("re-makes the shipped cart's own payment choice after the move, before completing it", async () => {
    const shop = vegyes()
    await completeSplitCart("cart_1", shop.ops, config)
    expect(shop.log.indexOf(`ensurePayment cart_1 ${COD}`)).toBeLessThan(
      shop.log.indexOf("complete cart_1")
    )
    expect(shop.log.indexOf("deleteLines cart_1 l2")).toBeLessThan(
      shop.log.indexOf(`ensurePayment cart_1 ${COD}`)
    )
  })

  it("refuses a mixed cart without a payment choice, and moves nothing", async () => {
    const shop = makeShop(
      [cart("cart_1", [line("l1", "v_eszkoz"), line("l2", "v_korall")], { payment_provider_id: null })],
      { cart_1: ["l2"] }
    )
    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow(
      "No payment method is selected"
    )
    expect(shop.log).toEqual([])
  })
})

describe("configuration", () => {
  it("without payment in the shop configured, refuses before moving anything", async () => {
    const shop = vegyes()
    await expect(
      completeSplitCart("cart_1", shop.ops, { payAtStoreProviderId: "" })
    ).rejects.toThrow("Payment in the shop is not configured")
    expect(shop.log).toEqual([])
  })
})

describe("when a step fails", () => {
  it("a failed shipped completion moves the pickup lines back, and makes no order", async () => {
    const shop = vegyes()
    shop.failOn.add("complete cart_1")

    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow(
      "complete cart_1 failed"
    )
    expect(shop.carts.get("cart_1")!.items.map((l) => l.variant_id).sort()).toEqual([
      "v_eszkoz",
      "v_korall",
    ])
    expect(shop.carts.get("cart_pickup_1")!.items).toEqual([])
    expect(shop.links).toEqual([])
  })

  it("the next attempt reuses the emptied pickup cart, and succeeds", async () => {
    const shop = vegyes()
    shop.failOn.add("complete cart_1")
    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow()
    shop.failOn.clear()
    shop.carts.get("cart_1")!.payment_provider_id = COD

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result.order_ids).toHaveLength(2)
    expect([...shop.carts.keys()].filter((k) => k.startsWith("cart_pickup"))).toEqual([
      "cart_pickup_1",
    ])
  })

  it("a failed pickup completion keeps the shipped order and names the pickup cart", async () => {
    const shop = vegyes()
    shop.failOn.add("complete cart_pickup_1")

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result).toEqual({ order_ids: ["order_1"], pending_pickup_cart_id: "cart_pickup_1" })
    expect(shop.warnings[0]).toContain("cart_pickup_1")
  })

  it("calling again after that finishes the pickup order, without a second shipped order", async () => {
    const shop = vegyes()
    shop.failOn.add("complete cart_pickup_1")
    await completeSplitCart("cart_1", shop.ops, config)
    shop.failOn.clear()

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result).toEqual({ order_ids: ["order_1", "order_2"], pending_pickup_cart_id: null })
    expect(shop.log.filter((l) => l === "complete cart_1")).toHaveLength(1)
  })

  it("a call after both orders exist changes nothing but the link, which is safe to repeat", async () => {
    const shop = vegyes()
    await completeSplitCart("cart_1", shop.ops, config)
    const before = shop.log.length

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result.order_ids).toEqual(["order_1", "order_2"])
    expect(shop.log.slice(before)).toEqual(["linkOrders order_1 order_2"])
  })
})

describe("a cart that is not mixed", () => {
  it("is completed as one order, with no pickup cart", async () => {
    const shop = makeShop([cart("cart_1", [line("l1", "v_eszkoz")])], {})
    const result = await completeSplitCart("cart_1", shop.ops, config)
    expect(result).toEqual({ order_ids: ["order_1"], pending_pickup_cart_id: null })
    expect(shop.log).toEqual(["complete cart_1"])
  })

  it("an unknown cart is a not-found error", async () => {
    const shop = makeShop([], {})
    await expect(completeSplitCart("cart_x", shop.ops, config)).rejects.toThrow(
      "was not found"
    )
  })
})
