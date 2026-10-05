import { MedusaError } from "@medusajs/framework/utils"

import { STRIPE_SHARE, sessionStartFacts } from "../split-completion"
import { type PaymentLinkPayload, verifyPaymentLink } from "./link-token"
import type { ReleaseSide } from "./release-hold"
import {
  ORDER_PAYMENT_METADATA_KEY,
  type StoredOrderPayment,
  storedOrderPaymentOf,
} from "./state"

/**
 * THE CUSTOMER PAYS THROUGH THE LINK (brief, points 4 and 5; plan 2.2): the
 * store side behind the token, no login needed (it comes from a mail).
 *
 *   open        payable
 *   paid        paid already: the page thanks, nothing more to do
 *   expired     the deadline passed (or the order was closed for it)
 *   superseded  a newer link was sent, or the order changed since (an edit
 *               moved its amount): the page asks for the newest mail
 *
 * THE MONEY IS CAPTURED AT ONCE, not held: the goods are here, and the parcel
 * leaves only after payment. A second hold would bring back the expiry this
 * work removes. A mixed cart's pair is paid with ONE Stripe payment, started
 * and captured the way checkout and Kiszállítás do it.
 */
export type LinkState = "open" | "paid" | "expired" | "superseded"

export type LinkCollection = {
  id: string
  amount: number
  status: string | null
  sessions: {
    id: string
    provider_id: string
    status: string | null
    data: Record<string, unknown> | null
    created_at: Date | string | null
  }[]
}

/** The session the card was confirmed on: an authorized one, else the newest. */
const sessionToAuthorize = (collection: LinkCollection | null) => {
  const sessions = collection?.sessions ?? []
  return (
    sessions.find((session) => session.status === "authorized") ??
    [...sessions].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0] ??
    null
  )
}

export type PayByLinkOperations = {
  loadPair(orderId: string): Promise<{ primary: ReleaseSide; pickup: ReleaseSide | null } | null>
  collection(collectionId: string): Promise<LinkCollection | null>
  /** A Stripe session on the collection (Medusa replaces its earlier ones); its data. */
  startSession(collectionId: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null>
  /** The session authorized with Stripe; false while the card is not confirmed yet. */
  authorizeSession(sessionId: string): Promise<boolean>
  /** The order's card payment captured: a mixed cart's both parts in one Stripe capture. */
  capture(orderId: string): Promise<void>
  /**
   * The payments of ONE collection captured: a difference link's (plan section
   * 5). The order's hold beside it stays for Kiszállítás.
   */
  captureCollection(collectionId: string): Promise<void>
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
}

export type ResolvedLink = {
  state: LinkState
  payload: PaymentLinkPayload
  pair: { primary: ReleaseSide; pickup: ReleaseSide | null }
  stored: StoredOrderPayment | null
}

/** The link behind a token; null for a token this server did not sign, or an order that is gone. */
export const resolvePaymentLink = async (
  token: string,
  ops: PayByLinkOperations,
  secret: string,
  now: () => Date = () => new Date()
): Promise<ResolvedLink | null> => {
  const payload = verifyPaymentLink(token, secret)
  if (!payload) return null
  const pair = await ops.loadPair(payload.order_id)
  if (!pair || pair.primary.order_id !== payload.order_id) return null

  const stored = storedOrderPaymentOf(pair.primary.metadata)
  const resolved = (state: LinkState): ResolvedLink => ({ state, payload, pair, stored })
  if (stored?.state === "paid") return resolved("paid")
  if (stored?.state === "expired" || now().getTime() > payload.expires_at) return resolved("expired")

  const link = stored?.link
  if (
    !link ||
    (stored!.state !== "link_sent" && stored!.state !== "reminded") ||
    link.collection_id !== payload.collection_id ||
    link.amount !== payload.amount ||
    Date.parse(link.expires_at) !== payload.expires_at
  ) {
    return resolved("superseded")
  }

  // an order edit since the link moved what the order owes: this link's amount is not it
  const ids = [link.collection_id, ...(link.pickup_collection_id ? [link.pickup_collection_id] : [])]
  const collections = await Promise.all(ids.map((id) => ops.collection(id)))
  if (
    collections.some((collection) => !collection || collection.status === "canceled") ||
    collections.reduce((sum, collection) => sum + (collection?.amount ?? 0), 0) !== payload.amount
  ) {
    return resolved("superseded")
  }
  return resolved("open")
}

const NOT_OPEN: Record<Exclude<LinkState, "open">, string> = {
  paid: "Ezt a rendelést már kifizetted, köszönjük!",
  expired: "Ez a fizetési link lejárt. Írj nekünk, és segítünk.",
  // no sent mail is claimed: on stage mails are off (the storefront's guard, Balázs)
  superseded:
    "Ez a fizetési link már nem érvényes: a rendelésedhez újabb fizetési link készült. Ha nem találod, írj nekünk a webshop@acropora.hu címre.",
}

const mustBeOpen = (resolved: ResolvedLink | null): ResolvedLink => {
  if (!resolved) throw new MedusaError(MedusaError.Types.NOT_FOUND, "A fizetési link nem található.")
  if (resolved.state !== "open") throw new MedusaError(MedusaError.Types.CONFLICT, NOT_OPEN[resolved.state])
  return resolved
}

const collectionIds = (resolved: ResolvedLink) => {
  const link = resolved.stored!.link!
  return { shipped: link.collection_id, pickup: link.pickup_collection_id ?? null }
}

/**
 * The Stripe payment the page confirms the card with (the checkout's deferred
 * card field): one intent for the link's whole amount. Opening the page again
 * starts a new one (Medusa cancels the earlier). Refused once a session is
 * authorized: the payment is under way, and `complete` finishes it.
 */
export const startLinkSession = async (
  token: string,
  ops: PayByLinkOperations,
  secret: string,
  now: () => Date = () => new Date()
): Promise<{ client_secret: string | null; amount: number }> => {
  const resolved = mustBeOpen(await resolvePaymentLink(token, ops, secret, now))
  const ids = collectionIds(resolved)
  const collections = await Promise.all([ids.shipped, ids.pickup].filter(Boolean).map((id) => ops.collection(id!)))
  if (collections.some((collection) => collection?.sessions.some((session) => session.status === "authorized"))) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "A fizetésed már folyamatban van. Frissítsd az oldalt néhány másodperc múlva."
    )
  }

  const shippedData = ids.pickup ? STRIPE_SHARE.joint(resolved.payload.amount) : STRIPE_SHARE.plain()
  const facts = sessionStartFacts(await ops.startSession(ids.shipped, shippedData), STRIPE_SHARE.factsKey)
  if (ids.pickup) await ops.startSession(ids.pickup, STRIPE_SHARE.joined(facts))

  return {
    client_secret: typeof facts.clientSecret === "string" ? facts.clientSecret : null,
    amount: resolved.payload.amount,
  }
}

