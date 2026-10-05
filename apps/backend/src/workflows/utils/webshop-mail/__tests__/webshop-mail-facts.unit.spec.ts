import {
  WEBSHOP_MAIL_FACTS_VERSION,
  WEBSHOP_MAIL_TEMPLATES,
  type WebshopMailFactsOf,
  customerNameOf,
  isWebshopMailTemplate,
  renderRequest,
} from "../facts"
import type { LoadedOrder } from "../prepare"

/**
 * THE FACTS ARE A CONTRACT WITH THE OS (nautilus 26557). What must fail: a
 * key added, renamed or dropped in what the OS receives without the version
 * and this list changing with it; a template outside the ten; the name in the
 * wrong order.
 *
 * IF THIS IS RED BECAUSE A BUILDER'S INPUT CHANGED: the OS reads these keys.
 * Raise `WEBSHOP_MAIL_FACTS_VERSION`, update this list, and tell the OS side
 * (its render endpoint answers 400 to another version).
 */
const order: LoadedOrder = {
  id: "order_1",
  display_id: 45,
  email: "vevo@example.test",
  total: 4950,
  items: [{ title: "Hanna", quantity: 1, total: 3800 }],
  shipping: [{ name: "GLS csomagpont", amount: 1150 }],
  payment: "ONLINE_CARD",
}
const common = { customer_name: "Teszt Elek", order_created_at: "2026-10-05T10:00:00.000Z" }

const samples: { [T in keyof WebshopMailFactsOf]: WebshopMailFactsOf[T] } = {
  "order-placed": {
    ...common,
    orders: [{ display_id: 45, items: order.items, shipping: order.shipping, total: 4950, payment: "COD", pickup: false }],
  },
  "order-status-confirmed": { ...common, order },
  "order-status-out_for_delivery": { ...common, order },
  "order-status-ready_for_pickup": { ...common, order },
  "order-status-closed": { ...common, order },
  "order-shipped": {
    ...common,
    shipped: {
      display_id: 45,
      carrier: "gls",
      destination_title: "Pont",
      destination_address: "1011 Budapest, X",
      gls_point: true,
      tracking_number: "GLS1",
      tracking_url: null,
      items: [{ title: "Hanna", quantity: 1 }],
      cod_amount: null,
      foxpost_logo_url: null,
    },
  },
  "order-payment-delayed": { ...common, order, amount: 4950, pickup_display_id: null },
  "order-payment-link": { ...common, order, url: "https://shop.example.test/x", expires_at: "2026-10-12T10:00:00.000Z", amount: 4950, pickup: null },
  "order-payment-reminder": { ...common, order, url: "https://shop.example.test/x", expires_at: "2026-10-12T10:00:00.000Z", amount: 4950, pickup: null },
  "payment-refunded": { ...common, refund: { display_id: 45, amount: 1000, refunded_total: 1000, last4: "4242" } },
}

const keysOf = (value: unknown): string[] =>
  value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort() : []

// THE CONTRACT: the top-level keys of each template's facts, and the inner objects' keys
const CONTRACT: Record<string, Record<string, string[]>> = {
  "order-placed": { "": ["customer_name", "order_created_at", "orders"], "orders[0]": ["display_id", "items", "payment", "pickup", "shipping", "total"] },
  "order-status-confirmed": { "": ["customer_name", "order", "order_created_at"] },
  "order-status-out_for_delivery": { "": ["customer_name", "order", "order_created_at"] },
  "order-status-ready_for_pickup": { "": ["customer_name", "order", "order_created_at"] },
  "order-status-closed": { "": ["customer_name", "order", "order_created_at"] },
  "order-shipped": {
    "": ["customer_name", "order_created_at", "shipped"],
    shipped: ["carrier", "cod_amount", "destination_address", "destination_title", "display_id", "foxpost_logo_url", "gls_point", "items", "tracking_number", "tracking_url"],
  },
  "order-payment-delayed": { "": ["amount", "customer_name", "order", "order_created_at", "pickup_display_id"] },
  "order-payment-link": { "": ["amount", "customer_name", "expires_at", "order", "order_created_at", "pickup", "url"] },
  "order-payment-reminder": { "": ["amount", "customer_name", "expires_at", "order", "order_created_at", "pickup", "url"] },
  "payment-refunded": { "": ["customer_name", "order_created_at", "refund"], refund: ["amount", "display_id", "last4", "refunded_total"] },
}
const ORDER_KEYS = ["display_id", "email", "id", "items", "payment", "shipping", "total"]

describe("the webshop mail facts", () => {
  it("ten templates, version 1", () => {
    expect(WEBSHOP_MAIL_TEMPLATES).toHaveLength(10)
    expect(WEBSHOP_MAIL_FACTS_VERSION).toBe(1)
    expect(Object.keys(samples).sort()).toEqual([...WEBSHOP_MAIL_TEMPLATES].sort())
    expect(isWebshopMailTemplate("order-shipped")).toBe(true)
    expect(isWebshopMailTemplate("order-status-stocking")).toBe(false)
  })

  it("each template's keys are the contract", () => {
    for (const template of WEBSHOP_MAIL_TEMPLATES) {
      const request = renderRequest(template, samples[template] as never)
      expect(keysOf(request)).toEqual(["facts", "facts_version", "template"])
      expect(request.facts_version).toBe(1)
      const facts = request.facts as Record<string, unknown>
      for (const [path, keys] of Object.entries(CONTRACT[template])) {
        const at =
          path === "" ? facts : path === "orders[0]" ? (facts.orders as unknown[])[0] : facts[path]
        expect([template, path, keysOf(at)]).toEqual([template, path, keys])
      }
      if ("order" in facts) expect([template, keysOf(facts.order)]).toEqual([template, ORDER_KEYS])
    }
  })

  it("the name is family name first, from the billing address", () => {
    expect(customerNameOf({ first_name: "Elek", last_name: "Teszt" })).toBe("Teszt Elek")
    expect(customerNameOf({ first_name: " ", last_name: null })).toBeNull()
    expect(customerNameOf(null)).toBeNull()
  })
})
