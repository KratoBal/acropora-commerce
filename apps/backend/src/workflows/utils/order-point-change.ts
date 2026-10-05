import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { buildShippingOptionRoleMap, glsPointOptionOf } from "./shipping-option-roles"

/**
 * A PLACED ORDER'S PICKUP POINT, CHANGED FROM THE OS (card d3b54954, S1: "she
 * wants another locker"). Only the point changes, never the shipping method:
 * the price, the payment and the hold stay as they are (a method change is a
 * separate round, acrobot 26569). The point is checked exactly as in the
 * checkout, by the fulfillment provider's `validateFulfillmentData`, so what
 * is stored comes from our own copy of the carrier's list (the browser, here
 * the OS, gives only the id) and the heavy-goods rule holds.
 */
export type PointCarrier = "foxpost" | "gls"

export type PointMethod = {
  id: string
  shipping_option_id: string | null
  data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

export type PointOrder = {
  id: string
  status: string
  fulfillments: Array<{ id: string; canceled_at?: unknown } | null> | null
  shipping_methods: Array<PointMethod | null> | null
}

/** Why the point cannot change; each has the OS's Hungarian message. */
export type PointChangeBlock = "not_point" | "canceled" | "fulfilled"

export const POINT_CHANGE_BLOCK_MESSAGE: Record<PointChangeBlock, string> = {
  not_point: "Ez a rendelés nem csomagpontra megy, itt nincs csomagpont, amit cserélni lehetne.",
  canceled: "A rendelés törölve van, a csomagpontja nem módosítható.",
  fulfilled: "A csomag már feladásra került, a csomagpont nem cserélhető.",
}

const POINT_KEY: Record<PointCarrier, "foxpost_pickup_point" | "gls_pickup_point"> = {
  foxpost: "foxpost_pickup_point",
  gls: "gls_pickup_point",
}

/** The order's pickup-point method, its carrier and the heavy-goods rule; null if it has none. */
export const pointMethodOf = (
  order: PointOrder,
  env: NodeJS.ProcessEnv = process.env
): { method: PointMethod; carrier: PointCarrier; heavy: boolean } | null => {
  const roles = buildShippingOptionRoleMap(env)
  for (const method of [...(order.shipping_methods ?? [])].reverse()) {
    const optionId = method?.shipping_option_id
    if (!method || !optionId) continue
    if (roles.get(optionId) === "FOXPOST") return { method, carrier: "foxpost", heavy: false }
    const gls = glsPointOptionOf(optionId, env)
    if (gls) return { method, carrier: "gls", heavy: gls.heavy }
  }
  return null
}

export const pointChangeBlock = (order: PointOrder, env: NodeJS.ProcessEnv = process.env): PointChangeBlock | null => {
  if (!pointMethodOf(order, env)) return "not_point"
  if (order.status === "canceled") return "canceled"
  if ((order.fulfillments ?? []).some((f) => f && !f.canceled_at)) return "fulfilled"
  return null
}

export const currentPointId = (method: PointMethod, carrier: PointCarrier): string | null => {
  const point = method.data?.[POINT_KEY[carrier]]
  const id = point && typeof point === "object" ? Reflect.get(point, "id") : undefined
  return typeof id === "string" ? id : null
}

export type PointChangeOperations = {
  loadOrder(orderId: string): Promise<PointOrder | null>
  /** The shipping option's provider and option data, as the checkout validates with. */
  loadOption(optionId: string): Promise<{ provider_id: string; data: Record<string, unknown> | null } | null>
  validate(providerId: string, optionData: Record<string, unknown>, data: Record<string, unknown>): Promise<Record<string, unknown>>
  updateMethod(id: string, changes: { data: Record<string, unknown>; metadata: Record<string, unknown> }): Promise<void>
  now(): Date
}

export type PointChangeResult =
  | { status: "not_found" }
  | { status: "blocked"; reason: PointChangeBlock }
  | { status: "invalid_point" }
  | { status: "unavailable" }
  | {
      status: "done"
      carrier: PointCarrier
      changed: boolean
      previous_point_id: string | null
      point: Record<string, unknown>
    }

export const changeOrderPoint = async (
  orderId: string,
  input: { point_id: string; source?: "finder" | "fallback"; actor?: string },
  /** The authenticated actor (the admin key's); `input.actor` is the OS user's name, as stated. */
  actor: string,
  ops: PointChangeOperations,
  env: NodeJS.ProcessEnv = process.env
): Promise<PointChangeResult> => {
  const order = await ops.loadOrder(orderId)
  if (!order) return { status: "not_found" }
  const block = pointChangeBlock(order, env)
  if (block) return { status: "blocked", reason: block }
  const { method, carrier } = pointMethodOf(order, env)!
  const key = POINT_KEY[carrier]
  const previous = currentPointId(method, carrier)
  if (previous === input.point_id) {
    return { status: "done", carrier, changed: false, previous_point_id: previous, point: method.data?.[key] as never }
  }

  const option = await ops.loadOption(method.shipping_option_id!)
  if (!option) return { status: "unavailable" }
  let validated: Record<string, unknown>
  try {
    validated = await ops.validate(
      option.provider_id,
      { ...(option.data ?? {}), id: (option.data as { id?: unknown } | null)?.id ?? method.shipping_option_id },
      { [key]: carrier === "gls" ? { id: input.point_id, source: input.source ?? "fallback" } : { id: input.point_id } }
    )
  } catch (error) {
    if (MedusaError.isMedusaError(error) && (error as MedusaError).type === MedusaError.Types.NOT_ALLOWED) {
      return { status: "unavailable" }
    }
    if (MedusaError.isMedusaError(error) && (error as MedusaError).type === MedusaError.Types.INVALID_DATA) {
      return { status: "invalid_point" }
    }
    throw error
  }

  const history = Array.isArray(method.metadata?.acropora_point_history) ? method.metadata!.acropora_point_history : []
  await ops.updateMethod(method.id, {
    data: { ...(method.data ?? {}), ...validated },
    metadata: {
      ...(method.metadata ?? {}),
      acropora_point_history: [
        ...(history as unknown[]),
        { from: previous, to: input.point_id, at: ops.now().toISOString(), by: input.actor ?? actor, api_actor: actor },
      ],
    },
  })
  return { status: "done", carrier, changed: true, previous_point_id: previous, point: validated[key] as never }
}

const ORDER_FIELDS = [
  "id",
  "status",
  "fulfillments.id",
  "fulfillments.canceled_at",
  "shipping_methods.id",
  "shipping_methods.shipping_option_id",
  "shipping_methods.data",
  "shipping_methods.metadata",
]

export const loadPointOrder = async (container: MedusaContainer, orderId: string): Promise<PointOrder | null> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ORDER_FIELDS })
  return (data?.[0] as PointOrder | undefined) ?? null
}

/** The Medusa side of `changeOrderPoint`. */
export const pointChangeOperations = (container: MedusaContainer): PointChangeOperations => ({
  loadOrder: (orderId) => loadPointOrder(container, orderId),
  loadOption: async (optionId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "shipping_option",
      filters: { id: optionId },
      fields: ["id", "provider_id", "data"],
    })
    const option = data?.[0] as { provider_id?: string; data?: Record<string, unknown> | null } | undefined
    return option?.provider_id ? { provider_id: option.provider_id, data: option.data ?? null } : null
  },
  validate: (providerId, optionData, data) =>
    container.resolve(Modules.FULFILLMENT).validateFulfillmentData(providerId, optionData, data, {} as never),
  updateMethod: async (id, changes) => {
    await container.resolve(Modules.ORDER).updateOrderShippingMethods({ id, ...changes })
  },
  now: () => new Date(),
})
