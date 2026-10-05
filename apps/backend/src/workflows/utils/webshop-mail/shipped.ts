import { webshopMailState } from "../webshop-mail-config"
import type { MailToSend } from "./prepare"
import { type ShippedCarrier, renderShippedMail } from "./shipped-mail"

/**
 * WHEN THE "FELADTUK" MAIL GOES (Foxpost brief point 12; endpoint agreed with
 * nautilus, 26342/26345). The OS calls the shipping-notice endpoint once the
 * parcel exists at the carrier, with the carrier's barcode. The answer says
 * what happened, so the OS can log it:
 *
 *   sent: true                       the mail went out
 *   sent: false, mail_off            the shop's mail channel is off (no key yet)
 *   sent: false, no_email            the order has no e-mail address
 *   sent: false, already_sent        this order and parcel number were mailed
 *   sent: false, stub_parcel         a STUB- number from the OS's stand-in
 *                                    carrier (its default mode): never a real
 *                                    parcel, so never in a customer's mail
 *
 * Idempotent on the order and the parcel number: a retried call sends
 * nothing more, a new number (a relabelled parcel) does.
 */
export type ShippingNotice = {
  carrier: ShippedCarrier
  tracking_number: string
  tracking_url?: string
  parcel_id?: string
}

export type ShippedOrder = {
  id: string
  display_id: number | string
  email: string | null
  total: number
  cash_on_delivery: boolean
  items: { title: string; quantity: number; fee: boolean }[]
  method_name: string
  foxpost_point: { name: string; address: string } | null
  /** `type`: parcel-shop or parcel-locker, as stored (G1); null on an older order. */
  gls_point: { name: string; address: string; type?: string | null } | null
  shipping_address: string
}

export type ShippedDeps = {
  loadOrder(orderId: string): Promise<ShippedOrder | null>
  alreadySent(idempotencyKey: string): Promise<boolean>
}

export type ShippedResult =
  | { status: "not_found" }
  | { status: "skip"; reason: "mail_off" | "no_email" | "already_sent" | "stub_parcel" }
  | { status: "send"; mail: MailToSend }

/**
 * The OS's stand-in carrier numbers its parcels `STUB-…` (acropora-os
 * `stub-carrier.client.ts`, `STUB_PARCEL_PREFIX`), so a stage run never looks
 * real (nautilus 26359: such a number must never reach the "Feladtuk" mail).
 */
export const STUB_PARCEL_PREFIX = "STUB-"

export const isStubParcelNumber = (trackingNumber: string) =>
  trackingNumber.trim().toUpperCase().startsWith(STUB_PARCEL_PREFIX)

export const shippedKey = (orderId: string, trackingNumber: string) =>
  `order-shipped:${orderId}:${trackingNumber}`

/** An image on the storefront, for the mail's <img>; https only. */
const storefrontImageUrl = (env: NodeJS.ProcessEnv, path: string): string | null => {
  const base = env.ACROPORA_WEBSHOP_URL?.trim()
  if (!base) return null
  try {
    const url = new URL(path, base)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

/** The official logo on the storefront, for the mail's <img>; https only. */
export const foxpostLogoUrl = (env: NodeJS.ProcessEnv): string | null =>
  storefrontImageUrl(env, "/images/foxpost-packeta-group.png")

/**
 * THE GLS LOGO OF THE MAIL (the GLS prompt, point 12; Figma 508:594, 508:613):
 * the point's own kind (GLS Automata, or GLS Csomagpont for a ParcelShop), the
 * general GLS logo for home delivery. The same files the checkout shows.
 */
export const glsLogoUrl = (
  env: NodeJS.ProcessEnv,
  point: { type?: string | null } | null
): string | null =>
  storefrontImageUrl(
    env,
    !point
      ? "/images/gls.png"
      : point.type === "parcel-locker"
        ? "/images/gls-automata.png"
        : "/images/gls-csomagpont.png"
  )

export const prepareShippedMail = async (
  orderId: string,
  notice: ShippingNotice,
  deps: ShippedDeps,
  env: NodeJS.ProcessEnv = process.env
): Promise<ShippedResult> => {
  const order = await deps.loadOrder(orderId)
  if (!order) return { status: "not_found" }
  // before the switch: the answer names the stub even while the channel is off
  if (isStubParcelNumber(notice.tracking_number)) return { status: "skip", reason: "stub_parcel" }
  if (webshopMailState(env) !== "on") return { status: "skip", reason: "mail_off" }
  const to = order.email?.trim()
  if (!to) return { status: "skip", reason: "no_email" }
  const key = shippedKey(order.id, notice.tracking_number)
  if (await deps.alreadySent(key)) return { status: "skip", reason: "already_sent" }

  const point = notice.carrier === "foxpost" ? order.foxpost_point : order.gls_point
  return {
    status: "send",
    mail: {
      to,
      template: "order-shipped",
      idempotency_key: key,
      resource_id: order.id,
      content: renderShippedMail({
        display_id: order.display_id,
        carrier: notice.carrier,
        destination_title: point?.name ?? order.method_name,
        destination_address: point?.address ?? order.shipping_address,
        gls_point: notice.carrier === "gls" && !!order.gls_point,
        tracking_number: notice.tracking_number,
        tracking_url: notice.tracking_url ?? null,
        items: order.items.filter((item) => !item.fee),
        cod_amount: order.cash_on_delivery ? order.total : null,
        foxpost_logo_url: foxpostLogoUrl(env),
        gls_logo_url:
          notice.carrier === "gls" ? glsLogoUrl(env, order.gls_point) : null,
        gls_point_type: notice.carrier === "gls" ? order.gls_point?.type ?? null : null,
      }),
    },
  }
}
