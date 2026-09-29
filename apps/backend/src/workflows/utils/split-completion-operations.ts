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
  deletePaymentSessionsWorkflow,
  updateCartPromotionsWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"

import {
  SIMPLEPAY_DATA_KEY,
  isSharedSimplePay,
  simplePayFactsOf,
} from "../../modules/simplepay/service"
import { reconcileCartCashOnDeliveryFeeWorkflow } from "../reconcile-cart-cod-fee"
import { planCashOnDeliveryFee } from "./cod-fee-reconciliation"
import { loadCartCashOnDeliveryFeeState } from "./load-cart-cod-fee-state"
import { loadCartShippingDecision } from "./load-cart-shipping-decision"
import {
  PARENT_CART_METADATA_KEY,
  PARENT_ORDER_METADATA_KEY,
  PICKUP_CART_METADATA_KEY,
  PICKUP_ORDER_METADATA_KEY,
  SplitCart,
  SharedPaymentOperations,
  SPLIT_LOCK_KEY,
  SplitOperations,
  pickupPromoCodes,
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

export const CART_FIELDS = [
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
  "promotions.application_method.type",
  "promotions.application_method.allocation",
  "payment_collection.id",
  "payment_collection.payment_sessions.id",
  "payment_collection.payment_sessions.provider_id",
  "payment_collection.payment_sessions.data",
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

export const toSplitCart = (raw: any): SplitCart => ({
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
  pickup_promo_codes: pickupPromoCodes(
    (raw.promotions ?? []).filter(Boolean).map((promotion: any) => ({
      code: promotion.code ?? null,
      type: promotion.application_method?.type ?? null,
      allocation: promotion.application_method?.allocation ?? null,
    }))
  ),
  has_shipping_method: (raw.shipping_methods ?? []).length > 0,
  shared_payment: isSharedSimplePay(
    simplePayFactsOf(raw.payment_collection?.payment_sessions?.[0]?.data)
  ),
})

/**
 * The payer's details SimplePay needs for 3DS (L758-773), from the cart itself:
 * its email and billing address, never from the request.
 */
export const simplePayPayerOf = (raw: any): Record<string, unknown> => {
  const address = raw?.billing_address ?? {}
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ")
  return {
    customer_email: raw?.email ?? undefined,
    invoice: {
      name,
      company: address.company || undefined,
      country: address.country_code ?? "hu",
      city: address.city ?? "",
      zip: address.postal_code ?? "",
      address: address.address_1 ?? "",
      address2: address.address_2 || undefined,
      phone: address.phone || undefined,
    },
  }
}

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

    discountTotal: async (cartId) => {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "cart",
        filters: { id: cartId },
        fields: ["id", "discount_total"],
      })
      return Number((data?.[0] as any)?.discount_total ?? 0)
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

    // Redis-backed on stage (medusa-config: locking-redis). A second call
    // waits up to a minute; the lock also expires after a minute, so a crashed
    // job cannot hold the cart for good.
    withLock: (cartId, job) =>
      container.resolve(Modules.LOCKING).execute(SPLIT_LOCK_KEY(cartId), job, { timeout: 60 }),

    warn: (message) => logger.warn(message),
  }
}

/**
 * The split's operations plus the three the shared card payment needs
 * (P4-3c): a cart's total, its payer, and a payment session started with
 * data only our server sets.
 */
export const sharedPaymentOperations = (
  container: Container,
  config: { storePickupOptionId: string }
): SharedPaymentOperations => ({
  ...splitCompletionOperations(container, config),

  cartTotal: async (cartId) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "cart",
      filters: { id: cartId },
      fields: ["id", "total"],
    })
    const total = Number((data?.[0] as any)?.total)

    if (!Number.isFinite(total)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No total for cart ${cartId}`
      )
    }

    return total
  },

  payerOf: async (cartId) => simplePayPayerOf(await loadRawCart(container, cartId)),

  startPayment: async (cartId, providerId, data) => {
    let raw = await loadRawCart(container, cartId)

    if (!raw?.payment_collection?.id) {
      await createPaymentCollectionForCartWorkflow(container).run({
        input: { cart_id: cartId },
      })
      raw = await loadRawCart(container, cartId)
    }

    const collectionId = raw?.payment_collection?.id

    if (!collectionId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cart ${cartId} has no payment collection`
      )
    }

    // Replaces the collection's other sessions (Medusa deletes them first),
    // so an earlier unpaid start is released.
    const { result } = await createPaymentSessionsWorkflow(container).run({
      input: {
        payment_collection_id: collectionId,
        provider_id: providerId,
        customer_id: raw.customer_id ?? undefined,
        data,
      },
    })

    return ((result as any)?.data?.[SIMPLEPAY_DATA_KEY] ?? {}) as Record<string, unknown>
  },

  dropCashOnDeliveryFee: async (cartId) => {
    const state = await loadCartCashOnDeliveryFeeState(cartId, container)
    // What the cart owes for a card payment: no fee at all.
    const plan = planCashOnDeliveryFee({ dueHuf: 0, items: state?.cart.items })

    if (plan.action === "remove") {
      await deleteLineItemsWorkflow(container).run({
        input: { cart_id: cartId, ids: plan.removeIds },
      })
    }
  },

  clearPayment: async (cartId) => {
    const raw = await loadRawCart(container, cartId)
    const sessions = (raw?.payment_collection?.payment_sessions ?? []) as { id?: string }[]
    const ids = sessions.map((session) => session?.id).filter((id): id is string => !!id)

    if (ids.length) {
      await deletePaymentSessionsWorkflow(container).run({ input: { ids } })
    }
  },
})
