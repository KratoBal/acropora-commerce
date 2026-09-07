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
import MuszakiLap, { hasznaljaVazat } from "./muszaki-lap"

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
  if (hasznaljaVazat(product)) {
    return (
      <>
        <div className="content-container pt-6">
          <ProductBreadcrumb product={product} categories={categories} />
        </div>
        <MuszakiLap
          product={product}
          vasarlasiResz={
            <Suspense
              fallback={
                <ProductActions disabled={true} product={product} region={region} />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
          }
        />
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

  return (
    <>
      <div className="content-container pt-6"><ProductBreadcrumb product={product} categories={categories} /></div>
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
