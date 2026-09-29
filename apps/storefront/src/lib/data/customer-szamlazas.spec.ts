import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  client: { fetch: vi.fn() },
  store: { customer: { updateAddress: vi.fn(), createAddress: vi.fn() } },
}))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheTag: vi.fn(async () => "customers"),
  getCacheOptions: vi.fn(async () => ({})),
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { saveBilling } from "./customer"

// Kitalalt, kezzel szamolt adoszam (lasd szamlazas.spec.ts).
const ADOSZAM = "12345676-2-13"

const urlap = (mezok: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(mezok)) fd.set(k, v)
  return fd
}
const CIM = {
  postal_code: "1111",
  city: "Budapest",
  address_1: "Minta utca 12.",
}
const vevo = (addresses: unknown[]) => ({
  customer: { id: "cus_1", first_name: "P5", last_name: "Teszt", addresses },
})

beforeEach(() => {
  sdk.store.customer.updateAddress.mockResolvedValue({})
  sdk.store.customer.createAddress.mockResolvedValue({})
})
afterEach(() => vi.clearAllMocks())

/**
 * A SZAMLAZASI ADATOK MENTESE (257:102). MI PIROSIT: ha nem a meglevo
 * alapertelmezett szamlazasi cimet frissiti, vagy ujat hoz letre mellette; ha
 * az adoszam nem egysegesitve, nem a `tax_id` kulcson, vagy a tobbi metadata
 * kulcs elveszik; ha maganszemelynel ceg vagy adoszam marad; ha ervenytelen
 * adoszammal ment; ha a hiba angolul jon vissza.
 */
describe("a számlázási adatok mentése", () => {
  it("cégként a meglévő számlázási címet frissíti, az adószám a tax_id kulcson", async () => {
    sdk.client.fetch.mockResolvedValue(
      vevo([
        {
          id: "addr_szall",
          is_default_shipping: true,
          is_default_billing: false,
        },
        {
          id: "addr_szla",
          is_default_billing: true,
          metadata: { mas_kulcs: "marad" },
        },
      ]),
    )
    const valasz = await saveBilling(
      null,
      urlap({
        tipus: "ceg",
        company: "Minta Kft.",
        tax_id: "12345676 2 13",
        ...CIM,
      }),
    )
    expect(valasz).toEqual({ state: "success" })
    expect(sdk.store.customer.createAddress).not.toHaveBeenCalled()
    const [id, adat] = sdk.store.customer.updateAddress.mock.calls[0]
    expect(id).toBe("addr_szla")
    expect(adat).toMatchObject({
      company: "Minta Kft.",
      postal_code: "1111",
      city: "Budapest",
      address_1: "Minta utca 12.",
      country_code: "hu",
      metadata: { tax_id: ADOSZAM, mas_kulcs: "marad" },
    })
  })

  it("magánszemélyként a cég és az adószám null", async () => {
    sdk.client.fetch.mockResolvedValue(
      vevo([
        {
          id: "addr_szla",
          is_default_billing: true,
          company: "Régi Kft.",
          metadata: { tax_id: ADOSZAM },
        },
      ]),
    )
    await saveBilling(
      null,
      urlap({
        tipus: "maganszemely",
        company: "Régi Kft.",
        tax_id: ADOSZAM,
        ...CIM,
      }),
    )
    const [, adat] = sdk.store.customer.updateAddress.mock.calls[0]
    expect(adat.company).toBeNull()
    expect(adat.metadata.tax_id).toBeNull()
  })

  it("számlázási cím nélkül újat hoz létre, alapértelmezettként és felismerhető névvel", async () => {
    sdk.client.fetch.mockResolvedValue(
      vevo([{ id: "addr_szall", is_default_shipping: true }]),
    )
    await saveBilling(null, urlap({ tipus: "maganszemely", ...CIM }))
    expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled()
    const [adat] = sdk.store.customer.createAddress.mock.calls[0]
    expect(adat).toMatchObject({
      is_default_billing: true,
      is_default_shipping: false,
      address_name: "Számlázási cím",
      first_name: "P5",
      last_name: "Teszt",
    })
  })

  it("érvénytelen adószámmal nem ment", async () => {
    sdk.client.fetch.mockResolvedValue(vevo([]))
    const valasz = await saveBilling(
      null,
      urlap({
        tipus: "ceg",
        company: "Minta Kft.",
        tax_id: "12345677-2-13",
        ...CIM,
      }),
    )
    expect(valasz?.state).toBe("error")
    expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled()
    expect(sdk.store.customer.createAddress).not.toHaveBeenCalled()
    // A bekuldott ertekek visszajonnek, hogy a mezok ne uruljenek ki
    // (a React 19 az action utan alaphelyzetbe allitja az urlapot).
    expect(valasz?.state === "error" && valasz.ertekek).toMatchObject({
      company: "Minta Kft.",
      tax_id: "12345677-2-13",
      city: "Budapest",
    })
  })

  it("a szerver hibája magyar mondat", async () => {
    sdk.client.fetch.mockResolvedValue(vevo([]))
    sdk.store.customer.createAddress.mockRejectedValue(new Error("Boom"))
    const valasz = await saveBilling(
      null,
      urlap({ tipus: "maganszemely", ...CIM }),
    )
    expect(valasz?.state).toBe("error")
    expect(JSON.stringify(valasz)).not.toContain("Boom")
  })
})
