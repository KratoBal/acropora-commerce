const updateCart = jest.fn()
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: () => ({ run: (args: unknown) => updateCart(args) }),
}))

import middlewares from "../../../api/middlewares"
import { POST as route } from "../../../api/store/cart-locale/[cart_id]/route"
import { StorePostCartLocale } from "../../../api/store/cart-locale/validators"
import { orderLocaleOf, parseOrderLocale, saveCartLocale } from "../order-locale"

const scopeWith = (row: unknown) =>
  ({
    resolve: () => ({
      graph: async (q: { entity: string }) => {
        expect(q.entity).toBe("cart")
        return { data: row ? [row] : [] }
      },
    }),
  }) as never

afterEach(() => updateCart.mockReset())

describe("parseOrderLocale", () => {
  it("accepts hu and en exactly, and nothing else", () => {
    expect(parseOrderLocale("hu")).toBe("hu")
    expect(parseOrderLocale("en")).toBe("en")
    for (const bad of ["EN", " en", "en-hu", "de", "", null, undefined, 1, { a: 1 }]) {
      expect(parseOrderLocale(bad)).toBeNull()
    }
  })
})

describe("orderLocaleOf", () => {
  it("an order without the key, or with an unknown value, is Hungarian", () => {
    expect(orderLocaleOf(undefined)).toBe("hu")
    expect(orderLocaleOf({})).toBe("hu")
    expect(orderLocaleOf({ storefront_locale: "de" })).toBe("hu")
    expect(orderLocaleOf({ storefront_locale: "en" })).toBe("en")
  })
})

describe("the body", () => {
  it("takes hu or en and no other key", () => {
    expect(StorePostCartLocale.safeParse({ locale: "en" }).success).toBe(true)
    expect(StorePostCartLocale.safeParse({ locale: "de" }).success).toBe(false)
    expect(StorePostCartLocale.safeParse({}).success).toBe(false)
    expect(StorePostCartLocale.safeParse({ locale: "en", aszf_elfogadas: "x" }).success).toBe(false)
  })
  it("the route is validated", () => {
    expect((middlewares.routes ?? []).find((r) => r.matcher === "/store/cart-locale/:cart_id")?.middlewares).toHaveLength(1)
  })
})

describe("saveCartLocale", () => {
  it("writes ONLY the language key: the stored metadata is merged by Medusa, never read and written back", async () => {
    const result = await saveCartLocale(scopeWith({ id: "cart_1", metadata: { aszf_elfogadas: { verzio: "1" } }, completed_at: null }), "cart_1", "en")
    expect(result).toEqual({ status: "saved", locale: "en" })
    expect(updateCart).toHaveBeenCalledTimes(1)
    expect(updateCart).toHaveBeenCalledWith({ input: { id: "cart_1", metadata: { storefront_locale: "en" } } })
  })
  it("a switch between cart and payment sends the new language the same way", async () => {
    await saveCartLocale(scopeWith({ id: "cart_1", metadata: { storefront_locale: "hu" }, completed_at: null }), "cart_1", "en")
    expect(updateCart).toHaveBeenCalledWith({ input: { id: "cart_1", metadata: { storefront_locale: "en" } } })
  })
  it("refuses a cart already ordered, and a missing one, without writing", async () => {
    expect(await saveCartLocale(scopeWith({ id: "cart_1", completed_at: new Date() }), "cart_1", "en")).toEqual({ status: "completed" })
    expect(await saveCartLocale(scopeWith(null), "cart_9", "en")).toEqual({ status: "not_found" })
    expect(updateCart).not.toHaveBeenCalled()
  })
})

describe("the route's answers", () => {
  const call = async (scope: unknown) => {
    const res = { statusCode: 200, body: undefined as unknown, status: jest.fn(), json: jest.fn() }
    res.status.mockImplementation((code: number) => ((res.statusCode = code), res))
    res.json.mockImplementation((body: unknown) => (res.body = body))
    await route({ scope, params: { cart_id: "c" }, validatedBody: { locale: "en" } } as never, res as never)
    return res
  }
  it("404 and 409 in Hungarian, 200 with the language", async () => {
    expect(await call(scopeWith(null))).toMatchObject({ statusCode: 404, body: { message: "Nincs ilyen kosár." } })
    expect(await call(scopeWith({ id: "c", completed_at: 1 }))).toMatchObject({ statusCode: 409 })
    expect(await call(scopeWith({ id: "c", metadata: null, completed_at: null }))).toMatchObject({ statusCode: 200, body: { locale: "en" } })
  })
})
