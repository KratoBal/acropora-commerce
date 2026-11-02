/**
 * A KOSÁR ÖSSZEGEI, EGY HELYEN (cartTotalsView). A kosár oldal összegzése és a
 * pénztár oldalsávja ugyanazt a bruttó számolást használja, nem két példányt:
 * ha az egyik elcsúszik, a vevő két különböző számot lát ugyanarra a kosárra.
 *
 * A számolás indoka (mért számokkal) a `CartTotals` komponens fejlécében és a
 * spec-jében áll; itt csak a szabály van:
 *
 * - a részösszeg a tételek BRUTTÓ összege (nettó + adó),
 * - a szállítás is bruttó (nettó + adó),
 * - az áfa INFORMÁCIÓS sor ("ebből"), nem összeadandó tétel,
 * - a fizetendő mindig a `total`.
 *
 * A hiányzó adó-érték nem nulla, de a kiírás nem tud mást tenni, mint a nettót
 * mutatni; a `?? 0` ezt mondja ki, a spec rögzíti.
 */
export type KosarOsszegekBemenet = {
  total?: number | null
  tax_total?: number | null
  currency_code: string
  item_subtotal?: number | null
  item_tax_total?: number | null
  shipping_subtotal?: number | null
  shipping_tax_total?: number | null
  discount_subtotal?: number | null
}

export type KosarOsszegek = {
  currencyCode: string
  /** a tételek bruttó összege */
  itemGross: number
  /** a szállítás bruttó összege */
  shippingGross: number
  /** a kedvezmény, 0 ha nincs */
  discount: number
  /** az áfa összege, 0 ha nincs */
  tax: number
  /** a fizetendő */
  total: number
}

export function kosarOsszegek(totals: KosarOsszegekBemenet): KosarOsszegek {
  return {
    currencyCode: totals.currency_code,
    itemGross: (totals.item_subtotal ?? 0) + (totals.item_tax_total ?? 0),
    shippingGross:
      (totals.shipping_subtotal ?? 0) + (totals.shipping_tax_total ?? 0),
    discount: totals.discount_subtotal ?? 0,
    tax: totals.tax_total ?? 0,
    total: totals.total ?? 0,
  }
}
