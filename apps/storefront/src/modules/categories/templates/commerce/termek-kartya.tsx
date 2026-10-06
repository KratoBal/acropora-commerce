import { HttpTypes } from "@medusajs/types"

import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import {
  maximumOrderQuantity,
  minimumOrderQuantity,
} from "@modules/products/components/product-actions/minimum-order-quantity"
import { keszletSor } from "@modules/products/components/stock-state/availability"

import KosarbaGomb from "./kosarba-gomb"

/**
 * A COMMERCE TERMEKKARTYA (P2, 2026-09-29), a 117:30 "Product Card" peldanyai
 * szerint (117:213, 117:229, 117:245).
 *
 * AMI A KERETBOL ADAT NELKUL MARADT KI, es a `docs/P2-CATEGORY.md` sorolja fel:
 * a muszaki "cue" sor (nincs muszaki parameter a katalogusban), az "AJÁNLOTT"
 * es "ÚJ" jelolo (nincs mogotte adat vagy szabaly), a kedvenc es az
 * osszehasonlitas jele (nincs mogotte funkcio).
 */

/*
  A KESZLET SORA a termek-modulban el (`keszletSor`), mert a termeklap
  zarosora is ezt mondja (P2, 3b). Innen tovabbadva, hogy a kartya es a
  tesztjei valtozatlanul importalhassak.
*/
export { keszletSor }
export type { KeszletSor } from "@modules/products/components/stock-state/availability"

/**
 * A GYORS KOSARBA TETEL, HA SZABAD (acrobot dontese, 2026-09-29 09:02).
 *
 * Csak EGYVALTOZATOS, kaphato termeknel, a termeklap szabalyaval: a mennyiseg
 * a termek rendelesi minimuma (ezzel indul a termeklap szamlaloja is). Ha a
 * rendelesi maximum, vagy a kezelt, utanrendeles nelkuli keszlet ennel
 * kevesebb, a gyors ut nem ad jo mennyiseget, tehat nincs gyors ut: a gomb a
 * termeklapra visz. Minden mas esetben is (tobb valtozat, nem kaphato) `null`.
 */
export function gyorsKosar(
  product: HttpTypes.StoreProduct,
): { variantId: string; quantity: number } | null {
  const valtozatok = product.variants ?? []
  if (valtozatok.length !== 1 || !valtozatok[0].id) return null
  if (!keszletSor(product).kaphato) return null

  const v = valtozatok[0]
  const minimum = minimumOrderQuantity(product)
  const rendelesiMax = maximumOrderQuantity(product)
  const keszletMax =
    v.manage_inventory && !v.allow_backorder
      ? (v.inventory_quantity ?? 0)
      : null
  if (rendelesiMax !== null && rendelesiMax < minimum) return null
  if (keszletMax !== null && keszletMax < minimum) return null

  return { variantId: v.id, quantity: minimum }
}

