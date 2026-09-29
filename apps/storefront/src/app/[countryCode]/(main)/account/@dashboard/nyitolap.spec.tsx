import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({
  redirect: vi.fn((cel: string) => {
    throw new Error(`REDIRECT ${cel}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))
vi.mock("next/navigation", () => nav)
const vevo = vi.hoisted(() => ({ retrieveCustomer: vi.fn() }))
vi.mock("@lib/data/customer", () => vevo)

import AccountStart from "./page"

afterEach(() => vi.clearAllMocks())

const lap = () =>
  AccountStart({ params: Promise.resolve({ countryCode: "hu" }) })

/**
 * A FIOK NYITOLAPJA (P5, 4. pont). MI PIROSIT: ha bejelentkezve nem a
 * rendelesekre visz, vagy nem az orszagkoddal; ha bejelentkezes nelkul is
 * atiranyit (akkor a belepo lap helyett a rendelesek utja jonne).
 */
describe("a fiók nyitólapja", () => {
  it("bejelentkezve a rendelésekre visz", async () => {
    vevo.retrieveCustomer.mockResolvedValue({ id: "cus_1" })
    await expect(lap()).rejects.toThrow("REDIRECT /hu/account/orders")
  })

  it("bejelentkezés nélkül nem irányít át", async () => {
    vevo.retrieveCustomer.mockRejectedValue(new Error("401"))
    await expect(lap()).rejects.toThrow("NOT_FOUND")
    expect(nav.redirect).not.toHaveBeenCalled()
  })
})
