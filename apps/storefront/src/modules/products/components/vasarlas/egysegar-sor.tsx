"use client"

import { HttpTypes } from "@medusajs/types"

import { egysegarNevbol, type Egysegar } from "@lib/util/egysegar"
import { getProductPrice } from "@lib/util/get-product-price"
import { convertToLocale } from "@lib/util/money"

import { useVasarlas } from "./kontextus"

/**
 * AZ EGYSEGAR-SOR A TERMEKLAPON (commerce-audit-p1, P1/3): "Egységár: 5 000
 * Ft/kg", az ar alatt, abbol a nevbol, amit a feed is hasznal (`egysegar.ts`).
 *
 * UGYANAZT A NEVET NEZI, MINT A FEED: tobbvaltozatu termeknel a kivalasztott
 * valtozat opcioi zarojelben a termek neve utan ("Termék (250 ml)"), egyvaltozatunal
 * a nev maga. Valtozat KIVALASZTASA nelkul tobbvaltozatu termeken nincs
 * egysegar (nem tudjuk, melyik kiszerelesre vonatkozna). Az ar a valasztott
 * valtozat vetelara, az akcios ar, ha van.
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

export function EgysegarSor() {
  const a = useVasarlas()
  if (!a) return null
  const egysegar = egysegarVaz(a.product, a.selectedVariant)
  if (!egysegar) return null
  const penz = convertToLocale({
    amount: egysegar.ar,
    currency_code: a.selectedVariant?.calculated_price?.currency_code ?? "huf",
  })
  return (
    <p
      className="text-[12.5px]"
      style={{
        marginTop: "4px",
        color: "var(--terv-szoveg-halvany)",
        fontFamily: "var(--terv-betu-fo-lanc)",
      }}
      data-testid="vaz-egysegar"
      data-kiszereles={egysegar.kiszereles}
    >
      Egységár: {penz}/{egysegar.alap}
    </p>
  )
}
