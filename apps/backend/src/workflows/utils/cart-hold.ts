import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { CART_HOLD_MODULE } from "../../modules/cart-hold"
import {
  cartHoldOn,
  decideHold,
  expiresAtOf,
  heldMessage,
  holdBlocks,
  holdMinutes,
  holdStands,
  limitMessage,
  maxHoldsPerCart,
  type HeldLine,
  type HoldDecision,
  type HoldRow,
} from "../../modules/cart-hold/policy"
import { isUniquePiece } from "./sold-lines"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "./split-completion"

/**
 * THE CART HOLD'S MEDUSA WIRING (V2.3, card 52024fc0): the two hooks that already guard a cart call these.
 *
 *   holdOnAdd            addToCartWorkflow's validate hook: every way a line gets into a cart (the store route, a
 *                        direct Store API call). Refuses a piece another cart holds, and the cart's limit.
 *   assertNoForeignHold  completeCartWorkflow's validate hook: every way a cart becomes an order (the stock
 *                        `/complete`, both halves of `complete-split`). Refuses a piece another cart holds.
 *
 * Both do nothing unless `ACROPORA_CART_HOLD=on`. Both FAIL OPEN on their own trouble (a query or the lock that
 * throws): the hold is a courtesy to the buyer, the stock is still guarded by Medusa at completion and V2.5 names the
 * piece sold meanwhile. A failing hold must not stop a sale; only a decision refuses.
 *
 * THE LOCK makes read-decide-write one step for a piece and for a cart, across instances (Redis-backed on stage,
 * like the split's). The unique index on `variant_id` is the backstop under it.
 */

type Container = Pick<MedusaContainer, "resolve">

type HoldRowWithVariant = HoldRow & { variant_id: string }

type CartHoldService = {
  listCartHolds(filters: Record<string, unknown>): Promise<HoldRowWithVariant[]>
  createCartHolds(data: { variant_id: string; cart_id: string; expires_at: Date }[]): Promise<unknown>
  updateCartHolds(data: { id: string; cart_id: string; expires_at: Date }[]): Promise<unknown>
}

type FamilyLine = { variant_id: string; title: string; handle: string | null; unique: boolean }

const LOCK_TIMEOUT_SECONDS = 5

/** The cart that holds for this one: a mixed cart's pickup half holds through its parent. */
export const holderOf = (cart: { id: string; metadata?: Record<string, unknown> | null }): string => {
  const parent = cart.metadata?.[PARENT_CART_METADATA_KEY]
  return typeof parent === "string" && parent ? parent : cart.id
}

/**
 * The lines the holder has on OPEN carts: its own and its pickup half's (split-completion.ts links them both ways).
 * A completed cart's lines are an order now, not a hold.
 */
async function familyLines(query: any, holder: string): Promise<FamilyLine[]> {
  const fields = [
    "id",
    "completed_at",
    "metadata",
    "items.variant_id",
    "items.title",
    "items.product_handle",
    "items.product.metadata",
  ]
  const { data: roots } = await query.graph({ entity: "cart", filters: { id: holder }, fields })
  const root = (roots ?? [])[0]
  if (!root) return []
  const carts = [root]
  const pickupId = root.metadata?.[PICKUP_CART_METADATA_KEY]
  if (typeof pickupId === "string" && pickupId) {
    const { data: pickups } = await query.graph({ entity: "cart", filters: { id: pickupId }, fields })
    carts.push(...(pickups ?? []))
  }
  return carts
    .filter((cart: any) => cart && !cart.completed_at)
    .flatMap((cart: any) => (cart.items ?? []).filter(Boolean))
    .filter((item: any) => typeof item.variant_id === "string")
    .map((item: any) => ({
      variant_id: item.variant_id,
      title: item.title ?? "",
      handle: item.product_handle ?? null,
      unique: isUniquePiece(item.product?.metadata?.unique_piece),
    }))
}

/** One lookup per cart, however many holds name it. */
const pieceLookup = (query: any) => {
  const seen = new Map<string, Promise<Set<string>>>()
  return (holder: string, variantId: string): Promise<boolean> => {
    if (!seen.has(holder))
      seen.set(
        holder,
        familyLines(query, holder).then((lines) => new Set(lines.map((line) => line.variant_id)))
      )
    return seen.get(holder)!.then((variants) => variants.has(variantId))
  }
}

const warn = (container: Container, message: string) => {
  try {
    container.resolve(ContainerRegistrationKeys.LOGGER).warn(message)
  } catch {
    // no logger: nothing to write
  }
}

