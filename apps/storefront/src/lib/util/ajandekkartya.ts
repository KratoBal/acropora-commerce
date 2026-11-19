/**
 * AZ AJÁNDÉKKÁRTYA A KOSÁRBAN (kártya 495c0007). A webshop kosár-jóváírásként viszi (`credit_lines`, `reference:
 * "gift_card"`): fizetőeszköz, nem kedvezmény, a végösszeg már nélküle számol. Itt csak az áll, amit a vevő lát belőle:
 * mennyit fizet, a kártya kódjának utolsó négy jele, és hogy maradt-e fizetendő.
 *
 * SAJÁT MODUL, a kedvezmény-üzenet okán: a `lib/data/cart.ts` `"use server"`, jsdom alatt be sem importálható.
 */

type JovairasSor = {
  amount?: number | string | null
  reference?: string | null
  metadata?: Record<string, unknown> | null
}

export type KosarJovairassal = {
  total?: number | null
  credit_lines?: (JovairasSor | null)[] | null
}

export type AjandekkartyaJovairas = { osszeg: number; utolso4: string | null }

/** A kosáron álló ajándékkártya-jóváírás, vagy null. Egy kosáron egy kártya áll (a webshop cseréli). */
export function ajandekkartyaJovairas(kosar: KosarJovairassal | null | undefined): AjandekkartyaJovairas | null {
  const sor = (kosar?.credit_lines ?? []).find((s) => s?.reference === "gift_card")
  if (!sor) return null
  const utolso4 = sor.metadata?.code_last4
  return { osszeg: Number(sor.amount ?? 0), utolso4: typeof utolso4 === "string" ? utolso4 : null }
}

/** A kártya mindent fizet: nincs fizetési lépés (a starter `paidByGiftcard` ága). */
export function ajandekkartyavalFizetve(kosar: KosarJovairassal | null | undefined): boolean {
  return !!ajandekkartyaJovairas(kosar) && (kosar?.total ?? 0) === 0
}

export const KARTYA_NEM_HASZNALHATO =
  "Ez az ajándékkártya nem használható: hibás a kód, lejárt, ki van kapcsolva, vagy nincs rajta egyenleg."

export const KARTYA_MOST_NEM_ELLENORIZHETO =
  "Az ajándékkártyát most nem tudjuk ellenőrizni. Próbáld meg újra."

/**
 * A vevőnek szánt mondat a webshop válaszából. 400: a kód nem használható (egy mondat minden okra, a webshop is így
 * felel). 409: a webshop saját mondata (vegyes kosár, nincs fizetendő, már rendelés lett). Minden más (5xx, hálózat):
 * NEM a kód a baj, tehát nem mondjuk azt, hogy rossz.
 */
export function ajandekkartyaUzenet(allapot: number | undefined, szerverUzenet?: string): string {
  if (allapot === 400) return KARTYA_NEM_HASZNALHATO
  if (allapot === 409 && szerverUzenet?.trim()) return szerverUzenet.trim()
  return KARTYA_MOST_NEM_ELLENORIZHETO
}
