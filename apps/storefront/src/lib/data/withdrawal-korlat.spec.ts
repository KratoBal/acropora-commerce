import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()
vi.mock("@lib/config", () => ({
  sdk: { client: { fetch: (...a: unknown[]) => fetchMock(...a) } },
}))
let realIp: string | null = "203.0.113.41"
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (n: string) => (n === "x-real-ip" ? realIp : null),
  }),
}))
let auth: { authorization: string } | Record<string, never> = {
  authorization: "Bearer jwt",
}
vi.mock("@lib/data/cookies", () => ({ getAuthHeaders: async () => auth }))

import { BEJELENTES_KORLAT } from "@lib/util/vendeg-korlat"

import {
  retrieveOwnWithdrawalState,
  submitOwnWithdrawal,
} from "./own-withdrawal"
import { submitWithdrawal } from "./withdrawal"

/**
 * AZ ELALLASI NYILATKOZAT SZERVER-MUVELETEI. MI PIROSIT: ha a keret feletti kuldes eljut a bolthoz; ha egy latogato mas
 * latogato keretet fogyasztja; ha a vendeg a szamot es a cimet nem a sajat vegpontjan kuldi; ha a bejelentkezett vevo
 * kerese a munkamenet nelkul indul, vagy a vevo azonositoja a torzsben utazik; ha a bolt valasza azonosito nelkul sikernek
 * latszik; ha a 409 nem "duplicate"; ha a cim bekerul a naplóba.
 */
const created = {
  withdrawal_id: "ordwd_1",
  created_at: "2026-11-09T12:00:00.000Z",
}
const vendeg = () =>
  submitWithdrawal({
    orderNumber: " 1043 ",
    email: " vevo@example.hu ",
    customerName: "Kiss Anna",
    itemIds: ["item_1"],
  })
const sajat = () =>
  submitOwnWithdrawal({
    orderId: "order_01/AB",
    customerName: "Kiss Anna",
    itemIds: ["item_1"],
  })

// each test is a visitor of its own: the limit's counter lives as long as the module does
let visitor = 100
beforeEach(() => {
  fetchMock.mockReset()
  visitor += 1
  realIp = `203.0.113.${visitor}`
  auth = { authorization: "Bearer jwt" }
})

describe("submitWithdrawal (guest)", () => {
  it("posts to the guest route with the trimmed number and address", async () => {
    fetchMock.mockResolvedValue(created)
    expect(await vendeg()).toMatchObject({
      ok: true,
      withdrawalId: "ordwd_1",
      alreadyDeclaredItemIds: [],
    })
    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe("/store/guest-orders/withdrawal")
    expect(options.body).toEqual({
      order_number: "1043",
      email: "vevo@example.hu",
      customer_name: "Kiss Anna",
      item_ids: ["item_1"],
    })
    expect(options.headers).toBeUndefined()
  })

  it("refuses the request over the limit with too_many WITHOUT asking the shop; another visitor is not affected", async () => {
    fetchMock.mockResolvedValue(created)
    for (let i = 0; i < BEJELENTES_KORLAT.max; i += 1)
      expect(await vendeg()).toMatchObject({ ok: true })
    expect(await vendeg()).toEqual({ ok: false, failure: "too_many" })
    expect(fetchMock).toHaveBeenCalledTimes(BEJELENTES_KORLAT.max)
    realIp = "203.0.114.1"
    expect(await vendeg()).toMatchObject({ ok: true })
  })

  it("keeps the names of the lines a partly taken request did not record", async () => {
    fetchMock.mockResolvedValue({
      ...created,
      already_declared_item_ids: ["item_2"],
    })
    expect(await vendeg()).toMatchObject({
      ok: true,
      alreadyDeclaredItemIds: ["item_2"],
    })
  })

  it("does not take an answer without the declaration's id for a success", async () => {
    fetchMock.mockResolvedValue({})
    expect(await vendeg()).toEqual({ ok: false, failure: "unavailable" })
  })

  it("answers a 409 as duplicate and does not log the address", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockRejectedValue({ status: 409 })
    expect(await vendeg()).toEqual({ ok: false, failure: "duplicate" })
    expect(JSON.stringify(error.mock.calls)).not.toContain("vevo@example.hu")
    error.mockRestore()
  })
})

describe("submitOwnWithdrawal (signed in)", () => {
  it("posts to the customer's own order route with the session and no customer id", async () => {
    fetchMock.mockResolvedValue(created)
    expect(await sajat()).toMatchObject({ ok: true, withdrawalId: "ordwd_1" })
    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe("/store/customers/me/orders/order_01%2FAB/withdrawal")
    expect(options.headers).toEqual({ authorization: "Bearer jwt" })
    expect(options.body).toEqual({
      customer_name: "Kiss Anna",
      item_ids: ["item_1"],
    })
  })

  it("asks nothing of the shop without a session", async () => {
    auth = {}
    expect(await sajat()).toEqual({ ok: false, failure: "not_found" })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

/*
  WHAT TURNS THIS RED (V0.3, the state of the order page). The state asked without the session, or for another path than
  the order's own; an answer without a boolean live animal flag (an older shop) taken for "no live animal" (the page
  would then offer the button on a guess); a failure turned into a state; the list left out of a clean answer.
*/
describe("retrieveOwnWithdrawalState", () => {
  it("asks the customer's own order route with the session, nothing cached, and maps the answer", async () => {
    fetchMock.mockResolvedValue({
      live_animal: true,
      store_pickup: true,
      withdrawals: [
        {
          id: "ordwd_1",
          created_at: "2026-11-09T12:00:00.000Z",
          item_ids: ["item_1"],
        },
      ],
    })
    expect(await retrieveOwnWithdrawalState("order_01/AB")).toEqual({
      liveAnimal: true,
      withdrawals: [
        {
          id: "ordwd_1",
          created_at: "2026-11-09T12:00:00.000Z",
          item_ids: ["item_1"],
        },
      ],
    })
    const [path, options] = fetchMock.mock.calls[0]
    expect(path).toBe("/store/customers/me/orders/order_01%2FAB/withdrawal")
    expect(options.method).toBe("GET")
    expect(options.headers).toEqual({ authorization: "Bearer jwt" })
    expect(options.cache).toBe("no-store")
  })

  it("is an empty list when the shop could not read the declarations", async () => {
    fetchMock.mockResolvedValue({ live_animal: false })
    expect(await retrieveOwnWithdrawalState("order_01")).toEqual({
      liveAnimal: false,
      withdrawals: [],
    })
  })

  it("is null without a clean answer: no session, no flag (an older shop), a failure", async () => {
    auth = {}
    expect(await retrieveOwnWithdrawalState("order_01")).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    auth = { authorization: "Bearer jwt" }
    fetchMock.mockResolvedValue({ store_pickup: true })
    expect(await retrieveOwnWithdrawalState("order_01")).toBeNull()
    fetchMock.mockResolvedValue({ live_animal: "false" })
    expect(await retrieveOwnWithdrawalState("order_01")).toBeNull()
    fetchMock.mockRejectedValue({ status: 404 })
    expect(await retrieveOwnWithdrawalState("order_01")).toBeNull()
  })
})
