import { MedusaError } from "@medusajs/framework/utils"

import {
  isInsufficientInventory,
  isUniquePiece,
  SOLD_UNIQUE_CODE,
  soldMessage,
  soldUniqueLines,
  type CartLineFacts,
} from "../sold-lines"
import { soldUniqueLinesOfCart } from "../sold-lines-of-cart"

/*
  WHAT TURNS THIS RED (V2.5). A shortage mistaken for any other 400 (or missed); an ordinary product named as "sold"; a line that
  still has stock named; the unique flag read loosely ("false", 1, a missing flag counting as unique); a code that does not survive
  the message; the cart wiring naming a line the inventory module still covers, or asking about a variant that manages no stock.
*/
const line = (over: Partial<CartLineFacts> = {}): CartLineFacts => ({
  title: "WYSIWYG Acropora",
  handle: "wysiwyg-acropora",
  quantity: 1,
  uniquePiece: true,
  ...over,
})

describe("isUniquePiece", () => {
  it("reads true and the text 'true' only", () => {
    expect(isUniquePiece(true)).toBe(true)
    expect(isUniquePiece("true")).toBe(true)
    for (const v of [false, "false", 1, "1", "", null, undefined, {}]) expect(isUniquePiece(v)).toBe(false)
  })
})

describe("isInsufficientInventory", () => {
  it("recognises Medusa's shortage by its code or its sentence, and nothing else", () => {
    expect(
      isInsufficientInventory(
        new MedusaError(MedusaError.Types.NOT_ALLOWED, "x", MedusaError.Codes.INSUFFICIENT_INVENTORY)
      )
    ).toBe(true)
    expect(
      isInsufficientInventory(
        new MedusaError(MedusaError.Types.NOT_ALLOWED, "Some variant does not have the required inventory")
      )
    ).toBe(true)
    // the inventory module's own sentence, as the test shop answered it (2026-11-14), with no code
    expect(
      isInsufficientInventory(
        new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Not enough stock available for item iitem_01M1YBNKDXZZ43B5NYDB1HH0TN at location sloc_01M0K2F9Q23AJN6CFWQCY7CC05"
        )
      )
    ).toBe(true)
    // the same sentence under another error type is not a shortage answer
    expect(
      isInsufficientInventory(new MedusaError(MedusaError.Types.INVALID_DATA, "Not enough stock available for item x at location y"))
    ).toBe(false)
    expect(isInsufficientInventory(new MedusaError(MedusaError.Types.NOT_ALLOWED, "cart is not ready"))).toBe(false)
    expect(isInsufficientInventory(new MedusaError(MedusaError.Types.INVALID_DATA, "bad"))).toBe(false)
    expect(isInsufficientInventory(new Error("boom"))).toBe(false)
    for (const v of [null, undefined, "text", 5]) expect(isInsufficientInventory(v)).toBe(false)
  })
})

describe("soldUniqueLines", () => {
  it("names the unique lines without stock, and no others", async () => {
    const sold = await soldUniqueLines(
      [
        line({ title: "A", handle: "a" }),
        line({ title: "B", handle: "b" }),
        line({ title: "C", handle: "c", uniquePiece: false }),
        line({ title: "D", handle: "d", uniquePiece: undefined }),
      ],
      async (l) => l.handle === "b"
    )
    expect(sold).toEqual([{ title: "A", handle: "a" }])
  })

  it("does not ask about an ordinary line, and skips a line with no handle", async () => {
    const hasStock = jest.fn(async () => false)
    const sold = await soldUniqueLines([line({ uniquePiece: false }), line({ handle: null })], hasStock)
    expect(sold).toEqual([])
    expect(hasStock).not.toHaveBeenCalled()
  })
})

describe("soldMessage", () => {
  it("carries the code and the lines as JSON, and nothing else", () => {
    const message = soldMessage([{ title: 'Korall "X"', handle: "korall-x" }])
    expect(message.startsWith(`${SOLD_UNIQUE_CODE}:`)).toBe(true)
    expect(JSON.parse(message.slice(SOLD_UNIQUE_CODE.length + 1))).toEqual([{ title: 'Korall "X"', handle: "korall-x" }])
  })
})

describe("soldUniqueLinesOfCart (the Medusa wiring, with a fake container)", () => {
  const scope = (opts: { stock: Record<string, boolean>; manage?: boolean; backorder?: boolean; cartItems?: unknown[] }) => {
    const confirm = jest.fn(async (itemId: string) => opts.stock[itemId] ?? true)
    const graph = jest.fn(async (q: { entity: string; filters: { id: string } }) => {
      if (q.entity === "cart")
        return {
          data: [
            {
              sales_channel_id: "sc_1",
              items: opts.cartItems ?? [
                {
                  quantity: 1,
                  title: "WYSIWYG Acropora",
                  product_handle: "wysiwyg-acropora",
                  variant_id: "var_1",
                  product: { metadata: { unique_piece: "true" } },
                },
                {
                  quantity: 2,
                  title: "Pumpa",
                  product_handle: "pumpa",
                  variant_id: "var_2",
                  product: { metadata: {} },
                },
              ],
            },
          ],
        }
      if (q.entity === "sales_channel") return { data: [{ stock_locations: [{ id: "sloc_1" }] }] }
      return {
        data: [
          {
            manage_inventory: opts.manage ?? true,
            allow_backorder: opts.backorder ?? false,
            inventory_items: [{ inventory_item_id: q.filters.id === "var_1" ? "iitem_1" : "iitem_2", required_quantity: 1 }],
          },
        ],
      }
    })
    return {
      confirm,
      container: {
        resolve: (key: string) => (key === "query" ? { graph } : { confirmInventory: confirm }),
      } as never,
    }
  }

  it("names the unique piece whose inventory the module does not cover, asking over the channel's locations", async () => {
    const { container, confirm } = scope({ stock: { iitem_1: false } })
    const sold = await soldUniqueLinesOfCart(container, "cart_1")
    expect(sold).toEqual([{ title: "WYSIWYG Acropora", handle: "wysiwyg-acropora" }])
    expect(confirm).toHaveBeenCalledWith("iitem_1", ["sloc_1"], 1)
    // the ordinary line is never asked about
    expect(confirm).not.toHaveBeenCalledWith("iitem_2", expect.anything(), expect.anything())
  })

  it("names nothing while the piece still has stock, or when the variant manages no stock or allows backorder", async () => {
    expect(await soldUniqueLinesOfCart(scope({ stock: {} }).container, "cart_1")).toEqual([])
    expect(await soldUniqueLinesOfCart(scope({ stock: { iitem_1: false }, manage: false }).container, "cart_1")).toEqual([])
    expect(await soldUniqueLinesOfCart(scope({ stock: { iitem_1: false }, backorder: true }).container, "cart_1")).toEqual([])
  })

  it("answers nothing, never throws, when a query fails", async () => {
    const broken = { resolve: () => ({ graph: async () => Promise.reject(new Error("db")) }) } as never
    expect(await soldUniqueLinesOfCart(broken, "cart_1")).toEqual([])
  })
})
