import { Metadata } from "next"
import { epitesiHibaMegnevezve } from "@lib/util/build-time-failure"
import { STORE_NAME } from "@lib/store"
import { notFound } from "next/navigation"

import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    epitesiHibaMegnevezve("termek", error)
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
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

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const handle = decodeHandleParam(params.handle)
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | ${STORE_NAME}`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | ${STORE_NAME}`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

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
      fields: "*categories",
    },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)
  const categories = await listCategories({ fields: "id,name,handle,parent_category_id" })

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
      categories={categories ?? []}
    />
  )
}