export default function CommerceTermekKartya({
  product,
  tomor = false,
}: {
  product: HttpTypes.StoreProduct
  /**
   * TOMOR ALAK `small` ALATT (a keresesi talalatok mobil kerete, 254:87):
   * ket oszlop 170 px-es kartyakkal, 100 px-es kep, 13 px-es nev, 15 px-es
   * ar. Asztalon a kartya ugyanaz. A kategorialap nem kapcsolja be: ott
   * mobilon egy oszlop all.
   */
  tomor?: boolean
}) {
  /** Tomor kartyanal a mobil osztaly, kulonben a rendes. */
  const m = (tomorOsztaly: string, rendes: string) =>
    tomor ? tomorOsztaly : rendes
  const { cheapestPrice } = getProductPrice({ product })
  const akcios = cheapestPrice?.price_type === "sale"
  const keszlet = keszletSor(product)
  const marka = (product.collection?.title ?? "").trim()
  const href = `/products/${product.handle}`
  const gyors = gyorsKosar(product)

  return (
    <article
      className={m(
        "flex h-full flex-col gap-1 small:gap-2",
        "flex h-full flex-col gap-2",
      )}
      data-testid="commerce-termek-kartya"
    >
      {/* A felso sor (117:207): az akcio jelolo, ha van. 30 px mindig all,
          hogy a kartyak egy vonalban maradjanak. */}
      <div
        className={m(
          "flex h-[22px] items-center small:h-[30px]",
          "flex h-[30px] items-center",
        )}
      >
        {akcios && cheapestPrice?.percentage_diff ? (
          <span
            className={m(
              "inline-flex h-[20px] items-center bg-acr-heritage px-[6px] text-[9.5px] font-medium tracking-[1px] text-acr-white small:h-[28px] small:px-2 small:text-[10px] small:tracking-[1.8px]",
              "inline-flex h-[28px] items-center bg-acr-heritage px-2 text-[10px] font-medium tracking-[1.8px] text-acr-white",
            )}
            data-testid="kartya-akcio"
          >
            -{cheapestPrice.percentage_diff}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col border border-acr-line bg-acr-shell">
        <LocalizedClientLink href={href} className="group flex flex-1 flex-col">
          <div
            className={m(
              "h-[100px] overflow-hidden bg-acr-white small:h-[242px]",
              "h-[242px] overflow-hidden bg-acr-white",
            )}
          >
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              className="h-full rounded-none p-0 shadow-none"
            />
          </div>
          <div
            className={m(
              "flex flex-1 flex-col px-[10px] pt-[10px] small:px-[14px] small:pt-[14px]",
              "flex flex-1 flex-col px-[14px] pt-[14px]",
            )}
          >
            {marka ? (
              <p
                className="text-[10px] font-medium uppercase leading-[12px] tracking-[1.8px] text-acr-slate"
                data-testid="kartya-marka"
              >
                {marka}
              </p>
            ) : null}
            <h2
              className={m(
                "mt-1 text-[13px] font-semibold leading-[17px] text-acr-ink small:mt-[6px] small:text-[18px] small:font-bold small:leading-[22px] small:tracking-[-0.2px]",
                "mt-[6px] text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-acr-ink",
              )}
            >
              {product.title}
            </h2>
            <div
              className={m(
                "min-h-[8px] flex-1 small:min-h-[18px]",
                "min-h-[18px] flex-1",
              )}
            />
            {cheapestPrice ? (
              <p className="flex items-baseline gap-[10px]">
                <span
                  className={m(
                    "text-[15px] font-bold leading-[20px] text-acr-ink small:text-[24px] small:leading-[30px] small:tracking-[-0.3px]",
                    "text-[24px] font-bold leading-[30px] tracking-[-0.3px] text-acr-ink",
                  )}
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
              className={m(
                "flex items-center gap-[6px] text-[11.2px] leading-[15px] text-acr-ink small:gap-2 small:text-[13px] small:leading-[18px]",
                "flex items-center gap-2 text-[13px] leading-[18px] text-acr-ink",
              )}
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
          </div>
        </LocalizedClientLink>
        {/* A "Kosárba" gomb (137:2) a linken KIVUL all, mert gomb nem lehet
          linkben. Egyvaltozatos, kaphato termeknel valoban kosarba tesz;
          minden mas esetben "Részletek", a termeklapra. */}
        <div
          className={m(
            "px-[10px] pb-[10px] pt-2 small:px-[14px] small:pb-[14px] small:pt-3 max-small:[&_a]:h-[36px] max-small:[&_a]:text-[12.5px] max-small:[&_button]:h-[36px] max-small:[&_button]:text-[12.5px]",
            "px-[14px] pb-[14px] pt-3",
          )}
        >
          {gyors ? (
            <KosarbaGomb
              variantId={gyors.variantId}
              quantity={gyors.quantity}
              termekNev={product.title ?? ""}
              rendelesiMaximum={maximumOrderQuantity(product)}
            />
          ) : (
            <LocalizedClientLink
              href={href}
              className="flex h-[44px] items-center justify-center bg-acr-heritage text-[14px] font-medium text-acr-white"
              data-testid="kartya-reszletek"
            >
              Részletek
            </LocalizedClientLink>
          )}
        </div>
      </div>
    </article>
  )
}
