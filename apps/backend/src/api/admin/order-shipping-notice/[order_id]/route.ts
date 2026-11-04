import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import type { Logger } from "@medusajs/framework/types";

import { shippedMailOperations } from "../../../../workflows/utils/webshop-mail/operations";
import { deliverShopMail } from "../../../../workflows/utils/webshop-mail/deliver";
import { saveShippingTracking } from "../../../../workflows/utils/order-tracking";
import { prepareShippedMail } from "../../../../workflows/utils/webshop-mail/shipped";
import { AdminOrderShippingNoticeType } from "../validators";

/**
 * POST /admin/order-shipping-notice/:order_id
 *
 * The OS calls this when the parcel exists at the carrier (its order page's
 * "Csomag" step), for the shipped order only. The shop then sends the
 * "Feladtuk a csomagodat" mail (Figma 488:109 / 488:131 / 488:150), if its
 * mail channel is on. The tracking data is also stored on the order's metadata (three keys of
 * ours, `order-tracking.ts`) for the order page; a failed store is logged and never stops the
 * mail. See `shipped.ts`.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminOrderShippingNoticeType>,
  res: MedusaResponse,
) => {
  const { order_id } = req.params;
  const notice = req.validatedBody;
  const result = await prepareShippedMail(
    order_id,
    notice,
    shippedMailOperations(req.scope),
  );

  if (result.status === "not_found") {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${order_id} was not found`,
    );
  }
  // the order page's tracking (V1.1): stored whatever the mail does; a STUB- number is never stored
  try {
    await saveShippingTracking(
      req.scope,
      order_id,
      notice,
      req.auth_context?.actor_id ?? "system",
    );
  } catch (error) {
    req.scope
      .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      .warn(
        `Order ${order_id}: the tracking data was not stored (${error instanceof Error ? error.message : "unknown error"}).`,
      );
  }
  if (result.status === "skip") {
    res.json({ sent: false, reason: result.reason });
    return;
  }

  const delivery = await deliverShopMail(req.scope, result.mail);
  if (!delivery.sent) {
    // the OS renders the mail later (Levélsablonok outbox); the parcel stands
    res.json({ sent: false, reason: "queued", message: delivery.reason });
    return;
  }
  req.scope
    .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    .info(
      `Order ${order_id}: shipping mail sent (${notice.carrier}${notice.parcel_id ? `, OS parcel ${notice.parcel_id}` : ""}).`,
    );
  res.json({ sent: true });
};
