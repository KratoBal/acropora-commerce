import { livestockKindsOf, livestockKindsOfOrder } from "../livestock-kinds"

// V2.6 (card f4e4832b): the kinds of live animal in an order, read for the confirmation's acclimatisation section
describe("the livestock kinds of an order", () => {
  // MI PIROSÍT: ha egy tétel nélküli vagy terméknélküli rendelésre is lekérdezés indulna
  it("asks nothing when no line has a product", async () => {
    const list = jest.fn(async () => [])
    expect(await livestockKindsOf(async () => [], list)).toEqual([])
    expect(await livestockKindsOf(async () => [null, undefined, ""], list)).toEqual([])
    expect(list).not.toHaveBeenCalled()
  })

  // MI PIROSÍT: ha egy termék kétszer kerülne a lekérdezésbe (két sor, ugyanaz a termék)
  it("asks once for all the distinct products, and returns the distinct kinds in the fixed order", async () => {
    const list = jest.fn(async () => [
      { livestock_kind: "CORAL" },
      { livestock_kind: "FISH" },
      { livestock_kind: "CORAL" },
      { livestock_kind: null },
    ])
    expect(await livestockKindsOf(async () => ["p1", "p2", "p1", "p3"], list)).toEqual(["FISH", "CORAL"])
    expect(list).toHaveBeenCalledTimes(1)
    expect(list).toHaveBeenCalledWith(["p1", "p2", "p3"])
  })

  // MI PIROSÍT: ha egy rekord nélküli vagy fajta nélküli termék kitalált fajtát kapna
  it("a product with no kind adds nothing", async () => {
    expect(await livestockKindsOf(async () => ["p1"], async () => [{}, { livestock_kind: null }])).toEqual([])
  })

  // MI PIROSÍT: ha a hiba a levelet is visszatartaná (a rendelés visszaigazolása fontosabb a szakasznál), vagy ha némán nyelné el
  it("a failed list read gives no kinds, and says so in the log, instead of holding the mail back", async () => {
    const warn = jest.fn()
    const kinds = await livestockKindsOf(
      async () => ["p1"],
      async () => {
        throw new Error("db down")
      },
      warn
    )
    expect(kinds).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain("db down")
  })

  // MI PIROSÍT: ha a termék-azonosítók olvasása a védelmen kívül állna (az első változatomban a modul feloldása így állt)
  it("a failed read of the order's products is guarded too", async () => {
    const warn = jest.fn()
    const list = jest.fn(async () => [])
    const kinds = await livestockKindsOf(
      async () => {
        throw new Error("order gone")
      },
      list,
      warn
    )
    expect(kinds).toEqual([])
    expect(list).not.toHaveBeenCalled()
    expect(warn.mock.calls[0][0]).toContain("order gone")
  })
})

describe("the Medusa side of the livestock kinds", () => {
  const scope = (resolve: (key: string) => unknown) => ({ resolve }) as never

  // MI PIROSÍT: ha a hiányzó modul kivételként a levélküldésig jutna (ez történt a státusz-levél tesztekben az első változattal)
  it("an unresolvable module gives no kinds and never throws", async () => {
    const warn = jest.fn()
    const query = { graph: async () => ({ data: [{ id: "order_1", items: [{ product_id: "p1" }] }] }) }
    const container = scope((key) => {
      if (key === "query") return query
      if (key === "logger") return { warn }
      throw new Error(`unexpected resolve ${key}`)
    })
    await expect(livestockKindsOfOrder(container, "order_1")).resolves.toEqual([])
    expect(warn.mock.calls[0][0]).toContain("Order order_1")
    expect(warn.mock.calls[0][0]).toContain("unexpected resolve shipping_attributes")
  })

  it("reads the kinds of the order's products from the shipping attributes", async () => {
    const list = jest.fn(async () => [{ livestock_kind: "INVERTEBRATE" }, { livestock_kind: "FISH" }])
    const query = {
      graph: jest.fn(async () => ({ data: [{ id: "order_1", items: [{ product_id: "p1" }, null, { product_id: "p2" }] }] })),
    }
    const container = scope((key) => {
      if (key === "query") return query
      if (key === "shipping_attributes") return { listShippingAttributes: list }
      throw new Error(`unexpected resolve ${key}`)
    })
    await expect(livestockKindsOfOrder(container, "order_1")).resolves.toEqual(["FISH", "INVERTEBRATE"])
    expect(list).toHaveBeenCalledWith({ product_id: ["p1", "p2"] })
    expect(query.graph).toHaveBeenCalledWith(expect.objectContaining({ filters: { id: "order_1" } }))
  })

  it("a logger that cannot be resolved does not turn a read failure into a thrown one", async () => {
    const query = { graph: async () => ({ data: [{ id: "order_1", items: [{ product_id: "p1" }] }] }) }
    const container = scope((key) => {
      if (key === "query") return query
      throw new Error(`unexpected resolve ${key}`)
    })
    await expect(livestockKindsOfOrder(container, "order_1")).resolves.toEqual([])
  })
})