/**
 * ADDING TO A CART: one hold per unique piece among `variantIds`, or a refusal. Ordinary products pass untouched. A
 * pickup half's lines are the split moving one buyer's lines between the two halves of one cart: no hold is asked.
 */
export async function holdOnAdd(container: Container, cartId: string, variantIds: string[]): Promise<void> {
  if (!cartHoldOn() || !variantIds.length) return

  let refusal: string | null = null
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: carts } = await query.graph({ entity: "cart", filters: { id: cartId }, fields: ["id", "metadata"] })
    const cart = (carts ?? [])[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
    if (!cart || holderOf(cart) !== cart.id) return

    const { data: variants } = await query.graph({
      entity: "variant",
      filters: { id: [...new Set(variantIds)] },
      fields: ["id", "product.title", "product.handle", "product.metadata"],
    })
    const pieces = ((variants ?? []) as any[]).filter((variant) => isUniquePiece(variant?.product?.metadata?.unique_piece))
    if (!pieces.length) return

    const holds = container.resolve<CartHoldService>(CART_HOLD_MODULE)
    const locking = container.resolve(Modules.LOCKING)
    const minutes = holdMinutes()
    const max = maxHoldsPerCart()
    const hasPiece = pieceLookup(query)

    for (const piece of pieces) {
      const decision = await locking.execute(
        [`cart_hold:variant:${piece.id}`, `cart_hold:cart:${cart.id}`],
        async (): Promise<HoldDecision> => {
          const now = new Date()
          const [row] = await holds.listCartHolds({ variant_id: piece.id })
          const otherCartHasPiece =
            !!row && row.cart_id !== cart.id ? await hasPiece(row.cart_id, piece.id) : false
          let standingOwnHolds = 0
          for (const own of await holds.listCartHolds({ cart_id: cart.id })) {
            if (own.variant_id === piece.id) continue
            // this call's earlier pieces have holds but no lines yet: holdStands counts them as in flight
            if (holdStands(own, now, await hasPiece(cart.id, own.variant_id))) standingOwnHolds++
          }
          const decided = decideHold({ row: row ?? null, holder: cart.id, now, minutes, max, otherCartHasPiece, standingOwnHolds })
          if (decided.action === "create")
            await holds.createCartHolds([{ variant_id: piece.id, cart_id: cart.id, expires_at: decided.expires_at }])
          if (decided.action === "take")
            await holds.updateCartHolds([{ id: decided.id, cart_id: cart.id, expires_at: decided.expires_at }])
          return decided
        },
        { timeout: LOCK_TIMEOUT_SECONDS }
      )
      if (decision.action === "refuse_held") {
        refusal = heldMessage([
          { title: piece.product?.title ?? "", handle: piece.product?.handle ?? null, until: decision.until.toISOString() },
        ])
        break
      }
      if (decision.action === "refuse_limit") {
        refusal = limitMessage(decision.max)
        break
      }
    }
  } catch (error) {
    warn(container, `Cart hold skipped on add to cart ${cartId}: ${(error as Error)?.message ?? error}`)
    return
  }
  if (refusal) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, refusal)
}

/**
 * PLACING AN ORDER: refuses when another cart's hold stands on a unique piece of this cart or of its other half. The
 * whole family is checked from either half, so a mixed cart is refused before its shipped half becomes an order, not
 * after (the split completes the shipped half first and undoes the move if that fails).
 */
export async function assertNoForeignHold(
  container: Container,
  cart: { id: string; metadata?: Record<string, unknown> | null }
): Promise<void> {
  if (!cartHoldOn()) return

  const blocked: HeldLine[] = []
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const holder = holderOf(cart)
    const pieces = (await familyLines(query, holder)).filter((line) => line.unique)
    if (!pieces.length) return
    const holds = container.resolve<CartHoldService>(CART_HOLD_MODULE)
    const rows = await holds.listCartHolds({ variant_id: [...new Set(pieces.map((line) => line.variant_id))] })
    const now = new Date()
    const hasPiece = pieceLookup(query)
    for (const row of rows) {
      if (row.cart_id === holder) continue
      if (!holdBlocks(row, holder, now, await hasPiece(row.cart_id, row.variant_id))) continue
      const line = pieces.find((piece) => piece.variant_id === row.variant_id)!
      blocked.push({ title: line.title, handle: line.handle, until: expiresAtOf(row).toISOString() })
    }
  } catch (error) {
    warn(container, `Cart hold check skipped on completing cart ${cart.id}: ${(error as Error)?.message ?? error}`)
    return
  }
  if (blocked.length) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, heldMessage(blocked))
}
