"use client"

import { Table, Text, clx } from "@modules/common/components/ui"
import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { similarItemsHref } from "@modules/products/components/stock-state/availability"
import { useState } from "react"

import CartLineState, { NotIncrementable } from "../line-state"
import { cartLineProduct, cartLineStateOf } from "../line-state/line-state"
import { minimumOrderQuantity } from "@modules/products/components/product-actions/minimum-order-quantity"
import { kosarMennyisegOpciok } from "./mennyiseg-opciok"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  /*
    A KESZLET FELSO HATARA MA NEM ISMERT, ES EZT KI KELL MONDANI.

    Itt korabban ket sor allt (`maxQtyFromInventory = 10` es egy `maxQuantity`,
    ami a `manage_inventory` agtol fuggetlenul SZINTEN 10-et adott), plusz a
    starter TODO-ja, hogy a valodi keszletet kellene ide hozni. A ket ag azonos
    erteke miatt a valtozo nem hordozott informaciot: egy helykitolto volt, ami
    KESZLET-KORLATNAK latszott.

    Ezert nem adunk at semmit: a `kosarMennyisegOpciok` harmadik argumentuma
    FELSO HATAR, es hianyaban vegtelen -- egy nem ismert korlat ne szukitsen.

    TODO: amikor a valodi keszlet elerheto lesz, AZT kell harmadik
    argumentumkent atadni (a darabszamot a fuggveny maga korlatozza tizre).
  */

  /**
   * AZ EGYEDI PÉLDÁNY A KOSÁRBAN.
   *
   * A jelző KIFEJEZETT, és ugyanabból a függvényből jön, mint a terméklapon
   * (`uniquePieceOf`) -- egy szabály, két hely. Amíg a vetítés nem hozza át,
   * minden sor NORMAL, és a kosár pontosan úgy néz ki, mint ma.
   *
   * === AZ ELKELT: MEG NEM ELERT ALLAPOT, ES MEGNEVEZEM A FELOLDASAT ===
   *
   * Ma semmi nem allitja elo, es ez nem elmaradas, hanem MERES (2026-09-08):
   *
   *   a kosar-lekerdezes NEM hozza a keszlet-mennyiseget, meg akkor sem, ha
   *   kifejezetten kerem (`items.variant.inventory_quantity` nincs a valaszban)
   *
   *   es ami dontobb: egy nulla keszletu EGYEDI peldanyt a bolt BE SEM ENGED a
   *   kosarba -- probaltam, HTTP 400, `insufficient_inventory`. Ugyanazon a
   *   nulla keszleten egy normal termek bekerul, mert nala a hatralek
   *   engedelyezett.
   *
   * Vagyis az ELKELT allapot CSAK ugy allhatna elo, ha a peldany MIKOZBEN a
   * kosarban van, fogy el. Ahhoz valodi keszlet kell egy egyedi peldany mogott,
   * es ma a bolt egyetlen valodi termeke sem visel keszletet.
   *
   * === A FELOLDASI FELTETEL, ES HONNAN KELL JONNIE A JELNEK ===
   *
   * Amikor valodi keszlet all egy egyedi peldany mogott, ez az allapot eletre
   * kel. De a jelnek NEM MINDEGY, honnan jon, es ezt acrobot erve dontotte el
   * (14553):
   *
   *   a bolt sajat rendelesei    SZERKEZETILEG VAKOK ra. A WYSIWYG peldanyok
   *                              tulnyomo reszet A BOLTBAN adjak el, nem a
   *                              webshopon, es arrol a Medusa semmit nem tud.
   *
   *   az Acropora OS             ott kel el a peldany (bolti eladas VAGY
   *                              webshopos rendeles), es az OS a torzsadat
   *                              gazdaja. A jelnek onnan kell jonnie, a
   *                              vetitesen at.
   *
   * Vagyis egy elohivo, ami a bolt rendeleseibol dolgozna, a valodi esetek
   * TOBBSEGET nem latna -- es epp attol latszana mukodonek, hogy a ritkabb
   * esetet helyesen kezeli.
   *
   * A MAI ALLAPOT, MERVE (2026-09-08, a bolt teljes katalogusa): 1492
   * valtozatbol EGYETLEN visel nulla folotti keszletet, es az a sajat
   * proba-termekunk (TEST0001, 4242 darab). Vagyis egyetlen valodi termek sem.
   *
   * ADDIG A `stillAvailable` IGAZ, es ez tudatos: egy elohivo, ami nem tud
   * elsulni, diszlet. (acrobot egyetertett, 14559 -- es hozzatette, hogy ebben
   * a dobozban ez mar a MASODIK diszlet lett volna, ami azt jelzi, hogy a doboz
   * a valosag elott jar.)
   */
  /**
   * A TERMEK-OBJEKTUM A SORHOZ. Merve: a valtozat alatti termek CSAK az
   * azonositot hordozza, a mezoket az `item.product` hozza. A valasztas a
   * `cartLineProduct` fuggvenyben all, allitassal.
   */
  const sorTermeke = cartLineProduct(item)

  const lineState = cartLineStateOf({
    productMetadata: sorTermeke.metadata,
    stillAvailable: true,
  })

  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="!pl-0 p-4 w-24">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className={clx("flex", {
            "w-16": type === "preview",
            "small:w-24 w-12": type === "full",
          })}
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>
      </Table.Cell>

      <Table.Cell className="text-left">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        <CartLineState
          state={lineState}
          similarHref={similarItemsHref(sorTermeke)}
        />
      </Table.Cell>

      {type === "full" && (
        <Table.Cell>
          <div className="flex gap-2 items-center w-28">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            {lineState !== "NORMAL" ? (
              <NotIncrementable />
            ) : (
              <CartItemSelect
                value={item.quantity}
                onChange={(value) =>
                  changeQuantity(parseInt(value.target.value))
                }
                className="w-14 h-10 p-4"
                data-testid="product-select-button"
              >
                {/*
                A LISTA A MINIMUMTOL INDUL, NEM EGYTOL.

                A minimalis rendelesi mennyiseget eddig csak a termeklap
                ismerte; a kosar mindig 1-tol kinalt tizig. Merve a boltban
                (2026-09-08): tizennegy termeknek van egynel nagyobb minimuma
                (nyolcnak 10, otnek 100, egynek 5).

                Ket baj kovetkezett belole, es a masodik a sulyosabb: a vevo a
                minimum ALA vihette a mennyiseget, szazas minimumnal pedig a
                helyes erteket EL SEM TUDTA ERNI, mert a lista tizig ert.

                A STRAY MASODIK "1" OPCIO IS KIKERULT: a starterbol maradt itt,
                es a lista elso elemet duplazta.
              */}
                {kosarMennyisegOpciok(
                  minimumOrderQuantity(sorTermeke),
                  item.quantity,
                ).map((mennyiseg) => (
                  <option value={mennyiseg} key={mennyiseg}>
                    {mennyiseg}
                  </option>
                ))}
              </CartItemSelect>
            )}
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </Table.Cell>
      )}

      {type === "full" && (
        <Table.Cell className="hidden small:table-cell">
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </Table.Cell>
      )}

      <Table.Cell className="!pr-0">
        <span
          className={clx("!pr-0", {
            "flex flex-col items-end h-full justify-center": type === "preview",
          })}
        >
          {type === "preview" && (
            <span className="flex gap-x-1 ">
              <Text className="text-ui-fg-muted">{item.quantity}x </Text>
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
          )}
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
