"use server"

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

/**
 * A TERMEK-TUDAS, AHOGY AZ ACROPORA OS VETITI (KZ Amino szelet, PD-014).
 *
 * A hatteroldal `/store/product-knowledge/:id` vegpontja a szerzodes alakjat adja.
 * Az OS a gazda: a kirakat csak olvas, es semmit nem ir vissza.
 *
 * UGYANAZ A GYORSITOTARAZAS, MINT A TERMEKE (`products` cimke, `force-cache`):
 * a termeklap statikusan epul, es egy `no-store` lekeres a lap renderelesi
 * modjat valtoztathatna meg minden termeknel. Igy a tudas pontosan akkor
 * frissul a lapon, amikor a termek leirasa is.
 */
export type TermekTudasTeny = {
  field: string
  value: string | null
  unit: string | null
  status: string
  source_type: string | null
  revision: number
}

export type TermekTudas = {
  product_id: string
  facts: TermekTudasTeny[]
  copy: { block: string; body: string; revision: number }[]
}

export async function termekTudas(
  productId: string,
): Promise<TermekTudas | null> {
  try {
    const { product_knowledge } = await sdk.client.fetch<{
      product_knowledge: TermekTudas
    }>(`/store/product-knowledge/${encodeURIComponent(productId)}`, {
      method: "GET",
      next: { ...(await getCacheOptions("products")) },
      cache: "force-cache",
    })
    return product_knowledge
  } catch (hiba) {
    /*
      A HIBA NEM TORI EL A LAPOT: a tudas-blokk kiegeszites, a lap nelkule is
      teljes. A valodi ok a naploba megy.
    */
    console.error("A termek-tudas vegpont nem valaszolt:", hiba)
    return null
  }
}
