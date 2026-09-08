import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import ProductBreadcrumb from "@modules/products/components/product-breadcrumb"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import { uniquePieceOf } from "@modules/products/components/stock-state/availability"

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
        <div className="content-container pt-6">
          <ProductBreadcrumb product={product} categories={categories} />
        </div>
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
          */
              ragadosResz={
                <RagadosSav
                  ar={<ProductPrice product={product} />}
                  cselekves={
                    <a
                      href="#vaz-mennyiseg"
                      data-testid="ragados-sav-ugras"
                      className="flex h-[50px] items-center px-6 text-[15px] font-semibold"
                      style={{
                        background: "var(--terv-kiemel)",
                        color: "var(--terv-kiemel-szoveg)",
                      }}
                    >
                      Kosárba
                    </a>
                  }
                />
              }
            />
          </VasarlasKeret>
        </Suspense>
      </>
    )
  }

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
