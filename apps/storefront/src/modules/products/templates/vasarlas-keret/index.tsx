import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import { VasarlasProvider } from "@modules/products/components/vasarlas/allapot"

/**
 * A VASARLASI ALLAPOT KERETE -- ES MIERT KELL HOZZA EGY MASODIK LEKERDEZES.
 *
 * Ez a fajl a `ProductActionsWrapper` szerepet veszi at a vazas lapon: ugyanaz
 * a lekerdezes, ugyanaz az ok, csak a vegen nem EGY komponens all, hanem a
 * provider, ami alatt a terv NEGY doboza kulon-kulon olvassa ugyanazt.
 *
 * === MIERT NEM ELEG A LAP SAJAT TERMEKE, HOLOTT `pricedProduct` A NEVE ===
 *
 * Merve a kodban (nem feltetelezve): a `listProducts` a sajat `fields` erteket
 * a `...queryParams` ELE teriti szet, tehat a HIVO fields-e felulirja. A
 * termeklap `TERMEKLAP_FIELDS` erteke `*categories,+metadata` -- ebben nincs
 * `*variants.calculated_price`, vagyis a lap termeke a szamolt arat NEM keri
 * le. A `ProductActionsWrapper` sajat lekerdezese pontosan ezt potolja
 * ("real time pricing"), es ezert marad meg itt is.
 *
 * A NEV FELREVEZET, es ezt kimondom, mert a kovetkezo olvaso a nevbol azt
 * vonna le, hogy a masodik lekerdezes felesleges.
 *
 * === AMIERT A MASODIK KOR MEGIS MARAD -- ES NEM A FRISSESSEG MIATT ===
 *
 * A kezenfekvo indok az lenne, hogy a kulon kor FRISSEBB arat hoz. Lemertem, es
 * EZ MA NEM ALL: mind a ket hivas UGYANAZ a `listProducts`, ugyanazzal a
 * `cache: "force-cache"` beallitassal es ugyanazzal a `getCacheOptions("products")`
 * cimkejevel. Ket azonos gyorsitotarazasu kor kozul a masodik nem lehet
 * frissebb. (Az utvonal ezen felul statikus: `generateStaticParams` all rajta,
 * es sem a lapon, sem a folotte allo layoutokban nincs `dynamic` vagy
 * `revalidate`.)
 *
 * A VALODI OK A MEZOLISTA, ES AZ, HOGY A FELULIRAS VESZTESEGES. A `listProducts`
 * sajat `fields` erteke a `...queryParams` ELE terul szet, tehat a hivoé
 * FELULIRJA -- nem bovíti. A fuggveny alapertelmezese ot dolgot ker:
 *
 *   *variants.calculated_price   +variants.inventory_quantity
 *   *variants.images             *variants.options            +tags
 *
 * A termeklap `TERMEKLAP_FIELDS` erteke ezzel szemben `*categories,+metadata`,
 * vagyis MIND AZ OTOT elejti. A `calculated_price` csak a legláthatóbb koztuk.
 * Az egyszerubb alak (a szamolt ar felvetele a lap mezoibe) tehat NEM egy
 * token: a teljes alapertelmezest helyre kellene allitani, es ha egy kimarad,
 * a hiba NEMA -- egy mezo, amit senki nem ker, ugyanugy nez ki, mint egy mezo,
 * ami ures.
 *
 * ES EGY MAR MOST FENNALLO, DE MA MEG ARTALMATLAN KOVETKEZMENY, hogy latszodjon,
 * mirol van szo: a lap `getImagesForVariant` fuggvenye a `variant.images`
 * mezobol szur, es azt a feluliras elejti. Ma ez a HELYES eredményt adja, mert
 * minden termeknek pontosan egy valtozata van, tehat a visszaeses (a termek
 * osszes kepe) ugyanaz. Az elso TOBBVALTOZATOS terméknel viszont a valtozathoz
 * kotott kepszures csendben nem tortenne meg.
 *
 * === MIT LAT A VEVO, AMIG EZ TOLT ===
 *
 * A hivo `Suspense`-be teszi, es a tartalek ugyanaz a vaz, `vasarlasAktiv`
 * nelkul: a negy doboz a VARAKOZO szoveget mutatja. Nem ures lap es nem
 * ugralo elrendezes -- ugyanaz a tizennegy doboz, ugyanott.
 */
export default async function VasarlasKeret({
  id,
  region,
  children,
}: {
  id: string
  region: HttpTypes.StoreRegion
  children: React.ReactNode
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return <>{children}</>
  }

  return <VasarlasProvider product={product}>{children}</VasarlasProvider>
}
