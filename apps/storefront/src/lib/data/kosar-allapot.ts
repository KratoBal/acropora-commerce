"use server"

import { HttpTypes } from "@medusajs/types"

import { listCartOptions, retrieveCart } from "./cart"
import { retrieveCustomer } from "./customer"

export type KosarAllapot = {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  shippingOptions: HttpTypes.StoreCartShippingOption[]
}

/**
 * A LATOGATO SAJAT ALLAPOTA, SZERVER-AKCIOKENT (FE-7).
 *
 * Eddig a `(main)/layout` olvasta szerveroldalon (suti), es ettol minden
 * publikus lap `private, no-store` lett. Most a kliens keri le a lap
 * betoltese utan: a lap maga gyorsitotarazhato marad, a kosar es a vevo pedig
 * a latogato sajat kereseben jon. Hibanal ures allapot, a lap nelkule is ep.
 */
export async function kosarAllapot(): Promise<KosarAllapot> {
  const [customer, cart] = await Promise.all([
    retrieveCustomer().catch(() => null),
    retrieveCart().catch(() => null),
  ])
  const shippingOptions = cart
    ? ((await listCartOptions().catch(() => null))?.shipping_options ?? [])
    : []
  return { customer, cart, shippingOptions }
}
