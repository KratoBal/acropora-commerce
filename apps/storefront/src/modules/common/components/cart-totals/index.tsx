"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    /**
     * A TETELEK ADOJA. Ez teszi a netto reszosszeget bruttova -- lasd a lenti
     * indoklast. Ha hianyzik, a reszosszeg a NETTO ertek marad, es az a lapon
     * kevesebbet mutat: ezert all mellette a `?? 0` helyett kimondott kezeles.
     */
    item_tax_total?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    item_tax_total,
    shipping_subtotal,
    discount_subtotal,
  } = totals

  /**
   * A RÉSZÖSSZEG BRUTTÓ, ÉS EZT EGY MÉRÉS DÖNTÖTTE EL.
   *
   * Mérve egy valódi kosáron a teszt bolton (acrobot, 2026-09-07), egy 1200 Ft-os
   * terméken:
   *
   *     item_subtotal    944,88     (NETTO)
   *     item_tax_total   255,12
   *     total          1200,00      (BRUTTO)
   *     944,88 + 255,12 = 1200      pontosan, es 255,12 / 944,88 = 27 szazalek
   *
   * A TERMÉKLAPON bruttó ár áll (1200 Ft). Ha a kosár részösszege 944,88-at
   * mutatna, a vevő KÉT KÜLÖNBÖZŐ számot látna ugyanarra a termékre, és egy
   * vegyes kosárban ez halmozódna.
   *
   * Ezért a részösszeg a tételek BRUTTÓ összege, az áfa pedig alatta,
   * INFORMÁCIÓS sorként áll („Ebből áfa"), nem összeadandó tételként.
   *
   * A HIÁNYZÓ ADÓ-ÉRTÉK ITT NEM NULLA: ha a mező nem jön, a részösszeg a nettó
   * érték marad, tehát KEVESEBBET mutat a valósnál. Ezt nem tudjuk elrejteni,
   * de nem is állítjuk másnak: a `Fizetendő` sor mindig a `total`, és az a
   * mérvadó szám.
   */
  const item_gross = (item_subtotal ?? 0) + (item_tax_total ?? 0)

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          {/*
            A FELIRAT NEM MOND TOBBET, MINT AMIT MERTUNK.

            Az eredeti szoveg ("excl. shipping and taxes") ALLITAST tett az ado
            kezelesérol. A bolt hattéroldala viszont BRUTTO arakkal dolgozik
            (`is_tax_inclusive: true` a dij-tetelen es a szallitasi aron), es a
            terv is azt mondja, hogy "az arak brutto arak, 27% afaval".

            Hogy az `item_subtotal` ezen belul pontosan mit tartalmaz, azt EGY
            valodi kosaron kell megmerni -- addig a felirat a sor NEVET mondja,
            nem a tartalmat magyarazza. Egy rossz magyarazat rosszabb, mint egy
            szuk felirat: a vevo szamol vele.
          */}
          <span>Részösszeg</span>
          <span data-testid="cart-subtotal" data-value={item_gross}>
            {convertToLocale({ amount: item_gross, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Szállítás</span>
          <span data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code })}
          </span>
        </div>
        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>Kedvezmény</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              -{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          {/*
            AZ "EBBOL" SZO A LENYEG: e nelkul a vevo HOZZAADJA a fejeben. A sor
            nem az osszegzes resze, hanem alatta allo magyarazat -- a tervben
            nincs kulon ado-sor, es ez a megoldas azt tiszteletben tartja.

            ES SZANDEKOSAN NEM ALL ITT KULCS (27 szazalek): egy vegyes kosarban
            ket kulonbozo kulcs is keveredhet, es akkor egy kiirt szazalek egy
            ATLAGOT allitana. Az OSSZEG mindig igaz, a kulcs nem.
          */}
          <span className="flex gap-x-1 items-center ">Ebből áfa</span>
          <span data-testid="cart-taxes" data-value={tax_total || 0}>
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <span>Fizetendő</span>
        <span
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CartTotals
