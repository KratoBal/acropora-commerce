import { Metadata } from "next"
import { notFound } from "next/navigation"

import { markaHandleAlapjan } from "@lib/data/brands"
import {
  indexelhetoRobots,
  lapCim,
  markaLeiras,
  openGraph,
} from "@lib/seo/oldal-metaadat"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { markaCanonical } from "@lib/util/lap-canonical"
import { markaLapTorzs } from "@modules/collections/templates/marka-lap-torzs"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
}

/**
 * A MARKAOLDAL (SEO P0 PR 11, G2: `/hu/marka/{slug}`).
 *
 * A cim, a leiras es a canonical a marka-modulbol jon (az OS a gazdaja); a
 * termeklista ATMENETILEG meg a gyujtemenybol, ugyanazzal a handle-lel, mert
 * a vetites a `collection_id`-t is irja. Amig a lista at nem all a
 * kapcsolatra, a ket forras handle-je azonos (mindketto az OS `Brand.slug`).
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const marka = await markaHandleAlapjan(decodeHandleParam(params.handle))
  if (!marka) notFound()

  const cim = marka.seo_title ?? lapCim(marka.name)
  const leiras =
    marka.meta_description ?? markaLeiras(marka.name, marka.description)
  const canonical = markaCanonical(params.countryCode, params.handle)
  return {
    title: cim,
    description: leiras,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({
      cim,
      leiras,
      url: canonical,
      kepek: marka.logo_url ? [marka.logo_url] : [],
    }),
  }
}

/* ISR, mint a gyujtemeny-lap: a `?page` es a szurok belso utra mennek. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function MarkaPage(props: Props) {
  const params = await props.params
  return markaLapTorzs(
    params,
    {},
    `/${params.countryCode}/marka/${params.handle}`,
    true,
  )
}
