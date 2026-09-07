import { Metadata } from "next"
import { STORE_NAME } from "@lib/store"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: STORE_NAME,
  /*
   * A starter leirasa SAJAT MAGAROL szolt ("A performant frontend ecommerce
   * starter template with Next.js 15 and Medusa"). Az a mondat a keresok
   * talalati listajaban jelent volna meg a bolt fooldalarol.
   *
   * NEM TALALTAM KI HELYETTE MASIKAT: a fooldal leirasa marketing-dontes, es
   * egy kitalalt mondat ugyanugy tovabbutazna, mint a starter sajatja. Amig
   * nincs, a Next a cimbol dolgozik.
   */
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
