import { Metadata } from "next"
import { epitesiHibaMegnevezve } from "@lib/util/build-time-failure"
import { STORE_NAME } from "@lib/store"
import { notFound } from "next/navigation"
import { termekLapTorzs } from "@modules/products/templates/termek-lap-torzs"

import { termeklapCanonical } from "@lib/util/lap-canonical"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat(),
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
        })),
      )
      .filter((param) => param.handle)
  } catch (error) {
    epitesiHibaMegnevezve("termek", error)
  }
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
    /*
     * A KANONIKUS CIM A NYERS, KODOLT HANDLE-BOL EPUL, nem a `handle`
     * valtozobol -- az `decodeHandleParam`-en ment at, es egy URL-be a KODOLT
     * alak valo. Az indoklas a `lap-canonical.ts` fejleceben all.
     */
    alternates: {
      canonical: termeklapCanonical(params.countryCode, params.handle),
    },
    openGraph: {
      title: `${product.title} | ${STORE_NAME}`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

/*
 * FE-7 3. resz: az alaplap nem olvas `searchParams`-t, tehat ISR. A `?v_id`
 * belso utra megy (`belso-utvonalak.js`); a torzs kozos
 * (`termek-lap-torzs.tsx`).
 */
export const revalidate = 300

export default async function ProductPage(props: Props) {
  return termekLapTorzs(await props.params)
}
