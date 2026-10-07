import { notFound } from "next/navigation"

import { listCategories } from "@lib/data/categories"
import { termekTudas } from "@lib/data/product-knowledge"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { TERMEKLAP_FIELDS } from "@lib/data/termeklap-fields"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { HttpTypes } from "@medusajs/types"
import ProductTemplate from "@modules/products/templates"
import {
  morzsaLd,
  termekCsoportLd,
  termekLd,
  valtozatGtin,
  type LatottElerhetoseg,
} from "@lib/seo/strukturalt-adat"
import { getBaseURL } from "@lib/util/env"
import { getProductPrice } from "@lib/util/get-product-price"
import { besorolasUt } from "@lib/util/kategoria-fa"
import { termeklapCanonical } from "@lib/util/lap-canonical"
import JsonLd from "@modules/common/components/json-ld"
import { cikkszam } from "@modules/products/components/lap-vaz/valodi-tartalom"
import {
  availabilityOf,
  csakUtanrendelesre,
  keszletIsmert,
  uniquePieceOf,
  valtozatKaphato,
} from "@modules/products/components/stock-state/availability"

/**
 * A TERMEKLAP TORZSE, KET UTNAK (FE-7 3. resz).
 *
 *   /products/h                     valtozat nelkul      ISR
 *   /_v/<valtozat>/products/h       a `?v_id=` atirasa   ISR, valtozatonkent
 *
 * Eddig a `page.tsx` a `searchParams.v_id`-t olvasta, es ettol minden termeklap
 * dinamikus volt. A valtozat most utvonal-szegmens (`belso-utvonalak.js`), es a
 * torzs a kepek MELLETT a vasarlodoboznak is atadja: Balazs SEO dontes, 2.
 * pont, kozvetlen megnyitaskor mar a kiszolgalt HTML-ben a helyes valtozat.
 * Eddig csak a kepet valasztotta ki, a doboz ures maradt, es a sajat effektje
 * a `v_id`-t ki is torolte a cimbol.
 */
function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string,
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function termekLapTorzs(
  params: { countryCode: string; handle: string },
  selectedVariantId?: string,
) {
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  /**
   * A `*categories` MEZO KERESE NEM DISZ: a lap ebbol donti el, hogy elo allat
   * vagy muszaki termek all-e elotte, es ezen mulik, melyik vazat kapja.
   *
   * MERVE, ES ELSORE ROSSZ VOLT: e nelkul a `product.categories` URES, a valto
   * pedig ilyenkor -- biztonsagos iranykent -- VILAGOSAT ad. A kovetkezmeny nem
   * hibauzenet volt, hanem az, hogy MINDEN termek a muszaki vazat kapta, az elo
   * allat lapja is. A tiszta fuggveny allitasai vegig zoldek voltak, mert azok
   * kozvetlenul atadott kategoriakkal dolgoznak: a szakadas a KOZOTTUK levo
   * atadasban allt, es csak a megrenderelt lapon latszott.
   *
   * ES A `+` ALAK NEM MUKODIK: a `fields=+categories` URESET ad vissza, a
   * `*categories` a teljes objektumot, `mpath`-tal egyutt -- azt olvassa a valto.
   */
  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: {
      handle: decodeHandleParam(params.handle),
      fields: TERMEKLAP_FIELDS,
    },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  /*
    IDEGEN VALTOZAT: 404 (FE-7 3. resz, barracuda elozetes review, 2. lelet).
    Az atiras csak az alakot nezi (`variant_` + 26 jel), tehat egy kitalalt
    azonosito eddig 200-at es egy uj ISR-bejegyzest kapott: a tar kivulrol
    korlatlanul tolthato volt. A torzs elejen all, nem `Suspense` alatt, hogy a
    valasz tenyleg 404 legyen.
  */
  if (
    selectedVariantId &&
    !pricedProduct.variants?.some((v) => v.id === selectedVariantId)
  ) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)
  const categories = await listCategories({
    fields: "id,name,handle,parent_category_id",
  })
  // a termek-tudas (PD-014): hiba vagy hianyzo tudas eseten null, a lap a mai
  const tudas = await termekTudas(pricedProduct.id)

  const { morzsa, termek } = strukturaltAdat(
    pricedProduct,
    categories ?? [],
    images ?? [],
    params,
  )

  return (
    <>
      <JsonLd adat={morzsa} />
      <JsonLd adat={termek} />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images ?? []}
        categories={categories ?? []}
        tudas={tudas}
        valtozatId={selectedVariantId}
      />
    </>
  )
}

