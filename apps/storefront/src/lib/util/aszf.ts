/**
 * AZ ASZF-ELFOGADAS RÖGZITESE (P5, acrobot dontese 2026-09-29 13:26): a
 * regisztracio IDOBELYEGET es az ASZF VERZIOJAT irja a vevo metadata
 * mezojebe. Egy kotelezo pipa magaban nem bizonyitek; ez az.
 *
 * === 2026-10-05 OTA A FOGYASZTOBARAT DOKUMENTUMA ===
 *
 * Eddig a hivatkozas a regi boltba vitt (`unas-shop-2026-09-29`). Mostantol az
 * ASZF-et es az adatkezelesi tajekoztatot a Fogyasztobarat adja, a kirakat sajat
 * oldalan (`/jogi/aszf`, `/jogi/adatkezeles`; Balazs kerese, Fogyasztobarat
 * szal). A rogzitett dokumentum a Fogyasztobarat FORRASA (a bolt azonositojaval),
 * a verzio a bolt azonositoja: a szoveget a Fogyasztobarat tartja karban, es az
 * elfogadas idopontja mondja meg, melyik allapotat fogadta el a vevo.
 *
 * A regi elfogadasok a regi verziot orzik (`unas-shop-2026-09-29`).
 */
import {
  FOGYASZTOBARAT_ID,
  dokumentumForras,
  jogiOldal,
} from "@lib/util/fogyasztobarat"

/** A metadata kulcs a vevon. A P4 es a fiok ugyanezt olvassa. */
export const ASZF_METADATA_KULCS = "aszf_elfogadas"

/** A ma elfogadott ASZF azonositoja: a Fogyasztobarat dokumentuma, a bolt azonositojaval. */
export const ASZF_VERZIO = `fogyasztobarat-${FOGYASZTOBARAT_ID}`

/** Az ASZF es az adatkezelesi tajekoztato a kirakat sajat oldalan. */
export const ASZF_CIM = jogiOldal("aszf")
export const ADATKEZELES_CIM = jogiOldal("adatkezeles")

/** Amit az elfogadas rekordja dokumentumkent megnevez: a Fogyasztobarat forrasa. */
export const ASZF_FORRAS = dokumentumForras("aszf")

export type AszfElfogadas = {
  idopont: string
  verzio: string
  dokumentum: string
}

/** Az elfogadas rekordja egy adott pillanatra. */
export function aszfElfogadas(most: Date): AszfElfogadas {
  return {
    idopont: most.toISOString(),
    verzio: ASZF_VERZIO,
    dokumentum: ASZF_FORRAS,
  }
}

/**
 * A REGISZTRACIO SZERVEROLDALI ELLENORZESE. A kliens `required` es a pipa
 * a bongeszoben is megall, de egy kozvetlen POST-ot nem allit meg: ez igen.
 * `null`, ha rendben; kulonben a vevonek szolo magyar mondat.
 */
export function regisztracioHiba(urlap: {
  aszf: FormDataEntryValue | null
  jelszo: FormDataEntryValue | null
  jelszoUjra: FormDataEntryValue | null
}): string | null {
  if (urlap.aszf !== "on") {
    return "A regisztrációhoz el kell fogadnod az ÁSZF-et és az adatkezelési tájékoztatót."
  }
  if (!urlap.jelszo || urlap.jelszo !== urlap.jelszoUjra) {
    return "A két jelszó nem egyezik."
  }
  return null
}
