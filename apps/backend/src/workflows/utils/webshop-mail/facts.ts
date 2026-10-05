import type { MailLine, MailOrder } from "./order-placed-mail"
import type { LoadedOrder } from "./prepare"
import type { RefundMailFacts } from "./refund-mail"
import type { ShippedMailFacts } from "./shipped-mail"
import type { StatusMailStatus } from "./status-mail"

/**
 * WHAT THE SHOP SENDS THE OS TO RENDER A MAIL (Levélsablonok; Balázs,
 * 2026-10-05 20:11 UTC: the OS renders, the shop sends; nautilus 26550/26557).
 *
 *   POST <ACROPORA_OS_MAIL_RENDER_URL>  { template, facts_version: 1, facts }
 *   -> { subject, html, text, customized }
 *
 * THE FACTS ARE A CONTRACT WITH ANOTHER REPOSITORY, not an internal type:
 * they are the inputs the shop's own mail builders take today (the OS turns
 * them into variables and blocks, and keeps today's text as its default).
 * A change here changes what the OS receives; the contract spec pins every
 * key, so such a change is red until `WEBSHOP_MAIL_FACTS_VERSION` and the OS
 * follow. Money is a number in forint, a time an ISO string; the OS formats.
 */
export const WEBSHOP_MAIL_FACTS_VERSION = 1 as const

/** The ten templates (acrobot 26554): the prompt's eight, link and reminder apart, and the closed status. */
export const WEBSHOP_MAIL_TEMPLATES = [
  "order-placed",
  "order-status-confirmed",
  "order-status-out_for_delivery",
  "order-status-ready_for_pickup",
  "order-status-closed",
  "order-shipped",
  "order-payment-delayed",
  "order-payment-link",
  "order-payment-reminder",
  "payment-refunded",
] as const
export type WebshopMailTemplate = (typeof WEBSHOP_MAIL_TEMPLATES)[number]

/** In every template's facts, on top (nautilus 26557): both may be null. */
type CommonFacts = {
  /** "Vezetéknév Keresztnév", from the billing address, as the invoice writes it. */
  customer_name: string | null
  /** When the order was placed, ISO. */
  order_created_at: string | null
}

type PaymentLinkFacts = CommonFacts & {
  order: LoadedOrder
  url: string
  /** ISO; the OS writes the Budapest calendar day. */
  expires_at: string
  amount: number
  /** A mixed cart's pickup order, paid with the same link. */
  pickup: LoadedOrder | null
}

export type WebshopMailFactsOf = {
  "order-placed": CommonFacts & { orders: MailOrder[] }
  "order-status-confirmed": CommonFacts & { order: LoadedOrder }
  "order-status-out_for_delivery": CommonFacts & { order: LoadedOrder }
  "order-status-ready_for_pickup": CommonFacts & { order: LoadedOrder }
  "order-status-closed": CommonFacts & { order: LoadedOrder }
  "order-shipped": CommonFacts & { shipped: ShippedMailFacts }
  "order-payment-delayed": CommonFacts & {
    order: LoadedOrder
    amount: number
    pickup_display_id: number | string | null
  }
  "order-payment-link": PaymentLinkFacts
  "order-payment-reminder": PaymentLinkFacts
  "payment-refunded": CommonFacts & { refund: RefundMailFacts }
}

/** The render request for one template. */
export type WebshopMailRenderRequest = {
  [T in WebshopMailTemplate]: {
    template: T
    facts_version: typeof WEBSHOP_MAIL_FACTS_VERSION
    facts: WebshopMailFactsOf[T]
  }
}[WebshopMailTemplate]

export const isWebshopMailTemplate = (value: string): value is WebshopMailTemplate =>
  (WEBSHOP_MAIL_TEMPLATES as readonly string[]).includes(value)

/** A status mail's template, from its status (`statusMailTemplate`). */
export const statusTemplateOf = (status: StatusMailStatus) => `order-status-${status}` as const

export const renderRequest = <T extends WebshopMailTemplate>(
  template: T,
  facts: WebshopMailFactsOf[T]
): WebshopMailRenderRequest =>
  ({ template, facts_version: WEBSHOP_MAIL_FACTS_VERSION, facts }) as WebshopMailRenderRequest

/**
 * The customer's name as the invoice and the success page write it: family
 * name first. Null when the address carries neither.
 */
export const customerNameOf = (
  address: { first_name?: string | null; last_name?: string | null } | null | undefined
): string | null => {
  const name = [address?.last_name, address?.first_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
  return name || null
}

/**
 * THE KEYS THE OS RECEIVES, PER BUILT-IN TYPE, AND A COMPILE-TIME GUARD.
 *
 * The facts reuse the builders' own input types, so a field added to one of
 * them (an OPTIONAL one too, which no sample would show) would reach the OS
 * silently. Each list below must equal its type's keys exactly, or this file
 * does not compile: change the list, raise `WEBSHOP_MAIL_FACTS_VERSION`, and
 * tell the OS side.
 */
export const WEBSHOP_MAIL_FACTS_CONTRACT = {
  LoadedOrder: ["id", "display_id", "email", "total", "items", "shipping", "payment"],
  MailOrder: ["display_id", "items", "shipping", "total", "payment", "pickup"],
  MailLine: ["title", "quantity", "total"],
  ShippedMailFacts: [
    "display_id",
    "carrier",
    "destination_title",
    "destination_address",
    "gls_point",
    "tracking_number",
    "tracking_url",
    "items",
    "cod_amount",
    "foxpost_logo_url",
    // G3 (#490), both optional, added while v1 had not yet rendered a mail
    // anywhere (the switch off, the OS endpoint not merged): told to the OS
    // side, so v1 carries them from the start rather than a v2
    "gls_logo_url",
    "gls_point_type",
  ],
  RefundMailFacts: ["display_id", "amount", "refunded_total", "last4"],
} as const

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Keys<T extends keyof typeof WEBSHOP_MAIL_FACTS_CONTRACT> = (typeof WEBSHOP_MAIL_FACTS_CONTRACT)[T][number]

// a `false` here means a type and its list above differ: see the comment above
export const WEBSHOP_MAIL_FACTS_CONTRACT_HOLDS: [
  Same<keyof LoadedOrder, Keys<"LoadedOrder">>,
  Same<keyof MailOrder, Keys<"MailOrder">>,
  Same<keyof MailLine, Keys<"MailLine">>,
  Same<keyof ShippedMailFacts, Keys<"ShippedMailFacts">>,
  Same<keyof RefundMailFacts, Keys<"RefundMailFacts">>,
] = [true, true, true, true, true]
