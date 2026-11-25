import { MedusaError } from "@medusajs/framework/utils"

import { BANK_TRANSFER_PROVIDER_ID } from "../../../../modules/acropora-transfer"
import { ACROPORA_FEE_TYPE_METADATA_KEY, CASH_ON_DELIVERY_FEE_TYPE } from "../../cod-fee-line-item"
import { ACROPORA_LINE_ITEM_KIND_METADATA_KEY } from "../../goods-total"
import type { PaymentRole } from "../../payment-eligibility"
import { recordTransferReceipt } from "../transfer-receipt"
import {
  ORDER_PAYMENT_SWITCH_METADATA_KEY,
  switchToBankTransfer,
  type SwitchOrder,
  type SwitchToTransferOperations,
} from "../switch-to-transfer"

/*
  "ÁTÁLLÍTÁS ELŐRE UTALÁSRA" (card d31a66a3; Balázs 2026-11-25 10:19 UTC). MI PIROSÍT: a card hold stays live after the switch (the
  customer would be charged at Kiszállítás too); the cash-on-delivery fee stays on the order (the proforma would carry it); the new
  bank-transfer session is not in the shape the transfer receipt looks for (the OS's "Utalás beérkezett" would fail); a second press
  makes a second collection; a half-done run cannot be finished; a paid, shipped or mixed-pair order is switched; the card's
  payment state (hold, link) still reads on the order.
*/
const COD = "pp_acropora_cod"
const STRIPE = "pp_stripe_stripe"
const STORE = "pp_system_default"
const ROLES = new Map<string, PaymentRole>([
  [STRIPE, "ONLINE_CARD"],
  [COD, "COD"],
  [STORE, "PAY_AT_STORE"],
  [BANK_TRANSFER_PROVIDER_ID, "BANK_TRANSFER"],
])
// the fee line's own marker, from the same constants the shop sets it with
const COD_FEE = { [ACROPORA_LINE_ITEM_KIND_METADATA_KEY]: "fee", [ACROPORA_FEE_TYPE_METADATA_KEY]: CASH_ON_DELIVERY_FEE_TYPE }

function shop(order: SwitchOrder, options: { failOpen?: boolean } = {}) {
  const calls: string[] = []
  let collections = 0
  const state = { order: structuredClone(order) }
  const ops: SwitchToTransferOperations = {
    load: async () => structuredClone(state.order),
    roles: () => ROLES,
    removeLines: async (_id, ids) => {
      calls.push(`remove:${ids.join(",")}`)
      for (const item of state.order.items) if (ids.includes(item.id)) item.quantity = 0
      state.order.total -= 590
    },
    cancelPayment: async (id) => {
      calls.push(`cancelPayment:${id}`)
      for (const c of state.order.payment_collections) for (const p of c.payments) if (p.id === id) p.canceled_at = "now"
    },
    cancelCollection: async (id) => {
      calls.push(`cancelCollection:${id}`)
      for (const c of state.order.payment_collections) if (c.id === id) c.status = "canceled"
    },
    openCollection: async (_id, amount) => {
      if (options.failOpen) throw new Error("the shop is down")
      const id = `pay_col_new_${++collections}`
      calls.push(`open:${amount}`)
      state.order.payment_collections.push({ id, status: "not_paid", payment_sessions: [], payments: [] })
      return { id, amount }
    },
    startTransferSession: async (collectionId) => {
      calls.push(`session:${collectionId}`)
      const c = state.order.payment_collections.find((x) => x.id === collectionId)!
      c.payment_sessions.push({ id: "payses_transfer", provider_id: BANK_TRANSFER_PROVIDER_ID, status: "pending_authorization" })
      return { id: "payses_transfer", status: "pending_authorization" }
    },
    setMetadata: async (_id, metadata) => {
      calls.push("metadata")
      state.order.metadata = metadata
    },
  }
  return { ops, calls, state }
}

const order = (over: Partial<SwitchOrder>): SwitchOrder => ({
  id: "order_1",
  total: 120000,
  metadata: null,
  business_status: "confirmed",
  items: [{ id: "item_1", quantity: 1, metadata: null }],
  payment_collections: [],
  ...over,
})

const cardOrder = (metadata: Record<string, unknown> | null = { acropora_payment: { state: "hold" } }) =>
  order({
    metadata,
    payment_collections: [
      {
        id: "pay_col_card",
        status: "authorized",
        payment_sessions: [{ id: "payses_card", provider_id: STRIPE, status: "authorized" }],
        payments: [{ id: "pay_card", provider_id: STRIPE, canceled_at: null, captured: 0 }],
      },
    ],
  })

const codOrder = () =>
  order({
    total: 120590,
    items: [
      { id: "item_1", quantity: 1, metadata: null },
      { id: "item_fee", quantity: 1, metadata: COD_FEE },
    ],
    payment_collections: [
      {
        id: "pay_col_cod",
        status: "awaiting",
        payment_sessions: [{ id: "payses_cod", provider_id: COD, status: "pending_authorization" }],
        payments: [],
      },
    ],
  })

