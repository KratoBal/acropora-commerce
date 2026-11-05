import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

import { GlsPickupPointsService } from "../../../../services/gls-pickup-points";
import { cartIsShopOnly } from "../../../../workflows/utils/locker-rule";
import { glsPointOptionOf } from "../../../../workflows/utils/shipping-option-roles";
import { StoreGetGlsPickupPointsParamsType } from "./validators";

const glsPickupPoints = new GlsPickupPointsService();

/** Only the three line fields the shipping class reads; an unknown cart has no lines. */
const loadCartItems = async (req: MedusaRequest<unknown>, cartId: string) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["id", "items.id", "items.variant_id", "items.requires_shipping"],
  });
  return { items: (data?.[0]?.items ?? []) as never[] };
};

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
  const { q, option_id, limit, include_unavailable, cart_id } =
    req.validatedQuery as StoreGetGlsPickupPointsParamsType;
  const option = glsPointOptionOf(option_id);

  if (!option) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This shipping option does not go to a GLS pickup point",
    );
  }

  // The search is a convenience: the shipping method and the completion check
  // the same rule, so a cart id left out only shows points that will be refused.
  const shopOnly =
    option.heavy ||
    (cart_id ? await cartIsShopOnly(await loadCartItems(req, cart_id), req.scope) : false);

  const answer = await glsPickupPoints.searchPickupPoints({
    query: q,
    heavy: shopOnly,
    limit,
    includeUnavailable: include_unavailable === "true",
  });

  res.status(answer.available ? 200 : 503).json(answer);
};
