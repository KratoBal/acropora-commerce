import type { LinkMigrationsPlannerAction } from "@medusajs/framework/types"

import {
  describePendingLinkActions,
  pendingLinkActions,
} from "../pending-link-actions"

const descriptor = {
  fromModule: "product",
  toModule: "inventory",
  fromModel: "variant",
  toModel: "inventory",
}

const action = (
  kind: LinkMigrationsPlannerAction["action"],
  tableName: string
): LinkMigrationsPlannerAction =>
  (kind === "noop" || kind === "delete"
    ? { action: kind, tableName, linkDescriptor: descriptor }
    : {
        action: kind,
        tableName,
        linkDescriptor: descriptor,
        sql: "select 1",
      }) as LinkMigrationsPlannerAction

describe("pendingLinkActions", () => {
  it("passes an in-sync plan: only noop actions", () => {
    expect(
      pendingLinkActions([action("noop", "a"), action("noop", "b")])
    ).toEqual([])
  })

  /**
   * THE MEASURED CASE (stage, 2026-09-28): the 2.20.1 upgrade changed
   * `required_quantity` on product_variant_inventory_item from integer to
   * numeric, which the planner reports as `notify` - the kind the safe sync
   * silently drops. It must come back as pending.
   */
  it("keeps what the safe sync drops: notify and delete", () => {
    const pending = pendingLinkActions([
      action("noop", "a"),
      action("notify", "product_variant_inventory_item"),
      action("delete", "old_link"),
    ])

    expect(pending.map((p) => [p.action, p.tableName])).toEqual([
      ["notify", "product_variant_inventory_item"],
      ["delete", "old_link"],
    ])
  })

  it("keeps a create or update the safe sync should have executed, as a surprise", () => {
    expect(
      pendingLinkActions([action("create", "c"), action("update", "u")])
    ).toHaveLength(2)
  })
})

describe("describePendingLinkActions", () => {
  it("names every table and the command that resolves it", () => {
    const text = describePendingLinkActions([
      action("notify", "product_variant_inventory_item"),
    ])

    expect(text).toContain(
      "notify: product <> inventory (product_variant_inventory_item)"
    )
    expect(text).toContain("npx medusa db:sync-links --execute-all")
    expect(text).toContain("ADATBÁZIS-MENTÉS UTÁN")
  })
})
