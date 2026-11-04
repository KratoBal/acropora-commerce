import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { guestOrderOperations } from "../../../../workflows/utils/guest-order/operations";
import { lookupGuestOrders } from "../../../../workflows/utils/guest-order/lookup";
import type { StorePostGuestOrderLookupType } from "./validators";

/**
 * POST /store/guest-orders/lookup
 *
 * The guest order page (V1.1): the order number and the e-mail address the customer ordered with
 * answer with the order, and with the other order of the same cart when the cart was split (a
 * mixed cart is two orders). EVERY miss is ONE answer, 404 "Nem találtuk a rendelést.": no such
 * order, a wrong address and a malformed number cannot be told apart, so the route does not say
 * which order numbers exist. The attempt limits are the middleware's (`attempt-limits.ts`: per
 * address AND per order number, 429 above). The answer never carries the e-mail address, a name,
 * a phone number or a home address (`lookup.ts`).
 */
export const POST = async (
  req: MedusaRequest<StorePostGuestOrderLookupType>,
  res: MedusaResponse,
) => {
  const { order_number, email } = req.validatedBody;
  const orders = await lookupGuestOrders(
    { displayId: Number(order_number.replace(/^#/, "")), email },
    guestOrderOperations(req.scope),
  );
  if (!orders) {
    res.status(404).json({ message: "Nem találtuk a rendelést." });
    return;
  }
  res.json({ orders });
};
