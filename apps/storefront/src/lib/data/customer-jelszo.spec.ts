import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ client: { fetch: vi.fn() } }))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheTag: vi.fn(async () => "customers"),
  getCacheOptions: vi.fn(async () => ({})),
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { changePassword } from "./customer"

const urlap = (mezok: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(mezok)) fd.set(k, v)
  return fd
}
const JO = {
  current_password: "regi-jelszo",
  new_password: "uj-jelszo",
  new_password_again: "uj-jelszo",
}

beforeEach(() => {
  sdk.client.fetch.mockResolvedValue({ success: true })
})
afterEach(() => vi.clearAllMocks())

/**
 * A JELSZOCSERE (257:191). MI PIROSIT: ha ures mezovel vagy eltero uj
 * jelszavakkal a szerverhez fordul; ha nem a sajat vegpontunkat hivja, vagy a
 * munkamenet nelkul; ha a rossz jelenlegi jelszo nyers angol szovegkent jon
 * vissza; ha barmelyik jelszo visszakerul a valaszba.
 */
describe("a jelszó módosítása", () => {
  it("a jelenlegi és az új jelszót küldi a saját végpontra, a munkamenettel", async () => {
    const valasz = await changePassword(null, urlap(JO))
    expect(valasz).toEqual({ state: "success" })
    const [ut, opciok] = sdk.client.fetch.mock.calls[0]
    expect(ut).toBe("/store/customers/me/password")
    expect(opciok).toMatchObject({
      method: "POST",
      headers: { authorization: "Bearer x" },
      body: { current_password: "regi-jelszo", new_password: "uj-jelszo" },
    })
  })

  it("üres mezővel nem fordul a szerverhez", async () => {
    const valasz = await changePassword(
      null,
      urlap({ ...JO, current_password: "" }),
    )
    expect(valasz).toEqual({
      state: "error",
      error: "Mindhárom mező kitöltése kötelező.",
    })
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("eltérő új jelszavakkal nem fordul a szerverhez", async () => {
    const valasz = await changePassword(
      null,
      urlap({ ...JO, new_password_again: "masik" }),
    )
    expect(valasz).toEqual({
      state: "error",
      error: "A két új jelszó nem egyezik.",
    })
    expect(sdk.client.fetch).not.toHaveBeenCalled()
  })

  it("a rossz jelenlegi jelszó magyar mondatként jön vissza, jelszó nélkül", async () => {
    sdk.client.fetch.mockRejectedValue(
      new Error("Current password is incorrect"),
    )
    const valasz = await changePassword(null, urlap(JO))
    expect(valasz).toEqual({
      state: "error",
      error: "A jelenlegi jelszó nem helyes.",
    })
    expect(JSON.stringify(valasz)).not.toContain("regi-jelszo")
    expect(JSON.stringify(valasz)).not.toContain("uj-jelszo")
  })

  it("más szerverhiba az általános mondatot kapja, nem a nyers szöveget", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("Password could not be changed"))
    const valasz = await changePassword(null, urlap(JO))
    expect(valasz?.state).toBe("error")
    expect(JSON.stringify(valasz)).not.toContain("could not")
    expect(JSON.stringify(valasz)).not.toContain("A jelenlegi jelszó")
  })
})
