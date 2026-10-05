import { retrieveCartShippingClass } from "@lib/data/cart"
import {
  getCartPaymentOptions,
  listCartPaymentMethods,
} from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import AszfNegyzet, {
  AszfProvider,
} from "@modules/checkout/components/aszf-elfogadas"
import Payment from "@modules/checkout/components/payment"
import PenztarKartya from "@modules/checkout/components/penztar-kartya"
import PenztarLepesek from "@modules/checkout/components/penztar-lepesek"
import RendelesiAdatok from "@modules/checkout/components/rendelesi-adatok"
import Rendelesed from "@modules/checkout/components/rendelesed"
import SzallitasiCsoportok from "@modules/checkout/components/szallitasi-csoportok"
import { STRIPE_BIZALMI_SZOVEG } from "@lib/util/stripe-allapot"
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
 */
export default async function FizetesiOldal({
  cart,
}: {
  cart: HttpTypes.StoreCart
}) {
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")
  const lehetosegek = await getCartPaymentOptions(cart.id)
  const osztaly = await retrieveCartShippingClass()

  return (
    <AszfProvider>
      <PenztarLepesek aktiv={3} />
      <div className="content-container py-8 small:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-acr-heritage">
          Pénztár
        </p>
        <h1 className="mt-1 text-[34px] font-normal leading-[40px] text-acr-ink small:text-[44px] small:leading-[52px]">
          Fizetés
        </h1>
        <p className="mt-2 text-[14px] text-acr-slate">
          Válaszd ki a fizetési módot. A rendelési, számlázási és szállítási
          adataid már rögzítve vannak.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-6 small:mt-8 small:grid-cols-[1fr_400px] small:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <PenztarKartya cim="Fizetési mód" data-testid="fizetesi-mod-kartya">
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
            <RendelesiAdatok cart={cart} />
            <SzallitasiCsoportok
              cart={cart}
              boltiTetelek={osztaly?.split_line_ids ?? []}
            />
            <PenztarKartya
              cim="Rendelés véglegesítése"
              data-testid="veglegesites"
            >
              <AszfNegyzet />
              <p className="mt-4 text-[12px] leading-[17px] text-acr-slate">
                {STRIPE_BIZALMI_SZOVEG}
              </p>
            </PenztarKartya>
          </div>
          <aside className="flex flex-col gap-4 small:sticky small:top-4 small:self-start">
            <Rendelesed cart={cart} />
            <DiscountCode cart={cart} />
          </aside>
        </div>
      </div>
    </AszfProvider>
  )
}
