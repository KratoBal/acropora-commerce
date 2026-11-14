import { shortLinesAt, type PickupLineFacts } from "../pickup-shortage"
import { variantHasStock } from "../variant-stock"

const line = (title: string, quantity = 1, handle: string | null = title.toLowerCase()): PickupLineFacts => ({
  title,
  handle,
  quantity,
})

/** What must fail: a line with stock named short, a short line missed, the cart's order lost, a line asked twice. */
describe("shortLinesAt", () => {
  it("PS-NAMES: only the lines without stock at the location are named, in the cart's order, with title and handle", async () => {
    const lines = [line("Alfa"), line("Beta"), line("Gamma", 2, null), line("Delta")]
    const out = await shortLinesAt(lines, async (l) => l.title === "Alfa" || l.title === "Delta")
    expect(out).toEqual([
      { title: "Beta", handle: "beta" },
      { title: "Gamma", handle: null },
    ])
  })

  it("PS-NONE: a cart where every line has stock names nothing; an empty cart too", async () => {
    expect(await shortLinesAt([line("Alfa")], async () => true)).toEqual([])
    expect(await shortLinesAt([], async () => false)).toEqual([])
  })

  it("PS-ONCE: each line is asked exactly once", async () => {
    const asked: string[] = []
    await shortLinesAt([line("Alfa"), line("Beta")], async (l) => {
      asked.push(l.title)
      return true
    })
    expect(asked).toEqual(["Alfa", "Beta"])
  })
})

type Variant = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_items?: { inventory_item_id: string; required_quantity?: number | null }[]
}

const queryOf = (variant: Variant | undefined) => ({
  graph: async () => ({ data: variant ? [{ id: "variant_1", ...variant }] : [] }),
})

/** What must fail: stock counted over the wrong locations, the required quantity ignored, an unmanaged variant named short. */
describe("variantHasStock", () => {
  it("VS-LOCATIONS: the check runs over exactly the locations it was given, for the wanted quantity", async () => {
    const calls: unknown[][] = []
    const inventory = {
      confirmInventory: async (...args: unknown[]) => {
        calls.push(args)
        return false
      },
    }
    const ok = await variantHasStock(
      queryOf({ manage_inventory: true, allow_backorder: false, inventory_items: [{ inventory_item_id: "iitem_1", required_quantity: 3 }] }) as never,
      inventory as never,
      "variant_1",
      2,
      ["sloc_pickup"]
    )
    expect(ok).toBe(false)
    expect(calls).toEqual([["iitem_1", ["sloc_pickup"], 6]])
  })

  it("VS-ALL-ITEMS: every inventory item of the variant must be in stock", async () => {
    const inventory = { confirmInventory: async (id: string) => id === "iitem_1" }
    const variant = {
      manage_inventory: true,
      inventory_items: [{ inventory_item_id: "iitem_1" }, { inventory_item_id: "iitem_2" }],
    }
    expect(await variantHasStock(queryOf(variant) as never, inventory as never, "variant_1", 1, ["l"])).toBe(false)
    expect(
      await variantHasStock(queryOf({ ...variant, inventory_items: [{ inventory_item_id: "iitem_1" }] }) as never, inventory as never, "variant_1", 1, ["l"])
    ).toBe(true)
  })

  it("VS-NEVER-INVENTED: a variant that does not manage stock, allows backorder, has no item or is unknown counts as in stock", async () => {
    const inventory = { confirmInventory: async () => false }
    const items = [{ inventory_item_id: "iitem_1" }]
    for (const variant of [
      { manage_inventory: false, inventory_items: items },
      { manage_inventory: true, allow_backorder: true, inventory_items: items },
      { manage_inventory: true, inventory_items: [] },
      undefined,
    ]) {
      expect(await variantHasStock(queryOf(variant) as never, inventory as never, "variant_1", 1, ["l"])).toBe(true)
    }
  })
})
