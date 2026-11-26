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
 * copy on the line (an ended reduction shown on a new order); the update carrying more than its own key (the cart module MERGES metadata, so a copy of the rest overwrites a key written meanwhile); a removal that sends nothing instead of the empty text (in a merge only \"\" deletes a key); a line that is already right being
 * written again; a failing read or write breaking the cart operation; the copy not being wired into the cart refresh.
 */
describe("planOmnibusSnapshots", () => {
  it("copies the variant's text onto a line that has none, and sends only its own key", () => {
    expect(
      planOmnibusSnapshots([
        {
          id: "li_1",
          metadata: { gift: "yes" },
          variant: { metadata: { [OMNIBUS_LINE_KEY]: REF, other: 1 } },
        },
      ])
    ).toEqual([{ id: "li_1", metadata: { [OMNIBUS_LINE_KEY]: REF } }])
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

  it("takes the key off a line whose variant no longer has it: the update carries the key as an empty text, nothing else", () => {
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
      ).toEqual([{ id: "li_1", metadata: { [OMNIBUS_LINE_KEY]: "" } }])
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

/**
 * THE CART MODULE MERGES (barracuda, #913 CHANGES): `updateLineItems` goes through the internal service's `mergeMetadata`
 * (@medusajs/utils 2.22: a key absent from the update stays, an empty text "" deletes it). The fake below merges the same way, so
 * these tests stand on what the module really does, not on the plan object: the removal must come out of the STORED metadata,
 * the other keys must survive, a key written between the read and the write must not be overwritten, and a second refresh with
 * nothing changed must write nothing.
 */
const mergeLikeMedusa = (
  stored: Record<string, unknown> | null,
  update: Record<string, unknown>
): Record<string, unknown> => {
  const merged = { ...(stored ?? {}) }
  for (const [key, value] of Object.entries(update)) {
    if (value === "") {
      delete merged[key]
      continue
    }
    merged[key] = value
  }
  return merged
}

const mergingContainer = (
  lines: Record<string, { metadata: Record<string, unknown> | null; variantMetadata: Record<string, unknown> | null }>,
  duringRead?: () => void
) => {
  const writes: { id: string; metadata: Record<string, unknown> }[] = []
  const graph = jest.fn(async () => {
    const data = [
      {
        id: "cart_1",
        items: Object.entries(lines).map(([id, line]) => ({
          id,
          metadata: line.metadata === null ? null : { ...line.metadata },
          variant: { metadata: line.variantMetadata },
        })),
      },
    ]
    // someone else writes a key on a line AFTER we read it and BEFORE we write
    duringRead?.()
    return { data }
  })
  const updateLineItems = jest.fn(
    async (data: { id: string; metadata: Record<string, unknown> }[]) => {
      for (const update of data) {
        writes.push(update)
        lines[update.id].metadata = mergeLikeMedusa(lines[update.id].metadata, update.metadata)
      }
      return []
    }
  )
  const container = {
    resolve: (key: string) => (key === "query" ? { graph } : { updateLineItems }),
  }
  return { container, writes }
}

describe("snapshotOmnibusReferences against a module that merges", () => {
  it("sets the key and keeps the line's other metadata", async () => {
    const lines = { li_1: { metadata: { gift: "yes" }, variantMetadata: { [OMNIBUS_LINE_KEY]: REF } } }
    const { container } = mergingContainer(lines)
    await snapshotOmnibusReferences("cart_1", container, { error: jest.fn() })
    expect(lines.li_1.metadata).toEqual({ gift: "yes", [OMNIBUS_LINE_KEY]: REF })
  })

  it("REMOVES the key when the variant lost it: the stored line has no key after the write, the other keys stay", async () => {
    const lines = {
      li_1: { metadata: { gift: "yes", [OMNIBUS_LINE_KEY]: REF }, variantMetadata: {} },
    }
    const { container, writes } = mergingContainer(lines)
    await snapshotOmnibusReferences("cart_1", container, { error: jest.fn() })
    expect(lines.li_1.metadata).toEqual({ gift: "yes" })
    // the input of the write is the empty text and only that key
    expect(writes).toEqual([{ id: "li_1", metadata: { [OMNIBUS_LINE_KEY]: "" } }])
  })

  it("a second refresh with nothing changed writes nothing (the removal does not loop)", async () => {
    const lines = {
      li_1: { metadata: { [OMNIBUS_LINE_KEY]: REF }, variantMetadata: {} },
      li_2: { metadata: null, variantMetadata: { [OMNIBUS_LINE_KEY]: REF } },
    }
    const first = mergingContainer(lines)
    await snapshotOmnibusReferences("cart_1", first.container, { error: jest.fn() })
    expect(first.writes).toHaveLength(2)
    const second = mergingContainer(lines)
    await snapshotOmnibusReferences("cart_1", second.container, { error: jest.fn() })
    expect(second.writes).toEqual([])
  })

  it("does not overwrite a key another writer set between the read and the write", async () => {
    const lines = {
      li_1: { metadata: { [OMNIBUS_LINE_KEY]: REF } as Record<string, unknown> | null, variantMetadata: {} },
    }
    const { container } = mergingContainer(lines, () => {
      lines.li_1.metadata = { ...lines.li_1.metadata, concurrent: "kept" }
    })
    await snapshotOmnibusReferences("cart_1", container, { error: jest.fn() })
    expect(lines.li_1.metadata).toEqual({ concurrent: "kept" })
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
