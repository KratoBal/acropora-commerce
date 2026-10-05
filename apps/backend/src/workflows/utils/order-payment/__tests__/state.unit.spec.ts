import { STRIPE_PROVIDER_ID } from "../../stripe-config"
import {
  ORDER_PAYMENT_METADATA_KEY,
  type OrderPaymentFacts,
  holdExpiresAt,
  orderPaymentView,
  refuseWhileAwaitingPayment,
} from "../state"

/**
 * THE ORDER'S PAYMENT STATE (the lejáró zárolás plan, 2.1 and 2.3).
 *
 * What must fail: the hold's expiry not 7 days from the authorization; a hold
 * shown on a payment that is captured, canceled or not a card; a released
 * order still showing its old hold (the OS would warn about a hold that is
 * gone); a stored state ignored for the payment's; cash on delivery read as
 * waiting for payment (the OS would block its parcel); Kiszállítás let through
 * while the order waits for payment, or refused when it does not.
 */
const AUTHORIZED = "2026-10-05T08:00:00.000Z"
const card = (facts: Partial<OrderPaymentFacts> = {}): OrderPaymentFacts => ({
  id: "pay_1",
  provider_id: STRIPE_PROVIDER_ID,
  amount: 22150,
  created_at: AUTHORIZED,
  canceled_at: null,
  captured: 0,
  captured_at: null,
  ...facts,
})
const stored = (state: string, extra: Record<string, unknown> = {}) => ({
  other_key: "kept",
  [ORDER_PAYMENT_METADATA_KEY]: { state, ...extra },
})

describe("orderPaymentView", () => {
  it("a live card hold: state hold, expiring 7 days after the authorization", () => {
    expect(orderPaymentView({ metadata: null, payments: [card()] })).toEqual({
      state: "hold",
      hold: { authorized_at: AUTHORIZED, expires_at: "2026-10-12T08:00:00.000Z", amount: 22150 },
      link: null,
      paid_at: null,
    })
  })

  it("a captured card payment is paid, with the capture's time", () => {
    const view = orderPaymentView({
      metadata: null,
      payments: [card({ captured: 11650, captured_at: "2026-10-06T09:00:00.000Z" })],
    })
    expect(view).toEqual({ state: "paid", hold: null, link: null, paid_at: "2026-10-06T09:00:00.000Z" })
  })

  it("the live payment is the one not canceled: an earlier canceled one is not the hold", () => {
    const view = orderPaymentView({
      metadata: null,
      payments: [card({ id: "old", canceled_at: "2026-10-04T10:00:00.000Z", created_at: "2026-10-01T08:00:00.000Z" }), card()],
    })
    expect(view.hold?.authorized_at).toBe(AUTHORIZED)
  })

  it("cash on delivery, paying at the shop, a canceled order: none, never waiting for payment", () => {
    for (const payments of [
      [card({ provider_id: "pp_system_default" })],
      [card({ canceled_at: "2026-10-05T09:00:00.000Z" })],
      [],
    ]) {
      expect(orderPaymentView({ metadata: null, payments })).toEqual({ state: "none", hold: null, link: null, paid_at: null })
    }
  })

  it("a stored state wins over the payment, and a released order shows no hold", () => {
    // the payment still reads live here, as a half-done release would leave it
    const view = orderPaymentView({
      metadata: stored("awaiting_payment", { released_at: "2026-10-05T10:00:00.000Z" }),
      payments: [card()],
    })
    expect(view).toEqual({ state: "awaiting_payment", hold: null, link: null, paid_at: null })
  })

  it("a stored link is given as the plan's shape", () => {
    const link = {
      collection_id: "pay_col_2",
      sent_at: "2026-10-06T10:00:00.000Z",
      expires_at: "2026-10-12T10:00:00.000Z",
      amount: 11650,
      url: "https://example.test/hu/rendeles-fizetese/t",
    }
    expect(orderPaymentView({ metadata: stored("link_sent", { link }), payments: [] }).link).toEqual({
      sent_at: link.sent_at,
      expires_at: link.expires_at,
      reminded_at: null,
      amount: 11650,
      url: link.url,
    })
  })

  it("an unknown stored value is not a state: the payment decides", () => {
    expect(orderPaymentView({ metadata: stored("hold"), payments: [card()] }).state).toBe("hold")
    expect(orderPaymentView({ metadata: { [ORDER_PAYMENT_METADATA_KEY]: "x" }, payments: [card()] }).state).toBe("hold")
  })
})

describe("holdExpiresAt", () => {
  it("the live hold's expiry, null once released or captured", () => {
    expect(holdExpiresAt({ metadata: null, payments: [card()] })).toBe("2026-10-12T08:00:00.000Z")
    expect(holdExpiresAt({ metadata: stored("awaiting_payment"), payments: [card()] })).toBeNull()
    expect(holdExpiresAt({ metadata: null, payments: [card({ captured: 100 })] })).toBeNull()
  })
})

describe("refuseWhileAwaitingPayment", () => {
  it("refuses Kiszállítás while the order waits for payment, in Hungarian", () => {
    for (const state of ["awaiting_payment", "link_sent", "reminded"]) {
      expect(() => refuseWhileAwaitingPayment(stored(state))).toThrow(/^Fizetésre vár: a kártyás zárolást feloldottuk/)
    }
    expect(() => refuseWhileAwaitingPayment(stored("expired"))).toThrow(/fizetési határidő lejárt/)
  })

  it("lets a held, paid or cash order go", () => {
    for (const metadata of [null, {}, stored("paid")]) {
      expect(() => refuseWhileAwaitingPayment(metadata)).not.toThrow()
    }
  })
})
