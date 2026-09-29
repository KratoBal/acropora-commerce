import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const visszateres = vi.hoisted(() => vi.fn())
const removeCartId = vi.hoisted(() => vi.fn())
vi.mock("@lib/data/simplepay", () => ({ simplePayVisszateres: visszateres }))
vi.mock("@lib/data/cookies", () => ({ removeCartId }))

import { GET } from "./route"

afterEach(() => vi.clearAllMocks())

const keres = (query: string) =>
  new NextRequest(`https://shop-staging.acropora.hu/api/simplepay-vissza${query}`)

/**
 * A SIMPLEPAY VISSZATERESI CIME (P4-4). MI PIROSIT: ha a sikeres fizetes utan a
 * kosar sutije megmarad; ha fizetes nelkul lekerul; ha az eredmenylapra nem
 * az alairt parameterek mennek tovabb.
 */
describe("a SimplePay visszatérés útja", () => {
  it("sikeres fizetésnél leveszi a kosarat, és az eredménylapra visz az aláírt paraméterekkel", async () => {
    visszateres.mockResolvedValue({ event: "SUCCESS", status: "paid", order_ids: ["order_1"] })
    const valasz = await GET(keres("?r=UkVS&s=QUzB"))

    expect(visszateres).toHaveBeenCalledWith("UkVS", "QUzB")
    expect(removeCartId).toHaveBeenCalledTimes(1)
    const cel = new URL(valasz.headers.get("location")!)
    expect(cel.pathname).toBe("/hu/checkout/simplepay")
    expect(cel.searchParams.get("r")).toBe("UkVS")
    expect(cel.searchParams.get("s")).toBe("QUzB")
  })

  it("fizetés nélkül a kosár megmarad", async () => {
    visszateres.mockResolvedValue({ event: "CANCEL", status: "not_paid" })
    await GET(keres("?r=UkVS&s=QUzB"))
    expect(removeCartId).not.toHaveBeenCalled()
  })

  it("paraméter nélkül nem kérdez, és paraméter nélkül visz tovább", async () => {
    const valasz = await GET(keres(""))
    expect(visszateres).not.toHaveBeenCalled()
    expect(new URL(valasz.headers.get("location")!).search).toBe("")
  })
})
