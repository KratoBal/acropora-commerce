import { listCategoryIdsWithDescendants } from "@lib/data/categories"
import { listProductsWithSort } from "@lib/data/products"
import { keresesTalalatok } from "@lib/data/termek-kereses"
import { keresesSzuro } from "@lib/util/kereses-szuro"
import { getRegion } from "@lib/data/regions"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import KeresesCsonkolt from "@modules/store/components/kereses-csonkolt"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

/**
 * A `q` MEZO INNEN KIKERULT (2026-09-14), ES EZT KIMONDOM.
 *
 * Itt allt a Medusa szabad szavas keresese, a 2026-09-08-i meresevel egyutt
 * (`q=DMBS1KG` 1 talalat cikkszambol, `q=Dupla` 32 pozitiv kontrollkent,
 * `q=zzzzqqqqxxxx` 0 negativ kontrollkent). Az a meres ERVENYES VOLT es ma is
 * az -- csak epp azt NEM merte, amit a `q` nem tud: az ekezetet.
 *
 * A kereses mostantol a sajat vegponton at megy (`lib/data/termek-kereses.ts`),
 * es azonositokkal szur. A cikkszam-kereses NEM veszett el: az uj vegpont a
 * valtozatok `sku` mezojet is nezi, epp azert, mert a fenti meres megmutatta,
 * hogy az a kepesseg letezik es hasznaljak.
 */
type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  includeDescendants = true,
  kereses,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  includeDescendants?: boolean
  /** A kereses szovege. Ures kereses eseten `undefined`. */
  kereses?: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    /**
     * A LESZARMAZOTTAK IS BELEKERULNEK, ES EZ NEM KENYELMI KERDES.
     *
     * A Medusa `category_id` szurese PONTOS EGYEZES -- merve 2026-09-07 a teszt
     * bolton, ismert pozitiv kontrollal (a reszletek a
     * `listCategoryIdsWithDescendants` fejleceben). A starter egyetlen
     * azonositot adott at, tehat egy szulo-kategoria lapja CSAK a kozvetlenul
     * ra akasztott termekeket mutatta.
     *
     * Amit ez a valodi katalogusban jelentene: a "Termékek" gyokerre kattintva
     * a vevo 34 termeket latna 1653 helyett, es het szulo-kategoria lapja
     * teljesen ures lenne, mikozben alattuk 168 termek all.
     */
    queryParams["category_id"] = includeDescendants
      ? await listCategoryIdsWithDescendants(categoryId)
      : [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  /**
   * A KERESES MOSTANTOL AZONOSITOKON AT MEGY, NEM A `q` PARAMETEREN.
   *
   * A Medusa `q`-ja `ILIKE '%token%'` feltetelt epit, a Postgres ILIKE pedig az
   * EKEZETET nem vonja ossze -- merve a kiszolgalt lapon: `lehabzó` 61-72
   * talalat, `lehabzo` NULLA. A sajat vegpont mind a ket oldalt ugyanarra az
   * alakra hajtogatja, es CSAK azonositokat ad vissza; a termekeket innentol a
   * MAI ut hozza, tehat a lapozas, a szures es az arazas egy helyen marad.
   *
   * A NULLA TALALAT KULON AG, ES EZ A LENYEG: egy URES `id` halmazt a
   * lekerdezes figyelmen kivul hagyhatna, es akkor a vevo a TELJES katalogust
   * latna egy olyan keresesre, aminek nincs talalata. Ezert ilyenkor el sem
   * inditjuk a lekerdezest.
   */
  let keresesNullaTalalat = false
  /*
    A CSONKOLAS ATKERUL A LAPRA, mert eddig SEHOVA nem ert el. A vegpont
    kimondta a valaszban, a kirakat viszont nem olvasta -- merve az
    origin/main-en: a mezo a tipusban all, egyetlen komponens sem hivatkozik ra.
    A vevo 200 terméket latott ugy, hogy semmi nem szolt a tobbirol.
  */
  let keresesCsonkolt = false
  let keresesDarab = 0
  if (kereses) {
    const talalat = await keresesTalalatok(kereses)
    keresesCsonkolt = talalat.csonkolt
    keresesDarab = talalat.count
    const szuro = keresesSzuro(talalat.ids, productsIds)
    if (szuro.nullaTalalat) keresesNullaTalalat = true
    else queryParams["id"] = szuro.ids
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  if (keresesNullaTalalat) {
    return (
      <p data-testid="kereses-nincs-talalat" className="text-base-regular">
        Erre a keresésre nincs találat: {kereses}
      </p>
    )
  }

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  /**
   * A NULLA TALALAT KERESESKOR NEM UGYANAZ, MINT EGY URES LISTA-LAP.
   *
   * A `null` eddig helyes volt: egy ures kategoria-lapon nincs mit mondani, a
   * lap tobbi resze all. Egy KERESES utan viszont a vevo bepotyogott valamit,
   * es egy uresen maradt lap nem valasz -- nem tudja meg, hogy nincs ilyen
   * termekunk, vagy elromlott valami.
   *
   * Ezert kereseskor mondat all a `null` helyen. Kereses NELKUL a viselkedes
   * betuere valtozatlan.
   */
  if (!products.length) {
    if (!kereses) return null

    return (
      <p data-testid="kereses-nincs-talalat" className="text-base-regular">
        Erre a keresésre nincs találat: {kereses}
      </p>
    )
  }

  return (
    <>
      <KeresesCsonkolt csonkolt={keresesCsonkolt} darab={keresesDarab} />
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
