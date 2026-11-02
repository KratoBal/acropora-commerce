import PickupNotice from "../components/pickup-notice"
import {
  pickupNoticeProps,
  splitNoticeProps,
} from "../components/pickup-notice/pickup-notice"
import SplitNotice from "../components/pickup-notice/split-notice"
import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
  shippingClass,
  countryCode,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
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
    /** P4-2: a bolti átvételes rendelésbe kerülő sorok. */
    split_line_ids?: string[]
  } | null
}) => {
  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="cart-page">
      <div
        className="mx-auto max-w-[1440px] px-4 py-8 small:px-[56px] small:py-[52px]"
        data-testid="cart-container"
      >
        {/*
          A KET OSZLOP A TERVBOL, MERESSEL: a jobb oszlop FIX 452 pixeles sav,
          a bal oszlop nyeli el a kulonbseget, a koz 44 (nautilus geometriai
          kinyerese a kosar tervlapjarol, visszamerve a fajljabol). A 24-es koz
          a mobil makettek kozti koz volt, es egy mobil-makett kozet tettunk az
          asztali racsra. A `856fr 452fr` arany sem allt a tervben: a 856 a bal
          oszlop kovetkezmenye 1440 pixelen. A TORESPONT (`small:`) szandekosan
          valtozatlan: a `line-state` szerif-toresponja ugyanerre hivatkozik.
          A `kosar-tokenek.spec` a racs sorat a forrasbol olvassa.
        */}
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[minmax(0,1fr)_452px] small:gap-x-[44px]">
            <div className="flex flex-col gap-y-6">
              <ItemsTemplate cart={cart} countryCode={countryCode} />
              {/*
                A TAJEKOZTATAS A TETELEK UTAN ALL (acrobot, 2026-11-02): a
                vevo elobb a sajat tetelet latja, telefonon nem kell egy
                kepernyonyit gorgetni hozza. A terv kikotese valtozatlan: a
                magyarazat a KOSARBAN alljon, ne a fizetesi lepesnel -- aki a
                fizetesnel talalkozik vele eloszor, mar dontott.

                A KET SAV SOSEM EGYUTT ALL, ES EZ MERT: a tiszta bolti
                atveteles kosar `PICKUP_ONLY`, a vegyes kosar `NORMAL` osztaly
                es `split_line_ids` (P4-2, a `resolve-cart-shipping-class`
                specje). Ezert nincs is egy dobozba vonva: nem ismetlik
                egymast, hanem egymast kizaroan allnak.
              */}
              <PickupNotice
                {...pickupNoticeProps(cart?.items ?? [], shippingClass)}
                countryCode={countryCode}
              />
              {/* P4-2: vegyes kosárnál két rendelés lesz, és ezt itt mondjuk ki. */}
              <SplitNotice
                {...splitNoticeProps(
                  cart?.items ?? [],
                  shippingClass,
                  cart?.payment_collection?.payment_sessions?.find(
                    (session) => session.status === "pending",
                  )?.provider_id,
                )}
                countryCode={countryCode}
              />
              {!customer && <SignInPrompt countryCode={countryCode} />}
            </div>
            <div className="relative mt-8 small:mt-0">
              <div className="sticky top-12 flex flex-col gap-y-8">
                {cart && cart.region && <Summary cart={cart} />}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage countryCode={countryCode} />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
