import { notFound } from "next/navigation"

import { listCategories } from "@lib/data/categories"
import { termekTudas } from "@lib/data/product-knowledge"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { TERMEKLAP_FIELDS } from "@lib/data/termeklap-fields"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { HttpTypes } from "@medusajs/types"
import ProductTemplate from "@modules/products/templates"

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

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
      categories={categories ?? []}
      tudas={tudas}
      valtozatId={selectedVariantId}
    />
  )
}
