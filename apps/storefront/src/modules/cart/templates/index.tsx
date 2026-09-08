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
          A KET OSZLOP A TERVBOL, MERESSEL -- ES A KOZ JAVITVA.

              BAL   856 px
              koz    44 px
              JOBB  452 px      856 + 44 + 452 = 1352

          Nautilus geometriai kinyerese a KOSAR tervlapjarol (a 49 nagy doboz
          x/y/szelesseg ertekeivel): a 856 szeles doboz x=514-nel all, a jobb
          szele 1370, a 452 szeles pedig x=1414-nel -- a koz tehat 44.
          Visszamertem a fajljabol, nem az uzenetebol.

          === AMI ITT KORABBAN ALLT, ES MIERT VOLT ROSSZ ===

          A koz `gap-x-6`, vagyis 24 pixel volt, azzal az indokkal, hogy az "a
          mert ertekek kozul a legnagyobb szerkezeti koz, hat helyen". A 24 -- de
          az a MOBIL MAKETTEK kozotti koz: harom 390 pixel szeles telefon all
          egymas mellett x=56, 470 es 884-nel, a lepeskoz 414, tehat a koz 24.

          Vagyis GYAKORISAG alapjan valasztottam, nem SZEREP alapjan, es egy
          mobil-makett kozet tettem az asztali racsra.

          === ES ITT EGY HAMIS MONDAT ALLT, AMIT VISSZAMERTEM (2026-09-08) ===

          Az allt itt, hogy a TERMEKLAP-terv `856fr 452fr` alakban hasznalja
          ugyanezt a harom szamot, es hogy ez kereszt-kontroll.

          NEM AZ. Mind a ket tervlapon a FIX alak all, es ezt a nyers forrasbol
          merteem, ugyanazzal a keresessel:

              termeklap-terv    minmax(0,1fr) 452px      2 elofordulas
              kosar-terv        minmax(0,1fr) 452px      1 elofordulas

          A `856fr 452fr` alak EGYIK tervlapon sem szerepel. A 856-os szam a
          BAL oszlop mert szelessege 1440 pixelen -- vagyis egy KOVETKEZMENY
          (1440 mínusz 44 mínusz 452), amit aranykent olvastunk vissza.

          A kulonbseg egyetlen szelessegen nem latszik: 1440 pixelen az aranyos
          osztas 440,953-at ad. KET szelessegen derul ki, hogy azonos marad az
          arany (1,894), ami fix savnal lehetetlen. (picasso merese.)

          === A KOD ITT MEGIS VALTOZATLAN, ES EZ TUDATOS ===

          A termeklap vaza 2026-09-08-tol a mert fix alakot viseli. A KOSAR nem:
          az elrendezes-valtozas latszik a vevonek, es ez a kor a termeklaprol
          szolt. A javitas egy sor, es acrobot dontesere var.

          Amit viszont nem lehetett igy hagyni, az a fenti mondat: egy hamis
          allitas, ami MERESNEK nevezi magat ("kereszt-kontroll"), tobbet art,
          mint a hianyzo javitas -- a kovetkezo olvaso nem merne ujra.
        */}
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[856fr_452fr] small:gap-x-[44px]">
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
