import { renderOrderPlacedMail, type MailOrder } from "../order-placed-mail"
import { cardLast4Of, renderRefundMail } from "../refund-mail"
import { type LoadedOrder, type LoadedPayment, prepareOrderPlacedMail, prepareRefundMail } from "../prepare"
import { operationsOrSkip, sendShopMail } from "../send"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "../../split-completion"

/**
 * THE SHOP'S ORDER AND REFUND MAILS (acrobot 26284).
 *
 * What must fail: a mixed cart mailed twice, or once without its second
 * order; the pickup half mailing on its own; a tracking number promised; an
 * amount not in forint or not Medusa's; a catalogue title reaching the HTML
 * unescaped; a card's digits invented, or read from the payment before the
 * session; a refund mail for cash on delivery; the newest refund not the one
 * mailed; a mail without its idempotency key; anything sent while switched off.
 */
const NBSP = " "
const ft = (n: string) => `${n.replace(/ /g, NBSP)} Ft`

const shipped: MailOrder = {
  display_id: 37,
  items: [{ title: "Hanna HI780-25 pH reagens", quantity: 1, total: 10500 }],
  shipping: [{ name: "GLS házhozszállítás", amount: 3500 }],
  total: 14000,
  payment: "ONLINE_CARD",
  pickup: false,
}
const pickup: MailOrder = {
  display_id: 38,
  items: [{ title: "Mithrax sculptus", quantity: 1, total: 8500 }],
  shipping: [{ name: "Személyes átvétel", amount: 0 }],
  total: 8500,
  payment: "ONLINE_CARD",
  pickup: true,
}

describe("the order confirmation", () => {
  it("one order: its lines, shipping and total in forint, the payment named", () => {
    const mail = renderOrderPlacedMail([shipped])
    expect(mail.subject).toBe("Rendelésed visszaigazolása (#37)")
    expect(mail.text).toContain(`Hanna HI780-25 pH reagens × 1: ${ft("10 500")}`)
    expect(mail.text).toContain(`Szállítás: GLS házhozszállítás, ${ft("3 500")}`)
    expect(mail.text).toContain(`Fizetendő: ${ft("14 000")}`)
    expect(mail.text).toContain("Fizetés: Bankkártya")
    expect(mail.text).not.toContain("két rendelés")
  })

  // MI PIROSÍT: ha a levél követési számot ígérne (Foxpost prompt, 11. pont)
  it("promises no tracking number, says when there will be one", () => {
    const mail = renderOrderPlacedMail([shipped])
    expect(mail.text).toContain("Követési szám csak a csomag feladása után lesz.")
    expect(mail.text).not.toMatch(/követési szám(ot)? (küld|elküld)|nyomon követheted|tracking/i)
  })

  it("a mixed cart: one mail, both orders, the shipped one first, the sum", () => {
    const mail = renderOrderPlacedMail([shipped, pickup])
    expect(mail.subject).toBe("Rendeléseid visszaigazolása (#37 és #38)")
    expect(mail.text.indexOf("Rendelés #37")).toBeLessThan(mail.text.indexOf("Rendelés #38 (átvétel a boltban)"))
    expect(mail.text).toContain("két rendelés lett belőle")
    expect(mail.text).toContain("egy lépésben")
    expect(mail.text).toContain(`Összesen: ${ft("22 500")}`)
    expect(mail.text).toContain("Az élő állatos rendelést a boltban veszed át.")
  })

  it("cash on delivery and pay at store say how they are paid", () => {
    expect(renderOrderPlacedMail([{ ...shipped, payment: "COD" }]).text).toContain("a csomag átvételekor fizeted")
    expect(renderOrderPlacedMail([{ ...pickup, payment: "PAY_AT_STORE" }]).text).toContain("a boltban, átvételkor")
  })

  it("a catalogue title is escaped in the HTML", () => {
    const mail = renderOrderPlacedMail([
      { ...shipped, items: [{ title: '<img src=x onerror="a">', quantity: 1, total: 1 }] },
    ])
    expect(mail.html).not.toContain("<img")
    expect(mail.html).toContain("&lt;img")
  })
})

