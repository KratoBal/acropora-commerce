import {
  shippingProfileGaps,
  PARENT_CART_METADATA_KEY,
  PICKUP_CART_METADATA_KEY,
  SplitCart,
  SplitLine,
  SharedPaymentOperations,
  SplitOperations,
  SPLIT_LOCK_KEY,
  STRIPE_SHARE,
  rejoinAndClearSharedSplit,
  chooseCardPayment,
  completeSplitCart,
  startCardPayment,
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
const STRIPE = "pp_stripe_stripe"
/** Unit prices for the in-memory totals. */
const PRICE: Record<string, number> = { v_eszkoz: 4950, v_korall: 8500 }
const PRICE_TOTAL = (c: SplitCart) =>
  c.items.reduce((sum, l) => sum + (PRICE[l.variant_id ?? ""] ?? 0) * l.quantity, 0)
const COD = "pp_acropora_cod"

type Shop = {
  carts: Map<string, SplitCart>
  split: Map<string, string[]>
  log: string[]
  failOn: Set<string>
  links: [string, string][]
  warnings: string[]
  /** Variants whose product is not on the store pickup's profile. */
  profileGaps: Set<string>
  /** The discount Medusa would compute on a cart; none by default. */
  discountOf: (c: SplitCart) => number
  /** The keys the jobs were run under, in order. */
  locks: string[]
  ops: SharedPaymentOperations
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
  pickup_promo_codes: [],
  has_shipping_method: true,
  shared_payment: false,
  ...extra,
})

const makeShop = (carts: SplitCart[], split: Record<string, string[]>): Shop => {
  const shop = {
    carts: new Map(carts.map((c) => [c.id, structuredClone(c)])),
    split: new Map(Object.entries(split)),
    log: [] as string[],
    stripeStartData: [] as Record<string, unknown>[],
    failOn: new Set<string>(),
    links: [] as [string, string][],
    warnings: [] as string[],
    profileGaps: new Set<string>(),
    discountOf: () => 0,
    locks: [] as string[],
  } as Shop
  // A real mutex per key: a second job waits for the first to finish.
  const queues = new Map<string, Promise<unknown>>()
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
    pickupProfileGaps: async (lines) => {
      step(`pickupProfileGaps ${lines.map((l) => l.variant_id).join(",")}`)
      return lines
        .filter((l) => shop.profileGaps.has(l.variant_id ?? ""))
        .map((l) => `prod_${l.variant_id}`)
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
    discountTotal: async (id) => shop.discountOf(get(id)),
    dropCashOnDeliveryFee: async (id) => {
      step(`dropCashOnDeliveryFee ${id}`)
    },
    clearPayment: async (id) => {
      step(`clearPayment ${id}`)
      get(id).payment_provider_id = null
      get(id).shared_payment = false
    },
    withLock: async (id, job) => {
      const key = SPLIT_LOCK_KEY(id)
      shop.locks.push(key)
      const before = queues.get(key) ?? Promise.resolve()
      const run = before.then(job, job)
      queues.set(key, run.catch(() => undefined))
      return run
    },
    cartTotal: async (id) =>
      get(id).items.reduce((sum, l) => sum + (PRICE[l.variant_id ?? ""] ?? 0) * l.quantity, 0),
    startPayment: async (id, provider, data, factsKey) => {
      const keys = Object.keys(data).filter((k) => k.startsWith("stripe"))
      const joint = data.stripe_joint as { total: number } | undefined
      const joined = data.stripe_joined
      const jointTotal = joint?.total
      step(
        `startPayment ${id} ${provider} ${JSON.stringify(keys)}${jointTotal !== undefined ? ` ${jointTotal}` : ""}${
          factsKey !== "stripe_share" ? ` key=${factsKey}` : ""
        }`
      )
      const c = get(id)
      c.payment_provider_id = provider
      c.shared_payment = true
      if (joined) {
        return { ...(joined as object), joined: true }
      }
      c.shared_payment = !!joint
      shop.stripeStartData.push(data)
      return { transactionId: "pi_1", total: joint?.total ?? PRICE_TOTAL(c), own: PRICE_TOTAL(c), clientSecret: "pi_1_secret" }
    },
  }
  return shop
}

