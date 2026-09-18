"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import type { EngedelyezettFizetesiMod } from "@lib/util/fizetesi-modok"

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      },
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      }),
    )
    .catch(() => {
      return null
    })
}

export type KosarFizetesiLehetosegek = {
  allowed_payment_providers: EngedelyezettFizetesiMod[]
  cash_on_delivery_fee: number
}

/**
 * WHICH PROVIDERS THIS CART MAY USE, from the backend.
 *
 * `listCartPaymentMethods` above answers a different question: what the REGION
 * has enabled. That list knows nothing about how the cart is being delivered,
 * so on its own it offers cash on delivery for a store pickup too.
 *
 * NOT CACHED, deliberately, unlike the region's provider list: the answer
 * depends on the shipping method the customer just chose, and a cached one
 * would belong to the previous choice.
 *
 * A FAILED CALL RETURNS NOTHING, NOT EVERYTHING. The caller then shows no
 * payment method, which is the safe direction: offering one the backend did
 * not allow is how a pickup cart ends up paying cash on delivery.
 */
export const getCartPaymentOptions = async (
  cartId: string,
): Promise<KosarFizetesiLehetosegek | null> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ payment_options: KosarFizetesiLehetosegek }>(
      `/store/payment-options`,
      {
        method: "GET",
        query: { cart_id: cartId },
        headers,
        cache: "no-store",
      },
    )
    .then(({ payment_options }) => payment_options)
    .catch(() => {
      return null
    })
}
