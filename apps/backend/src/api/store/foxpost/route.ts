import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { FoxpostPickupPointsService } from "../../../services/foxpost-pickup-points";
import { resolveShippingOptionRoleBindings } from "../../../workflows/utils/shipping-option-roles";

const foxpostPickupPoints = new FoxpostPickupPointsService();

/**
 * GET /store/foxpost
 *
 * Which shipping option is the Foxpost one, and whether it can be chosen now
 * (P4). The checkout needs to know this BEFORE the customer clicks: a Foxpost
 * method is refused without a pickup point, so the storefront shows the
 * picker instead of setting the method. The role table lives here, not in the
 * storefront, and the option objects do not carry it.
 */
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const binding = resolveShippingOptionRoleBindings().find(
    ({ role }) => role === "FOXPOST",
  );
  const availability = await foxpostPickupPoints.getAvailability();

  res.json({
    option_id: binding?.id ?? null,
    available: availability.available,
  });
};
