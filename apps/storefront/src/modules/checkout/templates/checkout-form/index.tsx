import { listCartShippingMethods } from "@lib/data/fulfillment"
import {
  getCartPaymentOptions,
  listCartPaymentMethods,
} from "@lib/data/payment"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
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

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment
        cart={cart}
        availablePaymentMethods={paymentMethods}
        engedelyezettModok={
          fizetesiLehetosegek?.allowed_payment_providers ?? []
        }
      />

      <Review cart={cart} />
    </div>
  )
}
