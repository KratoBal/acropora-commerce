import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import { uniquePieceOf } from "@modules/products/components/stock-state/availability"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
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
