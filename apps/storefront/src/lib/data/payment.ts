"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"
import { revalidateTag } from "next/cache"
import { FIZETES_MOST_NEM_SIKERULT } from "@lib/util/penztar-uzenet"
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

export type FizetesiSzerepValasz = "ONLINE_CARD" | "COD" | "PAY_AT_STORE" | null

export type KosarFizetesiLehetosegek = {
  allowed_payment_providers: EngedelyezettFizetesiMod[]
  selected_payment_role: FizetesiSzerepValasz
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

export type UtanvetEgyeztetes =
  | { ok: true; dij: number; valasztottSzerep: FizetesiSzerepValasz }
  | { ok: false; uzenet: string }

/**
 * BRINGS THE CART'S CASH-ON-DELIVERY FEE IN LINE WITH THE METHOD JUST CHOSEN.
 *
 * WHY IT RUNS FOR EVERY METHOD, NOT ONLY FOR CASH ON DELIVERY: this endpoint
 * reconciles, it does not add. Choosing cash on delivery puts the fee on;
 * choosing anything else takes it off. If the storefront called it only for
 * cash on delivery, a customer who picked it and then switched to card would
 * keep the fee - creating a payment session does not refresh the cart, so
 * nothing else would take it off before the order is placed.
 *
 * THE AMOUNT IS NEVER OURS TO DECIDE. The backend answers with it and this
 * function passes it through. A storefront that computed the fee itself would
 * be a second source of truth for money.
 *
 * `valasztottSzerep` is what the cart has AFTER the change, and `null` there is
 * not an error: applying the fee moves the cart total, and Medusa drops a
 * payment session whose collection no longer matches it. The caller has to
 * create the session again, against the new total.
 */
export const egyeztesdAzUtanvetDijat = async (
  cartId: string,
): Promise<UtanvetEgyeztetes> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    const valasz = await sdk.client.fetch<{
      payment_options: KosarFizetesiLehetosegek
    }>(`/store/payment-options`, {
      method: "POST",
      body: { cart_id: cartId },
      headers,
    })

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)

    return {
      ok: true,
      dij: valasz.payment_options.cash_on_delivery_fee,
      valasztottSzerep: valasz.payment_options.selected_payment_role,
    }
  } catch (hiba) {
    // A VALODI OK A SZERVER NAPLOJABAN MARAD, a vevo elol elvesszuk.
    console.error(
      "Az utánvét-díj egyeztetése nem sikerült:",
      hiba instanceof Error ? hiba.message : String(hiba),
    )

    return { ok: false, uzenet: FIZETES_MOST_NEM_SIKERULT }
  }
}
