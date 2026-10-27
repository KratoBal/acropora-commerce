/**
 * AMI A LABLEC OLDALAIBAN MEG NEM EGYEZTETETT, ES AMIG IGY ALL, AZ ELESITESI
 * LISTA NEM FUTHAT ZOLDRE (acrobot 2026-10-27 19:58 UTC, a #606 donteshez).
 *
 * A Fizetes es a Szallitas oldal a regi bolt 2026-09-02-i szoveget viszi
 * (`regi-bolt-szovegek.ts`). Az uj bolt mas: arak, ingyenes-szallitasi kuszob,
 * a nehez aru. Azt, hogy mi legyen az oldalakon, Balazs donti el egyben (a
 * d707cf5f eles elotti lista); a szoveg irasa uzleti tartalom, nem a fejleszto
 * dolga. Addig minden ilyen oldal a lapon `MintaJelzo` cimket visel, es a
 * kapu (`/api/health/lablec-szovegek`) a darabszamot adja, ugyanugy, ahogy a
 * kezdolap kitalalt tenyeire a `kezdolap-minta`.
 *
 * HOGYAN KERUL KI EGY SOR: az egyeztetett oldal sora kikerul innen. Ettol a
 * cimke eltunik a lapról, es a kapu szama csokken: egy forras, ket hatas.
 */
export type LablecMinta = {
  /** Az oldal kulcsa a lapon es a kapuban. */
  kulcs: "szallitas" | "fizetes"
  /** Mi nincs egyeztetve; a cimke szovege. */
  mit: string
}

export const LABLEC_MINTA_SZOVEGEK: readonly LablecMinta[] = [
  {
    kulcs: "szallitas",
    mit: "a régi bolt szövege: az árak, az ingyenes szállítás küszöbe és a nehéz áru egyeztetésre vár",
  },
  {
    kulcs: "fizetes",
    mit: "a régi bolt szövege: a fizetési módok és a felárak egyeztetésre várnak",
  },
]

export const lablecMinta = (kulcs: LablecMinta["kulcs"]) =>
  LABLEC_MINTA_SZOVEGEK.find((m) => m.kulcs === kulcs)