describe("the card's last four digits", () => {
  // the shapes measured on stage (acrobot 26288)
  const expanded = { payment_method: { card: { brand: "visa", last4: "4242" } } }
  const string = { payment_method: "pm_123" }

  it("the session first, then the payment; a pm_ string is no card", () => {
    expect(cardLast4Of([expanded, string])).toBe("4242")
    expect(cardLast4Of([string, { payment_method: { card: { last4: "1881" } } }])).toBe("1881")
    expect(cardLast4Of([string, string])).toBeNull()
    expect(cardLast4Of([null, undefined])).toBeNull()
  })

  // MI PIROSÍT: ha a fizetés adatát olvasná előbb (a /capture után az már szöveg, de egy régebbi objektum lehet)
  it("prefers the session even when both carry a card", () => {
    expect(
      cardLast4Of([{ payment_method: { card: { last4: "1111" } } }, { payment_method: { card: { last4: "2222" } } }])
    ).toBe("1111")
  })
})

describe("the refund notice", () => {
  it("names the amount, the card when known, and no date", () => {
    const mail = renderRefundMail({ display_id: 36, amount: 2000, refunded_total: 2000, last4: "4242" })
    expect(mail.subject).toBe("Visszatérítés a #36 rendelésedről")
    expect(mail.text).toContain(`Visszatérítettünk ${ft("2 000")} összeget a 4242 végű kártyádra a #36 rendelésedről.`)
    expect(mail.text).toContain("A jóváírás ideje a bankodtól függ.")
    expect(mail.text).not.toContain("eddig összesen")
  })

  it("without the digits it names no card; a second refund shows the running total", () => {
    const mail = renderRefundMail({ display_id: 36, amount: 8000, refunded_total: 10000, last4: null })
    expect(mail.text).toContain("a kártyádra, amellyel fizettél")
    expect(mail.text).not.toMatch(/\d{4} végű/)
    expect(mail.text).toContain(`eddig összesen ${ft("10 000")}`)
  })
})

const order = (id: string, display: number, over: Partial<LoadedOrder> = {}): LoadedOrder => ({
  id,
  display_id: display,
  email: "vevo@example.test",
  items: [],
  shipping: [],
  total: 1000,
  payment: "ONLINE_CARD",
  ...over,
})

describe("when the order confirmation goes", () => {
  const deps = (metadata: Record<string, unknown> | null, orderIds = ["order_ship", "order_pick"]) => {
    const completeSplit = jest.fn(async () => ({ order_ids: orderIds }))
    return {
      completeSplit,
      deps: {
        cartOf: async () => ({ id: "cart_1", metadata }),
        completeSplit,
        loadOrder: async (id: string) =>
          ({ order_ship: order("order_ship", 37), order_pick: order("order_pick", 38), order_1: order("order_1", 36) })[
            id
          ] ?? null,
      },
    }
  }

  it("a plain order: one mail, keyed by the order", async () => {
    const { deps: d, completeSplit } = deps(null)
    const result = await prepareOrderPlacedMail("order_1", d)
    expect(result).toMatchObject({
      action: "send",
      mail: { to: "vevo@example.test", template: "order-placed", idempotency_key: "order-placed:order_1" },
    })
    expect(completeSplit).not.toHaveBeenCalled()
  })

  // MI PIROSÍT: ha a bolti alrendelés saját levelet küldene (két levél egy kosárra)
  it("the pickup half of a split sends nothing", async () => {
    const { deps: d } = deps({ [PARENT_CART_METADATA_KEY]: "cart_0" })
    expect(await prepareOrderPlacedMail("order_pick", d)).toEqual({ action: "skip", reason: "pickup_half" })
  })

  it("the shipped half finishes the split first, then mails both, shipped first", async () => {
    const { deps: d, completeSplit } = deps({ [PICKUP_CART_METADATA_KEY]: "cart_2" }, ["order_pick", "order_ship"])
    const result = await prepareOrderPlacedMail("order_ship", d)
    expect(completeSplit).toHaveBeenCalledWith("cart_1")
    expect(result.action).toBe("send")
    const mail = (result as { mail: { content: { subject: string; text: string } } }).mail
    expect(mail.content.subject).toBe("Rendeléseid visszaigazolása (#37 és #38)")
    expect(mail.content.text).toContain("Rendelés #38 (átvétel a boltban)")
  })

  it("no address, or a missing order: nothing is sent", async () => {
    const noMail = { ...deps(null).deps, loadOrder: async () => order("order_1", 36, { email: " " }) }
    expect(await prepareOrderPlacedMail("order_1", noMail)).toEqual({ action: "skip", reason: "no_email" })
    const missing = { ...deps(null).deps, loadOrder: async () => null }
    expect(await prepareOrderPlacedMail("order_1", missing)).toEqual({ action: "skip", reason: "order_missing" })
  })
})

