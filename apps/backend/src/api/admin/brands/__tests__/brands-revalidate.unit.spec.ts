import { PUT as putBrand } from "../[os_brand_id]/route"
import { PUT as putProductBrand } from "../../product-brands/[product_id]/route"
import { BRANDS_REVALIDATE_WINDOW_MS, resetBrandsRevalidate } from "../helpers"

/*
  THE STOREFRONT'S BRAND CACHE AFTER A BRAND WRITE (kezdolap-marka-sav). What
  turns these red: a brand or product-link write that leaves the storefront's
  `brands` tag alone (the logo strip keeps the old names for 300 s); one call
  per write instead of one per window (a brand-links run writes hundreds); a
  call without the storefront's address and secret; a failed call that fails
  the write.
*/
const ON = {
  ACROPORA_STOREFRONT_URL: "https://shop.example/",
  STOREFRONT_REVALIDATE_SECRET: "s",
}

const calls: { url: string; tags: unknown }[] = []
let fetchImpl: typeof fetch
const logger = { info: jest.fn(), warn: jest.fn() }
const scope = {
  resolve: (name: string) =>
    name === "logger"
      ? logger
      : {
          upsertBrandByOsId: async (id: string, body: object) => ({
            os_brand_id: id,
            ...body,
          }),
          setProductBrand: async () => undefined,
        },
}
const res = () => {
  const r = { body: undefined as unknown, json: (b: unknown) => (r.body = b) }
  return r
}
const brand = (id: string) =>
  putBrand(
    { scope, params: { os_brand_id: id }, validatedBody: { name: id } } as never,
    res() as never
  )
const link = (productId: string) =>
  putProductBrand(
    {
      scope,
      params: { product_id: productId },
      validatedBody: { os_brand_id: "b1" },
    } as never,
    res() as never
  )

let savedEnv: NodeJS.ProcessEnv
const originalFetch = global.fetch

beforeEach(() => {
  jest.useFakeTimers()
  savedEnv = { ...process.env }
  resetBrandsRevalidate()
  calls.length = 0
  logger.info.mockClear()
  logger.warn.mockClear()
  fetchImpl = (async (url: string, init: { body: string }) => {
    calls.push({ url, tags: JSON.parse(init.body).tags })
    return new Response("{}", { status: 200 })
  }) as unknown as typeof fetch
  global.fetch = ((...args: Parameters<typeof fetch>) =>
    fetchImpl(...args)) as typeof fetch
})

afterEach(() => {
  jest.useRealTimers()
  global.fetch = originalFetch
  process.env = savedEnv
})

const windowPasses = async () => {
  await jest.advanceTimersByTimeAsync(BRANDS_REVALIDATE_WINDOW_MS)
}

describe("a brand write empties the storefront's brands tag", () => {
  it("BRANDS-REVALIDATE: many brand and link writes in a window are ONE call, after the window", async () => {
    Object.assign(process.env, ON)
    await brand("b1")
    await link("p1")
    await link("p2")
    await link("p3")
    expect(calls).toEqual([])
    await windowPasses()
    expect(calls).toEqual([
      { url: "https://shop.example/api/revalidate", tags: ["brands"] },
    ])
  })

  it("a write after the window starts a new one", async () => {
    Object.assign(process.env, ON)
    await link("p1")
    await windowPasses()
    await link("p2")
    await windowPasses()
    expect(calls.map((c) => c.tags)).toEqual([["brands"], ["brands"]])
  })

  it("the product link alone is enough: the store list offers only brands with products", async () => {
    Object.assign(process.env, ON)
    await link("p1")
    await windowPasses()
    expect(calls).toHaveLength(1)
  })

  it("without the storefront's address and secret nothing is called", async () => {
    delete process.env.ACROPORA_STOREFRONT_URL
    delete process.env.STOREFRONT_REVALIDATE_SECRET
    await brand("b1")
    await link("p1")
    await windowPasses()
    expect(calls).toEqual([])
  })

  it("a failed call is logged, and the write still answers", async () => {
    Object.assign(process.env, ON)
    fetchImpl = (async () => {
      throw new Error("down")
    }) as unknown as typeof fetch
    const r = res()
    await putProductBrand(
      {
        scope,
        params: { product_id: "p1" },
        validatedBody: { os_brand_id: "b1" },
      } as never,
      r as never
    )
    expect(r.body).toEqual({
      product_brand: { product_id: "p1", os_brand_id: "b1" },
    })
    await windowPasses()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Storefront revalidate (brands) failed")
    )
  })
})
