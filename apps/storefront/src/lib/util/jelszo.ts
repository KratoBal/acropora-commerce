/**
 * A JELSZO MINIMALIS HOSSZA (audit P1/8, B9): tiz karakter az uj jelszonal, a
 * regisztracional es a cserenel egyarant. Korabban nem volt hossz-szabaly
 * (acrobot, 2026-09-29), egykarakteres jelszo is atment. Karaktert szamolunk,
 * nem bajtot, tehat az ekezetes betu egy.
 *
 * A hatter ugyanezt tartja (`password-rules.ts`, `PASSWORD_MIN_LENGTH`), es
 * az a mérvadó: ez az ellenorzes csak azt adja, hogy a vevo magyar mondatot
 * kapjon a hivas elott. A BELEPESNEL nincs hossz-ellenorzes, hogy a regi, rovid
 * jelszavu fiok bejuthasson.
 */
export const JELSZO_MIN_HOSSZ = 10

export const JELSZO_ROVID_UZENET = `A jelszó legalább ${JELSZO_MIN_HOSSZ} karakter legyen.`

export const jelszoHosszuEleg = (jelszo: unknown): boolean =>
  typeof jelszo === "string" && Array.from(jelszo).length >= JELSZO_MIN_HOSSZ

/**
 * A JELSZOCSERE ELLENORZESE (P5, 257:191), a szerveren is: az ures mezo, az
 * eltero uj jelszo es a rovid uj jelszo akad meg.
 */
export type JelszoCsereUrlap = {
  jelenlegi: FormDataEntryValue | null
  uj: FormDataEntryValue | null
  ujUjra: FormDataEntryValue | null
}

export function jelszoCsereHiba(urlap: JelszoCsereUrlap): string | null {
  if (!urlap.jelenlegi || !urlap.uj || !urlap.ujUjra) {
    return "Mindhárom mező kitöltése kötelező."
  }
  if (urlap.uj !== urlap.ujUjra) return "A két új jelszó nem egyezik."
  if (!jelszoHosszuEleg(urlap.uj)) return JELSZO_ROVID_UZENET
  return null
}

/** A backend mondata a rossz jelenlegi jelszora (`/store/customers/me/password`). */
export const ROSSZ_JELENLEGI_JELSZO = /current password is incorrect/i

export const ROSSZ_JELENLEGI_JELSZO_SZOVEG = "A jelenlegi jelszó nem helyes."
