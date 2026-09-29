import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
  store: { customer: { createAddress: vi.fn(), updateAddress: vi.fn() } },
}))
vi.mock("@lib/config", () => ({ sdk }))
vi.mock("./cookies", () => ({
  getAuthHeaders: vi.fn(async () => ({ authorization: "Bearer x" })),
  getCacheTag: vi.fn(async () => "customers"),
  getCacheOptions: vi.fn(async () => ({})),
}))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { addCustomerAddress, updateCustomerAddress } from "./customer"

const urlap = (mezok: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(mezok)) fd.set(k, v)
  return fd
}
const CIM = {
  first_name: "Anna",
  last_name: "Minta",
  address_1: "Minta utca 12.",
  postal_code: "1111",
  city: "Budapest",
  country_code: "hu",
}

beforeEach(() => {
  sdk.store.customer.createAddress.mockResolvedValue({})
  sdk.store.customer.updateAddress.mockResolvedValue({})
})
afterEach(() => vi.clearAllMocks())

/**
 * A CIM MENTESE A KET UJ MEZOVEL (257:51). MI PIROSIT: ha a nev vagy az
 * alapertelmezes nem jut el a Medusaig; ha a regi hivo (a szamlazasi cim,
 * mezok nelkul) mas alapertelmezest kap, mint amit kert; ha a hiba angolul jon.
 */
describe("a cím mentése", () => {
  it("felvételkor a név és az alapértelmezés a Medusáig jut", async () => {
    await addCustomerAddress(
      {},
      urlap({
        ...CIM,
        address_name: "Otthon",
        alapertelmezett_mezo: "1",
        is_default_shipping: "on",
      }),
    )
    const [adat] = sdk.store.customer.createAddress.mock.calls[0]
    expect(adat).toMatchObject({
      address_name: "Otthon",
      is_default_shipping: true,
    })
  })

  /*
   * A KONTROLL `true`-t ker (a P5-3 kalibraciojabol): `false`-szal ez az
   * allitas nem tudta megkulonboztetni a sajat jelzot a hianyzo pipatol, mert
   * mind a ketto `false`-t ad.
   */
  it("a régi hívó (mezők nélkül) a saját jelzőit kapja", async () => {
    await addCustomerAddress(
      { isDefaultBilling: true, isDefaultShipping: true },
      urlap(CIM),
    )
    const [adat] = sdk.store.customer.createAddress.mock.calls[0]
    expect(adat.is_default_billing).toBe(true)
    expect(adat.is_default_shipping).toBe(true)
    expect(adat.address_name).toBeUndefined()
  })

  it("szerkesztéskor az üres név töröl, a levett pipa leveszi az alapértelmezést", async () => {
    await updateCustomerAddress(
      {},
      urlap({
        ...CIM,
        addressId: "addr_1",
        address_name: "",
        alapertelmezett_mezo: "1",
      }),
    )
    const [id, adat] = sdk.store.customer.updateAddress.mock.calls[0]
    expect(id).toBe("addr_1")
    expect(adat.address_name).toBeNull()
    expect(adat.is_default_shipping).toBe(false)
  })

  it("mezők nélküli szerkesztés nem nyúl a névhez és az alapértelmezéshez", async () => {
    await updateCustomerAddress({}, urlap({ ...CIM, addressId: "addr_1" }))
    const [, adat] = sdk.store.customer.updateAddress.mock.calls[0]
    expect("address_name" in adat).toBe(false)
    expect("is_default_shipping" in adat).toBe(false)
  })

  it("a szerver hibája magyarul jön vissza", async () => {
    sdk.store.customer.createAddress.mockRejectedValue(new Error("Boom"))
    const valasz = await addCustomerAddress({}, urlap(CIM))
    expect(valasz.success).toBe(false)
    expect(valasz.error).not.toContain("Boom")
  })
})
