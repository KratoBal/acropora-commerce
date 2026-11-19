import { afterEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  store: { cart: { update: vi.fn(async () => ({ cart: { id: "cart_1" } })) } },
  client: { fetch: vi.fn() },
}))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({})),
  getCacheOptions: vi.fn(async () => ({})),
  getCacheTag: vi.fn(async () => "carts"),
  getCartId: vi.fn(async () => "cart_1"),
  removeCartId: vi.fn(),
  setCartId: vi.fn(),
}))
vi.mock("./regions", () => ({ getRegion: vi.fn() }))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { setAddresses } from "./cart"
import { torzsszamRendben } from "../util/szamlazas"

afterEach(() => vi.clearAllMocks())

const torzsszam = (() => {
  for (let n = 10000000; n < 10000100; n += 1)
    if (torzsszamRendben(String(n))) return String(n)
  throw new Error("nincs ervenyes torzsszam")
})()
const ERVENYES = `${torzsszam}-2-41`

const urlap = (extra: Record<string, string>) => {
  const f = new FormData()
  const alap: Record<string, string> = {
    "shipping_address.first_name": "Minta",
    "shipping_address.last_name": "Vevő",
    "shipping_address.address_1": "Minta utca 12.",
    "shipping_address.company": "",
    "shipping_address.postal_code": "1111",
    "shipping_address.city": "Budapest",
    "shipping_address.country_code": "hu",
    "shipping_address.province": "",
    "shipping_address.phone": "+36 30 000 0000",
    email: "minta@example.com",
    same_as_billing: "on",
  }
  for (const [k, v] of Object.entries({ ...alap, ...extra })) f.set(k, v)
  return f
}

const kuldott = () =>
  (
    sdk.store.cart.update.mock.calls[0] as unknown as [
      string,
      {
        shipping_address: { metadata: unknown }
        billing_address: { metadata: unknown }
      },
    ]
  )[1]

/**
 * A CEGES VASARLAS ADOSZAMA A KOSARRA (kartya c977aed2). MI PIROSIT: ha a ceges adoszam nem a cim `metadata.tax_id` kulcsara
 * megy (az OS onnan olvassa), vagy csak az egyik cimre; ha maganszemelynel nem megy `tax_id: null` (egy korabbi kitoltes a
 * cimen maradna); ha hibas adoszammal a kosar frissitese mégis elindul.
 */
describe("setAddresses: a céges vásárlás adószáma", () => {
  it("céges vásárlásnál mindkét címre tax_id-ként megy, egységesítve", async () => {
    await setAddresses(
      null,
      urlap({
        company_purchase: "on",
        "shipping_address.company": "Minta Kft.",
        tax_id: ` ${torzsszam} 2 41 `,
      }),
    )
    const adat = kuldott()
    expect(adat.shipping_address.metadata).toEqual({ tax_id: ERVENYES })
    expect(adat.billing_address.metadata).toEqual({ tax_id: ERVENYES })
  })

  it("külön számlázási címnél a számlázási címen is ott van", async () => {
    await setAddresses(
      null,
      urlap({
        company_purchase: "on",
        same_as_billing: "",
        "billing_address.first_name": "Számla",
        "billing_address.last_name": "Cég",
        "billing_address.address_1": "Cég utca 1.",
        "billing_address.company": "Számlázási Kft.",
        "billing_address.postal_code": "2222",
        "billing_address.city": "Győr",
        "billing_address.country_code": "hu",
        tax_id: ERVENYES,
      }),
    )
    const adat = kuldott() as unknown as {
      billing_address: { company: string; metadata: unknown }
    }
    expect(adat.billing_address.company).toBe("Számlázási Kft.")
    expect(adat.billing_address.metadata).toEqual({ tax_id: ERVENYES })
  })

  it("magánszemélynél tax_id: null megy, és a kitöltve maradt mező nem számít", async () => {
    await setAddresses(null, urlap({ tax_id: ERVENYES }))
    const adat = kuldott()
    expect(adat.shipping_address.metadata).toEqual({ tax_id: null })
    expect(adat.billing_address.metadata).toEqual({ tax_id: null })
  })

  it("hibás adószámmal a kosár frissítése el sem indul, és a hiba az űrlap sora", async () => {
    const uzenet = await setAddresses(
      null,
      urlap({
        company_purchase: "on",
        "shipping_address.company": "Minta Kft.",
        tax_id: "12345",
      }),
    )
    expect(uzenet).toMatch(/adószám/i)
    expect(sdk.store.cart.update).not.toHaveBeenCalled()
  })

  it("cégnév nélkül a kosár frissítése el sem indul", async () => {
    const uzenet = await setAddresses(
      null,
      urlap({ company_purchase: "on", tax_id: ERVENYES }),
    )
    expect(uzenet).toMatch(/cég/i)
    expect(sdk.store.cart.update).not.toHaveBeenCalled()
  })
})
