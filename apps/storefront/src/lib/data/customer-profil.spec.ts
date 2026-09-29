import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  store: { customer: { update: vi.fn() } },
}))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheTag: vi.fn(async () => "customers"),
  getCacheOptions: vi.fn(async () => ({})),
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { saveProfile } from "./customer"

const urlap = (mezok: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(mezok)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  sdk.store.customer.update.mockResolvedValue({ customer: { id: "cus_1" } })
})
afterEach(() => vi.clearAllMocks())

/**
 * A PROFIL MENTESE (257:3). MI PIROSIT: ha nev nelkul ment; ha az e-mailt is
 * kuldene (a bolti API elutasitja); ha a kiuritett telefonszam nem torol; ha a hiba nyers angol szovegkent jonne vissza.
 */
describe("a profil mentése", () => {
  it("név nélkül nem ment", async () => {
    const valasz = await saveProfile(
      null,
      urlap({ first_name: "", last_name: "Minta" }),
    )
    expect(valasz).toEqual({
      state: "error",
      error: "A vezetéknév és a keresztnév kötelező.",
      ertekek: { first_name: "", last_name: "Minta", phone: "" },
    })
    expect(sdk.store.customer.update).not.toHaveBeenCalled()
  })

  it("a nevet és a telefonszámot menti, az e-mailt nem küldi", async () => {
    const valasz = await saveProfile(
      null,
      urlap({
        first_name: " Anna ",
        last_name: "Minta",
        phone: "+36 20 123 4567",
        email: "mas@example.hu",
      }),
    )
    expect(valasz).toEqual({ state: "success" })
    const [adat] = sdk.store.customer.update.mock.calls[0]
    expect(adat).toEqual({
      first_name: "Anna",
      last_name: "Minta",
      phone: "+36 20 123 4567",
    })
  })

  /*
   * A KIURITETT TELEFONSZAM TOROL: `null` megy ki. `undefined` eseten a Medusa
   * a regi szamot megtartana, es a vevo nem tudna torolni.
   */
  it("a kiürített telefonszámot törli (null), nem hagyja a régit", async () => {
    await saveProfile(
      null,
      urlap({ first_name: "Anna", last_name: "Minta", phone: " " }),
    )
    const [adat] = sdk.store.customer.update.mock.calls[0]
    expect(adat.phone).toBeNull()
  })

  it("a szerver hibája magyar mondatként jön vissza", async () => {
    sdk.store.customer.update.mockRejectedValue(new Error("Something broke"))
    const valasz = await saveProfile(
      null,
      urlap({ first_name: "Anna", last_name: "Minta" }),
    )
    expect(valasz?.state).toBe("error")
    expect(JSON.stringify(valasz)).not.toContain("Something broke")
    // The typed values come back, so the form refills after the reset.
    expect(valasz).toMatchObject({
      ertekek: { first_name: "Anna", last_name: "Minta", phone: "" },
    })
  })
})
