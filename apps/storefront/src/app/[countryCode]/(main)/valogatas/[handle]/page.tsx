import { Metadata } from "next"
import { notFound } from "next/navigation"

import { valogatasHandleAlapjan } from "@lib/data/valogatas"
import {
  indexelhetoRobots,
  lapCim,
  leirasSzovegbol,
  openGraph,
} from "@lib/seo/oldal-metaadat"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { valogatasCanonical } from "@lib/util/lap-canonical"
import { valogatasErvenyes, valogatasLeirasForrasa } from "@lib/util/valogatas"
import { valogatasLapTorzs } from "@modules/valogatas/valogatas-lap-torzs"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
}

/**
 * A VÁLOGATÁS (SEO LANDING) LAPJA (SEO P1-14, t10; Balázs döntése:
 * `/hu/valogatas/{slug}`). A cím, a leírás és a canonical a landing read
 * modelből jön (#541); az érvénytelen szűrőjű lap 404.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const valogatas = await valogatasHandleAlapjan(
    decodeHandleParam(params.handle),
  )
  if (!valogatas || !valogatasErvenyes(valogatas.filter)) notFound()

  const cim = valogatas.seo_title ?? lapCim(valogatas.title)
  const leiras =
    leirasSzovegbol(valogatasLeirasForrasa(valogatas)) ??
    `${valogatas.title}: válogatás az Acropora webáruházban.`
  const canonical = valogatasCanonical(params.countryCode, params.handle)
  return {
    title: cim,
    description: leiras,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({ cim, leiras, url: canonical }),
  }
}

/* ISR, mint a márkaoldal: a `?page` és a szűrő-paraméter belső útra megy. */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function ValogatasPage(props: Props) {
  return valogatasLapTorzs(await props.params, {})
}
