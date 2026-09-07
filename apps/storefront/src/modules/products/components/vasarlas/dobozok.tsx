"use client"

import { Button } from "@modules/common/components/ui"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import ProductPrice from "../product-price"
import StockState from "../stock-state"
import { useVasarlas } from "./kontextus"

/**
 * A NEGY VASARLASI DOBOZ, KULON-KULON -- A TERV SZERINT.
 *
 * A terv a jobb oszlopot negy dobozra bontja, es eddig mind a negy tartalma
 * EGY dobozban allt (a `mennyiseg` slotban), mert egyetlen komponens volt.
 * Az allapot most az `allapot.tsx`-ben lakik, tehat a negy doboz kulon
 * olvashatja ugyanazt -- a viselkedes valtozatlan.
 *
 * MINDEGYIK `null`-t ad provider nelkul, es ez SZANDEKOS: a vaz ilyenkor a
 * varakozo szoveget mutatja, ami a helyes valasz. A varrat merese nem itt van,
 * hanem a megepitett lapon.
 */

/** 6. doboz: AR. */
export function ArDoboz() {
  const a = useVasarlas()
  if (!a) return null
  return <ProductPrice product={a.product} variant={a.selectedVariant} />
}

/**
 * 7. doboz: ELERHETOSEG.
 *
 * A terv felirata "Keszlet, szallitas, bolti atvetel". Ebbol MA a keszlethez
 * kotodo ket teny letezik, es mind a ketto MAR MEGVOLT, csak rossz helyen:
 *
 *   a kiszereles (`Kiszereles: ...`)   eddig is itt allt, a `vazTartalom`-bol
 *   a minimalis rendelesi mennyiseg    eddig a GOMB ALATT, a 9. dobozban
 *
 * A szallitas es a bolti atvetel NEM letezik adatkent, tehat nem kerul ide
 * kitalalt sor.
 *
 * ES AMI SZANDEKOSAN NEM KERUL IDE: a keszlet-allapot SZOVEGE ("Kosarba",
 * "Nincs raktaron", "Eladva"). Azt a 9. doboz gombja MONDJA KI, ugyanabbol az
 * `availabilityLabel` terkepbol. Ha ide is kiirnank, ket allitas allna
 * ugyanarrol a lapon, es a ketto elcsuszasa NEM hibazna, csak mast mutatna --
 * ugyanaz az alak, amiert a ragados sav sem szamol sajat arat.
 */
export function ElerhetosegDoboz({
  kiszereles,
  minimumMennyiseg,
}: {
  kiszereles?: string
  minimumMennyiseg?: number
}) {
  const minimumSor =
    minimumMennyiseg && minimumMennyiseg > 1 ? (
      /**
       * A LEPTETO MAR NEM ENGED A MINIMUM ALA, DE EGY NEMA KORLAT MEGZAVAR: a
       * vevo azt latna, hogy a minusz gomb nem csinal semmit, es nem tudna,
       * miert. A mondat csak akkor jelenik meg, ha van mit mondania -- 1877
       * terméknel a minimum 1, es ott a hallgatas a helyes.
       */
      <p className="text-small-regular text-ui-fg-subtle">
        Ebből a termékből legalább {minimumMennyiseg} darab rendelhető.
      </p>
    ) : null

  /**
   * TISZTA MEGJELENITES, KONTEXT NELKUL -- ES EZ SZANDEKOS.
   *
   * A masik harom doboz allapotot olvas; ez ketto TENYT, es mindketto a
   * termekbol szamolhato (`unas_unit`, `unas_minimum_order_quantity`). Ha
   * kontextbol venne oket, egy provider nelkuli lapon URESEN allna ugy, hogy a
   * vaz TELINEK jeloli -- rosszabb, mint a varakozas.
   */
  if (!kiszereles && !minimumSor) return null

  return (
    <div className="flex flex-col gap-y-2">
      {kiszereles ? (
        <p className="text-sm" data-testid="vaz-egyseg">
          Kiszerelés: {kiszereles}
        </p>
      ) : null}
      {minimumSor}
    </div>
  )
}

/**
 * 8. doboz: VALTOZAT-VALASZTO.
 *
 * A harom allapot (valodi valaszto / ott all de nem valaszthato / meg sem
 * jelenik) VALTOZATLAN, a `ProductActions` torzsebol kerult ide, betuhiven.
 * A ket feltetel indoka is valtozatlan, es a `product-actions/index.tsx`
 * fejlece orzi a teljes levezetest -- ide csak a rovid alak kerul, hogy a ket
 * peldany ne csusszon el egymastol.
 */
export function ValasztoDoboz() {
  const a = useVasarlas()
  if (!a) return null
  if (a.uniquePiece) return null
  if ((a.product.options?.length ?? 0) === 0) return null

  return (
    <div className="flex flex-col gap-y-4">
      {(a.product.options || []).map((option) => (
        <div key={option.id}>
          <OptionSelect
            option={option}
            current={a.options[option.id]}
            updateOption={a.setOptionValue}
            title={option.title ?? ""}
            data-testid="product-options"
            disabled={
              a.disabled || a.isAdding || (a.product.variants?.length ?? 0) <= 1
            }
          />
        </div>
      ))}
    </div>
  )
}

/**
 * 9. doboz: MENNYISEG ES KOSARBA TETEL.
 *
 * A lap alji sav (14. doboz) NEM ehhez meri magat: az a sav `sticky`, es a
 * gombja UGRIK ide (`#vaz-mennyiseg`), nem onallo kosarba-tetel. Ezert itt
 * nincs `ref` es nincs lathatosag-figyelo -- a regi lap lebego sávja az, ami
 * ilyet igenyelt, es az a `ProductActions`-ben maradt, a regi uton.
 */
export function MennyisegDoboz() {
  const a = useVasarlas()
  if (!a) return null

  if (!a.selectedVariant) {
    return (
      <div>
        <Button
          disabled
          variant="primary"
          className="w-full h-10"
          data-testid="add-product-button"
        >
          Válassz változatot
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {!a.uniquePiece && (
        <div className="flex items-center rounded-md border border-ui-border-base">
          <button
            type="button"
            aria-label="Mennyiség csökkentése"
            className="h-10 w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            onClick={() => a.setQuantity(a.normaliseQuantity(a.quantity - 1))}
          >
            −
          </button>
          <input
            aria-label="Mennyiség"
            className="h-10 w-12 bg-transparent text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            inputMode="numeric"
            value={a.quantity}
            onChange={(event) =>
              a.setQuantity(a.normaliseQuantity(Number(event.target.value)))
            }
            onBlur={() => a.setQuantity(a.normaliseQuantity(a.quantity))}
          />
          <button
            type="button"
            aria-label="Mennyiség növelése"
            className="h-10 w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            onClick={() => a.setQuantity(a.normaliseQuantity(a.quantity + 1))}
            disabled={
              a.maximumQuantity !== null && a.quantity >= a.maximumQuantity
            }
          >
            +
          </button>
        </div>
      )}
      <StockState
        availability={a.availability}
        similarHref={a.similarHref}
        onAddToCart={a.handleAddToCart}
        isAdding={a.isAdding}
        disabled={a.disabled || a.isAdding}
      />
    </div>
  )
}
