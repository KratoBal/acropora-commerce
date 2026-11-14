import { translator, type Translate } from "@lib/i18n/dictionary"

/**
 * A LETILTOTT "BOLTI ATVETEL" MAGYARAZATA (V2.5 B szelet, kartya ffa5d8c6).
 *
 * A Medusa `insufficient_inventory` jelzovel szurkiti az atvetel opciojat, ha a kosar valamelyik
 * tetelebol nincs elegendo az atvetel helyen. A jelzo NEM mondja meg, melyik tetel az. A kosar
 * lekerdezese tetelenkenti keszletet nem ad (merve a teszt kirakaton, 2026-11-14), ezert a nevet a
 * backend `GET /store/pickup-shortage` hozza, az atvetel HELYENEK keszletevel.
 */

/** Az opcio, amit a Medusa keszlethiany miatt letiltott, es a raktar azonositoja, amin a hianyt kerdezzuk. */
export type BoltiOpcio = {
  insufficient_inventory?: boolean | null
  service_zone?: {
    fulfillment_set?: {
      type?: string | null
      location?: { id?: string | null } | null
    } | null
  } | null
}

const atvetelOpciok = <T extends BoltiOpcio>(
  opciok: readonly T[] | null | undefined,
) =>
  (opciok ?? []).filter(
    (o) => o.service_zone?.fulfillment_set?.type === "pickup",
  )

/**
 * A letiltott bolti atvetel(ek) KOZOS raktara; `null`, ha egyik sincs letiltva, ha valamelyik raktara ismeretlen, vagy ha
 * a letiltottak TOBB kulonbozo raktarra mutatnak. Az utolso ket eset azert null: a nevek egy raktar keszletebol jonnek, es
 * a sorok mindegyike alatt ugyanaz a lista all, tehat tobb raktarnal a masodik bolt soraban az ELSO bolt hianyzo tetelet
 * neveznenk meg, ami ott lehet, hogy van keszleten (hamis allitas a vevonek; barracuda, #766). Null eseten az altalanos
 * mondat all, ami igaz mindegyik sorra.
 */
export function letiltottAtvetelRaktara(
  opciok: readonly BoltiOpcio[] | null | undefined,
): string | null {
  const raktarak = atvetelOpciok(opciok)
    .filter((o) => o.insufficient_inventory)
    .map((o) => o.service_zone?.fulfillment_set?.location?.id ?? null)
  const kulonbozo = new Set(raktarak)
  return raktarak.length > 0 && kulonbozo.size === 1 ? raktarak[0] : null
}

/** Minden bolti atvetel letiltott: ilyenkor a mod kartyaja sem valaszthato. Nincs atvetel = nincs mit letiltani. */
export function mindenAtvetelLetiltott(
  opciok: readonly BoltiOpcio[] | null | undefined,
): boolean {
  const atvetel = atvetelOpciok(opciok)
  return atvetel.length > 0 && atvetel.every((o) => o.insufficient_inventory)
}

/**
 * A mondat. A tetelek neve a backendtol jon; ha nincs nev (a lekerdezes nem sikerult, vagy nem talalt
 * egyet sem), az altalanos alak all: a vevo ettol is megtudja, MIERT szurke, csak a nevet nem.
 */
export function boltiAtvetelTiltvaSzoveg(
  tetelek: readonly string[] | null | undefined,
  t: Translate = translator("hu"),
): string {
  const nevek = (tetelek ?? []).map((n) => n.trim()).filter(Boolean)
  return nevek.length
    ? t("checkoutShipping.pickupBlocked", { item: nevek.join(", ") })
    : t("checkoutShipping.pickupBlockedUnknown")
}

/** A backend valasza (`{ lines: [{ title, handle }] }`) a cimek listajava; barmi mas alak `null`. */
export function hianyzoTetelekValaszbol(valasz: unknown): string[] | null {
  if (typeof valasz !== "object" || valasz === null) return null
  const sorok = (valasz as { lines?: unknown }).lines
  if (!Array.isArray(sorok)) return null
  const cimek: string[] = []
  for (const sor of sorok) {
    const cim = (sor as { title?: unknown } | null)?.title
    if (typeof cim === "string" && cim.trim()) cimek.push(cim.trim())
  }
  return cimek
}
