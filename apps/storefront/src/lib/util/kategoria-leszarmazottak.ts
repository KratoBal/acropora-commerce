/**
 * EGY KATEGORIA ES MINDEN LESZARMAZOTTJA -- TISZTA FUGGVENYBEN.
 *
 * MIERT LETEZIK: a Medusa `category_id[]` szuroje CSAK a KOZVETLEN
 * hozzarendeleseket adja vissza. Merve a teszt bolton (2026-09-08 22:3x):
 *
 *     Termekek   sajat 1279   a reszfaja 1337
 *     Eledelek   sajat  177   a reszfaja  184
 *
 * Vagyis egy szulo-kategoria lapja ma NEM mutatja a leszarmazottak termekeit --
 * a vevo egy csempet lat, es mogotte a sajat termekek hianyoznak.
 *
 * ES EZ NEM HIANYZO API-KEPESSEG. Az `mpath` mezo ott all a kategorian
 * (`pcat_...FP.pcat_...MK` alakban), es a lap MA IS lekeri mind a 219
 * kategoriat egy hivassal, `parent_category_id` mezovel egyutt. Az adat megvan,
 * a LEPES hianyzik -- ezt a fajta korlatot a jegyzeteink kilencediknek hivjak,
 * es a feloldasa nem hozzaferes-keres, hanem ez a fuggveny.
 *
 * MIERT A `parent_category_id`, ES NEM AZ `mpath`: a lap MAR most lekeri, tehat
 * a fuggveny a MAI lekerdezessel hasznalhato, valtoztatas nelkul. Az mpath
 * elotag-illesztese egy csapdat is hordoz (`pcat_AB` elotagja a `pcat_ABC`-nek),
 * amit kulon kellene orizni; a szulo-mezovel ez a kerdes elo sem all.
 */

/** Amit a fuggveny egy kategoriabol hasznal. Szandekosan a legszukebb alak. */
export interface KategoriaCsomopont {
  id: string
  parent_category_id?: string | null
}

/**
 * A KATEGORIA ONMAGA ES MINDEN LESZARMAZOTTJA, a fa bejarasaval.
 *
 * A GYOKER MINDIG BENNE VAN, meg akkor is, ha a listaban nem szerepel: a lap
 * annak a kategorianak a termekeit mutatja, tehat a sajat azonositoja nelkul a
 * lista ROVIDEBB lenne, mint a mai viselkedes -- vagyis a valtozas ELVENNE
 * valamit, ahelyett hogy hozzaadna.
 *
 * A CIKLUS-VEDELEM NEM ELMELETI: a fa a szerver adatabol jon, es egy onmagara
 * (vagy korbe) mutato szulo vegtelen bejarast adna. A vedelem nelkul ez nem
 * hibauzenet lenne, hanem egy lap, ami sosem tolt be.
 */
export function leszarmazottAzonositok(
  kategoriak: readonly KategoriaCsomopont[],
  gyokerId: string,
): string[] {
  const gyerekek = new Map<string, string[]>()
  for (const kategoria of kategoriak) {
    const szulo = kategoria.parent_category_id
    if (!szulo) continue
    const lista = gyerekek.get(szulo)
    if (lista) lista.push(kategoria.id)
    else gyerekek.set(szulo, [kategoria.id])
  }

  const ki: string[] = []
  const latott = new Set<string>()
  const sor: string[] = [gyokerId]

  while (sor.length) {
    const id = sor.shift() as string
    if (latott.has(id)) continue
    latott.add(id)
    ki.push(id)
    const gyerek = gyerekek.get(id)
    if (gyerek) sor.push(...gyerek)
  }

  return ki
}
