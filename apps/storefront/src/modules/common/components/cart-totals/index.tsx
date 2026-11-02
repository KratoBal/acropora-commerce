"use client"

import { useTranslate } from "@lib/i18n/use-translate"
import {
  kosarOsszegek,
  type KosarOsszegekBemenet,
} from "@lib/util/kosar-osszegek"
import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: KosarOsszegekBemenet
}

/**
 * A PÉNZTÁR OLDALSÁVJÁNAK ÖSSZEGZÉSE. A számolás a közös `kosarOsszegek`-é (a
 * kosár oldal összegzése is azt használja), itt a kirajzolás és a szövegek
 * vannak; a szövegek a kosár oldal kulcsai (`cartPage.*`), mert a két oldal
 * ugyanazokat a sorokat nevezi meg.
 *
 * A RÉSZÖSSZEG BRUTTÓ (mérve egy valódi kosáron a teszt bolton, 2026-09-07:
 * nettó 944,88 + adó 255,12 = 1200, és a termékoldalon 1200 áll), a szállítás is
 * (2026-09-29, GLS csomagpont: nettó 2755,91 + adó 744,09 = 3500). Az áfa sora
 * INFORMÁCIÓS ("ebből"), nem összeadandó. A `Fizetendő` mindig a `total`.
 * Az áfa kulcsa szándékosan nem áll ki: vegyes kosárban két kulcs keveredhet,
 * és egy kiírt százalék átlagot állítana. Az összeg mindig igaz, a kulcs nem.
 */
const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const t = useTranslate()
  const o = kosarOsszegek(totals)
  const penz = (amount: number) =>
    convertToLocale({ amount, currency_code: o.currencyCode })

  return (
    <div>
      <div className="flex flex-col gap-y-2 text-[14px] leading-[22px] text-acr-slate">
        <div className="flex items-center justify-between">
          <span>{t("cartPage.subtotal")}</span>
          <span data-testid="cart-subtotal" data-value={o.itemGross}>
            {penz(o.itemGross)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>{t("cartPage.shipping")}</span>
          <span data-testid="cart-shipping" data-value={o.shippingGross}>
            {penz(o.shippingGross)}
          </span>
        </div>
        {!!o.discount && (
          <div className="flex items-center justify-between">
            <span>{t("cartPage.discount")}</span>
            <span
              className="text-acr-ocean"
              data-testid="cart-discount"
              data-value={o.discount}
            >
              - {penz(o.discount)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>{t("cartPage.vat")}</span>
          <span data-testid="cart-taxes" data-value={o.tax}>
            {penz(o.tax)}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-acr-line pt-4 text-acr-ink">
        <span className="text-[16px] font-medium leading-[26px]">
          {t("cartPage.payable")}
        </span>
        <span
          className="text-[24px] leading-[30px]"
          data-testid="cart-total"
          data-value={o.total}
        >
          {penz(o.total)}
        </span>
      </div>
    </div>
  )
}

export default CartTotals
