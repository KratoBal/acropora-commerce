"use server"

import { sdk } from "@lib/config"
import { getPublicCacheOptions } from "./cookies"

/**
 * A TERMEK-TUDAS, AHOGY AZ ACROPORA OS VETITI (KZ Amino szelet, PD-014).
 *
 * A hatteroldal `/store/product-knowledge/:id` vegpontja a szerzodes alakjat adja.
 * Az OS a gazda: a kirakat csak olvas, es semmit nem ir vissza.
 *
 * GYORSITOTARAZVA, DE KORLATOS IDEIG (`revalidate`), NEM OROKRE.
 *
 * Eddig `force-cache` allt itt a `products` cimkevel, ugyanugy, mint a termeknel.
 * A cimket viszont semmi nem ervenyteleniti, tehat a tudas a gyorsitotar
 * kitorleseig es a kirakat ujrainditasaig valtozatlan maradt (KZ Amino stage
 * futas, #1431 komment 5972125293, 6. lelet). Egy jovahagyott szoveg-csere igy
 * soha nem ert volna el a lapra, es az elavult szoveg sem tunt volna el.
 *
 * A ket ut kozul a kisebbik helyes: egy cimke-ervenytelenito vegpontot a
 * vetitonek kellene hivnia (uj titok, uj cim mindket oldalon), a korlatos
 * ido viszont egy sor. A lap a valtozas utan legfeljebb TUDAS_FRISSITES_MP
 * masodperccel, a kovetkezo lekereskor mar az uj tudast kapja: lejart bejegyzesnel
 * a Next a regit adja vissza es a hatterben ujrakeri (stale-while-revalidate).
 * A `no-store` NEM kell hozza, tehat a lap renderelesi modja nem valtozik.
 */
const TUDAS_FRISSITES_MP = 60

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
      next: {
        ...(await getPublicCacheOptions("products")),
        revalidate: TUDAS_FRISSITES_MP,
      },
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