const config = {
  payAtStoreProviderId: PAY_AT_STORE,
  onlineCardProviderIds: [STRIPE],
}
const CARD = { providerId: STRIPE, share: STRIPE_SHARE }

const vegyes = () =>
  makeShop(
    [cart("cart_1", [line("l1", "v_eszkoz"), line("l2", "v_korall", 2)], { pickup_promo_codes: ["TAVASZ"] })],
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
      "pickupProfileGaps v_korall",
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

  /*
    A CARD CHOSEN FOR THE WHOLE CART. The split
    below re-creates the shipped cart's session, which would discard a payment
    the customer already confirmed. What must fail: the lines moving, or a new
    session, before the refusal.
  */
  it("refuses a card chosen for the whole mixed cart, and moves nothing", async () => {
    const shop = makeShop(
      [cart("cart_1", [line("l1", "v_eszkoz"), line("l2", "v_korall")], { payment_provider_id: STRIPE })],
      { cart_1: ["l2"] }
    )
    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow(
      "A card payment for a cart with pickup-only items starts split"
    )
    expect(shop.log).toEqual([])
    expect(shop.carts.get("cart_1")!.items).toHaveLength(2)
    expect(shop.carts.get("cart_1")!.payment_provider_id).toBe(STRIPE)
  })
})

describe("the pickup order must be possible before the first order", () => {
  // Measured on stage, 2026-09-29: a pickup product without a shipping
  // profile let the shipped order through and left the pickup cart pending.
  it("a pickup product off the store pickup's profile refuses the placement, with nothing moved", async () => {
    const shop = vegyes()
    shop.profileGaps.add("v_korall")

    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow(
      "Some pickup items cannot be collected in the shop yet"
    )
    expect(shop.log).toEqual(["pickupProfileGaps v_korall"])
    expect(shop.carts.get("cart_1")!.items).toHaveLength(2)
    expect(shop.warnings[0]).toContain("prod_v_korall")
  })

  it("a cart that is not mixed is not checked", async () => {
    const shop = makeShop([cart("cart_1", [line("l1", "v_eszkoz")])], {})
    shop.profileGaps.add("v_eszkoz")
    await completeSplitCart("cart_1", shop.ops, config)
    expect(shop.log).toEqual(["complete cart_1"])
  })
})

describe("which products are off the store pickup's profile", () => {
  const variants = [
    { id: "v1", product: { id: "p1", shipping_profile: { id: "sp_default" } } },
    { id: "v2", product: { id: "p2", shipping_profile: null } },
    { id: "v3", product: { id: "p3", shipping_profile: { id: "sp_masik" } } },
  ]

  it("names the products without the pickup's profile, once each", () => {
    expect(
      shippingProfileGaps(variants, ["v1", "v2", "v3", "v2"], "sp_default")
    ).toEqual(["p2", "p3"])
  })

  it("a variant it cannot find, or an unknown pickup profile, is a gap", () => {
    expect(shippingProfileGaps(variants, ["v9"], "sp_default")).toEqual([
      "variant v9",
    ])
    expect(shippingProfileGaps(variants, ["v1"], null)).toEqual(["p1"])
  })
})

