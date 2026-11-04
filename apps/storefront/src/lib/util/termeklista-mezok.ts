/**
 * A TERMEKLISTA ALAP MEZOI (`listProducts`). Kulon allando, hogy egy hivo
 * KIEGESZITENI tudja: a `queryParams.fields` az egeszet felulirja. A Commerce
 * kategorialap a markat (`*collection`) fuzi hozza. Nem a `lib/data/products`
 * fajlban all, mert az `"use server"` modul, abbol csak async fuggveny mehet ki.
 */
export const TERMEKLISTA_MEZOK =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,"

/**
 * A TERMEKLISTA-KARTYAK MEZOI: az alap mezok, a marka es a kategoriak. A
 * kartya a markat olvassa (`*collection`), a kartya-valasztas a kategoriakat
 * (`*categories`, az `mpath`-tal egyutt). Minden lista, ami a kozos
 * lista-lapon all, ezt kerheti.
 */
export const termeklistaMezok = `${TERMEKLISTA_MEZOK}*collection,*categories`

/**
 * A VASARLASI KERET MEZOI: az alap mezok plusz a VALTOZAT METAADATA. Az Omnibus hivatkozasi ar a
 * valtozat `omnibus_lowest_price_30d` kulcsan all (az OS irja), es CSAK a termeklapon kell: a
 * listak kartyai nem mutatjak, tehat a listak mezoihez nem kerul (egy 1492 termekes valaszt nem
 * hizlalunk vele). A `+` a metaadatot hozzaadja, nem felulirja.
 */
export const VASARLAS_KERET_MEZOK = `${TERMEKLISTA_MEZOK}+variants.metadata`
