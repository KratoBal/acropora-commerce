import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import {
  describeMissingShippingOptions,
  describeUncheckableShippingOptions,
  verifyShippingOptionRoles,
} from "../workflows/utils/verify-shipping-option-roles"

/**
 * DO THE SIX SHIPPING OPTION IDS ACTUALLY EXIST? THE CHECK, WHERE IT CAN RUN.
 *
 * === WHY THIS MOVED OUT OF THE MODULE LOADER, MEASURED ===
 *
 * The same check used to live in `modules/commerce-settings/loaders`. It never
 * ran once, in any environment, and it said so on every single start:
 *
 *   FIGYELEM: a szállítási módok azonosítóit NEM tudtam ellenőrizni indításkor.
 *   Az ok: Could not resolve 'query'.
 *
 * That was not an environment fault. `runLoaders` in @medusajs/modules-sdk
 * hands a module loader `container: localContainer` - the MODULE's own
 * container - while `query` is registered on the APP container once every
 * module has loaded. A module loader therefore cannot resolve `query`, ever,
 * and no configuration can change that.
 *
 * The old placement was worse than no check at all: it printed a warning on
 * every start, which reads like a transient problem, and the warning arrived
 * so reliably that it stopped being read.
 *
 * === WHY AN EXEC SCRIPT IN THE ENTRYPOINT ===
 *
 * `medusa exec` boots the app container, so `query` is there - measured four
 * times on 2026-09-03, when the seed and the shipping-rules script both queried
 * happily in the same process that printed the warning above.
 *
 * The entrypoint already refuses to start the server when the migrations fail,
 * for the same reason this refuses: a shop that serves requests on a broken
 * configuration is worse than one that does not come up.
 *
 * === WHAT THIS DOES NOT DO ===
 *
 * It does not check that pricing works, that a checkout completes, or that the
 * rules are right. It answers one question: do the six bound ids exist in THIS
 * database. That question is the one that fails silently.
 */
export default async function verifyShippingOptionRolesScript({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // THE TWO FAILURES STAY SEPARATE, AND THIS IS NOT TIDINESS.
  //
  // "This id does not exist" must stop the start. "I could not look" must NOT:
  // a shop stopped because its GUARD broke is worse than one started without
  // the guard, and that asymmetry was written down when the check was born.
  //
  // Moving the check into the entrypoint nearly lost it, because `set -e` turns
  // EVERY non-zero exit into a refusal. So the distinction has to live here: an
  // unreadable database exits zero and says so loudly; a missing id throws.
  let ids: string[]
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "shipping_option",
      fields: ["id"],
    })
    ids = (data ?? []).map((row: { id: string }) => row.id)
  } catch (error) {
    logger.warn(
      describeUncheckableShippingOptions(
        error instanceof Error ? error.message : String(error),
      ),
    )
    return
  }

  const verification = verifyShippingOptionRoles(ids)

  if (verification.missing.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      describeMissingShippingOptions(verification),
    )
  }

  // THE SUCCESS LINE IS NOT DECORATION. Without it a passing check looks
  // exactly like a check that never ran - which is precisely the state this
  // whole file exists to end.
  logger.info(
    `A szállítási módok azonosítói rendben: ${verification.checked} kötés, ` +
      `mind a ${verification.checked} megtalálható ebben az adatbázisban.`,
  )
}
