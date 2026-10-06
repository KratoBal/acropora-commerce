import type { ShippingPricingSettings } from "../../../modules/commerce-settings/accessor"
import type { OrderBusinessStatus } from "../../../modules/order-business-status/types"
import type { ShippingClass } from "../compute-shipping-class"
import type { PaymentRole } from "../payment-eligibility"
import { SPLITTABLE_STATUSES } from "../order-split/plan"
import { buildShippingOptionRoleMap } from "../shipping-option-roles"
import { type CourierOption, courierOptions } from "./options"

/**
 * A PLACED ORDER'S SHIPPING METHOD, CHANGED FROM THE OS (card 0a14f739, C/2;
 * Balázs, 2026-10-06 04:46 UTC: if the fee rises, the customer gets a Stripe
 * payment link for the difference; if it falls, no new payment).
 *
 * The old method goes and the new one comes in ONE Medusa order edit, with
 * the point in the same step (a point method without a point would be a state
 * nobody can ship). The confirm keeps a card hold as every edit does; if the
 * order now owes more than the hold, the payment view says so and the OS sends
 * the existing difference link (the item-added-over-the-hold path, plan
 * section 5). Cash on delivery follows the new total by itself.
 *
 * Only before Kiszállítás (it takes the money), never on a paid order (that is
 * a refund or a second charge, a separate decision), never on an in-store
 * pickup order. The OS itself refuses after its own parcel or an invoice
 * (nautilus 26644): neither is visible here.
 */
export const SHIPPING_HISTORY_KEY = "acropora_shipping_history"

export type ChangeOrder = {
  id: string
  status: string
  business_status: OrderBusinessStatus | null
  fulfillments: Array<{ id: string; canceled_at?: unknown } | null> | null
  metadata: Record<string, unknown> | null
  total: number
  payment_role: PaymentRole | null
  paid: boolean
  /** The current method; null without one. */
  method: {
    id: string
    shipping_option_id: string | null
    amount: number
    data: Record<string, unknown> | null
  } | null
}

export type ChangeBlock = "canceled" | "fulfilled" | "status" | "paid" | "not_courier"

export const CHANGE_BLOCK_MESSAGE: Record<ChangeBlock, string> = {
  canceled: "A rendelés törölve van, a szállítási módja nem módosítható.",
  fulfilled: "A rendelésből már ment csomag, a szállítási mód nem cserélhető.",
  status: "Szállítási módot csak kiszállítás előtt lehet cserélni (Feldolgozásra vár, Visszaigazolva, Készletezés alatt).",
  paid: "A rendelés már ki van fizetve; kifizetett rendelés szállítási módja most nem cserélhető.",
  not_courier: "Ez a rendelés nem futárral megy (bolti átvétel), a szállítási módja itt nem cserélhető.",
}

export type ChangeOperations = {
  loadOrder(orderId: string): Promise<ChangeOrder | null>
  shippingClass(orderId: string): Promise<ShippingClass>
  goodsTotal(orderId: string): Promise<number>
  settings(): Promise<ShippingPricingSettings>
  /** The courier options' names, by id. */
  optionNames(): Promise<Record<string, string>>
  /**
   * The point for a point method, checked by the fulfillment provider as in
   * the checkout; the stored record comes from our own list.
   */
  validatePoint(
    optionId: string,
    carrier: "gls" | "foxpost",
    pointId: string,
    source: "finder" | "fallback"
  ): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; reason: "invalid_point" | "unavailable" }>
  /** One order edit: the old method out, the new one in with its data, confirmed keeping a hold. */
  replaceMethod(
    orderId: string,
    change: { old_method_id: string; option: CourierOption; data: Record<string, unknown>; actor: string }
  ): Promise<void>
  /** After the change: the payment state, and whether a difference is owed. */
  payment(orderId: string): Promise<{ state: string; difference_due: boolean }>
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
  now(): Date
}

export const changeBlock = (order: ChangeOrder, env: NodeJS.ProcessEnv = process.env): ChangeBlock | null => {
  if (order.status === "canceled") return "canceled"
  if ((order.fulfillments ?? []).some((f) => f && !f.canceled_at)) return "fulfilled"
  if (!order.business_status || !SPLITTABLE_STATUSES.includes(order.business_status)) return "status"
  if (order.paid) return "paid"
  const role = order.method?.shipping_option_id ? buildShippingOptionRoleMap(env).get(order.method.shipping_option_id) : undefined
  if (!role || role === "PICKUP") return "not_courier"
  return null
}

