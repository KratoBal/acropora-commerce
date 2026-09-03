import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import type { LoaderOptions } from "@medusajs/framework/types";

import {
  describeMissingShippingOptions,
  describeUncheckableShippingOptions,
  verifyShippingOptionRoles,
} from "../../../workflows/utils/verify-shipping-option-roles";

/**
 * STARTUP CHECK: do the six bound shipping option ids exist in THIS database?
 *
 * === WHAT MEDUSA DOES WITH A THROWING LOADER, MEASURED ===
 *
 * `moduleLoader` in @medusajs/modules-sdk logs "Could not resolve module" and
 * RETHROWS - the boot stops. That is exactly the behaviour we want for a missing
 * id, and exactly the behaviour we must NOT have when the check itself cannot
 * run: a shop stopped because its GUARD failed is worse than one started without
 * the guard.
 *
 * So the two paths are deliberately asymmetric:
 *
 *   the query fails      -> caught here, logged loudly, boot CONTINUES
 *   an id does not exist -> thrown, boot STOPS with instructions
 *
 * === THE LOG LINE ON SUCCESS IS NOT DECORATION ===
 *
 * Without it, a passing check is indistinguishable from a check that never ran.
 * This repo has been bitten by exactly that twice in one morning: a rule present
 * in a config that no agent could reach, and an offline read path sitting behind
 * a gate that shuts first. The code being there is not evidence that it fires.
 */
export default async function verifyShippingOptionRolesLoader({
  container,
}: LoaderOptions): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  let ids: string[];
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "shipping_option",
      fields: ["id"],
    });
    ids = (data ?? []).map((row: { id: string }) => row.id);
  } catch (error) {
    logger.warn(
      describeUncheckableShippingOptions(
        error instanceof Error ? error.message : String(error),
      ),
    );
    return;
  }

  const verification = verifyShippingOptionRoles(ids);
  if (verification.missing.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      describeMissingShippingOptions(verification),
    );
  }

  logger.info(
    `A szállítási módok azonosítói rendben: ${verification.checked} kötés, ` +
      `mind a ${verification.checked} megtalálható ebben az adatbázisban.`,
  );
}
