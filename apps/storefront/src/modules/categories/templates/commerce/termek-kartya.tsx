import { HttpTypes } from "@medusajs/types"

import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import {
  anyVariantPurchasable,
  availabilityOf,
  inventoryKnownOf,
  scarcityCountOf,
} from "@modules/products/components/stock-state/availability"

/**
 * A COMMERCE TERMEKKARTYA (P2, 2026-09-29), a 117:30 "Product Card" peldanyai
 * szerint (117:213, 117:229, 117:245).
 *
 * AMI A KERETBOL ADAT NELKUL MARADT KI, es a `docs/P2-CATEGORY.md` sorolja fel:
 * a muszaki "cue" sor (nincs muszaki parameter a katalogusban), az "AJÁNLOTT"
 * es "ÚJ" jelolo (nincs mogotte adat vagy szabaly), a kedvenc es az
 * osszehasonlitas jele (nincs mogotte funkcio).
 */

export type KeszletSor = { szoveg: string; kaphato: boolean }

/**
 * A KESZLET SORA ugyanazon a szabalyon, mint a termeklap: darabszam CSAK ott
 * all, ahol a `scarcityCountOf` is kiirna (a leltarig a nulla keszlet nem
 * jelenti, hogy elfogyott, ezert nem minden kaphato termeknek van szama).
 */
export function keszletSor(product: HttpTypes.StoreProduct): KeszletSor {
  const allapot = availabilityOf({
    inStock: anyVariantPurchasable(product),
    uniquePiece: false,
    inventoryKnown: inventoryKnownOf(product),
  })
  if (allapot !== "KAPHATO") return { szoveg: "Nincs raktáron", kaphato: false }
  const db =
    (product.variants?.length ?? 0) === 1
      ? scarcityCountOf(product.variants?.[0])
      : null
  return {
    szoveg: db ? `Raktáron – ${db} db` : "Rendelhető",
    kaphato: true,
  }
}

export default function CommerceTermekKartya({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const akcios = cheapestPrice?.price_type === "sale"
  const keszlet = keszletSor(product)
  const marka = (product.collection?.title ?? "").trim()
  const href = `/products/${product.handle}`

  return (
    <article
      className="flex h-full flex-col gap-2"
      data-testid="commerce-termek-kartya"
    >
      {/* A felso sor (117:207): az akcio jelolo, ha van. 30 px mindig all,
          hogy a kartyak egy vonalban maradjanak. */}
      <div className="flex h-[30px] items-center">
        {akcios && cheapestPrice?.percentage_diff ? (
          <span
            className="inline-flex h-[28px] items-center bg-acr-heritage px-2 text-[10px] font-medium tracking-[1.8px] text-acr-white"
            data-testid="kartya-akcio"
          >
            -{cheapestPrice.percentage_diff}%
          </span>
        ) : null}
      </div>
      <LocalizedClientLink
        href={href}
        className="group flex flex-1 flex-col border border-acr-line bg-acr-shell"
      >
        <div className="h-[242px] overflow-hidden bg-acr-white">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            className="h-full rounded-none p-0 shadow-none"
          />
        </div>
        <div className="flex flex-1 flex-col p-[14px]">
          {marka ? (
            <p
              className="text-[10px] font-medium uppercase leading-[12px] tracking-[1.8px] text-acr-slate"
              data-testid="kartya-marka"
            >
              {marka}
            </p>
          ) : null}
          <h2 className="mt-[6px] text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-acr-ink">
            {product.title}
          </h2>
          <div className="min-h-[18px] flex-1" />
          {cheapestPrice ? (
            <p className="flex items-baseline gap-[10px]">
              <span
                className="text-[24px] font-bold leading-[30px] tracking-[-0.3px] text-acr-ink"
                data-testid="kartya-ar"
              >
                {cheapestPrice.calculated_price}
              </span>
              {akcios ? (
                <span
                  className="text-[13px] leading-[18px] text-acr-slate line-through"
                  data-testid="kartya-regi-ar"
                >
                  {cheapestPrice.original_price}
                </span>
              ) : null}
            </p>
          ) : null}
          <p
            className="flex items-center gap-2 text-[13px] leading-[18px] text-acr-ink"
            data-testid="kartya-keszlet"
          >
            {/* A zold pont a keret sajat szine (I117:213;171:9); a Foundations
                palettaban nincs zold. */}
            <span
              className={
                "h-2 w-2 rounded-full " +
                (keszlet.kaphato ? "bg-[#2ea85e]" : "bg-acr-slate")
              }
              aria-hidden="true"
            />
            {keszlet.szoveg}
          </p>
          {/* A "Kosárba" gomb (137:2) a termeklapra visz, ahogy a regi kartya
              is: a listabol kosarba tetel kulon funkcio. Nem kaphato termeknel
              a felirat nem igeri a kosarat. */}
          <span className="mt-3 flex h-[44px] items-center justify-center bg-acr-heritage text-[14px] font-medium text-acr-white">
            {keszlet.kaphato ? "Kosárba" : "Részletek"}
          </span>
        </div>
      </LocalizedClientLink>
    </article>
  )
}
