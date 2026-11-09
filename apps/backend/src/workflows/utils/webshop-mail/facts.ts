import type { OrderLocale } from "../order-locale"
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

/**
 * The templates. The ten (acrobot 26554): the prompt's eight, link and
 * reminder apart, and the closed status; the eleventh, the split notice (C/3,
 * acrobot 26651), added while v1 had not yet rendered a mail anywhere.
 */
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
  "order-split",
  // the twelfth (V1.2 slice 4, Balázs 2026-11-04): the acknowledgement of a problem report; the OS has no text for
  // it on an older version and answers 422, so the mail waits in the outbox until the OS knows the template
  "problem-report-received",
  // the thirteenth (V0.3 slice 2): the acknowledgement of a withdrawal declaration, on a durable medium; the OS has no
  // text for it until its template exists and answers 422, so the mail waits in the outbox until the OS knows it
  "withdrawal-received",
  // the fourteenth (card d707cf5f): the newsletter's confirmation link (double opt-in); no order behind it, so its common
  // facts come from the sign-up (the name typed, the form's language). An older OS answers 422 and the mail waits.
  "newsletter-confirm",
  // the fifteenth (V2.4, card 0c1265d2): the stock alert's confirmation link ("Szólj, ha jön hasonló"), the newsletter's
  // double opt-in; no order behind it, its common facts come from the sign-up (no name, the form's language). An older OS answers 422 and the mail waits.
  "stock-alert-confirm",
] as const
export type WebshopMailTemplate = (typeof WEBSHOP_MAIL_TEMPLATES)[number]

/** In every template's facts, on top (nautilus 26557): both may be null. */
type CommonFacts = {
  /** "Vezetéknév Keresztnév", from the billing address, as the invoice writes it. */
  customer_name: string | null
  /** When the order was placed, ISO. */
  order_created_at: string | null
  /**
   * The language the customer ordered in (`storefront_locale` on the order,
   * order-locale.ts; an order without it is Hungarian). The OS writes the mail
   * in it. ADDED WITHOUT RAISING THE VERSION, as `legal_version` and G3's keys
   * were: the OS reads the facts key by key and treats a missing `locale` as
   * Hungarian, so the OS and this shop can be deployed in either order
   * (card d5c6befd). The OS must not be sent `en` before its English words are
   * merged (acropora-os, second step).
   */
  locale: OrderLocale
  /**
   * The address of the storefront's guest order page in the mail's language (`order-view-url.ts`), or null when the
   * shop does not know its own https address. A fact, not a sentence: the OS draws the link, in its own words, where
   * its template wants one. ADDED WITHOUT RAISING THE VERSION (an unknown key is ignored by an older OS).
   */
  order_view_url: string | null
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
  /**
   * `legal_version` (commerce-audit-p0, P0 #2, acrobot 36693): the version of
   * the legal documents the customer accepted at checkout, from the cart's
   * `aszf_elfogadas.verzio`; null when the cart carries no record. The OS picks
   * the legal blocks of that version for the confirmation (ASZF, withdrawal
   * information and form, privacy, the company's data), and answers 422 for a
   * version it does not know, so a mail is held rather than sent with another
   * text. ADDED WITHOUT RAISING THE VERSION, as G3 added its optional keys: the
   * OS reads the facts key by key and ignores one it does not know, so an older
   * OS renders the mail as before, without the legal part.
   */
  "order-placed": CommonFacts & { orders: MailOrder[]; legal_version: string | null }
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
  /** The split notice: the part that comes now (`order`), the one that comes later, and how both are paid. */
  "order-split": CommonFacts & { order: LoadedOrder; split_order: LoadedOrder; payment: "card" | "cod" | "store" | "transfer" }
  /** The order's number and the case reference the customer was given when filing; nothing else of the report. */
  "problem-report-received": CommonFacts & { display_id: number | string; report_id: string }
  /**
   * The withdrawal declaration's acknowledgement: what the customer declared and when the shop received it. `declared_name`
   * is the name typed into the declaration (it may differ from the billing name in `customer_name`); `item_ids` are the order
   * lines withdrawn from (the OS names them from the order); `received_at` is the shop server's time of receipt, ISO.
   */
  "withdrawal-received": CommonFacts & {
    display_id: number | string
    withdrawal_id: string
    declared_name: string
    item_ids: string[]
    received_at: string
  }
  /**
   * The newsletter's confirmation (double opt-in): the link that confirms (it works once, until `expires_at`, ISO), and
   * the link that leaves the list. `customer_name` is the name typed into the sign-up; `order_created_at` and
   * `order_view_url` are null (there is no order).
   */
  "newsletter-confirm": CommonFacts & {
    confirm_url: string
    unsubscribe_url: string
    expires_at: string
  }
  /**
   * The stock alert's confirmation (double opt-in): the two links, the link's end (ISO), and what the address signed up
   * for (`subject_label`, a species "Acropora abrolhosensis" or a product's title). No name was asked: `customer_name`,
   * `order_created_at` and `order_view_url` are null.
   */
  "stock-alert-confirm": CommonFacts & {
    confirm_url: string
    unsubscribe_url: string
    expires_at: string
    subject_label: string
  }
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
  // V2.6 (f4e4832b): `livestock_kinds` is optional and the OS's fact parser keeps only the keys it
  // knows, so an OS without the acclimatisation section ignores it: the version stays 1 and the two
  // sides deploy in either order (the same way `locale` was added)
  LoadedOrder: ["id", "display_id", "email", "total", "items", "shipping", "payment"],
  MailOrder: ["display_id", "items", "shipping", "total", "payment", "pickup", "livestock_kinds"],
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
