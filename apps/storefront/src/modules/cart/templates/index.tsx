import PickupNotice from "../components/pickup-notice"
import { pickupNoticeProps } from "../components/pickup-notice/pickup-notice"
import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
  shippingClass,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  /**
   * A HATTEROLDAL SZALLITASI OSZTALYA ES AZ OKA, a `store/shipping-class`
   * vegpontrol (#86). `null`, ha a vegpont nem valaszolt: olyankor a sav nem
   * jelenik meg, mert nem allitunk korlatozast, amirol nem tudunk.
   *
   * MIERT NEM A KOSAR TARTALMABOL SZAMOLJUK: eddig az `unique_piece` jelolo
   * volt a helyettesito. Az azt mondta meg, hogy egy tetel EGYEDI DARAB, nem
   * azt, hogy ELO ALLAT -- a ketto nagyresztuk fedi egymast, de nem ugyanaz.
   * A hatteroldal a HAROM ELO ALLAT GYOKERKATEGORIABOL szarmaztatja, es a
   * `shipping_class_source` megnevezi a KIVALTO SORT.
   */
  shippingClass?: {
    shipping_class: string
    shipping_class_source: string | null
  } | null
}) => {
  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {/*
          A KET OSZLOP A TERVBOL, MERESSEL.

          A tervlapot megrendereltem, es a kosar racsa `856px 452px` alakban
          all -- vagyis az osszegzo oszlop 452 pixel, nem 360. A koz a mert
          ertekek kozul a legnagyobb SZERKEZETI koz (24px, hat helyen); a mai
          `gap-x-40` (160 pixel) sehol nem fordul elo a tervben.

          AMIT EZ NEM ALLIT: hogy a 452 pixel FIX szelesseg-e a tervben, vagy egy
          arany eredmenye. A meres egy 1440 pixel szeles ablakban keszult, es a
          racs abszolut ertekeket adott vissza -- ket kulonbozo ablakban kellene
          ujramerni ahhoz, hogy ezt eldontsuk. Addig a 452 pixel az, amit
          MERTUNK, nem az, amit kitalaltunk.
        */}
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_452px] gap-x-6">
            <div className="flex flex-col bg-white py-6 gap-y-6">
              {/*
                AZ ATVETELI SAV A LISTA FOLOTT ALL, es ez a terv kikotese: a
                magyarazat a KOSARBAN alljon, ne a fizetesi lepesnel. Aki a
                fizetesnel talalkozik vele eloszor, mar dontott.
              */}
              <PickupNotice
                {...pickupNoticeProps(cart?.items ?? [], shippingClass)}
              />
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-white py-6">
                      <Summary cart={cart} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
