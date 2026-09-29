/**
 * A BELEPES ES A REGISZTRACIO HIBAI MAGYARUL (P5). A szerver angol, nyers
 * uzenete ("Error: Invalid email or password") eddig valtozatlanul a vevo ele
 * kerult (merve a stage ellen, 2026-09-29). Az ismert eseteknek sajat mondata
 * van; minden mas egy altalanos mondatot kap, a nyers szoveg nem megy ki.
 */
const ISMERT: readonly [RegExp, string][] = [
  [/invalid email or password/i, "Hibás e-mail-cím vagy jelszó."],
  [
    /(identity|customer) with email already exists|email already exists/i,
    "Ezzel az e-mail-címmel már van fiók. Jelentkezz be.",
  ],
]

export const ALTALANOS_AUTH_HIBA =
  "Nem sikerült, próbáld újra. Ha újra előjön, írj nekünk."

export function authHibaSzoveg(hiba: unknown): string {
  const nyers = hiba instanceof Error ? hiba.message : String(hiba ?? "")
  return ISMERT.find(([minta]) => minta.test(nyers))?.[1] ?? ALTALANOS_AUTH_HIBA
}
