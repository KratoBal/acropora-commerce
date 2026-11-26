import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  OMNIBUS_LINE_KEY,
  planOmnibusSnapshots,
  snapshotOmnibusReferences,
} from "../omnibus-line-snapshot"

const REF = JSON.stringify({
  amount: "5100",
  currency: "huf",
  complete: true,
  history_begins: "2026-09-01",
  reduction_start: "2026-11-19",
})
const OTHER = JSON.stringify({
  amount: "6000",
  currency: "huf",
  complete: true,
  history_begins: "2026-09-01",
  reduction_start: "2026-11-25",
})

/**
 * THE OMNIBUS REFERENCE KEPT ON THE CART LINE (card 90c54873, acrobot 62358): a placed order shows the state it was bought under,
 * not the live variant's. What must fail: a line that does not get its variant's text; a variant without the key leaving the old
 * copy on the line (an ended reduction shown on a new order); the line's other metadata lost; a line that is already right being
 * written again; a failing read or write breaking the cart operation; the copy not being wired into the cart refresh.
 */
describe("planOmnibusSnapshots", () => {
  it("copies the variant's text onto a line that has none, keeping the line's other metadata", () => {
    expect(
      planOmnibusSnapshots([
        {
          id: "li_1",
          metadata: { gift: "yes" },
          variant: { metadata: { [OMNIBUS_LINE_KEY]: REF, other: 1 } },
        },
      ])
    ).toEqual([
      { id: "li_1", metadata: { gift: "yes", [OMNIBUS_LINE_KEY]: REF } },
    ])
  })

  it("replaces a copy that no longer matches the variant", () => {
    expect(
      planOmnibusSnapshots([
        {
          id: "li_1",
          metadata: { [OMNIBUS_LINE_KEY]: REF },
          variant: { metadata: { [OMNIBUS_LINE_KEY]: OTHER } },
        },
      ])
    ).toEqual([{ id: "li_1", metadata: { [OMNIBUS_LINE_KEY]: OTHER } }])
  })

  it("takes the key off a line whose variant no longer has it, and keeps the rest", () => {
    for (const variant of [
      { metadata: {} },
      { metadata: { [OMNIBUS_LINE_KEY]: "" } },
      { metadata: null },
      null,
    ]) {
      expect(
        planOmnibusSnapshots([
          {
            id: "li_1",
            metadata: { [OMNIBUS_LINE_KEY]: REF, gift: "yes" },
            variant,
          },
        ])
      ).toEqual([{ id: "li_1", metadata: { gift: "yes" } }])
    }
  })

  it("writes nothing for a line that is already right (with or without a reduction)", () => {
    expect(
      planOmnibusSnapshots([
        {
          id: "li_1",
          metadata: { [OMNIBUS_LINE_KEY]: REF },
          variant: { metadata: { [OMNIBUS_LINE_KEY]: REF } },
        },
        { id: "li_2", metadata: null, variant: { metadata: {} } },
        { id: "li_3", variant: null },
      ])
    ).toEqual([])
  })

  it("skips a line without an id and plans each line on its own", () => {
    expect(
      planOmnibusSnapshots([
        { metadata: null, variant: { metadata: { [OMNIBUS_LINE_KEY]: REF } } },
        {
          id: "li_a",
          metadata: null,
          variant: { metadata: { [OMNIBUS_LINE_KEY]: REF } },
        },
        { id: "li_b", metadata: null, variant: { metadata: {} } },
      ])
    ).toEqual([{ id: "li_a", metadata: { [OMNIBUS_LINE_KEY]: REF } }])
    expect(planOmnibusSnapshots(null)).toEqual([])
    expect(planOmnibusSnapshots(undefined)).toEqual([])
  })
})

describe("snapshotOmnibusReferences", () => {
  const containerWith = (
    cart: unknown,
    opts: { failGraph?: boolean; failUpdate?: boolean } = {}
  ) => {
    const graph = jest.fn(async () => {
      if (opts.failGraph) {
        throw new Error("graph down")
      }
      return { data: cart ? [cart] : [] }
    })
    const updateLineItems = jest.fn(async () => {
      if (opts.failUpdate) {
        throw new Error("write refused")
      }
      return []
    })
    const container = {
      resolve: (key: string) =>
        key === "query" ? { graph } : { updateLineItems },
    }
    return { container, graph, updateLineItems }
  }
  const logger = () => ({ error: jest.fn() })

  it("reads the lines with their variants' metadata and writes the planned copies in one call", async () => {
    const { container, graph, updateLineItems } = containerWith({
      id: "cart_1",
      items: [
        {
          id: "li_1",
          metadata: null,
          variant: { metadata: { [OMNIBUS_LINE_KEY]: REF } },
        },
        { id: "li_2", metadata: null, variant: { metadata: {} } },
      ],
    })
    await snapshotOmnibusReferences("cart_1", container, logger())
    expect(graph).toHaveBeenCalledWith({
      entity: "cart",
      filters: { id: "cart_1" },
      fields: ["id", "items.id", "items.metadata", "items.variant.metadata"],
    })
    expect(updateLineItems).toHaveBeenCalledTimes(1)
    expect(updateLineItems).toHaveBeenCalledWith([
      { id: "li_1", metadata: { [OMNIBUS_LINE_KEY]: REF } },
    ])
  })

  it("does not write when every line is right, or when the cart is gone", async () => {
    const right = containerWith({
      id: "cart_1",
      items: [
        {
          id: "li_1",
          metadata: { [OMNIBUS_LINE_KEY]: REF },
          variant: { metadata: { [OMNIBUS_LINE_KEY]: REF } },
        },
      ],
    })
    await snapshotOmnibusReferences("cart_1", right.container, logger())
    expect(right.updateLineItems).not.toHaveBeenCalled()
    const gone = containerWith(null)
    await snapshotOmnibusReferences("cart_x", gone.container, logger())
    expect(gone.updateLineItems).not.toHaveBeenCalled()
  })

  it("never throws: a failing read or write is logged with the cart, the operation goes on", async () => {
    for (const opts of [{ failGraph: true }, { failUpdate: true }]) {
      const { container } = containerWith(
        {
          id: "cart_1",
          items: [
            {
              id: "li_1",
              metadata: null,
              variant: { metadata: { [OMNIBUS_LINE_KEY]: REF } },
            },
          ],
        },
        opts
      )
      const log = logger()
      await expect(
        snapshotOmnibusReferences("cart_1", container, log)
      ).resolves.toBeUndefined()
      expect(log.error).toHaveBeenCalledTimes(1)
      expect(log.error.mock.calls[0][0]).toContain("cart_1")
    }
  })
})

describe("the cart refresh runs the copy", () => {
  it("the refresh hook calls snapshotOmnibusReferences, after the credit caps and with the cart id", () => {
    // the hook cannot run without a Medusa runtime here; what is checked is that the call stands in the one handler Medusa allows
    const source = readFileSync(
      join(__dirname, "../../hooks/refresh-cart-items-cod-fee.ts"),
      "utf8"
    )
    const loyalty = source.indexOf(
      "await capLoyaltyCredit(cartId, container, logger)"
    )
    const snapshot = source.indexOf(
      "await snapshotOmnibusReferences(cartId, container, logger)"
    )
    expect(loyalty).toBeGreaterThan(-1)
    expect(snapshot).toBeGreaterThan(loyalty)
  })
})
