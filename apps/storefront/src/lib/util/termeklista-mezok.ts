/**
 * A TERMEKLISTA ALAP MEZOI (`listProducts`). Kulon allando, hogy egy hivo
 * KIEGESZITENI tudja: a `queryParams.fields` az egeszet felulirja. A Commerce
 * kategorialap a markat (`*collection`) fuzi hozza. Nem a `lib/data/products`
 * fajlban all, mert az `"use server"` modul, abbol csak async fuggveny mehet ki.
 */
export const TERMEKLISTA_MEZOK =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,"
