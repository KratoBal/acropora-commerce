/**
 * A JELSZOCSERE ELLENORZESE (P5, 257:191), a szerveren is. Hossz-szabaly nincs,
 * ahogy a regisztracional sem (acrobot, 2026-09-29): csak az ures mezo es az
 * eltero uj jelszo akad meg.
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
  return null
}

/** A backend mondata a rossz jelenlegi jelszora (`/store/customers/me/password`). */
export const ROSSZ_JELENLEGI_JELSZO = /current password is incorrect/i

export const ROSSZ_JELENLEGI_JELSZO_SZOVEG = "A jelenlegi jelszó nem helyes."
