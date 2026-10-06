import {
  assertOrderMaximum,
  orderMaximumOf,
  orderMaximumRefusal,
} from "../order-maximum"

/*
  THE ORDER MAXIMUM IN THE CART (card 6994c9a3). WHAT TURNS THIS RED:
  - adding again what the cart holds goes past the maximum (the lines are not
    counted, or only the new quantity is);
  - setting a line counts that line twice, or ignores another line of the
    same variant;
  - a product without a maximum, or with a broken one, is refused;
  - the refusal does not name the product and the number.
*/
const containerWith = (
  lines: { id: string; variant_id: string | null; quantity: number }[],
  products: Record<string, { title: string; metadata: Record<string, unknown> | null }>
) => {
  const asked: string[] = []
  return {
    asked,
    container: {
      resolve: () => ({
        graph: async ({ entity, filters }: any) => {
          asked.push(entity)
          if (entity === "cart") return { data: [{ id: filters.id, items: lines }] }
          return {
            data: (filters.id as string[]).map((id) => ({
              id,
              product: products[id] ?? null,
            })),
          }
        },
      }),
    } as any,
  }
}

const PUTTY = { title: "Nyos Reef Putty", metadata: { unas_maximum_order_quantity: "100" } }
const FREE = { title: "Szivattyú", metadata: {} }

describe("orderMaximumOf", () => {
  it("reads a whole number of at least 1, as the storefront does; anything else is no limit", () => {
    expect(orderMaximumOf({ unas_maximum_order_quantity: "100" })).toBe(100)
    expect(orderMaximumOf({ unas_maximum_order_quantity: 10 })).toBe(10)
    for (const raw of ["0", "-3", "1.5", "sok", "", null, undefined, true])
      expect(orderMaximumOf({ unas_maximum_order_quantity: raw })).toBeNull()
    expect(orderMaximumOf(null)).toBeNull()
  })

  it("names the product and the number", () => {
    expect(orderMaximumRefusal({ title: "Nyos Reef Putty", maximum: 100, quantity: 101 })).toBe(
      "Nyos Reef Putty: egy rendelésbe legfeljebb 100 darab tehető."
    )
    expect(orderMaximumRefusal({ title: "Nyos Reef Putty", maximum: 100, quantity: 100 })).toBeNull()
  })
})

describe("assertOrderMaximum", () => {
  it("adding counts what the cart already holds of that variant", async () => {
    const { container } = containerWith(
      [
        { id: "l1", variant_id: "v_putty", quantity: 60 },
        { id: "l2", variant_id: "v_putty", quantity: 30 },
      ],
      { v_putty: PUTTY }
    )
    await expect(
      assertOrderMaximum(container, "cart_1", [{ kind: "add", variant_id: "v_putty", quantity: 10 }])
    ).resolves.toBeUndefined()
    await expect(
      assertOrderMaximum(container, "cart_1", [{ kind: "add", variant_id: "v_putty", quantity: 11 }])
    ).rejects.toMatchObject({
      type: "not_allowed",
      message: "Nyos Reef Putty: egy rendelésbe legfeljebb 100 darab tehető.",
    })
  })

  it("setting a line replaces it, and the other lines of the variant still count", async () => {
    const { container } = containerWith(
      [
        { id: "l1", variant_id: "v_putty", quantity: 60 },
        { id: "l2", variant_id: "v_putty", quantity: 30 },
      ],
      { v_putty: PUTTY }
    )
    await expect(
      assertOrderMaximum(container, "cart_1", [{ kind: "set", line_id: "l1", quantity: 70 }])
    ).resolves.toBeUndefined()
    await expect(
      assertOrderMaximum(container, "cart_1", [{ kind: "set", line_id: "l1", quantity: 71 }])
    ).rejects.toMatchObject({ type: "not_allowed" })
  })

  it("a product without a maximum, a fee line and an empty change go through", async () => {
    const { container, asked } = containerWith(
      [{ id: "fee", variant_id: null, quantity: 1 }],
      { v_free: FREE }
    )
    await expect(
      assertOrderMaximum(container, "cart_1", [{ kind: "add", variant_id: "v_free", quantity: 5000 }])
    ).resolves.toBeUndefined()
    await expect(
      assertOrderMaximum(container, "cart_1", [{ kind: "set", line_id: "fee", quantity: 3 }])
    ).resolves.toBeUndefined()
    asked.length = 0
    await assertOrderMaximum(container, "cart_1", [])
    expect(asked).toEqual([])
  })
})
