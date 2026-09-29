import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { glsPointOptions } from "../../../workflows/utils/shipping-option-roles";

/**
 * GET /store/gls
 *
 * Which shipping options go to a GLS pickup point, and which of them is for
 * heavy goods (P4). The checkout needs this BEFORE a click: such a method is
 * refused without a point, so it opens the picker instead. The binding table
 * lives here; the option objects do not carry it.
 */
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({ options: glsPointOptions() });
};
