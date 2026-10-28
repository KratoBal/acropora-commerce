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

/*
 * A SZALLITAS OLDAL KIKERULT (Balázs, 2026-10-28 09:56 UTC, message
 * 1564940831658348567; acrobot 11:10): a kuszobok szolgaltatonkent a
 * beallitasokban (GLS 50 000, Foxpost 30 000, #611), az arak a teszt Medusa
 * beallitasi soraiban egyeznek a lappal (acrobot merte 2026-10-28 11:1x:
 * GLS 3 500, nehez 4 500, Foxpost 1 150), a nehez aru sora marad. A Fizetes
 * oldal marad, amig a fizetesi modok es a felarak nincsenek egyeztetve.
 */
export const LABLEC_MINTA_SZOVEGEK: readonly LablecMinta[] = [
  {
    kulcs: "fizetes",
    mit: "a régi bolt szövege: a fizetési módok és a felárak egyeztetésre várnak",
  },
]

export const lablecMinta = (kulcs: LablecMinta["kulcs"]) =>
  LABLEC_MINTA_SZOVEGEK.find((m) => m.kulcs === kulcs)
