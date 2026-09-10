import { headers } from "next/headers"
import type { MetadataRoute } from "next"

import { robotsHazirend } from "@lib/util/robots-hazirend"

/**
 * A `/robots.txt` KISZOLGALASA -- ES AMIERT NEM A STARTER KONFIGJAT KOTOTTUK BE.
 *
 * A repoban ott all egy `next-sitemap.js` a Medusa starterbol, `generateRobotsTxt: true`
 * ertekkel. HALOTT: a csomag nincs a fuggosegek kozott, egyetlen szkript sem futtatja, es
 * a `siteUrl` egy Vercel-valtozobol jon, amit nem hasznalunk. A `public/` mappaban egyetlen
 * fajl all, a favicon.
 *
 * ES A HAZIRENDJE `userAgent: "*", allow: "/"`. Aki azt "bekoti", a TESZT boltra publikal
 * egy mindent engedo robotsot -- pontosan az ellenkezojet annak, amiert ez a tetel letezik.
 * Ezert nem feltamasztottuk, hanem itt, kod-oldalon dol el, hosztnev szerint.
 *
 * A DONTES ES AZ INDOKA a `lib/util/robots-hazirend.ts` fejleceben all, a fuggveny mellett;
 * ide azert nem masolom at, mert ket helyen allo indok ket helyen avul el.
 *
 * === MIERT `force-dynamic` ===
 *
 * A valasz a KERES hosztnevetol fugg. Statikusan generalva egyetlen valasz szuletne, es az
 * a build kornyezetenek hosztneve szerint dontene minden kesobbi keresrol -- vagyis a
 * hosztnev-alapu szabaly csendben visszavaltozna beegetette.
 */
export const dynamic = "force-dynamic"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const fejlecek = await headers()
  const { engedett } = robotsHazirend(fejlecek.get("host"))

  return {
    rules: engedett
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
  }
}
