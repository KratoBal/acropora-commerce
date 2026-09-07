import { retrieveCart, retrieveCartShippingClass } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()
  /**
   * A SZALLITASI OSZTALY A HATTEROLDALROL, nem a kosar tartalmabol
   * kikovetkeztetve: az `shipping_class_source` megmondja, MELYIK sor idezte
   * elo, es a megnevezes az egesz sav indoka.
   */
  const shippingClass = await retrieveCartShippingClass()

  return (
    <CartTemplate
      cart={cart}
      customer={customer}
      shippingClass={shippingClass}
    />
  )
}
