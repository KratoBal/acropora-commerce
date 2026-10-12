import { headers } from "next/headers"

import { LANDING_FORRAS } from "@lib/data/sitemap-adat"
import { robotsHazirend } from "@lib/util/robots-hazirend"
import { SITEMAP_TIPUSOK } from "@lib/util/sitemap-bejegyzesek"
import { sitemapIndexXml, XML_FEJLECEK } from "@lib/util/sitemap-xml"

/**
 * A SITEMAP INDEXE (FE-5): a tipusonkenti sitemapek listaja. Ugyanaz a
 * hazirend, mint a robotsnal: ahol a robots tilt, ott ures index all, cim nelkul.
 * A valogatasok csak akkor kerulnek bele, ha a forrasuk be van kotve (t9).
 *
 * A valasz a keres hosztnevetol fugg, ezert dinamikus (lasd a robots.ts-t).
 */
export const dynamic = "force-dynamic"

export async function GET() {
  const hoszt = (await headers()).get("host")
  const { engedett } = robotsHazirend(hoszt)
  const tipusok = SITEMAP_TIPUSOK.filter(
    (tipus) => tipus !== "valogatasok" || LANDING_FORRAS !== null,
  )
  const cimek =
    engedett && hoszt
      ? tipusok.map((tipus) => `https://${hoszt}/sitemap/${tipus}.xml`)
      : []
  return new Response(sitemapIndexXml(cimek), { headers: XML_FEJLECEK })
}
