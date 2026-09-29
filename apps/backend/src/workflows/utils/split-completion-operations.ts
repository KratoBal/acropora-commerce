import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  PromotionActions,
} from "@medusajs/framework/utils"
import {
  addShippingMethodToCartWorkflow,
  addToCartWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  deleteLineItemsWorkflow,
  updateCartPromotionsWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"

import { reconcileCartCashOnDeliveryFeeWorkflow } from "../reconcile-cart-cod-fee"
import { loadCartShippingDecision } from "./load-cart-shipping-decision"
import {
  PARENT_CART_METADATA_KEY,
  PARENT_ORDER_METADATA_KEY,
  PICKUP_CART_METADATA_KEY,
  PICKUP_ORDER_METADATA_KEY,
  SplitCart,
  SplitOperations,
  shippingProfileGaps,
} from "./split-completion"

type Container = MedusaContainer

const ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "city",
  "postal_code",
  "province",
  "country_code",
  "phone",
] as const

/** An address to copy onto a new cart: its fields, not its row (id, dates). */
const copyAddress = (address: Record<string, unknown> | null | undefined) =>
  address
    ? Object.fromEntries(
        ADDRESS_FIELDS.filter((field) => address[field] != null).map((field) => [
          field,
          address[field],
        ])
      )
    : undefined

const CART_FIELDS = [
  "id",
  "completed_at",
  "metadata",
  "email",
  "customer_id",
  "region_id",
  "sales_channel_id",
  "currency_code",
  "shipping_address.*",
  "billing_address.*",
  "items.id",
  "items.variant_id",
  "items.quantity",
  "items.metadata",
  "promotions.code",
  "payment_collection.id",
  "payment_collection.payment_sessions.provider_id",
  "shipping_methods.id",
  // The cart-order link's field alias (link-modules, definitions/order-cart).
  "order.id",
]

const loadRawCart = async (container: Container, cartId: string) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: CART_FIELDS,
  })
  return data?.[0] ?? null
}

const toSplitCart = (raw: any): SplitCart => ({
  id: raw.id,
  completed_at: raw.completed_at ?? null,
  order_id: raw.order?.id ?? null,
  metadata: raw.metadata ?? null,
  items: (raw.items ?? []).filter(Boolean).map((item: any) => ({
    id: item.id,
    variant_id: item.variant_id ?? null,
    quantity: Number(item.quantity),
    metadata: item.metadata ?? null,
  })),
  payment_provider_id:
    raw.payment_collection?.payment_sessions?.[0]?.provider_id ?? null,
  promo_codes: (raw.promotions ?? [])
    .map((promotion: any) => promotion?.code)
    .filter((code: unknown): code is string => typeof code === "string"),
  has_shipping_method: (raw.shipping_methods ?? []).length > 0,
})

/**
 * The Medusa side of `completeSplitCart`: each operation is one core workflow
 * (or a query), so the lines, totals, refreshes and events are the ones any
 * other cart change goes through.
 */
