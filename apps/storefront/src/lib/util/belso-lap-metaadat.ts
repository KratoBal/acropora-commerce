import type { Metadata } from "next"

/**
 * A BELSO UTAK METAADATA (FE-7 3. resz). A `_p` es a `_szurt` ut ugyanazt a
 * lapot adja, mint a publikus cim, tehat az alaplap `generateMetadata`-jat
 * hasznalja. Egy kulonbseg van:
 *
 * A LAPOZOTT LAP SAJAT CANONICALT KAP (`?page=N`): az SEO Launch Audit
 * kriteriuma ("a lapozas sajat canonical"). Az alaplap canonicalja a
 * parameter nelkuli cim; a 2. lapon ugyanaz a canonical azt mondana, hogy a
 * 2. lap az 1. masolata, es a kereso a 2. lap termekeit nem indexelne.
 *
 * Ha az alaplapnak nincs canonicalja, itt sem kerul bele kitalalt.
 */
export function lapozottMetaadat(alap: Metadata, lap: string): Metadata {
  const canonical = alap.alternates?.canonical
  if (typeof canonical !== "string") return alap
  return {
    ...alap,
    alternates: { ...alap.alternates, canonical: `${canonical}?page=${lap}` },
  }
}
