import type { LinkMigrationsPlannerAction } from "@medusajs/framework/types"

/**
 * WHAT THE LINK SYNC LEFT UNDONE, AND WHY IT HAS TO BE SAID OUT LOUD.
 *
 * `medusa db:migrate` syncs the module-link tables after the migrations, and a
 * link change that is not purely additive ("notify": an altered column, or
 * "delete": a removed link) makes it ASK - an interactive checkbox. In a
 * container nobody answers, so on 2026-09-28 the stage backend waited on that
 * question after the 2.20.1 upgrade and never started (product_variant <>
 * inventory_item, `required_quantity` integer -> numeric).
 *
 * The entrypoint therefore runs `--execute-safe-links`, which never asks. But
 * that flag DROPS the notify and delete actions without a word (measured in
 * @medusajs/medusa 2.20.1, `dist/commands/db/sync-links.js`, `syncLinks`: the
 * arrays are emptied, nothing is logged). The code would then run against a
 * link table in the old shape. Closing stdin is no substitute either: the
 * checkbox (@inquirer/checkbox 2.5.0) does not reject on a closed stdin, it
 * keeps waiting - measured, still waiting after 10 s.
 *
 * So after the safe sync, the plan is asked for again, and anything left in it
 * stops the start - loudly, with the table names and the command that
 * resolves it. Creates and safe updates are what the safe sync executes, so
 * any of those still pending is a surprise too, and counts.
 */
export const pendingLinkActions = (
  plan: LinkMigrationsPlannerAction[]
): LinkMigrationsPlannerAction[] =>
  plan.filter((action) => action.action !== "noop")

const describeAction = (action: LinkMigrationsPlannerAction): string => {
  const { fromModule, toModule } = action.linkDescriptor
  return `  ${action.action}: ${fromModule} <> ${toModule} (${action.tableName})`
}

export const describePendingLinkActions = (
  pending: LinkMigrationsPlannerAction[]
): string =>
  [
    `A link-táblák NEM egyeznek a kóddal: ${pending.length} függő művelet, ` +
      "amit a biztonságos szinkron szándékosan nem hajtott végre.",
    ...pending.map(describeAction),
    "A szerver ezért nem indul el: a kód a régi alakú táblán futna.",
    "Teendő, ADATBÁZIS-MENTÉS UTÁN, kézzel, ebben a konténerben:",
    "  npx medusa db:sync-links --execute-all",
  ].join("\n")
