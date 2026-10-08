import { generikusAlt } from "@lib/seo/generikus-alt"

/**
 * A GALERIA NAGY KEPENEK ALT-JA (Balazs 2026-10-07, 5. pont; barracuda atvetele,
 * #519).
 *
 * Itt korabban az allando `Termékfotó` allt, ami a dontesben szo szerint tiltott
 * generikus alt. A termek neve all a helyen; tobb kepnel a masodiktol a sorszam
 * is, hogy a felolvaso ne olvassa fel ugyanazt a nevet ketszer ugyanugy.
 * Nev nelkul `""`: inkabb diszito kep, mint egy szo, ami semmit nem mond.
 */
export function galeriaAlt(
  nev: string | null | undefined,
  index: number,
  darab: number,
): string {
  const tiszta = (nev ?? "").trim()
  if (!tiszta) return ""
  return darab > 1 && index > 0 ? `${tiszta} (${index + 1}. kép)` : tiszta
}

/**
 * A KEP SAJAT ALT-JA, AZ OS VETITESEBOL (SEO P0 PR 9).
 *
 * A Medusa kep-objektuma az alt-ot nem viszi, ezert az OS a termek
 * metaadataban kuldi: `acropora_images` = JSON szoveg, `[{url, alt, title}]`,
 * a BOLTI (Medusa) URL-lel. Ugyanez a kulcs az OS `medusa-metadata-merge.ts`
 * fajljaban all: a szerzodes ket repoban el, mint a `unique_piece`.
 *
 * Kimenet: URL -> alt, sima objektum (a kliens komponens propjakent at kell
 * mennie a hataron). Ami nem olvashato, az kimarad: rossz alaku metaadat egy
 * altot sem ad, es a lap a termek nevere esik vissza.
 */
export const KEPEK_METAADAT_KULCS = "acropora_images"

export function kepAltok(metadata: unknown): Record<string, string> {
  if (typeof metadata !== "object" || metadata === null) return {}
  const nyers = (metadata as Record<string, unknown>)[KEPEK_METAADAT_KULCS]
  if (typeof nyers !== "string") return {}
  let lista: unknown
  try {
    lista = JSON.parse(nyers)
  } catch {
    return {}
  }
  if (!Array.isArray(lista)) return {}
  const altok: Record<string, string> = {}
  for (const elem of lista) {
    if (typeof elem !== "object" || elem === null) continue
    const { url, alt } = elem as { url?: unknown; alt?: unknown }
    if (typeof url !== "string" || typeof alt !== "string") continue
    const tiszta = alt.trim()
    // a generikus alt (5. pont) akkor sem megy ki, ha a forras adja
    if (tiszta && !generikusAlt(tiszta)) altok[url] = tiszta
  }
  return altok
}

/**
 * A KEP ALT-JA: a sajat, ha van, kulonben a termek neve (`galeriaAlt`).
 */
export function kepAlt(
  altok: Record<string, string> | undefined,
  url: string | null | undefined,
  nev: string | null | undefined,
  index: number,
  darab: number,
): string {
  const sajat = url ? altok?.[url] : undefined
  return sajat ?? galeriaAlt(nev, index, darab)
}
