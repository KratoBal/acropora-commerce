import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import UniquePieceBadge from "../unique-piece-badge"
import { uniquePieceOf } from "../stock-state/availability"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })

  /**
   * AZ EGYEDI PELDANY JELVENYE A LISTAN IS (64c8452a, picasso atnezese).
   *
   * === MIERT TOBB EGY SZEPSEGHIBANAL ===
   *
   * A termeklapon ott all az "1 db, egyedi peldany"; a listan sem jelveny, sem
   * felirat. Picasso erve: ez donti el, KOCKAZATOS-E rakattintani. Egy egyedi
   * peldany elkelhet, es a vevo a listan nem latja, hogy egyaltalan ilyen
   * fajtaju termekrol van szo.
   *
   * === A JELZO ATJON, ES EZT MEGMERTEM, NEM FELTETELEZTEM ===
   *
   * A `metadata` a lista-lekerdezesben is megerkezik: a `listProducts`
   * alapertelmezett `fields` erteke tartalmazza a `+metadata` elemet, es a
   * lista hivoi (`paginated-products.tsx`) NEM adnak sajat `fields` erteket,
   * tehat nem irjak felul. Ez nem apro reszlet: ugyanez a mezo egyszer mar
   * hianyzott a termeklaprol, es akkor a jelzo CSENDBEN hamis volt (lasd
   * `lib/data/termeklap-fields.ts`).
   *
   * A NYITOLAP KIVETEL, es ezt kimondom: az `app/[countryCode]/(main)/page.tsx`
   * `fields: "id, handle, title"` ertekkel ker, tehat ott a jelzo NEM jonne at.
   * Ma ez nem latszik, mert a nyitolap nem mutat termeket -- de ha valaha
   * mutatni fog, a mezot ott is kerni kell.
   *
   * === AMIT NEM A TERVBOL VETTEM, ES EZERT KIMONDOM ===
   *
   * A tervlapok kozott NINCS lista-nezet, tehat a jelveny lista-beli alakjara
   * nincs mert forras. Ezert UGYANAZT a komponenst hasznalom, mint a
   * termeklapon, kivetel nelkul: ha picasso mas meretet vagy helyet szeretne a
   * kartyan, az tervezoi dontes, es egy sorban megvaltoztathato.
   */
  const egyediPeldany = uniquePieceOf(product.metadata)

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <div className="relative">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
          />
          {egyediPeldany && <UniquePieceBadge />}
        </div>
        {/*
          A CIM ES AZ AR EGYMAS ALATT ALL, NEM EGY SORBAN.

          === A MERT HIBA ===

          A sor `flex justify-between` volt, tehat a cim es az ar EGY sorba
          keruelt. A kartya 150 pixel szeles; egy hosszabb nev mellett a sor
          TULCSORDUL. Merve a kiszolgalt lapon, 390 pixeles nezetben, negy
          termeklap hasonlo-widgetjen (osszesen 34 kartya):

              acropora-austea-tricolor            1 / 2   tulcsordul
              ecotech-...-rms-track-lampatarto    1 / 12
              nyos-quantum-220-eq                 0 / 8
              aquaforest-af-vitality-10ml         0 / 12

          A legrosszabb eset: "Acropora abrolhosensis ULTRA" -- a sor 163 pixel
          egy 150 pixeles kartyan.

          A SAJAT SZAMOM 2/34, ES NEM A JAVASLATE (8/12). A javaslat picassotol
          jott, es a kulonbseget nem magyarazom meg: mas lapokon mertek, es a
          widget TARTALMA ma valtozott (a hasonlo-lista tartaleka ota a
          kategoria-tarsak allnak benne, mas nevekkel). A jelenseg VALODI, a
          gyakorisaga nem az, amit a javaslat mond.

          === MIERT TORDELES, ES NEM CSONKOLAS ===

          A minta MAR LETEZIK a kodban: a kategoria-racs kartyaja
          (`category-products.tsx`) `mt-4 space-y-2` alatt egymas ALA teszi a
          nevet es az arat, sajat tokenekkel. Ez tehat nem uj minta, hanem a
          mar bevalt sajat alak ugyanarra a feladatra.

          Csonkolas eseten a nev vege VESZNE EL -- egy hasonlo-widgetben epp a
          megkulonbozteto resz ("ULTRA", "3 fejes frag") all a vegen.

          === AMI VALTOZIK, ES AMI NEM ===

          Minden kartya EGYFORMAN magasabb lesz (a cim es az ar kulon sorban),
          a szelesseguk valtozatlan (150 pixel). A nyers Medusa-osztalyok
          (`txt-compact-medium`, `text-ui-fg-subtle`) helyere a terv tokenjei
          kerulnek -- ugyanaz a csere, mint a fuleknel.
        */}
        <div className="mt-4 space-y-1">
          <Text
            className="text-sm font-medium"
            style={{ color: "var(--terv-szoveg)" }}
            data-testid="product-title"
          >
            {product.title}
          </Text>
          <div
            className="flex items-center gap-x-2 text-sm"
            style={{ color: "var(--terv-szoveg-halvany)" }}
          >
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
