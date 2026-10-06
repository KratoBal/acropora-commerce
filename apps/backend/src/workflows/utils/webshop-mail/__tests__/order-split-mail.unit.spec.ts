import { forint } from "../format"
import { orderSplitKey, prepareOrderSplitMail, renderOrderSplitMail } from "../order-split-mail"
import type { LoadedOrder } from "../prepare"

// the channel is on only with its keys (placeholders, as in the other mail specs)
const ON = {
  ACROPORA_WEBSHOP_MAIL: "on",
  GMAIL_WEBSHOP_CLIENT_ID: "a",
  GMAIL_WEBSHOP_CLIENT_SECRET: "b",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
} as NodeJS.ProcessEnv

const parent: LoadedOrder = {
  id: "order_A",
  display_id: 101,
  email: "vevo@example.test",
  total: 7990,
  items: [{ title: "Hanna HI780", quantity: 1, total: 6000 }],
  shipping: [{ name: "GLS házhozszállítás", amount: 1990 }],
  payment: "ONLINE_CARD",
}
const split: LoadedOrder = {
  id: "order_B",
  display_id: 202,
  email: "vevo@example.test",
  total: 4200,
  items: [{ title: "Red Sea Coral Pro", quantity: 1, total: 4200 }],
  shipping: [{ name: "GLS házhozszállítás", amount: 0 }],
  payment: null,
}

const deps = (orders: Record<string, LoadedOrder | null>, sent: string[] = []) => ({
  loadOrder: async (id: string) => orders[id] ?? null,
  alreadySent: async (key: string) => sent.includes(key),
})

/**
 * THE SPLIT NOTICE (C/3, acrobot 26651). What must fail: two parcels and two
 * payments arriving as a surprise (both order numbers and how each part is
 * paid named); a card customer promised a charge for the second part now; a
 * day promised for the second part; a second notice for the same split.
 */
describe("renderOrderSplitMail", () => {
  it("names both orders and both parts, and the second part's shipping as free", () => {
    const mail = renderOrderSplitMail(parent, split, "card")
    expect(mail.subject).toBe("Két részben érkezik a rendelésed (#101 és #202)")
    expect(mail.text).toContain("Az első rész a #101 rendelés, ez indul előbb. A második rész új rendelésszámot kapott: #202.")
    expect(mail.text).toContain("A második rész szállításáért nem fizetsz.")
    expect(mail.text).toContain(`- Hanna HI780 × 1: ${forint(6000)}`)
    expect(mail.text).toContain(`- Red Sea Coral Pro × 1: ${forint(4200)}`)
    expect(mail.html).toContain('<h2 style="font-size:16px;margin:20px 0 8px;">A második rész (#202)</h2>')
  })

  it("a card customer: only the first part charged when it ships, the second through a link when it is ready", () => {
    const text = renderOrderSplitMail(parent, split, "card").text
    expect(text).toContain("az első részért csak annak az összegét vonjuk le, amikor a csomag elindul")
    expect(text).toContain("A második részhez, amikor készen áll a szállításra, emailben fizetési linket küldünk")
  })

  it("cash on delivery and the shop say how each part is paid, with no second fee", () => {
    expect(renderOrderSplitMail(parent, split, "cod").text).toContain("A második részért külön utánvét-díjat nem számolunk fel.")
    expect(renderOrderSplitMail(parent, split, "store").text).toContain("Mindkét részt az üzletben fizeted, az átvételkor.")
    expect(renderOrderSplitMail(parent, split, "cod").text).not.toContain("fizetési linket")
  })

  it("promises no day, and escapes what comes from the shop's data", () => {
    const html = renderOrderSplitMail({ ...parent, items: [{ title: "<b>x</b>", quantity: 1, total: 1 }] }, split, "card").html
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;")
    expect(renderOrderSplitMail(parent, split, "card").text).not.toMatch(/\d+ napon belül|holnap/)
  })
})

describe("prepareOrderSplitMail", () => {
  it("one notice per split, to the original order's customer, with the facts the OS renders from", async () => {
    const result = await prepareOrderSplitMail(
      { orderId: "order_A", splitOrderId: "order_B", payment: "card" },
      deps({ order_A: parent, order_B: split }),
      ON
    )
    expect(result).toMatchObject({
      status: "send",
      mail: {
        to: "vevo@example.test",
        template: "order-split",
        idempotency_key: "order-split:order_A:order_B",
        resource_id: "order_A",
        render: { template: "order-split", facts: { order: parent, split_order: split, payment: "card" } },
      },
    })
  })

  it("skips when the channel is off, already sent, an order is missing, or there is no address", async () => {
    const input = { orderId: "order_A", splitOrderId: "order_B", payment: "cod" as const }
    expect(await prepareOrderSplitMail(input, deps({ order_A: parent, order_B: split }), {})).toEqual({ status: "skip", reason: "mail_off" })
    expect(
      await prepareOrderSplitMail(input, deps({ order_A: parent, order_B: split }, [orderSplitKey("order_A", "order_B")]), ON)
    ).toEqual({ status: "skip", reason: "already_sent" })
    expect(await prepareOrderSplitMail(input, deps({ order_A: parent, order_B: null }), ON)).toEqual({
      status: "skip",
      reason: "order_missing",
    })
    expect(await prepareOrderSplitMail(input, deps({ order_A: { ...parent, email: " " }, order_B: split }), ON)).toEqual({
      status: "skip",
      reason: "no_email",
    })
  })
})
