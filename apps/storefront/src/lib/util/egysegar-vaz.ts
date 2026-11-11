import { HttpTypes } from "@medusajs/types"

import { egysegarNevbol, type Egysegar } from "@lib/util/egysegar"
import { getProductPrice } from "@lib/util/get-product-price"

/**
 * AZ EGYSEGAR A TERMEKLAPON ES A LISTA-KARTYAN (commerce-audit-p1, P1/3; a kartyan d707cf5f, barracuda 7b): "Egységár: 5 000
 * Ft/kg", az ar alatt, abbol a nevbol, amit a feed is hasznal (`egysegar.ts`).
 *
 * UGYANAZT A NEVET NEZI, MINT A FEED: tobbvaltozatu termeknel a kivalasztott
 * valtozat opcioi zarojelben a termek neve utan ("Termék (250 ml)"), egyvaltozatunal
 * a nev maga. Valtozat KIVALASZTASA nelkul tobbvaltozatu termeken nincs
 * egysegar (nem tudjuk, melyik kiszerelesre vonatkozna). Az ar a valasztott
 * valtozat vetelara, az akcios ar, ha van.
 *
 * TISZTA FUGGVENY, NEM KLIENS-MODUL: a lista-kartya szerveren renderel, es egy `"use client"` fajlbol importalva a
 * fuggveny kliens-referencia lenne, nem hivhato.
 */
export function egysegarVaz(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant | null,
): Egysegar | null {
  const tobbvaltozatu = (product.variants?.length ?? 0) > 1
  if (tobbvaltozatu && !variant) return null

  const opciok = (variant?.options ?? [])
    .map((o) => o.value?.trim())
    .filter(Boolean)
  const nev =
    tobbvaltozatu && opciok.length
      ? `${product.title} (${opciok.join(", ")})`
      : product.title

  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })
  const ar = variant ? variantPrice : cheapestPrice
  return egysegarNevbol(nev, ar?.calculated_price_number)
}
