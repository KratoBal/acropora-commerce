"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import StockState from "../stock-state"
import {
  availabilityOf,
  similarItemsHref,
  uniquePieceOf,
} from "../stock-state/availability"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  /*
    HÁROM ÁLLAPOT, KETTŐ HELYETT.

    A mai gomb egyetlen logikai értéket ismer, és egyetlen feliratot ("Out of
    stock"). Egy élő állat lapján ez összemossa a VISSZAJÖHET és a MÁR NINCS
    esetet -- a vevő azt hiheti, kap egy állatot, ami már nem létezik.

    A jelző KIFEJEZETT: amíg a vetítés nem hozza át, `uniquePiece` hamis, és a
    lap az ELFOGYOTT ágat rajzolja. A halkabb tévedés a szándék, nem a hiány.
  */
  const uniquePiece = uniquePieceOf(product.metadata)
  const similarHref = similarItemsHref(product)
  const availability = availabilityOf({
    inStock: inStock && !!isValidVariant,
    uniquePiece,
  })
  const maximumQuantity =
    selectedVariant?.manage_inventory && !selectedVariant.allow_backorder
      ? Math.max(selectedVariant.inventory_quantity || 0, 1)
      : null
  const normaliseQuantity = (value: number) => {
    if (!Number.isInteger(value) || value < 1) return 1
    return maximumQuantity ? Math.min(value, maximumQuantity) : value
  }

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity,
      countryCode,
    })

    setIsAdding(false)
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        <ProductPrice product={product} variant={selectedVariant} />

        {!selectedVariant ? (
          <Button
            disabled
            variant="primary"
            className="w-full h-10"
            data-testid="add-product-button"
          >
            Válassz változatot
          </Button>
        ) : (
          <div className="flex gap-2">
            {!uniquePiece && (
              <div className="flex items-center rounded-md border border-ui-border-base">
                <button
                  type="button"
                  aria-label="Mennyiség csökkentése"
                  className="h-10 w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
                  onClick={() => setQuantity(normaliseQuantity(quantity - 1))}
                >
                  −
                </button>
                <input
                  aria-label="Mennyiség"
                  className="h-10 w-12 bg-transparent text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(normaliseQuantity(Number(event.target.value)))
                  }
                  onBlur={() => setQuantity(normaliseQuantity(quantity))}
                />
                <button
                  type="button"
                  aria-label="Mennyiség növelése"
                  className="h-10 w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
                  onClick={() => setQuantity(normaliseQuantity(quantity + 1))}
                  disabled={maximumQuantity !== null && quantity >= maximumQuantity}
                >
                  +
                </button>
              </div>
            )}
            <StockState
              availability={availability}
              similarHref={similarHref}
              onAddToCart={handleAddToCart}
              isAdding={isAdding}
              disabled={!!disabled || isAdding}
            />
          </div>
        )}
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          availability={availability}
          similarHref={similarHref}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
