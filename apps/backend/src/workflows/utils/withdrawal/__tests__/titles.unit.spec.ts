import { withdrawalLineTitles } from "../titles"

/*
  WHAT TURNS THIS RED (V0.3, the acknowledgement's titles). A title written differently from the order mail's line (the
  variant dropped or always added); the titles not in the order of the ids; another order's line, or a line the order does
  not show, getting a title; a blank title listed; the query asking for more than the one order; a failed read throwing (the
  acknowledgement is a legal one and must go out without the titles) or logging more than the order id and the error's kind.
*/
const order = {
  id: "order_1",
  items: [
    { id: "item_1", title: "Variant default", product_title: "Kék korall", variant_title: "Default Title" },
    { id: "item_2", title: "20 kg", product_title: "Tengeri só", variant_title: "20 kg" },
    { id: "item_3", title: "", product_title: "", variant_title: "" },
    null,
  ],
}

function fakeContainer(data: unknown, options: { throws?: unknown; noLogger?: boolean } = {}) {
  const graph = jest.fn(async () => {
    if (options.throws) throw options.throws
    return { data }
  })
  const warn = jest.fn()
  const container = {
    resolve: (key: string) => {
      if (key === "query") return { graph }
      if (key === "logger") {
        if (options.noLogger) throw new Error("no logger")
        return { warn }
      }
      throw new Error(`unexpected ${key}`)
    },
  } as never
  return { container, graph, warn }
}

describe("withdrawalLineTitles", () => {
  it("returns the lines' titles in the order of the ids, written like the order mail writes a line", async () => {
    const f = fakeContainer([order])
    expect(await withdrawalLineTitles(f.container, "order_1", ["item_2", "item_1"])).toEqual([
      "Tengeri só (20 kg)",
      "Kék korall",
    ])
  })

  it("leaves out a line the order does not show and one with no title", async () => {
    const f = fakeContainer([order])
    expect(await withdrawalLineTitles(f.container, "order_1", ["item_1", "item_9", "item_3"])).toEqual(["Kék korall"])
  })

  it("asks for the one order and only the title fields", async () => {
    const f = fakeContainer([order])
    await withdrawalLineTitles(f.container, "order_1", ["item_1"])
    expect(f.graph).toHaveBeenCalledWith({
      entity: "order",
      filters: { id: "order_1" },
      fields: ["id", "items.id", "items.title", "items.product_title", "items.variant_title"],
    })
  })

  it("is empty for another order than the one asked, no order, or nothing to name, without asking the shop", async () => {
    expect(await withdrawalLineTitles(fakeContainer([{ ...order, id: "order_2" }]).container, "order_1", ["item_1"])).toEqual([])
    expect(await withdrawalLineTitles(fakeContainer([]).container, "order_1", ["item_1"])).toEqual([])
    const f = fakeContainer([order])
    expect(await withdrawalLineTitles(f.container, "order_1", [])).toEqual([])
    expect(await withdrawalLineTitles(f.container, "", ["item_1"])).toEqual([])
    expect(f.graph).not.toHaveBeenCalled()
  })

  it("never throws: a failed read is an empty list, the log has the order id and the error's kind only", async () => {
    const error = Object.assign(new Error("secret address vevo@example.hu"), { name: "QueryFailed" })
    const f = fakeContainer([order], { throws: error })
    expect(await withdrawalLineTitles(f.container, "order_1", ["item_1"])).toEqual([])
    expect(f.warn).toHaveBeenCalledTimes(1)
    const line = String(f.warn.mock.calls[0][0])
    expect(line).toContain("order_1")
    expect(line).toContain("QueryFailed")
    expect(line).not.toContain("vevo@example.hu")
    // no logger either: still no throw
    const bare = fakeContainer([order], { throws: error, noLogger: true })
    expect(await withdrawalLineTitles(bare.container, "order_1", ["item_1"])).toEqual([])
  })
})
