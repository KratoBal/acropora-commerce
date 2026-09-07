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
 * vonna le, hogy a masodik lekerdezes felesleges. Az egyszerubb alak (a
 * `*variants.calculated_price` felvetele a lap mezoibe) MEGSZUNTETNE ezt a
 * kort -- de az a termeklap lekerdezeset noveli, es a lap adat-merete ma
 * kulon kerdes (a kategoria-lekerdezes ma 4,1 MB-rol 11 kB-ra ment). Ezert az
 * kulon dontes, kulon meressel, nem ennek a kornek a melleklete.
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
