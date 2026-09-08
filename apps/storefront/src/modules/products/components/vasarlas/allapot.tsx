"use client"

import { addToCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { isEqual } from "lodash"
import {
  useParams,
  usePathname,
  useSearchParams,
  useRouter,
} from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import {
  canIncreaseOrderQuantity,
  maximumOrderQuantity,
  minimumOrderQuantity,
  normaliseOrderQuantity,
  orderQuantityHint,
  orderQuantityStep,
} from "../product-actions/minimum-order-quantity"
import { VasarlasKontextus, type VasarlasAllapot } from "./kontextus"
import {
  availabilityOf,
  similarItemsHref,
  uniquePieceOf,
} from "../stock-state/availability"

/**
 * A VASARLASI ALLAPOT EGY HELYEN, MERT A TERV NEGY DOBOZBA TESZI SZET.
 *
 * === MIERT KELLETT KIEMELNI ===
 *
 * A terv a jobb oszlopot NEGY kulon dobozra bontja (ar, elerhetoseg, valaszto,
 * mennyiseg), a `ProductActions` viszont egyetlen komponens, ami mind a negyet
 * tartalmazza. Amig igy allt, a vazon HAROM doboz uresen varakozott, holott a
 * tartalmuk MEGVOLT -- csak eggyel lejjebb. A `valodi-tartalom.tsx` fejlece ezt
 * az elterest kimondta, es azt is, hogy a szetbontas KULON KOR: az allapot
 * (kivalasztott valtozat, mennyiseg, kosarba tetel) egyutt mozog, tehat nem
 * lehet negy fuggetlen komponensre vagni.
 *
 * Ez a fajl az a kulon kor. Az allapot NEM valtozott: ugyanaz a nyolc ertek es
 * ugyanaz a harom levezetes all itt, mint eddig a `ProductActions` torzseben.
 * Csak feljebb kerult, hogy a negy doboz KULON-KULON olvashassa.
 *
 * === MIERT KONTEXT, ES NEM PARAMETER ===
 *
 * A vaz slotjai eddig atadott NODE-ok voltak, es az jol mukodott mindenre, ami
 * ONALLO (galeria, hasonlo lista, ragados sav). Itt nem az: a negy doboz
 * UGYANAZT az allapotot olvassa, es harom irja is. Ha parameterkent adnank at
 * oket, az allapotnak a hivo oldalan kellene allnia -- vagyis a szerver
 * komponensben, ahol nincs allapot.
 *
 * === MI TORTENIK PROVIDER NELKUL, ES MIERT NEM DOB HIBAT ===
 *
 * A `useVasarlas()` `null`-t ad, es a negy doboz URESEN marad -- vagyis
 * pontosan ugy, ahogy a vaz varakozo allapota. Ez SZANDEKOS: a vaz specjei a
 * dobozokat provider nelkul renderelik, es ott a helyes valasz a varakozas, nem
 * a hiba.
 *
 * ES AMI EZZEL JAR, KIMONDVA: ez egy VARRAT, aminek a ket fele kulon-kulon
 * helyes lehet ugy, hogy a lap megis ures. Pontosan ez tortent ma egyszer mar,
 * a vaz bekotesenel: a kapcsolo mindket fele jo volt, es a lekerdezes nem kerte
 * le a mezot, amitol fuggott. Egy jsdom-allitas ezt a varratot NEM latja.
 * Ezert a bizonyitek a MEGEPITETT LAP merese, nem ez a fajl.
 */

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"],
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

/**
 * AZ EGYETLEN VALTOZAT MAR A KISZOLGALON KIVALASZTVA -- KULON FUGGVENY, HOGY
 * ALLITAS MUTATHASSON RA.
 *
 * === MI VOLT A BAJ, ES MEKKORA ===
 *
 * A starter a kivalasztast `useEffect`-ben vegezte ("If there is only 1
 * variant, preselect the options"). Egy effekt CSAK HIDRATALAS UTAN fut, tehat
 * a kiszolgalt HTML-ben nem volt kivalasztott valtozat -- es a
 * `MennyisegDoboz` ilyenkor a letiltott "Válassz változatot" gombot rajzolja.
 *
 * Merve a teszt bolton (2026-09-08): MIND A 1492 TERMEKNEK PONTOSAN EGY
 * valtozata es EGY opcioja van. Vagyis nem szeleseset volt, hanem a
 * terméklapok SZAZ SZAZALEKA: minden lap elso festese egy letiltott gombot
 * mutatott, olyan termeken, ahol nincs is mit valasztani.
 *
 * Visszamerve a kitelepitett lapon: a kiszolgalt HTML-ben a gomb
 * `disabled` volt es "Válassz változatot" allt rajta, ket kulonbozo termeken
 * (egy WYSIWYG korall es egy egyszeru kiegeszito).
 *
 * === AMIT EZ NEM OLD MEG ===
 *
 * Ha egy termeknek egyszer TOBB valtozata lesz, ott tovabbra is valasztani
 * kell, es a letiltott gomb HELYES. A fuggveny ezert a darabszamra kerdez, nem
 * arra, hogy "van-e valtozat".
 */
export function kezdoOpciok(
  product: Pick<HttpTypes.StoreProduct, "variants">,
): Record<string, string | undefined> {
  if (product.variants?.length !== 1) return {}
  return optionsAsKeymap(product.variants[0].options) ?? {}
}

export function VasarlasProvider({
  product,
  disabled,
  children,
}: {
  product: HttpTypes.StoreProduct
  disabled?: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /*
    LUSTA KEZDOERTEK, NEM URES OBJEKTUM: igy a KISZOLGALON is ki van valasztva
    az egyetlen valtozat, es a lap elso festese mar a valodi gombot mutatja.
  */
  const [options, setOptions] = useState<Record<string, string | undefined>>(
    () => kezdoOpciok(product),
  )
  const [isAdding, setIsAdding] = useState(false)
  /**
   * A KEZDŐÉRTÉK A TERMÉK MINIMUMA, nem beégetett 1. Tizenhat terméknél a
   * minimum nem 1 (nyolcnál 10, hétnél 100, egynél 5), és ott az 1 olyan
   * mennyiség, amit nem lehet megrendelni.
   */
  const minimumQuantity = minimumOrderQuantity(product)
  /**
   * A LÉPÉSKÖZ ÉS A RENDELÉSI MAXIMUM UGYANONNAN JÖN, MINT A MINIMUM, és
   * ugyanabból a modulból: a három paraméter egy szabálycsalád.
   */
  const quantityStep = orderQuantityStep(product)
  const orderMaximum = maximumOrderQuantity(product)
  const [quantity, setQuantity] = useState(minimumQuantity)
  const countryCode = useParams().countryCode as string

  /*
    AZ EFFEKT MARAD, DE MOSTANTOL NEM FUT FELESLEGESEN.

    A kezdoertek mar helyes, tehat ez az ag csak akkor tesz valamit, ha a
    `product` KESOBB valtozik anelkul, hogy a komponens ujra beallna. Ezert
    hasonlit ELOBB, es csak elteresnel ir: enelkul minden bejovo termek-objektum
    egy UJ objektumot tolt be azonos tartalommal, es az felesleges ujrarajzolast
    okoz.

    Nem toroltem: az, hogy a lap-valtas mindig ujra beallitja a komponenst, a
    keret viselkedesere vonatkozo FELTEVES lenne, es nem mertem le.
  */
  useEffect(() => {
    const kezdo = kezdoOpciok(product)
    if (!Object.keys(kezdo).length) return
    setOptions((elozo) => (isEqual(elozo, kezdo) ? elozo : kezdo))
  }, [product])

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
  /**
   * TUDJUK-E, MENNYI A KESZLET.
   *
   * A `manage_inventory` hamis erteke azt jelenti, hogy a bolt nem tart
   * keszletet erre a valtozatra -- ott a kerdes ertelmetlen, es a lap ugysem az
   * ELFOGYOTT/ELADVA agon all. Ahol viszont TART keszletet, ott a HIANYZO szam
   * es a mert nulla ket kulonbozo allapot, es a kettot a `|| 0` alak mossa
   * ossze. Az ELADVA ag csak a mert nullara szolhat.
   */
  const inventoryKnown =
    !selectedVariant?.manage_inventory ||
    typeof selectedVariant?.inventory_quantity === "number"

  const availability = availabilityOf({
    inStock: inStock && !!isValidVariant,
    uniquePiece,
    inventoryKnown,
  })
  const maximumQuantity =
    selectedVariant?.manage_inventory && !selectedVariant.allow_backorder
      ? Math.max(selectedVariant.inventory_quantity || 0, 1)
      : null
  /**
   * A KÉT HATÁR ÜTKÖZHET, és a sorrend eldönti, melyik nyer. A felső határ a
   * készletből jön, az alsó a termék minimumából -- egy 100-as minimumú termék
   * két darabos készlettel mindkettőt egyszerre nem tudja teljesíteni.
   *
   * Ilyenkor az ALSÓ nyer, mert az a rendelhetőség feltétele: a felső határ
   * annyit mond, hogy ennyi van raktáron, az alsó azt, hogy ennél kevesebbet
   * nem lehet megrendelni. A kettő közül a másodikat megsérteni hibás rendelést
   * ad, az elsőt utánrendelést.
   */
  const normaliseQuantity = (value: number) =>
    normaliseOrderQuantity({
      value,
      minimum: minimumQuantity,
      step: quantityStep,
      orderMaximum,
      stockMaximum: maximumQuantity,
    })

  const novelheto = canIncreaseOrderQuantity({
    quantity,
    minimum: minimumQuantity,
    step: quantityStep,
    orderMaximum,
    stockMaximum: maximumQuantity,
  })

  const rendelesiMondat = orderQuantityHint({
    minimum: minimumQuantity,
    step: quantityStep,
    orderMaximum,
  })

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

  const ertek: VasarlasAllapot = {
    product,
    options,
    setOptionValue,
    selectedVariant,
    isValidVariant,
    quantity,
    setQuantity,
    normaliseQuantity,
    minimumQuantity,
    maximumQuantity,
    quantityStep,
    novelheto,
    rendelesiMondat,
    availability,
    uniquePiece,
    similarHref,
    isAdding,
    disabled: !!disabled,
    handleAddToCart,
  }

  return (
    <VasarlasKontextus.Provider value={ertek}>
      {children}
    </VasarlasKontextus.Provider>
  )
}
