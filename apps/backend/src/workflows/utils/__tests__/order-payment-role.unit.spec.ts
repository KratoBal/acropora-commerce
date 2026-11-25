import { orderPaymentRoleOf } from "../payment-providers"
import type { PaymentRole } from "../payment-eligibility"

/*
  THE ORDER'S PAYMENT ROLE AFTER A SWITCH (card d31a66a3). MI PIROSÍT: an order switched to bank transfer still reads its first,
  canceled card or cash-on-delivery collection (the mails and the guest page would name the old method); a released card hold,
  whose every collection is canceled, loses its role (the mails would name no method).
*/
const ROLES = new Map<string, PaymentRole>([
  ["pp_stripe_stripe", "ONLINE_CARD"],
  ["pp_acropora_cod", "COD"],
  ["pp_acropora_transfer", "BANK_TRANSFER"],
])

describe("orderPaymentRoleOf", () => {
  it("a switched order reads its open transfer collection, not the canceled one before it", () => {
    const order = {
      payment_collections: [
        { status: "canceled", payment_sessions: [{ provider_id: "pp_acropora_cod" }], payments: [] },
        { status: "not_paid", payment_sessions: [{ provider_id: "pp_acropora_transfer" }], payments: [] },
      ],
    }
    expect(orderPaymentRoleOf(order, ROLES)).toBe("BANK_TRANSFER")
  })

  it("a released card hold (every collection canceled, the payment canceled) still reads the card", () => {
    const order = {
      payment_collections: [
        {
          status: "canceled",
          payment_sessions: [{ provider_id: "pp_stripe_stripe" }],
          payments: [{ provider_id: "pp_stripe_stripe", canceled_at: "2026-11-25" }],
        },
      ],
    }
    expect(orderPaymentRoleOf(order, ROLES)).toBe("ONLINE_CARD")
  })

  it("a live payment decides first; without the collection's status every collection reads as before", () => {
    expect(
      orderPaymentRoleOf(
        { payment_collections: [{ payment_sessions: [{ provider_id: "pp_acropora_cod" }], payments: [{ provider_id: "pp_stripe_stripe", canceled_at: null }] }] },
        ROLES,
      ),
    ).toBe("ONLINE_CARD")
    expect(orderPaymentRoleOf({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_acropora_cod" }], payments: [] }] }, ROLES)).toBe("COD")
  })
})
