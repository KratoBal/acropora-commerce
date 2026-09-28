/**
 * MELYIK MODBAN JELENIK MEG EGY OLDAL: COMMERCE (VILAGOS) VAGY REEF (SOTET).
 *
 * A szabaly a PD-000 preflight 7. pontja (P1a) es a Figma Implementation Handoff
 * (262:3) szerint: a WYSIWYG, a hal es a gerinctelen utvonal Reef, minden mas
 * Commerce. ("Commerce kepernyok vilagos modúak; WYSIWYG/livestock Reef
 * kepernyok ... sotet Reef modúak.")
 *
 * A mod a meglevo `data-vilag` kapcsolora kepezodik le (`vilagModhoz`), tehat
 * nem uj mechanizmus, hanem uj dontes ugyanarra a kapcsolora.
 *
 * === MA SZANDEKOSAN NINCS BEKOTVE EGYETLEN MEGLEVO OLDALBA SEM ===
 *
 * A meglevo termeklap (`lap-vaz/vilag-valto.ts`) MAS szabalyt kovet: a Korallok
 * gyoker ALATT minden termek sotet, a nem WYSIWYG korall is. Ez a fuggveny egy
 * nem WYSIWYG korallt Commerce-nek (vilagosnak) mond. A ketto kozotti atallas
 * tehat LATHATO valtozas egy meglevo oldalon, es a P1a hatokore kimondja, hogy
 * meglevo oldalt nem rajzolunk at. Az atallas a P2-P3 dontese.
 *
 * A dontes a kategoria-UTVONAL NEVEIN all (gyokertol lefele), ugyanugy, mint a
 * meglevo vilag-valto: a kategoria-fa azonositoi kornyezetenkent masok, a nevek
 * a tarolt katalogusbol jonnek.
 */

export type AcroporaMod = "commerce" | "reef"

/** A gyoker-kategoriak, amelyek alatt minden Reef. */
export const REEF_GYOKEREK = ["Halak", "Gerinctelenek"] as const

/** Az utvonal barmely pontjan allo kategoria, ami Reef-be visz. */
export const REEF_KATEGORIA = "WYSIWYG"

const egyezik = (a: string, b: string) =>
  a.trim().toLocaleLowerCase("hu") === b.toLocaleLowerCase("hu")

export function modKategoriaUtvonalhoz(
  utvonal: readonly (string | null | undefined)[],
): AcroporaMod {
  const nevek = utvonal
    .map((nev) => (nev ?? "").trim())
    .filter((nev) => nev.length > 0)
  if (nevek.length === 0) return "commerce"
  const gyoker = nevek[0]
  if (REEF_GYOKEREK.some((reef) => egyezik(gyoker, reef))) return "reef"
  if (nevek.some((nev) => egyezik(nev, REEF_KATEGORIA))) return "reef"
  return "commerce"
}

/** A mod a meglevo `data-vilag` ertekere: Reef = "sotet", Commerce = "vilagos". */
export function vilagModhoz(mod: AcroporaMod): "sotet" | "vilagos" {
  return mod === "reef" ? "sotet" : "vilagos"
}
