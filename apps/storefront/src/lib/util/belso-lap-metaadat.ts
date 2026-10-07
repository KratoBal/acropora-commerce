import type { Metadata } from "next"

/**
 * A BELSO UTAK METAADATA (FE-7 3. resz). A `_p` ut ugyanazt a lapot adja, mint
 * a publikus cim, tehat az alaplap `generateMetadata`-jat hasznalja, harom
 * kulonbseggel:
 *
 * 1. SAJAT CANONICAL (`?page=N`): az SEO Launch Audit kriteriuma ("a lapozas
 *    sajat canonical"). Az alaplap canonicalja a parameter nelkuli cim; a 2.
 *    lapon ugyanaz azt mondana, hogy a 2. lap az 1. masolata, es a kereso a 2.
 *    lap termekeit nem indexelne.
 * 2. AZ `og:url` UGYANAZ, MINT A CANONICAL (barracuda elozetes review): a
 *    ketto eddig elvalt, az OG az 1. lapra mutatott.
 * 3. A CIMBEN A LAPSZAM ("(2. oldal)"): kulonben a lapozott lapok cime az 1.
 *    lapeval azonos, ami duplikalt cimnek szamit.
 *
 * Ha az alaplapnak nincs canonicalja vagy OG-ja, itt sem kerul bele kitalalt.
 */
export function lapozottMetaadat(alap: Metadata, lap: string): Metadata {
  const canonical = alap.alternates?.canonical
  if (typeof canonical !== "string") return alap
  const sajat = `${canonical}?page=${lap}`
  return {
    ...alap,
    title: lapozottCim(alap.title, lap),
    alternates: { ...alap.alternates, canonical: sajat },
    ...(alap.openGraph ? { openGraph: { ...alap.openGraph, url: sajat } } : {}),
  }
}

/** A cim a lapszammal; nem szoveges (sablon-) cimet erintetlenul hagy. */
export function lapozottCim(
  cim: Metadata["title"],
  lap: string | number,
): Metadata["title"] {
  return typeof cim === "string" ? `${cim} (${lap}. oldal)` : cim
}
