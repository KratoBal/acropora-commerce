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
 *
 * === 2026-10-06: A REKORD AZT ALLITJA, AMIT A VEVO KAPOTT (kartya 4a2b252d) ===
 *
 * A Fogyasztobarat-bekotes kapcsoloval jar (`NEXT_PUBLIC_FOGYASZTOBARAT_ENABLED`),
 * es Balazs 2026-10-05-en kikapcsoltatta. Kikapcsolva a `/jogi/aszf` oldal NEM a
 * Fogyasztobarat szoveget mutatja, hanem a mai bolt ASZF-jere visz -- a rekord
 * eddig megis a Fogyasztobarat verziojat irta. Mostantol (acrobot dontese,
 * 2026-10-06 17:06):
 *
 *   kikapcsolva   a mai bolt ASZF-je, a regi verzioval (`unas-shop-2026-09-29`)
 *   bekapcsolva   a Fogyasztobarat dokumentuma, a HATALYDATUMMAL es a tartalom
 *                 LENYOMATAVAL, amit a szerver az elfogadaskor kerdez le
 *
 * A Fogyasztobarat fejlecben nem ad verziot (se ETag, se Last-Modified, merve
 * 2026-10-06); a dokumentum szovege viszont kimondja, mitol hatalyos. A ketto
 * egyutt mondja meg, MELYIK szoveget fogadta el a vevo, akkor is, ha a
 * Fogyasztobarat a regi allapotot nem adja vissza.
 */
import {
  FOGYASZTOBARAT_ID,
  dokumentumForras,
  jogiDokumentum,
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

/** A mai bolt ASZF-je: ezt kapja a vevo, amig a Fogyasztobarat ki van kapcsolva. */
export const ASZF_VERZIO_MAI_BOLT = "unas-shop-2026-09-29"
export const ASZF_FORRAS_MAI_BOLT = jogiDokumentum("aszf")!.maiBoltCim!

/** A lenyomat helyen, ha a lekeres nem sikerult: a rendeles ettol meg leadhato. */
export const LENYOMAT_NINCS = "nincs"

/**
 * Amit a vevo az elfogadas pillanataban kapott. A Fogyasztobarat agon a
 * hatalydatum es a lenyomat `null`, ha a szerver nem tudta lekerdezni.
 */
export type AszfDokumentumAllapot =
  | { tipus: "mai-bolt" }
  | {
      tipus: "fogyasztobarat"
      hatalyos: string | null
      lenyomat: string | null
    }

export type AszfElfogadas = {
  idopont: string
  verzio: string
  dokumentum: string
  /** Csak a Fogyasztobarat agon: a dokumentum szerinti hatalydatum (ÉÉÉÉ-HH-NN). */
  hatalyos?: string | null
  /** Csak a Fogyasztobarat agon: `sha256:<hex>`, vagy `nincs`. */
  lenyomat?: string
}

/** Az elfogadas rekordja egy adott pillanatra, abbol, amit a vevo kapott. */
export function aszfElfogadas(
  most: Date,
  dokumentum: AszfDokumentumAllapot,
): AszfElfogadas {
  if (dokumentum.tipus === "mai-bolt")
    return {
      idopont: most.toISOString(),
      verzio: ASZF_VERZIO_MAI_BOLT,
      dokumentum: ASZF_FORRAS_MAI_BOLT,
    }
  return {
    idopont: most.toISOString(),
    verzio: ASZF_VERZIO,
    dokumentum: ASZF_FORRAS,
    hatalyos: dokumentum.hatalyos,
    lenyomat: dokumentum.lenyomat ?? LENYOMAT_NINCS,
  }
}

/**
 * A HATALYDATUM A DOKUMENTUM SZOVEGEBOL. A Fogyasztobarat az ASZF fejleceben
 * irja: „<bolt> - hatályos ettől a naptól: <span …>2026-10-05</span>”. Ha nincs
 * ilyen sor, `null`: a rekord nem talal ki datumot.
 */
export function aszfHatalyDatum(html: string): string | null {
  const talalat =
    /hat[aá]lyos\s+ett[oő]l\s+a\s+napt[oó]l:\s*(?:<[^>]*>\s*)*(\d{4}-\d{2}-\d{2})/i.exec(
      html,
    )
  return talalat ? talalat[1]! : null
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
