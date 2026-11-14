import { retrieveCartShippingClass } from "@lib/data/cart"
import { boltiHianyLekerdezes } from "@lib/data/bolti-hiany"
import { retrieveFoxpostOption, retrieveGlsModok } from "@lib/data/csomagpont"
import {
  csakCsomagboltOsztaly,
  foxpostTiltottTetel,
} from "@lib/util/csomagpont"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { letiltottAtvetelRaktara } from "@lib/util/bolti-atvetel"
import {
  getCartPaymentOptions,
  listCartPaymentMethods,
} from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import { splitNoticeProps } from "@modules/cart/components/pickup-notice/pickup-notice"
import SplitNotice from "@modules/cart/components/pickup-notice/split-notice"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
  countryCode,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")
  /**
   * A HARMADIK HIVAS, ES EZ DONTI EL, MIT LATHAT A VEVO.
   *
   * A `paymentMethods` a REGIO szolgaltatoit adja, es semmit nem tud arrol,
   * hogyan szallitunk. A szallitasi modhoz kotott szabaly a hatterben lakik
   * (Balazs dontese), es ez a hivas kerdezi meg.
   *
   * KULON `await`, NEM `Promise.all`: a fenti ketto nelkul ugyis `null`-lal
   * terunk vissza, tehat a parhuzamositas itt nem nyerne semmit, egy hibas
   * ag viszont nehezebben olvashato lenne.
   */
  const fizetesiLehetosegek = await getCartPaymentOptions(cart.id)
  const szallitasiOsztaly = await retrieveCartShippingClass()
  // P4: melyik mod a Foxpost; annal a mod csomagpont-valasztot nyit.
  const foxpost = await retrieveFoxpostOption()
  const glsModok = await retrieveGlsModok()

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  // V2.5 B: ha a Medusa letiltotta a bolti atvetelt, megkerdezzuk, MELYIK tetel hianyzik ott
  const letiltottRaktar = letiltottAtvetelRaktara(shippingMethods)
  const boltiHiany = letiltottRaktar
    ? await boltiHianyLekerdezes(cart.id, letiltottRaktar)
    : null

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping
        cart={cart}
        availableShippingMethods={shippingMethods}
        foxpostOptionId={foxpost?.option_id ?? null}
        glsOptions={glsModok.pont}
        glsHomeOptions={glsModok.haz}
        foxpostTiltottTetel={foxpostTiltottTetel(
          cart.items ?? [],
          szallitasiOsztaly,
        )}
        csakCsomagbolt={csakCsomagboltOsztaly(szallitasiOsztaly)}
        boltiHiany={boltiHiany}
      />

      <Payment
        cart={cart}
        vegyes={fizetesiLehetosegek?.split ?? false}
        availablePaymentMethods={paymentMethods}
        engedelyezettModok={
          fizetesiLehetosegek?.allowed_payment_providers ?? []
        }
      />

      <Review
        cart={cart}
        fizetesiSzerep={fizetesiLehetosegek?.selected_payment_role ?? null}
        ertesites={
          <SplitNotice
            {...splitNoticeProps(
              cart.items ?? [],
              szallitasiOsztaly,
              cart.payment_collection?.payment_sessions?.find(
                (session) => session.status === "pending",
              )?.provider_id,
            )}
            countryCode={countryCode}
          />
        }
      />
    </div>
  )
}
