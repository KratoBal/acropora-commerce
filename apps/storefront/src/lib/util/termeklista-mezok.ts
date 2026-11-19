/**
 * A TERMEKLISTA ALAP MEZOI (`listProducts`). Kulon allando, hogy egy hivo
 * KIEGESZITENI tudja: a `queryParams.fields` az egeszet felulirja. A Commerce
 * kategorialap a markat (`*collection`) fuzi hozza. Nem a `lib/data/products`
 * fajlban all, mert az `"use server"` modul, abbol csak async fuggveny mehet ki.
 */
export const TERMEKLISTA_MEZOK =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+variants.metadata,+metadata,+tags,"

/**
 * A TERMEKLISTA-KARTYAK MEZOI: az alap mezok, a marka es a kategoriak. A
 * kartya a markat olvassa (`*collection`), a kartya-valasztas a kategoriakat
 * (`*categories`, az `mpath`-tal egyutt). Minden lista, ami a kozos
 * lista-lapon all, ezt kerheti.
 */
export const termeklistaMezok = `${TERMEKLISTA_MEZOK}*collection,*categories`

/**
 * A VASARLASI KERET MEZOI: az alap mezok. A valtozat metaadata (`+variants.metadata`) az alap mezok KOZT van 2026-11-19 ota: az
 * Omnibus hivatkozasi ar a valtozat `omnibus_lowest_price_30d` kulcsan all (az OS irja), es nem csak a termeklapnak kell, hanem
 * a LISTAK KARTYAINAK is: az athuzott ar es a szazalek csak valodi arcsokkentesnel allhat (Omnibus 2/A., acrobot eles-kiadasi
 * feltetel 2), az pedig a referencia nelkul nem igazolhato. Egy kihagyott mezo ugyanugy nez ki, mint egy ures (a kartyak
 * akciojelzese csendben eltunne), ezert a spec orzi. A keszlet NEM hizlalodik: a lapozott lista egy oldala (a teszten 24
 * termek, a valaszmeret valtozatlan, mert a legtobb valtozatnak nincs metaadata); a teljes halmazt lehivo kor (rendezes,
 * kategoria-szamlalo) a sajat, szuk mezoit hasznalja (`RENDEZO_KOR_MEZOK`, `KATALOGUS_KOR_MEZOK`).
 */
export const VASARLAS_KERET_MEZOK = TERMEKLISTA_MEZOK

/**
 * A RENDEZO KOR MEZOI (task t-20261115-ar-rendezes-szukites). Az ar szerinti rendezes (a Store API nem tud arra rendezni)
 * a teljes halmazt lehivja, es a `sortProducts` CSAK ezt olvassa: az azonositot, a letrehozas idejet es a valtozatok
 * `calculated_price`-at. A teljes mezokeszlet (kepek, opciok, metaadat, cimkek) ehhez folosleges: merve 2026-11-15 a
 * teszt Medusan, az osszes termek (1344) ar szerinti rendezesenel 8,9 MB / 3,1 s volt, csak ezekkel 1,0 MB / 1,5 s, es az
 * arral rendelkezo termekek szama azonos (1343/1344). A megjeleno lap termekei egy KULON lekeresben kapjak a teljes
 * mezoket. A `created_at` azert van itt, mert a `sortProducts` idorendi aga is olvassa.
 */
export const RENDEZO_KOR_MEZOK = "id,created_at,*variants.calculated_price,"

/**
 * A KOZOS KOR MEZOI (task t-20261116-gyoker-ar-rendezes): a rendezes mezoi es a marka (gyujtemeny) azonositoja, neve. A gyoker es
 * a kategoria lista ar szerint a rendezo kort ES a marka-szamlalot egyszerre futtatja, es mindketto a teljes halmazt olvassa; egy
 * kozos kor mindket mezovel a Medusa-terhelest felezi (lasd `katalogusKorLista` a `lib/data/products.ts`-ben).
 */
export const KATALOGUS_KOR_MEZOK = `${RENDEZO_KOR_MEZOK}collection.id,collection.title`