describe("configuration", () => {
  it("without payment in the shop configured, refuses before moving anything", async () => {
    const shop = vegyes()
    await expect(
      completeSplitCart("cart_1", shop.ops, {
        payAtStoreProviderId: "",
        onlineCardProviderIds: [],
      })
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

  // A move that stopped half way (added to the pickup cart, not yet removed
  // from the shipped one) must not put the live animal on the pickup order
  // twice when the call is repeated.
  it("a repeated call after a half-done move does not add the lines twice", async () => {
    const shop = vegyes()
    shop.failOn.add("deleteLines cart_1 l2")
    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow(
      "deleteLines cart_1 l2 failed"
    )
    shop.failOn.clear()

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result.order_ids).toHaveLength(2)
    expect(
      shop.carts.get("cart_pickup_1")!.items.map((l) => [l.variant_id, l.quantity])
    ).toEqual([["v_korall", 2]])
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

describe("a mixed cart with a code that must not go twice", () => {
  it("the pickup cart gets no promotion call when none of the codes divide", async () => {
    const shop = makeShop(
      [cart("cart_1", [line("l1", "v_eszkoz"), line("l2", "v_korall")], { pickup_promo_codes: [] })],
      { cart_1: ["l2"] }
    )

    await completeSplitCart("cart_1", shop.ops, config)

    expect(shop.log.filter((entry) => entry.startsWith("applyPromotions"))).toEqual([])
  })
})

/**
 * ONE CARD PAYMENT FOR BOTH ORDERS (P4-3c2b). What must fail: the payment
 * started before the lines are split, or for anything but the two carts'
 * sum; the pickup session starting a second transaction; a failed start
 * leaving the lines split; a non-split cart started here; the completion of a
 * shared payment moving lines, moving them back on failure, or making the
 * pickup order pay in the shop.
 */
describe("starting one card payment for a mixed cart", () => {
  const config = CARD

  it("the Stripe lock refuses a mixed cart before anything changes", async () => {
    const shop = vegyes()

    await expect(
      startCardPayment("cart_1", shop.ops, { ...CARD, allowSplit: false })
    ).rejects.toThrow("does not pay a cart with pickup-only items yet")
    expect(shop.log).toEqual([])
    expect(shop.carts.get("cart_1")!.items).toHaveLength(2)
  })

  it("the lock leaves a cart that is not split alone", async () => {
    const plain = makeShop([cart("cart_1", [line("l1", "v_eszkoz")])], {})

    await startCardPayment("cart_1", plain.ops, { ...CARD, allowSplit: false })
    expect(plain.log.at(-1)).toBe(`startPayment cart_1 ${STRIPE} []`)
  })

  /*
    ONE STRIPE PAYMENT FOR BOTH ORDERS (Balázs 2026-10-01). What must fail: the
    Stripe keys not reaching the sessions, the storefront left without the joint
    intent's secret, or a payment method type other than card (Link) asked for.
  */
  it("splits first, then starts one intent for both carts, which the pickup session joins", async () => {
    const shop = vegyes()

    const result = await startCardPayment("cart_1", shop.ops, config)

    // card only, as the deferred card field asks (Apple Pay and Google Pay are card wallets)
    expect(shop.stripeStartData[0].payment_method_types).toEqual(["card"])
    expect(result).toEqual({
      // the storefront confirms the card with the joint intent's secret
      client_secret: "pi_1_secret",
      total: 4950 + 17000,
      shipped_total: 4950,
      pickup_total: 17000,
      pickup_cart_id: "cart_pickup_1",
    })
    expect(shop.log).toEqual([
      "dropCashOnDeliveryFee cart_1",
      "pickupProfileGaps v_korall",
      "createPickupCart cart_1",
      "addLines cart_pickup_1 v_korall",
      "deleteLines cart_1 l2",
      "applyPromotions cart_pickup_1 TAVASZ",
      "setStorePickup cart_pickup_1",
      `startPayment cart_1 ${STRIPE} ["stripe_joint"] 21950`,
      `startPayment cart_pickup_1 ${STRIPE} ["stripe_joined"]`,
    ])
  })

  it("a failed start puts the lines back, so the cart is whole again", async () => {
    const shop = vegyes()
    shop.failOn.add(`startPayment cart_pickup_1 ${STRIPE} ["stripe_joined"]`)

    await expect(startCardPayment("cart_1", shop.ops, config)).rejects.toThrow("failed")

    expect(shop.carts.get("cart_1")!.items.map((l) => l.variant_id).sort()).toEqual(["v_eszkoz", "v_korall"])
    expect(shop.carts.get("cart_pickup_1")!.items).toEqual([])
  })

  it("a cart that is not split gets one intent for itself, after its fee is dropped", async () => {
    const plain = makeShop([cart("cart_1", [line("l1", "v_eszkoz")])], {})

    expect(await startCardPayment("cart_1", plain.ops, config)).toEqual({
      client_secret: "pi_1_secret",
      total: 4950,
      shipped_total: 4950,
      pickup_total: 0,
      pickup_cart_id: null,
    })
    expect(plain.log).toEqual(["dropCashOnDeliveryFee cart_1", `startPayment cart_1 ${STRIPE} []`])
    expect(plain.carts.size).toBe(1)
  })

  it("refuses a shop without card payment, and a completed cart, with nothing changed", async () => {
    const shop = vegyes()
    await expect(startCardPayment("cart_1", shop.ops, { ...CARD, providerId: "" })).rejects.toThrow("not configured")

    const done = vegyes()
    done.carts.get("cart_1")!.completed_at = "2026-09-29T20:00:00Z"
    await expect(startCardPayment("cart_1", done.ops, config)).rejects.toThrow("already completed")
    expect([...shop.log, ...done.log]).toEqual([])
  })

  it("started again, it reuses the split and starts a new intent", async () => {
    const shop = vegyes()
    await startCardPayment("cart_1", shop.ops, config)
    shop.log.length = 0

    await startCardPayment("cart_1", shop.ops, config)

    expect(shop.log).toEqual([
      "dropCashOnDeliveryFee cart_1",
      "applyPromotions cart_pickup_1 TAVASZ",
      `startPayment cart_1 ${STRIPE} ["stripe_joint"] 21950`,
      `startPayment cart_pickup_1 ${STRIPE} ["stripe_joined"]`,
    ])
    expect(shop.carts.size).toBe(2)
  })
})

describe("completing a split paid together", () => {
  const paid = async () => {
    const shop = vegyes()
    await startCardPayment("cart_1", shop.ops, CARD)
    shop.log.length = 0
    return shop
  }

  it("moves nothing, and both orders keep the card payment", async () => {
    const shop = await paid()

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result).toEqual({ order_ids: ["order_1", "order_2"], pending_pickup_cart_id: null })
    expect(shop.log).toEqual([
      `ensurePayment cart_1 ${STRIPE}`,
      "complete cart_1",
      `ensurePayment cart_pickup_1 ${STRIPE}`,
      "complete cart_pickup_1",
      "linkOrders order_1 order_2",
    ])
  })

  it("a failed completion moves nothing back: the payment belongs to the two carts as they are", async () => {
    const shop = await paid()
    shop.failOn.add("complete cart_1")

    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow("failed")

    expect(shop.log).toEqual([`ensurePayment cart_1 ${STRIPE}`, "complete cart_1"])
    expect(shop.carts.get("cart_pickup_1")!.items.map((l) => l.variant_id)).toEqual(["v_korall"])
  })

  it("a pickup line added to the shipped cart after the payment started is refused, before anything moves", async () => {
    const shop = await paid()
    shop.carts.get("cart_1")!.items.push(line("l9", "v_korall"))
    shop.split.set("cart_1", ["l9"])

    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow("changed after its shared payment")
    expect(shop.log).toEqual([])
  })

  it("called again after the shipped order, the pickup order also keeps the card payment", async () => {
    const shop = await paid()
    shop.failOn.add("complete cart_pickup_1")
    await completeSplitCart("cart_1", shop.ops, config)
    shop.failOn.clear()
    shop.log.length = 0

    const result = await completeSplitCart("cart_1", shop.ops, config)

    expect(result.order_ids).toHaveLength(2)
    expect(shop.log).toEqual([
      `ensurePayment cart_pickup_1 ${STRIPE}`,
      "complete cart_pickup_1",
      "linkOrders order_1 order_2",
    ])
  })
})

/**
 * THE DISCOUNT MAY NOT CHANGE BY SPLITTING (acrobot's decision, 2026-09-29).
 * Measured on stage: an automatic fixed cart-level promotion landed on both
 * carts (635 + 635 instead of 635), a code targeting the pickup item and a
 * minimum-subtotal code landed on neither. What must fail: a split placed or
 * paid with another discount than the whole cart's; the lines left split
 * after the refusal; the refusal without its code (the storefront's sentence
 * hangs on it); a rounding difference refused.
 */
describe("a split that would change the discount", () => {
  // An automatic fixed promotion: 635 on every cart that has lines.
  const automatic = (c: SplitCart) => (c.items.length ? 635 : 0)

  it("is refused before any order, and the lines go back", async () => {
    const shop = vegyes()
    shop.discountOf = automatic

    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow(
      "split_discount_changed: the discount changes"
    )

    expect(shop.carts.get("cart_1")!.items.map((l) => l.variant_id).sort()).toEqual(["v_eszkoz", "v_korall"])
    expect(shop.carts.get("cart_pickup_1")!.items).toEqual([])
    expect(shop.log.some((entry) => entry.startsWith("ensurePayment") || entry.startsWith("complete"))).toBe(false)
    expect(shop.warnings.join()).toContain("1270 split, 635 whole")
  })

  it("the shared card payment is not started either", async () => {
    const shop = vegyes()
    shop.discountOf = automatic

    await expect(startCardPayment("cart_1", shop.ops, CARD)).rejects.toThrow(
      "split_discount_changed"
    )
    expect(shop.log.some((entry) => entry.startsWith("startPayment"))).toBe(false)
  })

  it("a discount that is lost by the split is refused the same way", async () => {
    const shop = vegyes()
    // A minimum-subtotal code: only the whole cart (two lines) meets it.
    shop.discountOf = (c) => (c.items.length === 2 ? 1150 : 0)

    await expect(completeSplitCart("cart_1", shop.ops, config)).rejects.toThrow("split_discount_changed")
  })

  it("a percentage split into two roundings is the same discount", async () => {
    const shop = vegyes()
    // 950 whole; 100 + 849.9999999 split, as measured.
    shop.discountOf = (c) =>
      c.items.length === 2 ? 950 : c.items.some((l) => l.variant_id === "v_korall") ? 849.9999999 : 100

    const result = await completeSplitCart("cart_1", shop.ops, config)
    expect(result.order_ids).toHaveLength(2)
  })
})

/**
 * PUTTING A SPLIT BACK AFTER AN UNPAID SHARED PAYMENT (P4-3c3). What must
 * fail: the lines left in the pickup cart after a cancelled payment; a split
 * put back whose payment was not shared (paid in the shop, or not started);
 * a completed cart or pickup cart touched.
 */
describe("putting a split back after its shared payment did not happen", () => {
  const started = async () => {
    const shop = vegyes()
    await startCardPayment("cart_1", shop.ops, CARD)
    shop.log.length = 0
    return shop
  }

  it("moves the pickup lines back to the cart, which is whole again", async () => {
    const shop = await started()

    expect(await rejoinAndClearSharedSplit("cart_1", shop.ops)).toEqual({ rejoined: true })

    expect(shop.carts.get("cart_1")!.items.map((l) => l.variant_id).sort()).toEqual(["v_eszkoz", "v_korall"])
    expect(shop.carts.get("cart_pickup_1")!.items).toEqual([])
  })

  it("leaves alone a cart that is not split, not paid together, or already completed", async () => {
    const plain = vegyes()
    expect(await rejoinAndClearSharedSplit("cart_1", plain.ops)).toEqual({ rejoined: false })

    const shop = await started()
    shop.carts.get("cart_1")!.shared_payment = false
    expect(await rejoinAndClearSharedSplit("cart_1", shop.ops)).toEqual({ rejoined: false })

    const done = await started()
    done.carts.get("cart_pickup_1")!.completed_at = "2026-09-29T20:00:00Z"
    expect(await rejoinAndClearSharedSplit("cart_1", done.ops)).toEqual({ rejoined: false })

    const shipped = await started()
    shipped.carts.get("cart_1")!.completed_at = "2026-09-29T20:00:00Z"
    expect(await rejoinAndClearSharedSplit("cart_1", shipped.ops)).toEqual({ rejoined: false })

    expect([...shop.log, ...done.log, ...shipped.log].filter((e) => e.startsWith("addLines"))).toEqual([])
  })
})

/**
 * ONE SPLIT AT A TIME PER CART. What must fail: two placements of the same
 * cart at once (a double click) making two pickup carts or a second shipped
 * order; the lock taken on the cart id itself, which Medusa's own completion
 * holds inside the job; the card start or the rejoin running unlocked.
 */
describe("two splits of the same cart at once", () => {
  it("run one after the other: one pickup cart, one pair of orders, both answers the same", async () => {
    const shop = vegyes()

    const [first, second] = await Promise.all([
      completeSplitCart("cart_1", shop.ops, config),
      completeSplitCart("cart_1", shop.ops, config),
    ])

    expect(first).toEqual({ order_ids: ["order_1", "order_2"], pending_pickup_cart_id: null })
    expect(second).toEqual(first)
    expect([...shop.carts.keys()]).toEqual(["cart_1", "cart_pickup_1"])
    expect(shop.log.filter((e) => e.startsWith("createPickupCart"))).toHaveLength(1)
  })

  it("take a key of their own, not the cart id Medusa locks, for every entry", async () => {
    const shop = vegyes()
    await startCardPayment("cart_1", shop.ops, CARD)
    await completeSplitCart("cart_1", shop.ops, config)
    // after the orders it changes nothing, but still takes the key
    await rejoinAndClearSharedSplit("cart_1", shop.ops)

    expect(shop.locks).toEqual(["split:cart_1", "split:cart_1", "split:cart_1"])
  })
})

/**
 * THE CUSTOMER CHOSE CARD PAYMENT FOR A MIXED CART. What must fail: an intent
 * started before placement; the cash-on-delivery fee or the old session left
 * on the cart, so the review shows the wrong amount; a completed cart touched.
 */
describe("choosing card payment", () => {
  it("drops the old session and the fee, and starts nothing", async () => {
    const shop = vegyes()

    await chooseCardPayment("cart_1", shop.ops)

    expect(shop.log).toEqual(["clearPayment cart_1", "dropCashOnDeliveryFee cart_1"])
    expect(shop.carts.get("cart_1")!.payment_provider_id).toBeNull()
    expect(shop.locks).toEqual(["split:cart_1"])
  })

  it("refuses a completed cart", async () => {
    const shop = vegyes()
    shop.carts.get("cart_1")!.completed_at = "2026-09-29T20:00:00Z"
    await expect(chooseCardPayment("cart_1", shop.ops)).rejects.toThrow("already completed")
    expect(shop.log).toEqual([])
  })
})

/**
 * A SHARED STRIPE PAYMENT THAT DID NOT HAPPEN (Balázs 2026-10-01). What must
 * fail: the lines left split, a session left on either cart (the joint one
 * would keep a hold on the card), or a cart that is not shared touched.
 */
describe("rejoinAndClearSharedSplit", () => {
  it("puts the lines back and drops both carts' payment sessions", async () => {
    const shop = vegyes()
    await startCardPayment("cart_1", shop.ops, CARD)
    shop.log.length = 0

    expect(await rejoinAndClearSharedSplit("cart_1", shop.ops)).toEqual({ rejoined: true })
    expect(shop.carts.get("cart_1")!.items.map((l) => l.variant_id).sort()).toEqual(["v_eszkoz", "v_korall"])
    expect(shop.log.filter((entry) => entry.startsWith("clearPayment"))).toEqual([
      "clearPayment cart_1",
      "clearPayment cart_pickup_1",
    ])
  })

  it("a cart that is not split, or not shared, is left alone", async () => {
    const plain = makeShop([cart("cart_1", [line("l1", "v_eszkoz")])], {})
    expect(await rejoinAndClearSharedSplit("cart_1", plain.ops)).toEqual({ rejoined: false })
    expect(plain.log.filter((entry) => !entry.startsWith("lock"))).toEqual([])
  })
})
