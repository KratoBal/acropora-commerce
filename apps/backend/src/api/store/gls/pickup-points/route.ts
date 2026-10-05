import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { GlsPickupPointsService } from "../../../../services/gls-pickup-points";
import { glsPointOptionOf } from "../../../../workflows/utils/shipping-option-roles";
import { StoreGetGlsPickupPointsParamsType } from "./validators";

const glsPickupPoints = new GlsPickupPointsService();

/**
 * GET /store/gls/pickup-points?q=…&option_id=…&limit=…
 *
 * The GLS points a shipping option may use, searched the same way as Foxpost's
 * (`pickup-point-search.ts`). The option decides the rule, not a flag from the
 * browser: the heavy-goods option offers parcel shops only.
 */
export const GET = async (
  req: MedusaRequest<unknown, StoreGetGlsPickupPointsParamsType>,
  res: MedusaResponse,
) => {
  const { q, option_id, limit, include_unavailable } =
    req.validatedQuery as StoreGetGlsPickupPointsParamsType;
  const option = glsPointOptionOf(option_id);

  if (!option) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This shipping option does not go to a GLS pickup point",
    );
  }

  const answer = await glsPickupPoints.searchPickupPoints({
    query: q,
    heavy: option.heavy,
    limit,
    includeUnavailable: include_unavailable === "true",
  });

  res.status(answer.available ? 200 : 503).json(answer);
};