describe("when the refund notice goes", () => {
  const payment = (over: Partial<LoadedPayment> = {}): LoadedPayment => ({
    id: "pay_1",
    provider_id: "pp_stripe_stripe",
    refunds: [
      { id: "ref_old", amount: 2000, created_at: "2026-10-05T10:00:00Z" },
      { id: "ref_new", amount: 8000, created_at: "2026-10-05T11:00:00Z" },
    ],
    session_data: { payment_method: { card: { last4: "4242" } } },
    payment_data: { payment_method: "pm_1" },
    order: { id: "order_36", display_id: 36, email: "vevo@example.test" },
    ...over,
  })
  const prepare = (p: LoadedPayment | null) => prepareRefundMail("pay_1", { loadPayment: async () => p })

  it("the newest refund, keyed by it, with the running total and the session's card", async () => {
    const result = await prepare(payment())
    expect(result).toMatchObject({ action: "send", mail: { idempotency_key: "payment-refunded:ref_new" } })
    const text = (result as { mail: { content: { text: string } } }).mail.content.text
    expect(text).toContain(`Visszatérítettünk ${ft("8 000")} összeget a 4242 végű kártyádra`)
    expect(text).toContain(`eddig összesen ${ft("10 000")}`)
  })

  // MI PIROSÍT: ha a bekötés a fizetés adatát olvasná a munkamenet előtt
  it("reads the session's card before the payment's", async () => {
    const result = await prepare(payment({ payment_data: { payment_method: { card: { last4: "9999" } } } }))
    const text = (result as { mail: { content: { text: string } } }).mail.content.text
    expect(text).toContain("4242 végű")
    expect(text).not.toContain("9999")
  })

  it("not a card payment, no order, no address, no refund: nothing is sent", async () => {
    expect((await prepare(payment({ provider_id: "pp_acropora_cod" }))).action).toBe("skip")
    expect((await prepare(payment({ order: null }))).action).toBe("skip")
    expect((await prepare(payment({ order: { id: "o", display_id: 1, email: null } }))).action).toBe("skip")
    expect((await prepare(payment({ refunds: [] }))).action).toBe("skip")
    expect((await prepare(null)).action).toBe("skip")
  })
})

describe("sending", () => {
  it("off unless switched on with keys", () => {
    expect(operationsOrSkip({})).toBe(false)
    expect(operationsOrSkip({ ACROPORA_WEBSHOP_MAIL: "on" })).toBe(false)
    expect(
      operationsOrSkip({
        ACROPORA_WEBSHOP_MAIL: "on",
        GMAIL_WEBSHOP_CLIENT_ID: "a",
        GMAIL_WEBSHOP_CLIENT_SECRET: "b",
        GMAIL_WEBSHOP_REFRESH_TOKEN: "c",
      })
    ).toBe(true)
  })

  it("goes to the email channel with the idempotency key and the written content", async () => {
    const createNotifications = jest.fn(async () => ({}))
    const content = { subject: "S", text: "T", html: "<p>T</p>" }
    await sendShopMail({ createNotifications }, {
      to: "vevo@example.test",
      template: "order-placed",
      idempotency_key: "order-placed:order_1",
      resource_id: "order_1",
      content,
    })
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "vevo@example.test",
        channel: "email",
        idempotency_key: "order-placed:order_1",
        content,
      })
    )
  })
})