/**
 * After the page confirmed the card: the sessions authorized, the money
 * captured, the orders paid. Safe to call again: an authorized session is not
 * authorized twice (Medusa returns its payment), a captured payment is not
 * captured twice, and a paid order answers paid.
 */
export const completeLinkPayment = async (
  token: string,
  ops: PayByLinkOperations,
  secret: string,
  now: () => Date = () => new Date()
): Promise<{ state: "paid"; paid_at: string }> => {
  const found = await resolvePaymentLink(token, ops, secret, now)
  if (found?.state === "paid") return { state: "paid", paid_at: found.stored?.paid_at ?? now().toISOString() }
  const resolved = mustBeOpen(found)
  const ids = collectionIds(resolved)

  const notConfirmed = () =>
    new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "A kártyás fizetés még nem ment végbe, a kártyádat nem terheltük meg. Próbáld újra."
    )
  // the shipped session holds the intent: authorized first, the joined one after it
  for (const id of [ids.shipped, ids.pickup]) {
    if (!id) continue
    const session = sessionToAuthorize(await ops.collection(id))
    if (!session) throw notConfirmed()
    const authorized = await ops.authorizeSession(session.id).catch((error) => {
      if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_ALLOWED) return false
      throw error
    })
    if (!authorized) throw notConfirmed()
  }

  // a difference link takes only its own payment; the hold waits for Kiszállítás
  if (resolved.stored!.kind === "difference") await ops.captureCollection(ids.shipped)
  else await ops.capture(resolved.pair.primary.order_id)

  const paidAt = now().toISOString()
  for (const side of [resolved.pair.primary, ...(resolved.pair.pickup ? [resolved.pair.pickup] : [])]) {
    const own = storedOrderPaymentOf(side.metadata) ?? resolved.stored!
    await ops.setMetadata(side.order_id, {
      ...(side.metadata ?? {}),
      [ORDER_PAYMENT_METADATA_KEY]: { ...own, state: "paid", paid_at: paidAt } satisfies StoredOrderPayment,
    })
  }
  return { state: "paid", paid_at: paidAt }
}
