import { BigNumber } from "@medusajs/framework/utils"

import { orderMailOperations, refundMailOperations, shippedMailOperations } from "../operations"

/*
  THE MAIL FACTS NEVER CARRY A NULL QUANTITY OR PRICE. On the test shop the
  split loader's Number(item.quantity) was NaN (2026-10-06, order #50), and
  JSON makes NaN null; the mail loaders read the same order module, so the
  quantities and amounts here go through medusaNumber: Medusa's BigNumber and
  its raw { value, precision } record are plain numbers in the facts.
*/
const raw = (value: number) => ({ value: String(value), precision: 20 })

const containerWith = (rows: Record<string, unknown[]>) =>
  ({
    resolve: (key: string) => {
      if (key === "query") return { graph: async (q: { entity: string }) => ({ data: rows[q.entity] ?? [] }) }
      throw new Error(`unexpected ${key}`)
    },
  }) as never

const order = {
  id: "order_1",
  display_id: 7,
  email: "vevo@example.test",
  total: new BigNumber(16450),
  items: [
    { id: "ordli_1", title: "Termék", product_title: "Termék", variant_title: null, quantity: raw(2), total: new BigNumber(10500), metadata: null },
    { id: "ordli_2", title: "Másik", product_title: "Másik", variant_title: null, quantity: new BigNumber(1), total: raw(4800), metadata: null },
  ],
  shipping_methods: [{ id: "ordsm_1", name: "Foxpost csomagpont", total: raw(1150), data: {} }],
  shipping_address: { postal_code: "1111", city: "Budapest", address_1: "Teszt utca 1." },
  payment_collections: [],
}

describe("mail facts from Medusa's number forms", () => {
  it("the order mail: BigNumber and raw quantities and totals are plain numbers, never null", async () => {
    const loaded = await orderMailOperations(containerWith({ order: [order] })).loadOrder("order_1")
    expect(loaded).toMatchObject({
      total: 16450,
      items: [
        { title: "Termék", quantity: 2, total: 10500 },
        { title: "Másik", quantity: 1, total: 4800 },
      ],
      shipping: [{ name: "Foxpost csomagpont", amount: 1150 }],
    })
    expect(JSON.parse(JSON.stringify(loaded))).toEqual(loaded)
  })

  it("the shipped mail: the quantities and the total are plain numbers", async () => {
    const loaded = await shippedMailOperations(containerWith({ order: [order] })).loadOrder("order_1")
    expect(loaded!.total).toBe(16450)
    expect(loaded!.items.map((item) => item.quantity)).toEqual([2, 1])
  })

  it("the refund mail: a BigNumber refund amount is a plain number", async () => {
    const loaded = await refundMailOperations(
      containerWith({
        payment: [{ id: "pay_1", provider_id: "pp_stripe_stripe", payment_collection_id: "pc_1", refunds: [{ id: "ref_1", amount: new BigNumber(2350), created_at: null }] }],
        payment_collection: [{ id: "pc_1", order: { id: "order_1", display_id: 7, email: "vevo@example.test" } }],
      })
    ).loadPayment("pay_1")
    expect(loaded!.refunds).toEqual([{ id: "ref_1", amount: 2350, created_at: null }])
  })

  it("a quantity that did not load stops the mail loudly instead of sending a null", async () => {
    const { quantity: _quantity, ...noQuantity } = order.items[0]
    await expect(
      orderMailOperations(containerWith({ order: [{ ...order, items: [noQuantity] }] })).loadOrder("order_1")
    ).rejects.toThrow("The quantity of item ordli_1 was not loaded")
  })
})
