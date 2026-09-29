/**
 * AZ ASZF-ELFOGADAS RÖGZITESE (P5, acrobot dontese 2026-09-29 13:26): a
 * regisztracio IDOBELYEGET es az ASZF VERZIOJAT irja a vevo metadata
 * mezojebe. Egy kotelezo pipa magaban nem bizonyitek; ez az.
 *
 * === A VERZIO MIERT SAJAT AZONOSITO, ES NEM AZ OLDAL DATUMA ===
 *
 * Az uj kirakatnak meg nincs sajat ASZF-je: a hivatkozas a MAI boltba visz
 * (`REGI_BOLT_HIVATKOZASOK`, a lablec listaja). Azon a lapon a tartalom
 * szkriptbol toltodik, a letoltott HTML-ben nincs datum (merve 2026-09-29).
 * A verzio tehat a MI azonositonk, a dokumentum cimevel egyutt.
 *
 * AMI EZT ERVENYTELENITI: ha az ASZF szovege valtozik, vagy az uj kirakat
 * sajat ASZF-lapot kap (az elesites elott kotelezo), az `ASZF_VERZIO`-t
 * emelni kell ES a cimet atirni. A regi elfogadasok a regi verziot orzik.
 */
import { REGI_BOLT_HIVATKOZASOK } from "@modules/layout/templates/footer/hivatkozasok"

/** A metadata kulcs a vevon. A P4 es a fiok ugyanezt olvassa. */
export const ASZF_METADATA_KULCS = "aszf_elfogadas"

/** A ma hivatkozott ASZF azonositoja; ASZF-valtozaskor emelni kell. */
export const ASZF_VERZIO = "unas-shop-2026-09-29"

const cim = (cimke: string) =>
  REGI_BOLT_HIVATKOZASOK.find((h) => h.cimke === cimke)?.cim ?? ""

/** Az ASZF es az adatkezelesi tajekoztato cime, a lablec egyetlen listajabol. */
export const ASZF_CIM = cim("Általános szerződési feltételek")
export const ADATKEZELES_CIM = cim("Adatkezelési tájékoztató")

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
    dokumentum: ASZF_CIM,
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
