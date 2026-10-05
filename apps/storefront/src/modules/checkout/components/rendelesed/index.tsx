import { HttpTypes } from "@medusajs/types"

import { tetelSor } from "@lib/util/fizetesi-oldal"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** A cselekvo gomb helye az osszesitoben: a fizetesi resz ide rajzolja (portal). */
export const PENZTAR_CTA_HELY = "penztar-cta-hely"

/**
 * "Rendelésed" (Figma 209:3 jobb oszlop, mobilon "Összesítés"): a tetelek, a
 * termekek es a szallitas brutto osszege, a fizetendo, es a CTA helye. Az
 * osszegek ugyanabbol a mezokbol jonnek, mint a kosar-osszegzoben (brutto:
 * reszosszeg + ado), a szam itt sem talalgatas.
 */
export default function Rendelesed({ cart }: { cart: HttpTypes.StoreCart }) {
  const penz = (amount: number) =>
    convertToLocale({ amount, currency_code: cart.currency_code })
  const termekek = (cart.item_subtotal ?? 0) + (cart.item_tax_total ?? 0)
  const szallitas =
    (cart.shipping_subtotal ?? 0) + (cart.shipping_tax_total ?? 0)
  // ugyanaz a mezo, amit a kosar-osszegzo olvas (a Store tipus nem nevezi meg)
  const kedvezmeny =
    (cart as { discount_subtotal?: number | null }).discount_subtotal ?? 0

  return (
    <section
      className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6"
      data-testid="rendelesed"
    >
      <h2 className="mb-4 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]">
        <span className="small:hidden">Összesítés</span>
        <span className="hidden small:inline">Rendelésed</span>
      </h2>
      <ul className="flex flex-col gap-3 text-[13px] text-acr-slate">
        {(cart.items ?? []).map((tetel) => (
          <li
            key={tetel.id}
            className="flex justify-between gap-4"
            data-testid="rendelesed-tetel"
          >
            <span className="min-w-0">{tetelSor(tetel)}</span>
            <span className="shrink-0 text-acr-ink">
              {penz(Number(tetel.total ?? 0))}
            </span>
          </li>
        ))}
      </ul>
      <div className="my-4 h-px bg-acr-line" />
      <dl className="flex flex-col gap-3 text-[13px] text-acr-slate">
        <div className="flex justify-between">
          <dt>Termékek</dt>
          <dd className="text-acr-ink">{penz(termekek)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Szállítás</dt>
          <dd className="text-acr-ink">{penz(szallitas)}</dd>
        </div>
        {kedvezmeny > 0 ? (
          <div className="flex justify-between">
            <dt>Kedvezmény</dt>
            <dd className="text-acr-ink">- {penz(kedvezmeny)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="my-4 h-px bg-acr-line" />
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-medium text-acr-ink">Fizetendő</span>
        <span
          className="text-[26px] font-semibold text-acr-ink"
          data-testid="rendelesed-fizetendo"
        >
          {penz(cart.total ?? 0)}
        </span>
      </div>
      <div id={PENZTAR_CTA_HELY} className="mt-4 flex flex-col gap-3" />
      <LocalizedClientLink
        href="/checkout?step=delivery"
        className="mt-3 flex h-11 items-center justify-center border border-acr-line text-[14px] font-medium text-acr-ink hover:border-acr-slate"
        data-testid="vissza-az-adatokhoz"
      >
        Vissza az adatokhoz
      </LocalizedClientLink>
      <p className="mt-3 text-[12px] leading-[17px] text-acr-slate">
        A rendelés végösszege a fizetési mód kiválasztásakor nem változik.
      </p>
    </section>
  )
}
