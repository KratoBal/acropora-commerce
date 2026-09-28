import { MedusaAppLoader } from "@medusajs/framework"
import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import {
  describePendingLinkActions,
  pendingLinkActions,
} from "../workflows/utils/pending-link-actions"

/**
 * Run by the entrypoint after `db:migrate --execute-safe-links`. Asks Medusa
 * for the link sync plan again - the same planner `db:sync-links` uses
 * (`MedusaAppLoader.getLinksExecutionPlanner`) - and refuses the start if
 * anything is still pending. See `pending-link-actions.ts` for why.
 *
 * A failure to build the plan is NOT swallowed: `db:migrate` builds the same
 * plan a moment earlier, so if it cannot be built here, something is wrong
 * that a silent start would hide.
 */
export default async function verifyLinksInSync({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const planner = await new MedusaAppLoader().getLinksExecutionPlanner()
  const pending = pendingLinkActions(await planner.createPlan())

  if (pending.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      describePendingLinkActions(pending)
    )
  }

  logger.info("A link-táblák egyeznek a kóddal.")
}
