import { retrieveCartShippingClass } from "@lib/data/cart"
import {
  getCartPaymentOptions,
  listCartPaymentMethods,
} from "@lib/data/payment"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { HttpTypes } from "@medusajs/types"
import { splitNoticeProps } from "@modules/cart/components/pickup-notice/pickup-notice"
import SplitNotice from "@modules/cart/components/pickup-notice/split-notice"
import AszfNegyzet, {
  AszfProvider,
} from "@modules/checkout/components/aszf-elfogadas"
import Payment from "@modules/checkout/components/payment"
import PenztarKartya from "@modules/checkout/components/penztar-kartya"
import PenztarLepesek from "@modules/checkout/components/penztar-lepesek"
import RendelesiAdatok from "@modules/checkout/components/rendelesi-adatok"
import Rendelesed from "@modules/checkout/components/rendelesed"
import SzallitasiCsoportok from "@modules/checkout/components/szallitasi-csoportok"
import DiscountCode from "@modules/checkout/components/discount-code"

/**
 * A FIZETESI OLDAL (Figma 209:3 desktop, 209:133 mobil; B hatokor, Balazs
 * 2026-10-05 12:54 UTC: "igen jo lenne a vegleges kinezetet latni").
 *
 * Bal oszlop: Fizetési mód, Rendelési adatok, Szállítási csoportok, Rendelés
 * véglegesítése (ASZF). Jobb oszlop: Rendelésed, benne a cselekvo gomb, amit
 * a fizetesi resz rajzol oda (`PENZTAR_CTA_HELY`), mert a gomb a Stripe
 * mezojevel egy kornyezetben kell eljen. Mobilon ugyanez egymas alatt, a gomb
 * a kepernyo aljara ragad.
 *
 * A KOSAR ES A FIZETES LOGIKAJA VALTOZATLAN: ugyanaz a `Payment` komponens
 * fut, csak oldal-modban (cim nelkul, a gombot az osszesitobe rajzolja, es az
 * ASZF pipat varja).
 *
 * A STRIPE BIZALMI MONDATA NEM ITT ALL (acrobot 27110, jovahagyva): a
 * veglegesites kartyaja minden modnal latszik, a mondat viszont csak a
 * bankkartyas fizetesrol igaz. A kartya paneljen all, ami csak a bankkartya
 * kivalasztasakor nyilik ki (`StripePaymentContainer`).
 */
type Lehetosegek = Awaited<ReturnType<typeof getCartPaymentOptions>>
type Osztaly = Awaited<ReturnType<typeof retrieveCartShippingClass>>

/** A kirajzolás: az adatokat a hívó adja (az oldal a háttértől kéri, a próba fix adatot ad). */
export function FizetesiOldalNezet({
  cart,
  countryCode,
  paymentMethods,
  lehetosegek,
  osztaly,
}: {
  cart: HttpTypes.StoreCart
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
  paymentMethods: { id: string }[] | null
  lehetosegek: Lehetosegek
  osztaly: Osztaly
}) {
  const t = translator(localeOf(countryCode))

  return (
    <AszfProvider>
      <PenztarLepesek aktiv={3} countryCode={countryCode} />
      <div className="content-container py-8 small:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-acr-heritage">
          {t("checkoutPage.title")}
        </p>
        <h1 className="mt-1 text-[34px] font-normal leading-[40px] text-acr-ink small:text-[44px] small:leading-[52px]">
          {t("cartPage.stepPayment")}
        </h1>
        <p className="mt-2 text-[14px] text-acr-slate">
          {t("checkoutPayment.lead")}
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 small:mt-8 small:grid-cols-[1fr_400px] small:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <PenztarKartya
              cim={t("checkoutPayment.cardMode")}
              data-testid="fizetesi-mod-kartya"
            >
              <Payment
                cart={cart}
                oldal
                halasztott
                vegyes={lehetosegek?.split ?? false}
                availablePaymentMethods={paymentMethods ?? []}
                engedelyezettModok={
                  lehetosegek?.allowed_payment_providers ?? []
                }
              />
            </PenztarKartya>
            <RendelesiAdatok cart={cart} countryCode={countryCode} />
            <SzallitasiCsoportok
              cart={cart}
              boltiTetelek={osztaly?.split_line_ids ?? []}
              countryCode={countryCode}
            />
            <PenztarKartya
              cim={t("checkoutPayment.cardFinalize")}
              data-testid="veglegesites"
            >
              <AszfNegyzet />
            </PenztarKartya>
          </div>
          <aside className="flex flex-col gap-4 small:sticky small:top-4 small:self-start">
            <Rendelesed
              cart={cart}
              countryCode={countryCode}
              ertesites={
                <SplitNotice
                  {...splitNoticeProps(
                    cart.items ?? [],
                    osztaly,
                    cart.payment_collection?.payment_sessions?.find(
                      (session) => session.status === "pending",
                    )?.provider_id,
                  )}
                  countryCode={countryCode}
                />
              }
            />
            <DiscountCode cart={cart} />
          </aside>
        </div>
      </div>
    </AszfProvider>
  )
}

export default async function FizetesiOldal({
  cart,
  countryCode,
}: {
  cart: HttpTypes.StoreCart
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
}) {
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")
  const lehetosegek = await getCartPaymentOptions(cart.id)
  const osztaly = await retrieveCartShippingClass()

  return (
    <FizetesiOldalNezet
      cart={cart}
      countryCode={countryCode}
      paymentMethods={paymentMethods}
      lehetosegek={lehetosegek}
      osztaly={osztaly}
    />
  )
}