/** The options for the OS's list, with the current one named. */
export const listChangeOptions = async (
  orderId: string,
  ops: ChangeOperations,
  env: NodeJS.ProcessEnv = process.env
): Promise<
  | { status: "not_found" }
  | { status: "blocked"; reason: ChangeBlock }
  | { status: "ok"; current_option_id: string | null; options: CourierOption[] }
> => {
  const order = await ops.loadOrder(orderId)
  if (!order) return { status: "not_found" }
  const block = changeBlock(order, env)
  if (block) return { status: "blocked", reason: block }
  const [names, shippingClass, goodsTotalHuf, settings] = await Promise.all([
    ops.optionNames(),
    ops.shippingClass(orderId),
    ops.goodsTotal(orderId),
    ops.settings(),
  ])
  return {
    status: "ok",
    current_option_id: order.method?.shipping_option_id ?? null,
    options: courierOptions({ shippingClass, paymentRole: order.payment_role, goodsTotalHuf, settings, names, env }),
  }
}

const POINT_KEY = { gls: "gls_pickup_point", foxpost: "foxpost_pickup_point" } as const

const pointIdOf = (data: Record<string, unknown> | null | undefined): string | null => {
  for (const key of Object.values(POINT_KEY)) {
    const point = data?.[key]
    const id = point && typeof point === "object" ? Reflect.get(point, "id") : undefined
    if (typeof id === "string") return id
  }
  return null
}

export type ChangeResult =
  | { status: "not_found" }
  | { status: "blocked"; reason: ChangeBlock }
  | { status: "invalid"; message: string }
  | { status: "unavailable" }
  | {
      status: "done"
      changed: boolean
      previous_total: number
      total: number
      difference: number
      payment_due: boolean
      payment_state: string
    }

export const changeShippingMethod = async (
  orderId: string,
  input: { shipping_option_id: string; point_id?: string; source?: "finder" | "fallback"; actor?: string },
  apiActor: string,
  ops: ChangeOperations,
  env: NodeJS.ProcessEnv = process.env
): Promise<ChangeResult> => {
  const listed = await listChangeOptions(orderId, ops, env)
  if (listed.status !== "ok") return listed
  const order = (await ops.loadOrder(orderId))!
  const option = listed.options.find((o) => o.id === input.shipping_option_id)
  if (!option) return { status: "invalid", message: "Ez a szállítási mód ehhez a rendeléshez nem választható." }
  if (option.needs_point && !input.point_id) {
    return { status: "invalid", message: "Csomagpontos módhoz csomagpontot is ki kell választani." }
  }

  const current = order.method!
  const samePoint = !option.needs_point || pointIdOf(current.data) === input.point_id
  if (current.shipping_option_id === option.id && samePoint) {
    const payment = await ops.payment(orderId)
    return {
      status: "done",
      changed: false,
      previous_total: order.total,
      total: order.total,
      difference: 0,
      payment_due: payment.difference_due,
      payment_state: payment.state,
    }
  }

  let data: Record<string, unknown> = {}
  if (option.needs_point) {
    const point = await ops.validatePoint(option.id, option.carrier, input.point_id!, input.source ?? "fallback")
    if (!point.ok) {
      return point.reason === "unavailable"
        ? { status: "unavailable" }
        : { status: "invalid", message: "Ez a csomagpont ehhez a szállítási módhoz most nem választható." }
    }
    data = point.data
  }

  const actor = input.actor ?? apiActor
  await ops.replaceMethod(orderId, { old_method_id: current.id, option, data, actor })

  const after = (await ops.loadOrder(orderId))!
  const history = Array.isArray(after.metadata?.[SHIPPING_HISTORY_KEY]) ? (after.metadata![SHIPPING_HISTORY_KEY] as unknown[]) : []
  await ops.setMetadata(orderId, {
    ...(after.metadata ?? {}),
    [SHIPPING_HISTORY_KEY]: [
      ...history,
      {
        from: { option_id: current.shipping_option_id, point_id: pointIdOf(current.data), amount: current.amount },
        to: { option_id: option.id, point_id: option.needs_point ? input.point_id : null, amount: option.amount },
        at: ops.now().toISOString(),
        by: actor,
        api_actor: apiActor,
      },
    ],
  })
  const payment = await ops.payment(orderId)
  return {
    status: "done",
    changed: true,
    previous_total: order.total,
    total: after.total,
    difference: after.total - order.total,
    payment_due: payment.difference_due,
    payment_state: payment.state,
  }
}
