/**
 * MELYIK MODBAN JELENIK MEG EGY OLDAL: COMMERCE (VILAGOS) VAGY REEF (SOTET).
 *
 * A szabaly Balazs dontese (2026-09-28, 18:52 UTC, Eldontendo szal): MINDEN
 * KORALL SOTET (Reef), a WYSIWYG-tol fuggetlenul, es ugyanigy a hal es a
 * gerinctelen; minden mas Commerce. A PD-000 preflight 7. pontja meg csak a
 * WYSIWYG korallt sorolta a Reef-be; a dontes ezt tagitotta.
 *
 * A mod a meglevo `data-vilag` kapcsolora kepezodik le (`vilagModhoz`), tehat
 * nem uj mechanizmus, hanem uj dontes ugyanarra a kapcsolora.
 *
 * === A MEGLEVO TERMEKLAPPAL MOSTANTOL EGYEZIK, ES EZT TESZT TARTJA IGY ===
 *
 * A `lap-vaz/vilag-valto.ts` ugyanezt a harom gyokeret sotetnek veszi
 * (`ELO_ALLAT_GYOKEREK`). A ket lista kulon el (ez `lib`, az `modules`), ezert
 * az `acropora-mod.spec.ts` kimondja, hogy egyeznek: ha az egyik valtozik, a
 * masik nem maradhat le szo nelkul.
 *
 * BEKOTVE MEG MINDIG NINCS: a bekotes a P2-P3 resze.
 *
 * A dontes a kategoria-UTVONAL NEVEIN all (gyokertol lefele), ugyanugy, mint a
 * meglevo vilag-valto: a kategoria-fa azonositoi kornyezetenkent masok, a nevek
 * a tarolt katalogusbol jonnek.
 */

export type AcroporaMod = "commerce" | "reef"

/** A gyoker-kategoriak, amelyek alatt minden Reef. */
export const REEF_GYOKEREK = ["Korallok", "Halak", "Gerinctelenek"] as const

/**
 * Az utvonal barmely pontjan allo kategoria, ami Reef-be visz. Ma a Korallok
 * alatt all, tehat a gyoker-szabaly mar lefedi; akkor szamit, ha egyszer mas
 * gyoker ala is kerul WYSIWYG ag.
 */
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
