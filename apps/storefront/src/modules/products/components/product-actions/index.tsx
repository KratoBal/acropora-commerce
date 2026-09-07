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
import { minimumOrderQuantity } from "./minimum-order-quantity"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"],
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
  /**
   * A KEZDŐÉRTÉK A TERMÉK MINIMUMA, nem beégetett 1. Tizenhat terméknél a
   * minimum nem 1 (nyolcnál 10, hétnél 100, egynél 5), és ott az 1 olyan
   * mennyiség, amit nem lehet megrendelni.
   */
  const minimumQuantity = minimumOrderQuantity(product)
  const [quantity, setQuantity] = useState(minimumQuantity)
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
  const normaliseQuantity = (value: number) => {
    if (!Number.isInteger(value) || value < minimumQuantity)
      return minimumQuantity
    return maximumQuantity
      ? Math.max(Math.min(value, maximumQuantity), minimumQuantity)
      : value
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
          {/*
            A VALASZTO DOBOZ HAROM ALLAPOTA -- ES A LATHATOSAG ELVALIK A
            VALASZTHATOSAGTOL.

            Eddig a ketto EGYBE volt kotve: egy valtozatnal a doboz el sem
            keszult. Balazs vaz-kerese ota (2026-09-07) a lap ALLJON OSSZE ugy,
            ahogy a terv -- tehat a doboz OTT A HELYEN akkor is, ha nincs mit
            valasztani. Acrobot pontositasa ezt harom allapotra bontja:

              ket vagy tobb valtozat   valodi valaszto, kattinthato gombokkal
              PONTOSAN egy valtozat    a doboz OTT ALL, de NEM valaszthato
              nulla opcio              a doboz nem jelenik meg

            A masodik allapotban a gombok LETILTVA allnak. Igy a "egyetlen
            valtozatnal nincs VALASZTAS" allitas tovabbra is igaz es merheto --
            csak nem a doboz hianyabol olvassuk ki, hanem abbol, hogy nem lehet
            valasztani.

            ES MIKOR LESZ LATHATO AZ ELSO ALLAPOT (a valodi valaszto):
            amikor az elso TOBBVALTOZATOS termek webshoposra kerul.

            Merve (acrobot, 2026-09-07): a torzsadatban KILENC tobbvaltozatos
            termek all (Reef Factory lampak es lampatartok, plusz egy kozeli
            lejaratu tetel), es MIND A KILENC `webshopSellable = NEM`. Nulla
            kivetel, es a boltban egyetlen `RF-` cikkszam sem all.

            Vagyis a Medusa "minden termeknek pontosan egy valtozata" allapota
            NEM a vetites osszevonasa, hanem a valosag: ami tobbvaltozatos, az
            ki van szurve a webshopbol.

            A KULONBSEG GYAKORLATI: egy NEM LETEZO kepesseghez keszult felulet
            torlendo; egy MA NEM LATHATO kepesseg viszont az elso ilyen
            terméknel el. Ezert marad mind a harom allapot.

            MIERT SZAMIT EZ A KATALOGUSON -- ES A SZAM HELYESBITVE (2026-09-07
            22:3x, a teljes katalogus bejarva, lapozva):

              1492 termek, MINDEGYIKNEK pontosan EGY opcioja: `Kivitel` = `Alap`
              tobb opcios vagy tobb valtozatos termek: NULLA

            Korabban "1884 termeknek nincs valtozata, 9-nek van" allt itt. Az a
            szam az UNAS FORRASOLDALROL valo, nem a Medusa `variants` /
            `options` mezojerol -- ket kulonbozo rendszer, ugyanaz a szo. A
            Medusaban minden termeknek VAN legalab egy valtozata.

            AMIT EZ A GYAKORLATBAN JELENT: ma a MASODIK allapot fut minden
            terméklapon (a doboz ott all, nem valaszthato), es az ELSO allapot
            (valodi valaszto) a mai adaton EGYALTALAN NEM all elo. Allitas fedi,
            de a boltban nem latszik -- ezt jobb tudni, mint kiprobaltnak hinni.

            ES EGY NEGYEDIK ESET, AMI NEM A VALTOZATOK SZAMAROL SZOL:
            EGYEDI PELDANYNAL A DOBOZ EGYALTALAN NEM JELENIK MEG.

            A lapon MAR ALL egy allitas: "1 db, Egyedi peldany". Egy doboz --
            meg letiltva is -- ugyanarra a kerdesre ad MASIK valaszt: azt
            sugallja, hogy VAN tengely, amin valasztani lehetne, csak most nem
            szabad. Egy WYSIWYG korallnal nincs ilyen tengely: egy peldany van,
            es az az. (acrobot dontese, 2026-09-07.)

            SZABALY, NEM PARAMETER: ha a hivo dontene, a ket termeklap ket
            kulonbozo valaszt adna ugyanarra a kerdesre. A `uniquePiece` itt
            MAR ismert (abbol dol a keszlet-doboz harom allapota is), tehat a
            szabaly egy sor, es a komponensben lakik.

            ES AMIT EZ MOSTANTOL TENYLEG VALTOZTAT: a fenti harom allapot ota a
            doboz EGY valtozatnal is megjelenik -- vagyis a harom WYSIWYG
            korallon MA MEGJELENNE, ha ez a feltetel nem allna itt. Amikor ezt
            a sort megirtam, meg nem valtoztatott semmit (a regi feltetel `> 1`
            volt); a 81 beolvasztasa ota valtoztat. A mondat, ami akkor igaz
            volt, ma mar nem az.
          */}
          {/*
            ES AMIERT A `options?.length > 0` FELTETEL BENT MARAD, HOLOTT MA
            REDUNDANS -- mert a kalibracio ezt kifejezetten megmutatta.

            A feltetel elhagyasa NULLA allitast dont pirosra: a vedelem ket
            helyen all, es a masik fele (a `ProductOptionSelect` sajat ures-ag
            kezelese) egyedul is megvedi a lapot. Vagyis a kovetkezo olvaso
            joggal hiszi, hogy a sor felesleges.

            NEM AZ. Ha kikerul, egy opcio nelkuli terméknel egy URES KONTENER es
            egy ELVALASZTO marad a lapon -- olyan kimenet, amire ma EGYETLEN
            allitas sem szol. A redundancia tehat nem veletlen, hanem a
            MASODIK reteg, es a jelenlegi adaton (nulla opcio nelkuli termek)
            egyszeruen nem tud elsulni.

            Egy redundans vedelem, aminek le van irva, MIERT redundans, mas
            dolog, mint egy felesleges sor. (acrobot kikotese, 2026-09-07.)

            ES MIKOR KELL UJRA RANEZNI: az ELSO OPCIO NELKULI TERMEK
            megjelenesekor. Ma mind az 1492 termek visel egy opciot
            (Kivitel = Alap), tehat ez a sor nem sul el; az elso olyan
            terméknel viszont, aminek NINCS opcioja, ez a feltetel az egyetlen,
            ami megakadalyozza, hogy ures kontener es egy elvalaszto keruljon a
            lapra. A komment eddig azt mondta meg, MIERT all itt -- ez a
            bekezdes azt, MIKOR szamit eloszor.
          */}
          {!uniquePiece && (product.options?.length ?? 0) > 0 && (
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
                      disabled={
                        !!disabled ||
                        isAdding ||
                        (product.variants?.length ?? 0) <= 1
                      }
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
                  disabled={
                    maximumQuantity !== null && quantity >= maximumQuantity
                  }
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
        {/*
          A LÉPTETŐ MÁR NEM ENGED A MINIMUM ALÁ, DE EGY NÉMA KORLÁT MEGZAVAR: a
          vevő azt látná, hogy a mínusz gomb nem csinál semmit, és nem tudná,
          miért. A mondat csak akkor jelenik meg, ha van mit mondania -- 1877
          terméknél a minimum 1, és ott a hallgatás a helyes.
        */}
        {!uniquePiece && minimumQuantity > 1 && (
          <p className="text-small-regular text-ui-fg-subtle">
            Ebből a termékből legalább {minimumQuantity} darab rendelhető.
          </p>
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