/**
 * A TERMEKLAP STRUKTURALT ADATA (FE-2a). Minden ertek ugyanabbol jon, amit a
 * lap mutat:
 *
 *   morzsamenu     `besorolasUt` + a `nev` mezo, mint a `ProductBreadcrumb`
 *   ar, penznem    `getProductPrice`, mint a `ProductPrice` (`data-value`)
 *   elerhetoseg    `valtozatKaphato` + `availabilityOf`, mint a vasarlasi doboz
 *   cikkszam       `cikkszam`, mint a lap cim alatti sora
 *
 *   gtin           a valtozat `ean`/`upc` ervenyes kodja (FE-2b; a `barcode` nem forras)
 *
 * TOBBVALTOZATOS TERMEKEN ProductGroup (FE-2b): a valtozatok a sajat
 * araval es keszletevel, ugyanugy, ahogy a lap a `?v_id=` kivalasztasa utan
 * mutatja (`getProductPrice` a `variantId`-vel). Ar nelkuli valtozat kimarad,
 * mert egy ajanlat ar nelkul ervenytelen; ha egy sem marad, nincs blokk.
 */
export function strukturaltAdat(
  termek: HttpTypes.StoreProduct,
  kategoriak: {
    id: string
    name?: string | null
    handle?: string | null
    parent_category_id?: string | null
  }[],
  kepek: HttpTypes.StoreProductImage[],
  params: { countryCode: string; handle: string },
) {
  const alap = getBaseURL()
  const url = `${alap}${termeklapCanonical(params.countryCode, params.handle)}`
  const handleAzonositora = new Map(kategoriak.map((k) => [k.id, k.handle]))
  const ut = besorolasUt(termek, kategoriak)
  const nev = termek.title ?? ""

  // a handle ekezetet es vesszot is tartalmazhat: a JSON-LD URL-je kodolt alak
  const morzsa = morzsaLd([
    ...ut.map((k) => ({
      nev: k.nev,
      url: `${alap}/${params.countryCode}/categories/${encodeURIComponent(handleAzonositora.get(k.id) ?? "")}`,
    })),
    { nev, url },
  ])

  const valtozatok = termek.variants ?? []
  const kepUrlek = kepek.flatMap((k) => (k.url ? [k.url] : []))
  const elerhetosegE = (v: HttpTypes.StoreProductVariant): LatottElerhetoseg =>
    availabilityOf({
      inStock: valtozatKaphato(v),
      uniquePiece: uniquePieceOf(termek.metadata),
      inventoryKnown: keszletIsmert(v),
    })
  if (!nev) return { morzsa, termek: null }

  if (valtozatok.length > 1) {
    const opcioNev = new Map(
      (termek.options ?? []).map((o) => [o.id, o.title ?? ""]),
    )
    const tetelek = valtozatok.flatMap((v) => {
      const varAr = getProductPrice({
        product: termek,
        variantId: v.id,
      }).variantPrice
      if (!varAr) return []
      const elerhetoseg = elerhetosegE(v)
      return [
        {
          url: `${url}?v_id=${encodeURIComponent(v.id)}`,
          opciok: (v.options ?? []).map((o) => ({
            nev: opcioNev.get(o.option_id ?? "") ?? "",
            ertek: o.value ?? "",
          })),
          cikkszam: v.sku?.trim() || null,
          gtin: valtozatGtin(v),
          kepek: (v.images ?? []).flatMap((k) => (k.url ? [k.url] : [])),
          ar: varAr.calculated_price_number,
          penznem: String(varAr.currency_code ?? "").toUpperCase(),
          elerhetoseg,
          utanrendeles: elerhetoseg === "KAPHATO" && csakUtanrendelesre(v),
        },
      ]
    })
    if (!tetelek.length) return { morzsa, termek: null }
    return {
      morzsa,
      termek: termekCsoportLd({
        nev,
        url,
        csoportAzonosito: termek.id,
        marka: termek.collection?.title ?? null,
        kepek: kepUrlek,
        penznem: tetelek[0]!.penznem,
        kategoriaNevek: ut.map((k) => k.teljesNev),
        valtozatok: tetelek,
      }),
    }
  }

  const valtozat = valtozatok[0]
  const ar = getProductPrice({ product: termek }).cheapestPrice
  if (!valtozat || !ar) return { morzsa, termek: null }
  const elerhetoseg = elerhetosegE(valtozat)

  return {
    morzsa,
    termek: termekLd({
      nev,
      url,
      cikkszam: cikkszam(termek),
      marka: termek.collection?.title ?? null,
      kepek: kepUrlek,
      gtin: valtozatGtin(valtozat),
      ar: ar.calculated_price_number,
      penznem: String(ar.currency_code ?? "").toUpperCase(),
      elerhetoseg,
      utanrendeles: elerhetoseg === "KAPHATO" && csakUtanrendelesre(valtozat),
      kategoriaNevek: ut.map((k) => k.teljesNev),
    }),
  }
}
