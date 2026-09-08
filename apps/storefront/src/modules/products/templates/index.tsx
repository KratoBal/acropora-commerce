import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import ProductBreadcrumb from "@modules/products/components/product-breadcrumb"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import {
  anyVariantPurchasable,
  availabilityLabel,
  availabilityOf,
  inventoryKnownOf,
  SIMILAR_ITEMS_LABEL,
  similarItemsHref,
  uniquePieceOf,
} from "@modules/products/components/stock-state/availability"

import ProductActionsWrapper from "./product-actions-wrapper"
import MuszakiLap, { galeriatAdunkAt, hasznaljaVazat } from "./muszaki-lap"
import VasarlasKeret from "./vasarlas-keret"
import ProductPrice from "@modules/products/components/product-price"
import RagadosSav from "@modules/products/components/lap-vaz/ragados-sav"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  categories: HttpTypes.StoreProductCategory[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  categories,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  /**
   * A SAV CSELEKVESE UGYANAZT AZ ALLAPOTOT KAPJA, MINT A FO OSZLOP.
   *
   * A `ragadosSavAllapota` ugyanazt az `availabilityOf` dontest futtatja, csak a
   * VALTOZAT NELKULI bemenettel -- az indoklas a fuggvenyek fejleceben all.
   * Azert ITT szamolom es nem a JSX-ben, hogy egyetlen ertek legyen belole: ket
   * kulon szamitas ket kulon valaszt adhatna ugyanarra a kerdesre.
   */
  const ragadosSavAllapota = availabilityOf({
    inStock: anyVariantPurchasable(product),
    uniquePiece: uniquePieceOf(product.metadata),
    inventoryKnown: inventoryKnownOf(product),
  })

  /**
   * A VAZ BEKOTESE, ES A HATAR, AMIT NEM EN DONTOK EL.
   *
   * A muszaki termek mostantol a TERV szerinti vazat kapja. Az ELO ALLAT lapja
   * VALTOZATLAN marad, mert az murena kore -- a vaz doboz-sorrendje mas, mint a
   * mai lape, es az o lapjat nem irom at anelkul, hogy o ranezett volna.
   *
   * A kaput a `hasznaljaVazat` tartja, es allitas all ra (`muszaki-lap.spec`).
   * Amikor murena keszen all, EGYETLEN fuggveny torzse cserel, egy helyen.
   *
   * ES AMI NEM ESIK KI: a kepgaleria es a vasarlasi resz UGYANAZ a komponens,
   * amit a mai lap hasznal -- a vaz slotjaiba adjuk at oket, nem ujraepitve.
   * Igy murena harom keszlet-allapota, a jelveny es a lepteto valtozatlanul
   * mukodik a vazon belul is.
   */
  if (hasznaljaVazat(product, categories)) {
    return (
      <>
        {/*
          A MORZSAMENU MAR NEM ITT ALL, HANEM A VAZON BELUL (2026-09-08).

          Eddig ebben a `content-container` dobozban allt, a vaz FOLOTT, tehat
          a vilagos lapon -- a sotet felulet alatta kezdodott. A tervben a
          sotet felulet a morzsamenuvel kezdodik, ezert slotkent megy at.

          A MASIK AG (elo allat) VALTOZATLAN: ott a morzsamenu tovabbra is a
          sablonban all, mert ott nincs teljes szelessegu sotet felulet, ami ala
          be lehetne vinni.
        */}
        {/*
          A VASARLASI ALLAPOT A LAP FOLE KERUL, ES A TARTALEK UGYANAZ A VAZ.

          Eddig a `ProductActions` EGY slotba ment, tehat a Suspense is egy
          dobozt fedett. A terv viszont NEGY dobozra bontja a jobb oszlopot, es
          mind a negy UGYANAZT az allapotot olvassa -- az allapot tehat mind a
          negy folott kell, hogy alljon.

          A TARTALEK NEM URES LAP: ugyanaz a tizennegy doboz, `vasarlasAktiv`
          nelkul, vagyis a negy doboz a varakozo szoveget mutatja, es a tobbi
          tiz mar a helyen all. A hasonlo lista a tartalekbol kimarad, hogy a
          lekerdezese ne induljon el ketszer.
        */}
        <Suspense
          fallback={
            <MuszakiLap
              product={product}
              kategoriak={categories}
              morzsaResz={
                <ProductBreadcrumb product={product} categories={categories} />
              }
              fotoResz={
                galeriatAdunkAt(product, categories) ? (
                  <ImageGallery
                    images={images}
                    uniquePiece={uniquePieceOf(product.metadata)}
                  />
                ) : undefined
              }
            />
          }
        >
          <VasarlasKeret id={product.id} region={region}>
            <MuszakiLap
              product={product}
              kategoriak={categories}
              morzsaResz={
                <ProductBreadcrumb product={product} categories={categories} />
              }
              vasarlasAktiv
              hasonloResz={
                <div data-testid="related-products-container">
                  <Suspense fallback={<SkeletonRelatedProducts />}>
                    <RelatedProducts
                      product={product}
                      countryCode={countryCode}
                      fejlecNelkul
                    />
                  </Suspense>
                </div>
              }
              /**
               * A MASODIK LISTA. UGYANAZ A KOMPONENS, MASIK KULCS.
               *
               * A terv a bal oszlop vegen KET listat ker, es a vaz `kiegeszitok`
               * doboza eddig URESEN allt: a kepesseg megvolt (a vetites irja a
               * `unas_accessory_ids` kulcsot), csak senki nem olvasta.
               *
               * Sajat `data-testid`-t kap, mert a ket doboz kulon allitasokat
               * hordoz -- egy kozos azonositoval egy ures kiegeszito-lista
               * ugyanugy nezne ki, mint egy ures hasonlo-lista.
               */
              kiegeszitoResz={
                <div data-testid="kiegeszito-products-container">
                  <Suspense fallback={<SkeletonRelatedProducts />}>
                    <RelatedProducts
                      product={product}
                      countryCode={countryCode}
                      kapcsolat="kiegeszito"
                      fejlecNelkul
                    />
                  </Suspense>
                </div>
              }
              /*
            A FOTO SLOT ATADASA -- ITT DOL EL, HOGY A JELVENY MEGMARAD-E.

            A galeria viszi a `UniquePieceBadge`-et az elso kepre es a
            `UniquePiecePromise`-t a galeria ala. A vaz sajat egykepes
            valtozata egyiket sem ismeri, tehat az elo allat lapja a
            koltozeskor CSENDBEN vesztette volna el mind a kettot.

            Hogy melyik lap kapja, azt a `galeriatAdunkAt` mondja meg, es a
            fejlece megindokolja, miert nem mindenki.
          */
              fotoResz={
                galeriatAdunkAt(product, categories) ? (
                  <ImageGallery
                    images={images}
                    uniquePiece={uniquePieceOf(product.metadata)}
                  />
                ) : undefined
              }
              /*
            A RAGADOS SAV TARTALMA -- ES AMI BENNE NEM SAJAT.

            A GOMB UGRIK, nem onallo kosarba-tetel (acrobot dontese, 14504). Az
            indok a legerosebb alakjaban: ket kosarba-tetel KULON allapottal azt
            jelentene, hogy a vevo fent beallit harom darabot, lehuz, lent
            megnyom egy gombot, es EGY darab kerul a kosarba. Nem hibazna, csak
            mast csinalna -- es csak a kosarnal derulne ki.

            AZ AR a `ProductPrice` VALTOZAT NELKULI alakja, ami a legolcsobbat
            adja "-tol" alakban, es NEM koveti a valasztast. Ez szandekos: a sav
            akkor latszik, amikor a vevo mar elgorgetett a valaszto mellol, es
            egy ar, ami kovetne a valasztast, olyat allitana, amit a vevo eppen
            nem lat.

            CIMKE NINCS. A tervben "Utolso darab" all ott -- az keszlet-allapot,
            es a muszaki termeken ma nincs ra forrasunk. Kitalalni nem szabad,
            tehat a helye osszemegy.

            ES A GOMB MOSTANTOL KOVETI A FO CSELEKVEST (415f455c, 2026-09-08).
            Korabban FELTETEL NELKUL "Kosárba" allt itt, akkor is, amikor fent
            mar a "Hasonló példányok megnézése" gomb volt: egy elkelt egyedi
            peldany ket kulonbozo dolgot mondott ugyanazon a lapon.

            EZ NEM HIANYZO KEPESSEG VOLT, HANEM SZAKADAS. A harom allapot
            dontese (`availabilityOf`) es a feliratai (`availabilityLabel`,
            `SIMILAR_ITEMS_LABEL`) mar hetek ota alltak, es a fo oszlop hasznalta
            is oket. Ez a sav egyszeruen nem hivta meg egyiket sem. A `StockState`
            fejlece ma is azt allitja, hogy a lap "KET helyen" rajzolja ki ezt a
            dobozt -- az a REGI, ma nem futo agra volt igaz.

            AMIT NEM TESZUNK: a `StockState`-et magat nem hasznaljuk itt, mert az
            kosarba-tetel visszahivast var, ez a gomb pedig UGRIK. A FELIRATOT es
            a CELT vesszuk at, nem a komponenst.
          */
              ragadosResz={
                <RagadosSav
                  ar={<ProductPrice product={product} />}
                  cselekves={
                    ragadosSavAllapota === "KAPHATO" ? (
                      <a
                        href="#vaz-mennyiseg"
                        data-testid="ragados-sav-ugras"
                        className="flex h-[50px] items-center px-6 text-[15px] font-semibold"
                        style={{
                          background: "var(--terv-kiemel)",
                          color: "var(--terv-kiemel-szoveg)",
                        }}
                      >
                        {availabilityLabel.KAPHATO}
                      </a>
                    ) : ragadosSavAllapota === "ELADVA" ? (
                      <a
                        href={similarItemsHref(product)}
                        data-testid="ragados-sav-hasonlo"
                        className="flex h-[50px] items-center border px-6 text-[15px] font-semibold"
                        style={{
                          borderColor: "var(--terv-keret)",
                          color: "var(--terv-szoveg)",
                        }}
                      >
                        {SIMILAR_ITEMS_LABEL}
                      </a>
                    ) : (
                      <span
                        data-testid="ragados-sav-elfogyott"
                        className="flex h-[50px] items-center px-6 text-[15px] font-semibold"
                        style={{ color: "var(--terv-szoveg-halvany)" }}
                      >
                        {availabilityLabel.ELFOGYOTT}
                      </span>
                    )
                  }
                />
              }
            />
          </VasarlasKeret>
        </Suspense>
      </>
    )
  }

  /**
   * A REGI AG -- MA EGYETLEN SORA SEM FUT, ES EZ NEM ELIRAS.
   *
   * A `hasznaljaVazat` ma FELTETEL NELKUL igazat ad: vilagos vilagra igaz, es
   * minden mas esetben a kapcsolot adja vissza, ami BE van kapcsolva. Vagyis
   * ide a vezerles nem jut el -- sem a `ProductActions`, sem a
   * `MobileActions`, sem a `ProductActionsWrapper` nem renderelodik.
   *
   * NEM TOROLJUK: ez a visszaut, ha a kapcsolo valaha visszabillen. De a "ma
   * nem fut" allitas magaban ELAVUL, ezert ide tartozik a ket dolog, ami
   * nelkul a kovetkezo olvasonal "torolheto" lesz belole:
   *
   *   MI KAPCSOLJA VISSZA
   *     `ELO_ALLAT_VAZON` a `templates/muszaki-lap/index.tsx` 56. soran.
   *     Ha az hamisra valt, ez az ag AZONNAL el, minden elo allat lapjan.
   *
   *   MIT NEM MER MA SEMMI EZEN AZ AGON
   *     EGYETLEN spec sem rendereli a `ProductTemplate`-et. Ami rola szol
   *     (`muszaki-lap.spec.tsx`), az a FORRAS SZOVEGET olvassa es szamolja --
   *     vagyis zold marad akkor is, ha ez az ag torott. A kapcsolo
   *     visszabillentesekor tehat NINCS halo alatta: az elso dolog egy olyan
   *     allitas legyen, ami RENDERELI.
   *
   *   MI RENDEREL ROSSZUL, AMINT FELEBRED
   *     A `RelatedProducts` fejlece (`Hasonlo termekek`) egy BEIRT vilagos
   *     szurke erteken all (`text-gray-600`, a komponens 88. sora). Az elo ag
   *     ezt nem mutatja, mert a vaz aga a `fejlecNelkul` kapcsoloval hivja --
   *     EZ az ag viszont kapcsolo nelkul hivja, tehat a fejlec megjelenik, es
   *     a sotet lapon vilagos szurke szoveg lesz sotet hatteren.
   *
   *     Merve 2026-09-08, import-lezarassal a sablon belepesi pontjabol: ez az
   *     EGYETLEN olyan beirt szin-ertek, amit a visszagordules KAPCSOL BE. A
   *     tobbi 21, ami a sotet lapon ma is renderel, mindket agon ugyanaz (a
   *     `common/components/ui` Button es Container ertekei, a mobil sav, a ket
   *     varakozo vaz es a valaszto vonal) -- azok nem ehhez a kapcsolohoz
   *     tartoznak, es nem is a termeklap sajatjai.
   *
   *     AMIERT EZ ITT ALL, ES NEM EGY KARTYAN: a visszagordules az a pillanat,
   *     amikor a legkevesbe nezi meg valaki a szineket -- baj van, vissza kell
   *     allni. Aki akkor atbillenti a kapcsolot, ezt a fejlecet olvassa, nem
   *     egy hetekkel korabbi meresi jelentest.
   *
   * ES AMIERT EZ MA MEGIS SPOROL: aki egy javitast vegez a termeklapon, ezen az
   * agon NEM kell atvezetnie. Egy "ott is javitani kell" kor felesleges --
   * egeszen addig, amig a kapcsolo all.
   *
   *   MIKOR TOROLHETO EZ AZ AG (acrobot dontese, msg 14964)
   *     Egy visszaut FELTETEL NELKUL orokre megmarad, ezert a feltetel itt all,
   *     nevesitve. Mind a HAROM kell, nem barmelyik:
   *
   *       1. a teszt kirakat telepitese KIMENT
   *       2. a lapon VISSZAMERVE mind a harom nautilus-fele allitas a VART
   *          erteket adja
   *       3. Balazs LATTA a lapot, es nem kert visszaallast
   *
   *     Igy a kovetkezo olvaso (vagy mi magunk, ket het mulva) nem azt kerdezi,
   *     hogy "kell-e meg ez", hanem hogy "teljesult-e a harom" -- es az utobbi
   *     MERHETO, az elobbi velemeny.
   */
  return (
    <>
      <div className="content-container pt-6">
        <ProductBreadcrumb product={product} categories={categories} />
      </div>
      <div
        className="content-container  flex flex-col small:flex-row small:items-start py-6 relative"
        data-testid="product-container"
      >
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-6">
          <ProductInfo product={product} />
          {/*
            ITT KET FUL ALLT, ES MIND A KETTO KIKERULT (2026-09-07).

            "Shipping & Returns": harom KESZ IGERETET tett a vevonek --
            3-5 munkanapos kiszallitas, csere ha "nem jo a meret", es kerdes
            nelkuli visszakuldes. A masodik ruhaboltbol valo, a harmadik pedig
            elo allatra is allt volna. Ma NINCS jovahagyott szovegunk, tehat a
            helyes allapot az, hogy nincs ott semmi: egy hianyzo ful HANGOS
            (valaki keresi es szol), egy rossz igeret NEMA -- addig all ott,
            amig egy vevo nem hivatkozik ra.

            "Product Information": ot mezot mutatott (Material, Country of
            origin, Type, Weight, Dimensions), es a vetitesunk EGYIKET SEM
            kuldi -- merve: nulla ertekadas mind a hatra, kontroll a `title`
            harom ertekadasaval. Ot gondolatjel allt volna minden termeken.
            A tomeget ezen felul SZANDEKOSAN nem visszuk fel (Balazs dontese).

            Ami visszakerul, az egyesevel kerul vissza, amikor van mit mutatni.
            A szallitasi es visszakuldesi szoveg a mai boltunkban LETEZIK
            (ASZF, Elallasi tajekoztato, Szallitas oldal): atemeles lesz.
          */}
        </div>
        <div className="block w-full relative">
          <ImageGallery
            images={images}
            uniquePiece={uniquePieceOf(product.metadata)}
          />
        </div>
        <div className="flex flex-col small:sticky small:top-48 small:py-0 small:max-w-[300px] w-full py-8 gap-y-12">
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
        </div>
      </div>
      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
