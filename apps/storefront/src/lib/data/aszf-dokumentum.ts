import { createHash } from "node:crypto"

import {
  ASZF_FORRAS,
  type AszfDokumentumAllapot,
  aszfHatalyDatum,
} from "@lib/util/aszf"
import {
  fogyasztobaratBekapcsolva,
  fogyasztobaratHibakod,
} from "@lib/util/fogyasztobarat"

/**
 * AZ ASZF, AHOGY A VEVO AZ ELFOGADAS PILLANATABAN KAPTA (kartya 4a2b252d;
 * acrobot dontese 2026-10-06 17:06).
 *
 * Kikapcsolt Fogyasztobaratnal a mai bolt ASZF-je: nincs mit lekerdezni.
 * Bekapcsolva a szerver lekeri a dokumentumot, es a hatalydatumot meg a
 * tartalom lenyomatat adja vissza.
 *
 * === A REFERER, ES MIERT A SAJAT BOLTI DOMAINUNK ===
 *
 * A Fogyasztobarat a teljes szoveget csak a bejegyzett domainrol adja ki; mas
 * Referer-re (vagy nelkule) 1002-es hibat ad (merve 2026-10-06: 154 KB kontra
 * 1400 bajt). A bejegyzett domain a mi boltunk, tehat a szerver a sajat bolti
 * cimunkkel kerdez.
 *
 * === MIERT NINCS `server-only` ===
 *
 * Csak a ket „use server” adatfajl hivja (`cart.ts`, `customer.ts`), es a
 * `node:crypto` miatt kliens-kotegbe forditasi hiba nelkul be sem kerulhet. A
 * `server-only` importtal viszont minden spec elhasalna, ami a ket adatfajlt
 * betolti es ezt a modult nem mockolja (merve: nyolc).
 *
 * === HA A LEKERES NEM SIKERUL, A RENDELES MEGY ===
 *
 * Halozati hiba, idotullepes, hibakod: a hatalydatum es a lenyomat `null`, a
 * rekordban `lenyomat: "nincs"`. A vevot nem allitja meg egy harmadik fel
 * szolgaltatasa; a rekord kimondja, mi hianyzik.
 */
export const FOGYASZTOBARAT_REFERER =
  process.env.FOGYASZTOBARAT_REFERER?.trim() || "https://shop.acropora.hu/"

/** Ennyit var a lekeresre, utana a rekord lenyomat nelkul megy. */
export const ASZF_LEKERES_MS = 4000

export async function aszfDokumentumMost(
  bekapcsolva: boolean = fogyasztobaratBekapcsolva(),
  lekeres: typeof fetch = fetch,
): Promise<AszfDokumentumAllapot> {
  if (!bekapcsolva) return { tipus: "mai-bolt" }
  const nincs: AszfDokumentumAllapot = {
    tipus: "fogyasztobarat",
    hatalyos: null,
    lenyomat: null,
  }
  try {
    const valasz = await lekeres(ASZF_FORRAS, {
      headers: { Referer: FOGYASZTOBARAT_REFERER },
      signal: AbortSignal.timeout(ASZF_LEKERES_MS),
      cache: "no-store",
    })
    const bajtok = new Uint8Array(await valasz.arrayBuffer())
    const szoveg = new TextDecoder("utf-8").decode(bajtok)
    if (!valasz.ok || fogyasztobaratHibakod(szoveg)) return nincs
    return {
      tipus: "fogyasztobarat",
      hatalyos: aszfHatalyDatum(szoveg),
      lenyomat: `sha256:${createHash("sha256").update(bajtok).digest("hex")}`,
    }
  } catch {
    return nincs
  }
}
