"use client"

import { createContext, useContext } from "react"
import { HttpTypes } from "@medusajs/types"

import type { Availability } from "../stock-state/availability"

/**
 * A KONTEXT KULON FAJLBAN AL, ES EZ NEM TAGOLASI IZLES -- MERES KENYSZERITETTE KI.
 *
 * A provider (`allapot.tsx`) a kosarba tetelt hivja (`@lib/data/cart`), es annak
 * a lancaban `server-only` modul all. Amig a negy doboz onnan vette a horgot,
 * MINDEN fajl, ami a dobozokat importalja, magaval hozta a kosar-modult is --
 * es a vaz ket specje NEM INDULT EL:
 *
 *   Error: This module cannot be imported from a Client Component module.
 *   Test Files  2 failed | 25 passed (27)
 *   Tests  219 passed (219)
 *
 * A SZAM MAGAS VOLT ES NOTT. Nem "nulla teszt futott le", hanem 219 zold --
 * csak epp ket fajl nem szolalt meg. Ugyanaz az alak, mint ma egyszer mar, es
 * a KILEPESI KOD arulta el (1), nem az osszegzes.
 *
 * Itt tehat nincs adat-import: csak a szerzodes es a horog. A provider ezt
 * tolti fel, a dobozok ezt olvassak, es a kosar-modul csak a provider fajljaban
 * all -- ott, ahova egy szerver-komponens amugy is elvezet.
 */
export type VasarlasAllapot = {
  product: HttpTypes.StoreProduct
  options: Record<string, string | undefined>
  setOptionValue: (optionId: string, value: string) => void
  selectedVariant: HttpTypes.StoreProductVariant | undefined
  isValidVariant: boolean | undefined
  quantity: number
  setQuantity: (value: number) => void
  normaliseQuantity: (value: number) => number
  minimumQuantity: number
  maximumQuantity: number | null
  quantityStep: number
  novelheto: boolean
  rendelesiMondat: string | null
  availability: Availability
  uniquePiece: boolean
  similarHref: string
  isAdding: boolean
  disabled: boolean
  handleAddToCart: () => Promise<null | void>
}

export const VasarlasKontextus = createContext<VasarlasAllapot | null>(null)

/**
 * `null`-t ad provider nelkul, es NEM dob hibat: a vaz specjei a dobozokat
 * provider nelkul is renderelik, es ott a helyes valasz a varakozas.
 */
export function useVasarlas(): VasarlasAllapot | null {
  return useContext(VasarlasKontextus)
}
