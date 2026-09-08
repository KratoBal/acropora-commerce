import { HttpTypes } from "@medusajs/types"

/**
 * A minimális rendelési mennyiség a termék metaadatában érkezik, a vetítés
 * teszi oda `unas_minimum_order_quantity` néven.
 *
 * MIÉRT KELL, ÉS MIÉRT NEM KOZMETIKA. A léptető alsó határa 1 volt, a
 * katalógusban viszont TIZENHAT terméknél a minimum nem 1 (nyolcnál 10, hétnél
 * 100, egynél 5). Azoknál a vevő betehetett egyet a kosárba, és sem a léptető,
 * sem a lap nem szólt. A rendelés vagy rossz lesz, vagy elutasítjuk, és a vevő
 * csak akkor tudja meg.
 *
 * A POPULÁCIÓ A SZÁM MELLÉ TARTOZIK, mert ugyanerről MÁSIK szám is áll a
 * tárházban. Ez a tizenhat a 2026-09-02-i UNAS EXPORTON kelt. A kosár oldalán
 * (`cart/components/item/mennyiseg-opciok.ts`) TIZENNÉGY áll, 8 / 5 / 1
 * bontásban: az a TESZT MEDUSA Store API-jának mind az 1492 termékén kelt,
 * ami szűkebb halmaz.
 *
 * Mind a kettő igaz. Populáció nélkül viszont úgy néznének ki, mint két mérés
 * ugyanarról, amiből az egyik elavult -- és a következő olvasó „kijavítaná" a
 * másikat.
 *
 * AZ ÉRTÉK SZÖVEGKÉNT JÖN. A metaadat JSON-mező, a vetítés sztringet ír bele
 * ("1", "10", "100"), tehát a szám-alakra nincs garancia -- és mivel a mező a
 * mi oldalunkon kívülről kap értéket, minden nem értelmezhető alak 1-re esik
 * vissza. Ez a biztonságos irány: egy hibás metaadat ne zárja el a terméket.
 */
export function minimumOrderQuantity(
  product: Pick<HttpTypes.StoreProduct, "metadata"> | null | undefined
): number {
  const nyers = (product?.metadata as Record<string, unknown> | null | undefined)
    ?.unas_minimum_order_quantity

  if (typeof nyers !== "string" && typeof nyers !== "number") {
    return 1
  }

  const szam = Number(nyers)

  if (!Number.isFinite(szam) || !Number.isInteger(szam) || szam < 1) {
    return 1
  }

  return szam
}
