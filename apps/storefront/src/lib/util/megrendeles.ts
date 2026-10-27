/**
 * A MEGRENDELES GOMBJA ES A PIPA SZOVEGE (commerce-audit-p0, P0-1, 2026-10-27).
 *
 * A 45/2014. Korm. rendelet szerint a gombnak vagy a vele egyenerteku feliratnak
 * egyertelmuen jeleznie kell, hogy a megrendeles fizetesi kotelezettseggel jar;
 * a „Rendelés leadása” ezt nem mondja ki (audit 07-fizetes-rendeles, P0 #1).
 *
 * A DONTES BALAZSE (2026-10-27 09:27 UTC, Commerce lepesek szal, msg
 * 1564571348057989152, a kockazatot ismeri): a gomb felirata „Megrendel”, mint a
 * mai UNAS-penztarban. A KOTELEZETTSEG KIMONDASA IGY A PIPAN ALL, nem a gombon:
 * a jelolonegyzet szovege szo szerint az UNAS-e (Balazs mutatta a mai penztarat,
 * `exchange/commerce-audit-2026-10-27/unas-penztar-jelolo.png`), es kotelezo,
 * szerveroldalon is (`apps/backend/.../aszf-guard.ts`).
 *
 * EGY HELYEN ALL, HOGY EGY SORRAL CSERELHETO LEGYEN: ha a gomb felirata
 * megvaltozik (pl. „Fizetési kötelezettséggel járó megrendelés”, amit az audit
 * jogi minimumkent nevez meg), ez az egy konstans mozdul, es vele az osszes
 * leado gomb (kartya, utanvet, elore utalas).
 */
export const MEGRENDEL_GOMB_FELIRAT = "Megrendel"

/**
 * A pipa szovege reszekben, mert ket kifejezes hivatkozas. A reszek egymas utan
 * olvasva a szo szerinti szoveg (`ASZF_PIPA_SZOVEG`).
 */
export const ASZF_PIPA_RESZEK = {
  elso: "Elfogadom az ",
  aszf: "Általános szerződési feltételeket",
  koztes: " és az ",
  adatkezeles: "Adatkezelési tájékoztatót",
  vege: ". Tudomásul veszem, hogy a megrendelés elküldése fizetési kötelezettséggel jár.",
} as const

export const ASZF_PIPA_SZOVEG = Object.values(ASZF_PIPA_RESZEK).join("")
