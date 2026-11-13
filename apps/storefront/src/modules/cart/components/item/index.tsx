"use client"

import { updateLineItem } from "@lib/data/cart"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { convertToLocale } from "@lib/util/money"
import { KOSAR_MOST_NEM_SIKERULT } from "@lib/util/kosar-uzenet"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { similarItemsHref } from "@modules/products/components/stock-state/availability"
import { useParams } from "next/navigation"
import { useState } from "react"

import CartLineState, { NotIncrementable } from "../line-state"
import { cartLineProduct, cartLineStateOf } from "../line-state/line-state"
import {
  maximumOrderQuantity,
  minimumOrderQuantity,
  orderQuantityStep,
} from "@modules/products/components/product-actions/minimum-order-quantity"
import { kosarMennyisegOpciok } from "./mennyiseg-opciok"
import { valtozatNev } from "./valtozat"
import { kosarValtozott } from "@modules/layout/components/kosar-allapot/kosar-esemeny"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const { countryCode } = useParams() as { countryCode: string }
  const t = translator(localeOf(countryCode))
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /*
    A HIBA A MUVELET VALASZABOL JON, NEM A KIVETELBOL.

    Itt korabban `.catch((err) => setError(err.message))` allt. Fejlesztoi gepen
    ez mukodik; produkcioban NEM: a Next a szerver-muveletbol DOBOTT hiba
    uzenetet lecsereli egy altalanos angol mondatra es egy digestre, tehat a
    vevo azt latta volna a kosarban, amit a kedvezmenykodnal mar lemertunk
    (#371). Egy VISSZAADOTT ertek valtozatlanul atmegy a hataron.

    A `try/catch` ATTOL MEG ITT MARAD: az `updateLineItem` a ket hianyzo
    azonositora tovabbra is DOB (az a mi hibank, nem a vevoe), es kell egy ag,
    ami ilyenkor sem hagyja a lapot pörgo allapotban.
  */
  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    try {
      const eredmeny = await updateLineItem({
        lineId: item.id,
        quantity,
      })

      if (!eredmeny.ok) {
        setError(eredmeny.uzenet)
      }
    } catch {
      setError(KOSAR_MOST_NEM_SIKERULT)
    } finally {
      kosarValtozott()
      setUpdating(false)
    }
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

  /**
   * AZ ÁRAK: a sor összege és az egységár, a kedvezményes ár áthúzott
   * eredetivel. A számolás a közös `LineItemPrice` és `LineItemUnitPrice`
   * komponensekével azonos, a kosár saját, szótáras és világos kirajzolásával
   * (azok a pénztár és a rendelés oldalán is állnak, és azok külön kör).
   */
  const sorOsszeg = item.total ?? 0
  const sorEredeti = item.original_total ?? 0
  const kedvezmenyes = sorOsszeg < sorEredeti
  const egysegAr = sorOsszeg / (item.quantity || 1)
  const egysegEredeti = sorEredeti / (item.quantity || 1)
  const penz = (amount: number) =>
    convertToLocale({ amount, currency_code: currencyCode })

  return (
    <tr
      className="grid w-full grid-cols-[72px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t border-acr-line py-4 align-top small:table-row small:py-0"
      data-testid="product-row"
    >
      <td
        className={
          type === "preview"
            ? "row-span-2 w-16 small:py-4 small:pr-4"
            : "row-span-2 small:w-24 small:py-4 small:pr-4"
        }
      >
        <LocalizedClientLink
          href={`/termek/${item.product_handle}`}
          className="flex w-full border border-acr-line"
        >
          <Thumbnail
            alt={item.product_title ?? item.title ?? ""}
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>
      </td>
      <td className="col-start-2 text-left small:py-4 small:pr-4">
        <p
          className="text-[16px] font-medium leading-[26px] text-acr-ink"
          data-testid="product-title"
        >
          {item.product_title}
        </p>
        {valtozatNev(item.variant?.title, item.product_title) ? (
          <p
            className="text-[14px] leading-[22px] text-acr-slate"
            data-testid="product-variant"
          >
            {valtozatNev(item.variant?.title, item.product_title)}
          </p>
        ) : null}
        <CartLineState
          state={lineState}
          similarHref={similarItemsHref(sorTermeke)}
          countryCode={countryCode}
        />
      </td>
      {type === "full" && (
        <td className="col-span-2 col-start-2 small:py-4 small:pr-4">
          <div className="flex items-center gap-3">
            {lineState !== "NORMAL" ? (
              <NotIncrementable countryCode={countryCode} />
            ) : (
              <CartItemSelect
                aria-label={t("cartPage.quantityLabel")}
                value={item.quantity}
                onChange={(value) =>
                  changeQuantity(parseInt(value.target.value))
                }
                data-testid="product-select-button"
              >
                {/*
                A LISTA A MINIMUMTOL INDUL, A LEPESKOZT ES A RENDELESI
                MAXIMUMOT IS OLVASSA: ugyanabbol a modulbol, mint a
                termeklap, kulonben a kosar mas mennyisegeket kinalna, mint
                amit a lap enged.
              */}
                {kosarMennyisegOpciok({
                  minimum: minimumOrderQuantity(sorTermeke),
                  jelenlegi: item.quantity,
                  lepes: orderQuantityStep(sorTermeke),
                  rendelesiMaximum: maximumOrderQuantity(sorTermeke),
                }).map((mennyiseg) => (
                  <option value={mennyiseg} key={mennyiseg}>
                    {mennyiseg}
                  </option>
                ))}
              </CartItemSelect>
            )}
            <DeleteButton
              id={item.id}
              ariaLabel={t("cartPage.deleteLine")}
              data-testid="product-delete-button"
            />
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </td>
      )}
      {type === "full" && (
        <td className="hidden small:table-cell small:py-4 small:pr-4">
          <div className="text-[14px] leading-[22px] text-acr-slate">
            {kedvezmenyes && (
              <p
                className="line-through"
                data-testid="product-unit-original-price"
              >
                {penz(egysegEredeti)}
              </p>
            )}
            <span data-testid="product-unit-price">{penz(egysegAr)}</span>
          </div>
        </td>
      )}
      <td className="col-start-3 row-start-1 text-right small:py-4">
        <div className="flex flex-col items-end text-[16px] leading-[26px] text-acr-ink">
          {type === "preview" && (
            <span className="text-[14px] text-acr-slate">
              {item.quantity}x {penz(egysegAr)}
            </span>
          )}
          {kedvezmenyes && (
            <span
              className="text-[14px] text-acr-slate line-through"
              data-testid="product-original-price"
            >
              {penz(sorEredeti)}
            </span>
          )}
          <span className="font-medium" data-testid="product-price">
            {penz(sorOsszeg)}
          </span>
        </div>
      </td>
    </tr>
  )
}

export default Item
