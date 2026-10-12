import { headers } from "next/headers"

import { sitemapBemenet } from "@lib/data/sitemap-adat"
import { robotsHazirend } from "@lib/util/robots-hazirend"
import {
  SITEMAP_TIPUSOK,
  sitemapReszek,
  type SitemapTipus,
} from "@lib/util/sitemap-bejegyzesek"
import { urlsetXml, XML_FEJLECEK } from "@lib/util/sitemap-xml"

/**
 * EGY TIPUS SITEMAPJE (FE-5): `/sitemap/<tipus>.xml`. Ismeretlen tipus 404,
 * nem ures lista: egy elgepelt cim ne latsszon ervenyes, ures sitemapnek.
 */
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  props: { params: Promise<{ tipus: string }> },
) {
  const { tipus: nyers } = await props.params
  const tipus = nyers.replace(/\.xml$/, "") as SitemapTipus
  if (!nyers.endsWith(".xml") || !SITEMAP_TIPUSOK.includes(tipus))
    return new Response("Not found", { status: 404 })

  const hoszt = (await headers()).get("host")
  const { engedett } = robotsHazirend(hoszt)
  if (!engedett || !hoszt)
    return new Response(urlsetXml([]), { headers: XML_FEJLECEK })

  const reszek = sitemapReszek(await sitemapBemenet(`https://${hoszt}`, tipus))
  return new Response(urlsetXml(reszek[tipus]), { headers: XML_FEJLECEK })
}
