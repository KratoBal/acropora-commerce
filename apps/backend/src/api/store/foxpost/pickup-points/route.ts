import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { FoxpostPickupPointsService } from "../../../../services/foxpost-pickup-points";
import { StoreGetFoxpostPickupPointsParamsType } from "./validators";

const foxpostPickupPoints = new FoxpostPickupPointsService();

/**
 * GET /store/foxpost/pickup-points
 *
 * Without `q`: the whole directory, as before. With `q`: at most `limit`
 * matching points (postcode prefix, or every word in the name, city or
 * address) and the total match count, for the checkout pickup-point picker.
 */
export const GET = async (
  req: MedusaRequest<unknown, StoreGetFoxpostPickupPointsParamsType>,
  res: MedusaResponse,
) => {
  const { q, limit } = (req.validatedQuery ??
    {}) as Partial<StoreGetFoxpostPickupPointsParamsType>;

  const answer = q
    ? await foxpostPickupPoints.searchPickupPoints({ query: q, limit })
    : await foxpostPickupPoints.getAvailability();

  const status =
    answer.available || answer.reason === "missing_configuration" ? 200 : 503;

  res.status(status).json(answer);
};
