import { Metadata } from "next"
import { localeOf } from "@lib/i18n/locale"
import {
  lapCim,
  openGraph,
  termekLeiras,
  termekRobots,
} from "@lib/seo/oldal-metaadat"
import { epitesiHibaMegnevezve } from "@lib/util/build-time-failure"
import { notFound } from "next/navigation"
import { termekLapTorzs } from "@modules/products/templates/termek-lap-torzs"

import { termeklapCanonical } from "@lib/util/lap-canonical"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { listProducts } from "@lib/data/products"
import { nemKaphatoTermek } from "@lib/data/nem-kaphato"
import { translator } from "@lib/i18n/dictionary"
import { ELADOTT_LAP_MEZOK, nemElerhetoLapCim } from "@lib/util/eladott-darab"
import {
  anyVariantPurchasable,
  availabilityOf,
  inventoryKnownOf,
  uniquePieceOf,
} from "@modules/products/components/stock-state/availability"
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

  // a kaphatosaghoz a `manage_inventory` is kell: nelkule minden valtozat kaphatonak latszik (V2.4)
  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle, fields: ELADOTT_LAP_MEZOK },
  }).then(({ response }) => response.products[0])

  const locale = localeOf(params.countryCode)

  if (!product) {
    // a kifutott termek lapja (V4.2): korall meta-szovegei, a lapcim a V2.4 vagasaval
    const kifutott = await nemKaphatoTermek(handle)
    if (!kifutott) notFound()
    const t = translator(locale)
    const cim = nemElerhetoLapCim(
      kifutott.termek.title,
      t("discontinued.metaTitlePrefix"),
    )
    const leiras = t("discontinued.metaDescription")
    const canonical = termeklapCanonical(params.countryCode, params.handle)
    return {
      title: cim,
      description: leiras,
      alternates: { canonical },
      openGraph: openGraph({ cim, leiras, url: canonical, locale, kepek: [] }),
    }
  }

  /*
    A NEM ELERHETO EGYEDI DARAB LAPCIME (V2.4): "Nem elérhető: [nev]", ugyanaz a
    dontes, mint a lap ELADVA allapota; jelen ideju, mert a nulla keszlet ma sem
    eladas-meres (acrobot 42122).
  */
  const nemElerheto =
    availabilityOf({
      inStock: anyVariantPurchasable(product),
      uniquePiece: uniquePieceOf(product.metadata),
      inventoryKnown: inventoryKnownOf(product),
    }) === "ELADVA"
  const cim = nemElerheto
    ? nemElerhetoLapCim(
        product.title ?? "",
        translator(locale)("meta.unavailableTitlePrefix"),
      )
    : lapCim(product.title ?? "")
  const leiras = termekLeiras(product, locale)
  const canonical = termeklapCanonical(params.countryCode, params.handle)
  return {
    title: cim,
    description: leiras,
    robots: termekRobots(product.metadata),
    /*
     * A KANONIKUS CIM A NYERS, KODOLT HANDLE-BOL EPUL, nem a `handle`
     * valtozobol -- az `decodeHandleParam`-en ment at, es egy URL-be a KODOLT
     * alak valo. Az indoklas a `lap-canonical.ts` fejleceben all.
     */
    alternates: { canonical },
    openGraph: openGraph({
      cim,
      leiras,
      url: canonical,
      locale,
      kepek: product.thumbnail ? [product.thumbnail] : [],
    }),
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
