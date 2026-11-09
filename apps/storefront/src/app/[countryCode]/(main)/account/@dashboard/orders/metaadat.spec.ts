import { describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/orders", () => ({
  listOrders: vi.fn(),
  listOrderBusinessStatuses: vi.fn(),
  retrieveOrder: vi.fn(async () => ({ id: "order_1", display_id: 14 })),
  retrieveOrderBusinessStatus: vi.fn(),
}))
vi.mock("@lib/data/own-withdrawal", () => ({
  retrieveOwnWithdrawalState: vi.fn(async () => null),
  submitOwnWithdrawal: vi.fn(),
}))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@modules/account/components/rendelesek", () => ({
  default: () => null,
}))
vi.mock("@modules/account/components/transfer-request-form", () => ({
  default: () => null,
}))
vi.mock("@modules/account/components/rendeles-reszletek", () => ({
  default: () => null,
}))

import { generateMetadata as reszletekMeta } from "./details/[id]/page"
import { generateMetadata as rendelesekMeta } from "./page"

/**
 * A RENDELESEK ES A RESZLETEK FUL-CIME A LAP NYELVEN. MI PIROSIT: ha az angol
 * uton magyar cim vagy leiras marad; ha a magyar ut szovege elmozdul.
 */
describe("a rendelések oldalainak metaadata", () => {
  const lista = (countryCode: string) => ({
    params: Promise.resolve({ countryCode }),
  })
  const reszlet = (countryCode: string) => ({
    params: Promise.resolve({ countryCode, id: "order_1" }),
  })

  it("magyarul a régi cím és leírás", async () => {
    expect(await rendelesekMeta(lista("hu"))).toEqual({
      title: "Rendeléseim",
      description: "Aktuális és korábbi rendeléseid egy helyen.",
    })
    expect(await reszletekMeta(reszlet("hu"))).toEqual({
      title: "Rendelés #14",
      description: "A rendelésed részletei.",
    })
  })

  it("angolul angol cím és leírás", async () => {
    expect(await rendelesekMeta(lista("en-hu"))).toEqual({
      title: "My orders",
      description: "Your current and past orders in one place.",
    })
    expect(await reszletekMeta(reszlet("en-hu"))).toEqual({
      title: "Order #14",
      description: "The details of your order.",
    })
  })
})
