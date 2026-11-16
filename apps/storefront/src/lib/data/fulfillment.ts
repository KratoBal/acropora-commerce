"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export const listCartShippingMethods = async (cartId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreShippingOptionListResponse>(
      `/store/shipping-options`,
      {
        method: "GET",
        query: {
          cart_id: cartId,
        },
        headers,
        next,
        cache: "force-cache",
      },
    )
    .then(({ shipping_options }) => shipping_options)
    .catch(() => {
      return null
    })
}

export const calculatePriceForShippingOption = async (
  optionId: string,
  cartId: string,
  data?: Record<string, unknown>,
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("fulfillment")),
  }

  const body = { cart_id: cartId, data }

  if (data) {
    body.data = data
  }

  return sdk.client
    .fetch<{ shipping_option: HttpTypes.StoreCartShippingOption }>(
      `/store/shipping-options/${optionId}/calculate`,
      {
        method: "POST",
        body,
        headers,
        next,
      },
    )
    .then(({ shipping_option }) => shipping_option)
    .catch((_e) => {
      return null
    })
}

/**
 * A KOSAR SZALLITASI OPCIOI A KOSAR LAPNAK, FRISSEN (task t-20261116-kosar-dobozok). A penztari lista (`listCartShippingMethods`) a
 * `fulfillment` cimkevel gyorsitotarazott, es egy kosarhoz tartozik: a kosar lap tartalma viszont tetelenkent valtozik (egy elo allat
 * kikerul, az opciok szama megvaltozik), ezert itt NINCS gyorsitotar. Hiba eseten `null`: a doboz akkor nem jelenik meg, nem allit
 * olyat, amit nem tudunk.
 */
export const listCartShippingOptionsFresh = async (
  cartId: string,
): Promise<HttpTypes.StoreCartShippingOption[] | null> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<HttpTypes.StoreShippingOptionListResponse>(
      `/store/shipping-options`,
      {
        method: "GET",
        query: { cart_id: cartId },
        headers,
        cache: "no-store",
      },
    )
    .then(({ shipping_options }) => shipping_options)
    .catch(() => null)
}
