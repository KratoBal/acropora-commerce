"use client"

import { useKosarAllapot } from "@modules/layout/components/kosar-allapot"
import CartDropdown from "../cart-dropdown"

/**
 * A fejlec kosar-gombja KLIENSOLDALON (FE-7): eddig szerveroldalon olvasta a
 * kosarat (suti), es ez a fejlecen at minden lapot dinamikussa tett.
 */
export default function CartButton() {
  const { cart, betoltve } = useKosarAllapot()

  return <CartDropdown cart={cart} betoltve={betoltve} />
}