describe("switching a placed order to bank transfer", () => {
  it("a card order: the hold is canceled, its collection closed, a transfer collection opened for the total, the card state cleared", async () => {
    const { ops, calls, state } = shop(cardOrder())
    const result = await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, ops, () => new Date("2026-11-25T11:00:00Z"))
    expect(result).toEqual({ switched: true, from: "ONLINE_CARD", amount: 120000, collection_id: "pay_col_new_1", removed_cod_fee: false })
    expect(calls).toEqual([
      "metadata",
      "cancelPayment:pay_card",
      "cancelCollection:pay_col_card",
      "open:120000",
      "session:pay_col_new_1",
      "metadata",
    ])
    expect(state.order.metadata?.acropora_payment).toBeNull()
    expect(state.order.metadata?.[ORDER_PAYMENT_SWITCH_METADATA_KEY]).toMatchObject({
      state: "done",
      from: "ONLINE_CARD",
      by: "Teszt Elek",
      started_at: "2026-11-25T11:00:00.000Z",
    })
  })

  it("cash on delivery: the fee line leaves by an order edit first, then the collection, and the transfer is for the new total", async () => {
    const { ops, calls, state } = shop(codOrder())
    const result = await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, ops)
    expect(result).toMatchObject({ switched: true, from: "COD", amount: 120000, removed_cod_fee: true })
    expect(calls).toEqual(["metadata", "remove:item_fee", "metadata", "cancelCollection:pay_col_cod", "open:120000", "session:pay_col_new_1", "metadata"])
    expect(state.order.metadata?.[ORDER_PAYMENT_SWITCH_METADATA_KEY]).toMatchObject({ state: "done", removed_cod_fee: true })
  })

  it("paying in the store: the system provider's authorization is canceled too", async () => {
    const { ops, calls } = shop(
      order({
        payment_collections: [
          {
            id: "pay_col_store",
            status: "authorized",
            payment_sessions: [{ id: "payses_store", provider_id: STORE, status: "authorized" }],
            payments: [{ id: "pay_store", provider_id: STORE, canceled_at: null, captured: 0 }],
          },
        ],
      }),
    )
    const result = await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, ops)
    expect(result.from).toBe("PAY_AT_STORE")
    expect(calls).toContain("cancelPayment:pay_store")
    expect(calls).toContain("cancelCollection:pay_col_store")
  })

  it("the switched order is what the transfer receipt looks for: the OS's 'Utalás beérkezett' finds one waiting session", async () => {
    const { ops, state } = shop(codOrder())
    await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, ops)
    const sessions = state.order.payment_collections.flatMap((c) =>
      c.payment_sessions.map((s) => ({ ...s, amount: 120000, currency_code: "huf", data: {}, payment_id: null })),
    )
    const updated: string[] = []
    const result = await recordTransferReceipt(
      "order_1",
      { reference: "UTAL-1", received_at: "2026-11-26", amount: 120000 },
      {
        loadSessions: async () => sessions,
        updateSession: async (input) => void updated.push(input.id),
        authorizeSession: async () => ({ payment_id: "pay_transfer" }),
      },
    )
    expect(updated).toEqual(["payses_transfer"])
    expect(result).toEqual({ recorded: true, payment_id: "pay_transfer" })
  })

  it("a second press on a switched order does nothing and says so", async () => {
    const { ops, calls } = shop(codOrder())
    await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, ops)
    calls.length = 0
    const again = await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, ops)
    expect(again).toMatchObject({ switched: false, from: "COD" })
    expect(calls).toEqual([])
  })

  it("a run stopped half way is finished by the next press, from where it was (the fee is not removed twice, the from stays)", async () => {
    const broken = shop(codOrder(), { failOpen: true })
    await expect(switchToBankTransfer("order_1", { actor: "Teszt Elek" }, broken.ops)).rejects.toThrow("the shop is down")
    expect(broken.state.order.metadata?.[ORDER_PAYMENT_SWITCH_METADATA_KEY]).toMatchObject({ state: "switching", from: "COD", removed_cod_fee: true })
    const resumed = shop(broken.state.order)
    const result = await switchToBankTransfer("order_1", { actor: "Teszt Elek" }, resumed.ops)
    expect(result).toMatchObject({ switched: true, from: "COD", amount: 120000, removed_cod_fee: true })
    expect(resumed.calls).not.toContain("remove:item_fee")
  })

  it("refuses a paid, a shipped or closed, a mixed-pair and an unknown-method order, without touching it", async () => {
    const cases: [string, SwitchOrder][] = [
      [
        "kifizették",
        order({
          payment_collections: [
            {
              id: "c",
              status: "completed",
              payment_sessions: [{ id: "s", provider_id: STRIPE, status: "authorized" }],
              payments: [{ id: "p", provider_id: STRIPE, canceled_at: null, captured: 120000 }],
            },
          ],
        }),
      ],
      ["úton van vagy lezárult", { ...cardOrder(), business_status: "out_for_delivery" }],
      ["lezárult", { ...cardOrder(), business_status: "closed_unsuccessfully" }],
      ["Vegyes kosár", cardOrder({ acropora_pickup_order_id: "order_2" })],
      ["nem ismert", order({ payment_collections: [] })],
    ]
    for (const [reason, o] of cases) {
      const { ops, calls } = shop(o)
      await expect(switchToBankTransfer("order_1", { actor: "x" }, ops)).rejects.toMatchObject({
        type: MedusaError.Types.CONFLICT,
        message: expect.stringContaining(reason),
      })
      expect(calls).toEqual([])
    }
  })
})
