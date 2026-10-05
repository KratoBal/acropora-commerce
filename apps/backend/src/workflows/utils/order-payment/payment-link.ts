import { MedusaError } from "@medusajs/framework/utils"

import { type PaymentLinkConfig, paymentLinkUrl } from "./link-config"
import { signPaymentLink } from "./link-token"
import type { ReleaseSide } from "./release-hold"
import {
  ORDER_PAYMENT_METADATA_KEY,
  orderPaymentView,
  type StoredOrderPayment,
  storedOrderPaymentOf,
} from "./state"

/**
 * "FIZETÉSI LINK KÜLDÉSE" (brief, point 4): the goods arrived, the order is
 * paid for through a link to its own page. The amount is the order's CURRENT
 * total: an item that dropped out went through an order edit (#482) first.
 *
 * A MIXED CART'S PAIR PAYS TOGETHER (acrobot 26483, decision 3): each order
 * gets its own collection for its own total, and the link pays both with one
 * Stripe payment, as at checkout (`stripe_joint` / `stripe_joined`).
 *
 * THE LINK LIVES 6 DAYS (decision 2: the reminder on day 3, the close on day
 * 6). Sending it again is a new link with a new deadline; the older one reads
 * "superseded".
 */
export const LINK_DAYS = 6
const DAY_MS = 24 * 60 * 60 * 1000

export type PaymentLinkOperations = {
  /** The order and its mixed-cart pair, the shipped (paying) order first. */
  loadPair(orderId: string): Promise<{ primary: ReleaseSide; pickup: ReleaseSide | null } | null>
  /**
   * The order's collection for what it still owes (Medusa's
   * `createOrUpdateOrderPaymentCollectionWorkflow`): a new one after the
   * released hold, or the open one with its amount brought up to date.
   */
  ensureCollection(orderId: string): Promise<{ id: string; amount: number } | null>
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
}

export type SentPaymentLink = {
  state: "link_sent"
  link: { url: string; expires_at: string; amount: number }
  sent_at: string
  /** The orders the link pays: the shipped one first. */
  orders: { order_id: string; display_id: number | null; amount: number }[]
}

const refuse = (message: string): never => {
  throw new MedusaError(MedusaError.Types.CONFLICT, message)
}

const REFUSALS: Record<string, string> = {
  hold: "A kártya még zárolva van: a fizetési link a zárolás feloldása („Csúszik a szállítás”) után küldhető.",
  paid: "A rendelést már kifizették, nincs mit fizetni.",
  expired: "A fizetési határidő lejárt, a rendelés lezárult. Új link nem küldhető.",
  none: "Ez a rendelés nem kártyás fizetésű, fizetési link nem küldhető.",
}

export const sendPaymentLink = async (
  orderId: string,
  ops: PaymentLinkOperations,
  config: PaymentLinkConfig,
  now: () => Date = () => new Date()
): Promise<SentPaymentLink> => {
  const pair = await ops.loadPair(orderId)
  if (!pair) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found`)
  const sides = [pair.primary, ...(pair.pickup ? [pair.pickup] : [])]

  const stored = storedOrderPaymentOf(pair.primary.metadata)
  if (!stored || !stored.released_at) {
    refuse(REFUSALS[orderPaymentView(pair.primary).state] ?? REFUSALS.hold)
  }
  if (stored!.state === "paid" || stored!.state === "expired") refuse(REFUSALS[stored!.state])

  const collections: { side: ReleaseSide; id: string; amount: number }[] = []
  for (const side of sides) {
    const collection = await ops.ensureCollection(side.order_id)
    // a pickup order that owes nothing (its items dropped) is paid with nothing
    if (!collection || !(collection.amount > 0)) {
      if (side === pair.primary) refuse("A rendelés végösszege 0 Ft, nincs mit fizetni. Ha üres, törölni kell.")
      continue
    }
    collections.push({ side, ...collection })
  }

  const amount = collections.reduce((sum, collection) => sum + collection.amount, 0)
  const sentAt = now()
  const expiresAt = new Date(sentAt.getTime() + LINK_DAYS * DAY_MS)
  const token = signPaymentLink(
    { order_id: pair.primary.order_id, collection_id: collections[0].id, amount, expires_at: expiresAt.getTime() },
    config.secret
  )
  const url = paymentLinkUrl(config, token)

  const link: NonNullable<StoredOrderPayment["link"]> = {
    collection_id: collections[0].id,
    pickup_collection_id: collections[1]?.id ?? null,
    sent_at: sentAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    reminded_at: null,
    amount,
    url,
  }
  for (const side of sides) {
    const own = storedOrderPaymentOf(side.metadata) ?? stored!
    await ops.setMetadata(side.order_id, {
      ...(side.metadata ?? {}),
      [ORDER_PAYMENT_METADATA_KEY]: { ...own, state: "link_sent", link } satisfies StoredOrderPayment,
    })
  }

  return {
    state: "link_sent",
    link: { url, expires_at: link.expires_at, amount },
    sent_at: link.sent_at,
    orders: collections.map(({ side, amount: own }) => ({
      order_id: side.order_id,
      display_id: side.display_id,
      amount: own,
    })),
  }
}