export const splitCompletionOperations = (
  container: Container,
  config: { storePickupOptionId: string }
): SplitOperations => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger

  return {
    loadCart: async (cartId) => {
      const raw = await loadRawCart(container, cartId)
      return raw ? toSplitCart(raw) : null
    },

    splitLineIds: async (cartId) =>
      (await loadCartShippingDecision(cartId, container))?.split_line_ids ?? [],

    createPickupCart: async (from) => {
      const raw = await loadRawCart(container, from.id)

      if (!raw) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Cart with id ${from.id} was not found`
        )
      }

      const { result } = await createCartWorkflow(container).run({
        input: {
          region_id: raw.region_id ?? undefined,
          sales_channel_id: raw.sales_channel_id ?? undefined,
          customer_id: raw.customer_id ?? undefined,
          email: raw.email ?? undefined,
          currency_code: raw.currency_code,
          shipping_address: copyAddress(raw.shipping_address),
          billing_address: copyAddress(raw.billing_address),
          metadata: { [PARENT_CART_METADATA_KEY]: from.id },
        },
      })
      await updateCartWorkflow(container).run({
        input: {
          id: from.id,
          metadata: {
            ...(raw.metadata ?? {}),
            [PICKUP_CART_METADATA_KEY]: result.id,
          },
        },
      })
      return result.id
    },

    addLines: async (cartId, lines) => {
      if (!lines.length) return
      await addToCartWorkflow(container).run({
        input: {
          cart_id: cartId,
          items: lines.map((line) => ({
            variant_id: line.variant_id ?? undefined,
            quantity: line.quantity,
            metadata: line.metadata ?? undefined,
          })),
        },
      })
    },

    deleteLines: async (cartId, lineIds) => {
      if (!lineIds.length) return
      await deleteLineItemsWorkflow(container).run({
        input: { cart_id: cartId, ids: lineIds },
      })
    },

    applyPromotions: async (cartId, codes) => {
      try {
        await updateCartPromotionsWorkflow(container).run({
          input: {
            cart_id: cartId,
            promo_codes: codes,
            action: PromotionActions.ADD,
          },
        })
      } catch (error) {
        // A code that does not apply to live animals is simply not applied.
        logger.info(
          `Split completion: promotion codes not applied to ${cartId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    },

    pickupProfileGaps: async (lines) => {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data: options } = await query.graph({
        entity: "shipping_option",
        filters: { id: config.storePickupOptionId },
        fields: ["id", "shipping_profile_id"],
      })
      const variantIds = lines.map((line) => line.variant_id)
      const { data: variants } = await query.graph({
        entity: "variant",
        filters: {
          id: variantIds.filter((id): id is string => typeof id === "string"),
        },
        fields: ["id", "product.id", "product.shipping_profile.id"],
      })
      return shippingProfileGaps(
        (variants ?? []) as any[],
        variantIds,
        options?.[0]?.shipping_profile_id ?? null
      )
    },

    setStorePickup: async (cartId) => {
      await addShippingMethodToCartWorkflow(container).run({
        input: {
          cart_id: cartId,
          options: [{ id: config.storePickupOptionId }],
        },
      })
    },

    /**
     * A payment session with the given provider, and the fee lines in line
     * with it. Settling the fee can change the total, and Medusa then deletes
     * the session, so this repeats until the fee plan is "none" and the
     * session is still there (twice at most in practice).
     */
    ensurePayment: async (cartId, providerId) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const raw = await loadRawCart(container, cartId)

        if (!raw) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Cart with id ${cartId} was not found`
          )
        }

        if (!raw.payment_collection?.id) {
          await createPaymentCollectionForCartWorkflow(container).run({
            input: { cart_id: cartId },
          })
          continue
        }

        const hasSession = (raw.payment_collection.payment_sessions ?? []).some(
          (session: any) => session?.provider_id === providerId
        )

        if (!hasSession) {
          await createPaymentSessionsWorkflow(container).run({
            input: {
              payment_collection_id: raw.payment_collection.id,
              provider_id: providerId,
              customer_id: raw.customer_id ?? undefined,
            },
          })
          continue
        }

        const { result: plan } = await reconcileCartCashOnDeliveryFeeWorkflow(
          container
        ).run({ input: { cart_id: cartId } })

        if (plan.action === "none") {
          return
        }
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `The payment of cart ${cartId} did not settle`
      )
    },

    complete: async (cartId) => {
      const { result } = await completeCartWorkflow(container).run({
        input: { id: cartId },
      })
      return result.id
    },

    linkOrders: async (parentOrderId, pickupOrderId) => {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "order",
        filters: { id: [parentOrderId, pickupOrderId] },
        fields: ["id", "metadata"],
      })
      const metadataOf = (id: string) =>
        (data ?? []).find((order: any) => order.id === id)?.metadata ?? {}

      await container.resolve(Modules.ORDER).updateOrders([
        {
          id: parentOrderId,
          metadata: {
            ...metadataOf(parentOrderId),
            [PICKUP_ORDER_METADATA_KEY]: pickupOrderId,
          },
        },
        {
          id: pickupOrderId,
          metadata: {
            ...metadataOf(pickupOrderId),
            [PARENT_ORDER_METADATA_KEY]: parentOrderId,
          },
        },
      ])
    },

    warn: (message) => logger.warn(message),
  }
}
