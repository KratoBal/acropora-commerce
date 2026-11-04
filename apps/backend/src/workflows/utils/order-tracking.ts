import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import { updateOrderWorkflow } from "@medusajs/medusa/core-flows";

import { isStubParcelNumber } from "./webshop-mail/shipped";

/**
 * THE PARCEL'S TRACKING DATA ON THE ORDER (V1.1, the guest order page).
 *
 * The OS tells the shop about a parcel through the shipping-notice endpoint, and until now the shop
 * only mailed it ("Nothing is written on the order"). The order page a customer opens later (also a
 * guest, `store/guest-orders`) has nothing to show then, and the shipped mail is the only place the
 * number lives. So the notice also stores it, in three flat keys of ours on the order's metadata:
 *
 *   acropora_tracking_carrier   foxpost | gls (as the notice names it)
 *   acropora_tracking_number    the carrier's parcel number
 *   acropora_tracking_url       the link the carrier/OS gave, or absent: the shop never builds one
 *
 * A NEW NUMBER REPLACES THE OLD (a relabelled parcel); the same data again writes nothing. A `STUB-`
 * number (the OS's stand-in carrier) is never stored: it is not a parcel. Only these three keys are
 * touched, never the rest of the metadata (the notes, the language, the terms record).
 */
export const TRACKING_CARRIER_KEY = "acropora_tracking_carrier" as const;
export const TRACKING_NUMBER_KEY = "acropora_tracking_number" as const;
export const TRACKING_URL_KEY = "acropora_tracking_url" as const;

export type TrackingNotice = {
  carrier: string;
  tracking_number: string;
  tracking_url?: string | null;
};

export type StoredTracking = {
  carrier: string;
  number: string;
  url: string | null;
};

/** The tracking an order's metadata carries, or null (no number, or not a text). */
export const trackingOf = (
  metadata: Record<string, unknown> | null | undefined,
): StoredTracking | null => {
  const number = metadata?.[TRACKING_NUMBER_KEY];
  const carrier = metadata?.[TRACKING_CARRIER_KEY];
  if (
    typeof number !== "string" ||
    number.trim() === "" ||
    typeof carrier !== "string" ||
    carrier === ""
  )
    return null;
  const url = metadata?.[TRACKING_URL_KEY];
  return {
    carrier,
    number,
    url: typeof url === "string" && url !== "" ? url : null,
  };
};

/**
 * The metadata after the notice, or null when nothing changes (a stub number, or the same data).
 * Only the three keys are set or removed; an absent link removes a link that an older notice stored.
 */
export const withTracking = (
  metadata: Record<string, unknown> | null | undefined,
  notice: TrackingNotice,
): Record<string, unknown> | null => {
  const number = notice.tracking_number.trim();
  if (number === "" || isStubParcelNumber(number)) return null;
  const url = notice.tracking_url?.trim() || null;
  const current = trackingOf(metadata);
  if (
    current &&
    current.carrier === notice.carrier &&
    current.number === number &&
    current.url === url
  )
    return null;
  const next: Record<string, unknown> = { ...(metadata ?? {}) };
  next[TRACKING_CARRIER_KEY] = notice.carrier;
  next[TRACKING_NUMBER_KEY] = number;
  if (url) next[TRACKING_URL_KEY] = url;
  else delete next[TRACKING_URL_KEY];
  return next;
};

export type SaveTrackingResult = "saved" | "unchanged" | "not_found";

export const saveShippingTracking = async (
  container: MedusaContainer,
  orderId: string,
  notice: TrackingNotice,
  /** The admin caller: Medusa records the change (old and new metadata) under this id. */
  userId: string,
): Promise<SaveTrackingResult> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId },
    fields: ["id", "metadata"],
  });
  const order = data?.[0] as
    { id: string; metadata?: Record<string, unknown> | null } | undefined;
  if (!order) return "not_found";
  const metadata = withTracking(order.metadata, notice);
  if (!metadata) return "unchanged";
  await updateOrderWorkflow(container).run({
    input: { id: orderId, metadata, user_id: userId },
  });
  return "saved";
};
