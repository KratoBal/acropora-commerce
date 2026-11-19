const resolveService = jest.fn()
jest.mock("../../../admin/brands/helpers", () => ({
  resolveBrandService: (...a: unknown[]) => resolveService(...a),
  forStore: (b: { name: string; handle: string }) => ({
    name: b.name,
    handle: b.handle,
  }),
}))

import { GET as listBrands } from "../route"
import { GET as getBrand } from "../[handle]/route"

/**
 * THE BRAND LIST AND THE BRAND'S OWN RECORD SHARE ONE RULE (2026-11-19, test
 * shop: 45 of the 105 listed brands answered 404 on their page, because the
 * page lists from a collection and they had none). What must fail: a brand with
 * products and no collection still in the list; the list and the record
 * disagreeing on which brand has a collection; a collection paired by the OS id
 * (the renamed-slug case) not counting; a collection with the brand's own
 * handle (the storefront's fallback) not counting; a brand without products
 * appearing; a brand without a collection answering 200 on its record.
 */
type Coll = { handle: string; external_id?: string | null }

const BRANDS = [
  { os_brand_id: "b-id", handle: "aquamedic", name: "Aqua Medic" },
  { os_brand_id: "b-handle", handle: "amtra", name: "Amtra" },
  { os_brand_id: "b-none", handle: "sera", name: "Sera" },
  { os_brand_id: "b-noprod", handle: "hobby", name: "Hobby" },
]
const COLLECTIONS: Coll[] = [
  // paired by the OS id; the handle predates the brand's slug change
  { handle: "aqua-medic", external_id: "b-id" },
  // paired by the brand's own handle only
  { handle: "amtra", external_id: null },
  // an unrelated collection must pair with nobody
  { handle: "korallok", external_id: "other" },
]

const service = (withProducts: string[]) => ({
  listProductBrands: async (filter: { os_brand_id?: string } = {}) =>
    withProducts
      .filter((id) => !filter.os_brand_id || id === filter.os_brand_id)
      .map((os_brand_id) => ({ os_brand_id })),
  listBrands: async (filter: { os_brand_id?: string[]; handle?: string }) =>
    BRANDS.filter((b) =>
      filter.handle
        ? b.handle === filter.handle
        : (filter.os_brand_id ?? []).includes(b.os_brand_id)
    ),
})

const scope = (collections: Coll[]) =>
  ({
    resolve: () => ({
      listProductCollections: async (filter: {
        external_id?: string
        handle?: string
      }) =>
        collections.filter((c) =>
          filter.external_id
            ? c.external_id === filter.external_id
            : filter.handle
              ? c.handle === filter.handle
              : true
        ),
    }),
  }) as never

const listed = async (collections: Coll[] = COLLECTIONS) => {
  const res = { json: jest.fn() }
  await listBrands({ scope: scope(collections) } as never, res as never)
  return (res.json.mock.calls[0][0].brands as { handle: string }[]).map(
    (b) => b.handle
  )
}

const record = async (handle: string, collections: Coll[] = COLLECTIONS) => {
  const res = { json: jest.fn() }
  const call = getBrand(
    { params: { handle }, scope: scope(collections) } as never,
    res as never
  )
  return call.then(
    () => ({ status: 200, body: res.json.mock.calls[0][0] }),
    (e: { type?: string }) => ({ status: 404, type: e.type })
  )
}

beforeEach(() => {
  resolveService.mockReset()
  resolveService.mockReturnValue(service(["b-id", "b-handle", "b-none"]))
})

describe("GET /store/brands", () => {
  it("offers only the brands that have products AND a collection", async () => {
    expect(await listed()).toEqual(["aquamedic", "amtra"])
  })

  it("a brand with products and no collection is not offered", async () => {
    expect(await listed()).not.toContain("sera")
  })

  it("a brand without products is not offered, collection or not", async () => {
    expect(
      await listed([
        ...COLLECTIONS,
        { handle: "hobby", external_id: "b-noprod" },
      ])
    ).not.toContain("hobby")
  })

  it("no brand has a collection: an empty list, not an error", async () => {
    expect(await listed([])).toEqual([])
  })
})

describe("GET /store/brands/:handle", () => {
  it("a brand paired by the OS id answers its collection's handle", async () => {
    const r = await record("aquamedic")
    expect(r.status).toBe(200)
    expect(
      (r as { body: { brand: { collection_handle: string } } }).body.brand
        .collection_handle
    ).toBe("aqua-medic")
  })

  it("a brand paired by its own handle answers that handle", async () => {
    const r = await record("amtra")
    expect(
      (r as { body: { brand: { collection_handle: string } } }).body.brand
        .collection_handle
    ).toBe("amtra")
  })

  it("a brand with products and no collection is a 404, like its list entry", async () => {
    expect((await record("sera")).status).toBe(404)
  })

  it("the list and the record agree for every brand", async () => {
    const inList = await listed()
    for (const b of BRANDS.filter((x) => x.os_brand_id !== "b-noprod"))
      expect((await record(b.handle)).status === 200).toBe(
        inList.includes(b.handle)
      )
  })
})
