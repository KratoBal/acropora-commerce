import { projectOrderQueryRows } from "../order-query-projection"

const order = (id: string, customer_id: string | null) => ({
  id,
  customer_id,
  display_id: 1,
  created_at: new Date("2026-09-03T10:00:00Z"),
  total: 1_000,
  email: "customer@example.com",
})

describe("order query projection", () => {
  it("derives customer signals from the batched other-order dataset", () => {
    const rows = projectOrderQueryRows({
      pageOrders: [order("order_current", "customer_1")],
      customerOrders: [
        order("order_current", "customer_1"),
        order("order_failed", "customer_1"),
        order("order_open", "customer_1"),
      ],
      statuses: [
        { order_id: "order_current", status: "stocking" },
        { order_id: "order_failed", status: "closed_unsuccessfully" },
        { order_id: "order_open", status: "out_for_delivery" },
      ],
      history: [
        {
          order_id: "order_current",
          to_status: "stocking",
          created_at: new Date("2026-09-03T11:00:00Z"),
        },
      ],
    })

    expect(rows[0].business_status).toEqual({
      code: "stocking",
      label: "Készletezés alatt",
      changed_at: new Date("2026-09-03T11:00:00Z"),
    })
    expect(rows[0].customer_signals).toEqual({
      is_new_customer: false,
      unsuccessful_closed_order_count: 1,
      has_other_open_order: true,
      purchased_without_registration: false,
    })
  })

  it("marks a guest purchase without inventing customer-wide signals", () => {
    const rows = projectOrderQueryRows({
      pageOrders: [order("order_guest", null)],
      customerOrders: [],
      statuses: [],
      history: [],
    })

    expect(rows[0].customer_signals).toEqual({
      is_new_customer: false,
      unsuccessful_closed_order_count: 0,
      has_other_open_order: false,
      purchased_without_registration: true,
    })
  })

  /**
   * THE OS LIST'S FIELDS. What must fail: the name or phone not taken from the
   * shipping address first (the billing one is the fallback), a GLS point
   * missed because only Foxpost is read, the payment's captured part lost,
   * or the mixed cart's pair not named from the order's metadata.
   */
  it("gives the OS list the buyer, the pickup point, the payment and the mixed cart's pair", () => {
    const [shipped, guest] = projectOrderQueryRows({
      pageOrders: [
        {
          ...order("order_ship", "customer_1"),
          currency_code: "huf",
          metadata: { acropora_pickup_order_id: "order_pick" },
          shipping_address: { first_name: "Emese", last_name: " Nagy ", phone: "+36 30 555 0137" },
          billing_address: { first_name: "Név", last_name: "Számlázó", phone: "+36 1 000 0000" },
          shipping_methods: [
            {
              name: "GLS csomagpont",
              data: { gls_pickup_point: { id: "HU-123", name: "GLS Mammut" } },
            },
          ],
          payment_collections: [
            {
              status: "authorized",
              amount: 26390,
              captured_amount: 0,
              refunded_amount: 0,
              payments: [
                { provider_id: "pp_stripe_stripe", amount: 26390, created_at: "2026-10-05T08:00:00.000Z", captures: [] },
              ],
            },
          ],
        },
        {
          ...order("order_pick", null),
          metadata: { acropora_parent_order_id: "order_ship" },
          shipping_address: null,
          billing_address: { first_name: "Vendég", last_name: null, phone: null },
        },
      ],
      customerOrders: [],
      statuses: [],
      history: [],
    })

    expect({
      currency_code: shipped.currency_code,
      customer_name: shipped.customer_name,
      phone: shipped.phone,
      pickup_point: shipped.pickup_point,
      payment: shipped.payment,
      related_order: shipped.related_order,
    }).toEqual({
      currency_code: "huf",
      customer_name: "Nagy Emese",
      phone: "+36 30 555 0137",
      pickup_point: { id: "HU-123", name: "GLS Mammut" },
      payment: {
        provider_id: "pp_stripe_stripe",
        status: "authorized",
        amount: 26390,
        captured_amount: 0,
        refunded_amount: 0,
        hold_expires_at: "2026-10-12T08:00:00.000Z",
      },
      related_order: { id: "order_pick", role: "pickup" },
    })
    expect([guest.customer_name, guest.phone, guest.payment, guest.related_order]).toEqual([
      "Vendég",
      null,
      null,
      { id: "order_ship", role: "parent" },
    ])
  })

  /**
   * THE LIST'S HOLD EXPIRY (nautilus 26484: the OS list reads it, does not
   * count it). What must fail: an expiry shown for a released, a captured or a
   * cash order; the expiry not 7 days after the authorization; a later live
   * payment's hold read from an earlier, canceled one.
   */
  it("gives hold_expires_at only for a live, uncaptured card hold", () => {
    const withPayments = (payments: Record<string, unknown>[], metadata: Record<string, unknown> | null = null) =>
      projectOrderQueryRows({
        pageOrders: [
          {
            ...order("order_1", null),
            metadata,
            payment_collections: [{ status: "authorized", amount: 1000, payments: payments as never }],
          },
        ],
        customerOrders: [],
        statuses: [],
        history: [],
      })[0].payment?.hold_expires_at
    const card = { provider_id: "pp_stripe_stripe", amount: 1000, created_at: "2026-10-05T08:00:00.000Z", captures: [] }

    expect(withPayments([card])).toBe("2026-10-12T08:00:00.000Z")
    expect(
      withPayments([
        { ...card, created_at: "2026-10-01T08:00:00.000Z", canceled_at: "2026-10-02T08:00:00.000Z" },
        card,
      ])
    ).toBe("2026-10-12T08:00:00.000Z")
    expect(withPayments([{ ...card, captures: [{ amount: 900 }] }])).toBeNull()
    expect(withPayments([{ ...card, provider_id: "pp_system_default" }])).toBeNull()
    expect(withPayments([card], { acropora_payment: { state: "awaiting_payment" } })).toBeNull()
  })
})
