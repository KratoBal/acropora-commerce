import { HttpTypes } from "@medusajs/types"

import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getImageProps } from "next/image"

/**
 * A KAPCSOLODO TERMEK KARTYAJA A 192:57 SZERINT (P2, 3b, 2026-09-29).
 *
 * "Ami még kellhet hozzá" (193:186): 320 x 300 kep keret nelkul, alatta a
 * nev (500/14) es az ar (400/14, halvany), 10 pixeles kozokkel. Csak a
 * vilagos (muszaki) termeklap hasznalja; a tobbi lista a kozos
 * `ProductPreview`-n marad.
 */
export default function KapcsolatKartya({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const kep = product.thumbnail ?? product.images?.[0]?.url

  return (
    <LocalizedClientLink
      href={`/termek/${product.handle}`}
      className="group flex flex-col gap-[10px]"
      data-testid="kapcsolat-kartya"
    >
      <div className="aspect-[32/30] w-full overflow-hidden bg-acr-white">
        {/* termekkep, tehat a neve az alt-ja (Balazs 2026-10-07, 5. pont) */}
        {kep ? (
          <img
            // FE-3: a Next optimalizaloja; az arany a doboze (32/30)
            {...getImageProps({
              src: kep,
              alt: product.title ?? "",
              width: 320,
              height: 300,
              sizes: "(min-width: 1024px) 220px, 45vw",
            }).props}
            alt={product.title ?? ""}
            className="h-full w-full object-contain"
            data-testid="kapcsolat-kartya-kep"
          />
        ) : null}
      </div>
      <p className="text-[14px] font-medium leading-[18px] text-acr-ink group-hover:underline">
        {product.title}
      </p>
      {cheapestPrice ? (
        <p
          className="text-[14px] leading-[18px] text-acr-slate"
          data-testid="kapcsolat-kartya-ar"
        >
          {cheapestPrice.calculated_price}
        </p>
      ) : null}
    </LocalizedClientLink>
  )
}
