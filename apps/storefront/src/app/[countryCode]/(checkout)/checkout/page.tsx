import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getCartPaymentOptions } from "@lib/data/payment"
import { isStripeLike } from "@lib/constants"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import FizetesiOldal from "@modules/checkout/templates/fizetesi-oldal"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  // A cim a bongeszo fulen latszik, tehat a vevo olvassa. Az eredeti starter
  // angol szava (`Checkout`) ugyanabban a fajlban allt, mint a most javitott
  // 404-es valasz.
  title: "Pénztár",
}

/**
 * URES KOSARRAL A VEVO A KOSARBA KERUL, NEM EGY 404-RE.
 *
 * === A MERT HIBA (1d6e612a) ===
 *
 * Sajat meres a kitelepitett lapon (2026-09-14,
 * `agents/murena/scripts/ures-kosar-penztar.cjs`), KET allapotban -- es a ketto
 * MASKEPP viselkedett, holott a vevonek ugyanaz a helyzet:
 *
 *   NINCS kosar (friss munkamenet)   HTTP 404, az ALTALANOS "Nincs ilyen oldal"
 *   VAN kosar, de URES               HTTP 200, es a SZALLITASI CIM urlapja
 *
 *   POZITIV KONTROLL, ugyanabban a korben:
 *   TELI kosar                       HTTP 200, "Szállítási cím", urlap all
 *
 * A kontroll nelkul a 404 az utvonalrol is szolhatott volna; igy viszont
 * biztos, hogy a kosar allapota donti el.
 *
 * A KARTYA CSAK AZ ELSOT ISMERTE. A masodik rosszabb: a vevo nekiallhat
 * kitolteni egy szallitasi cimet egy URES rendeleshez, es csak kesobb derul ki,
 * hogy nincs mit megvenni.
 *
 * === MIERT ATIRANYITAS, ES NEM SAJAT URES-UZENET ===
 *
 * A valasz MAR MEGVAN, es meg is van tervezve: a kosar lapja nem egy "ures"
 * feliratot mutat, hanem HAROM KIINDULOPONTOT (`EmptyCartMessage`). Egy masodik
 * ures-uzenet a penztaron ugyanarra a helyzetre ket kulonbozo valaszt adna, es
 * a ketto elobb-utobb szetcsuszna.
 *
 * ES NEM `notFound()`: a penztar-lap LETEZIK, csak nincs mit fizetni. A 404 azt
 * mondja a vevonek (es a keresonek), hogy rossz helyen jar -- holott jo helyen
 * jar, csak ures a kosara.
 */
export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
  searchParams?: Promise<{ step?: string }>
}) {
  const { countryCode } = await props.params
  const { step } = (await props.searchParams) ?? {}
  const cart = await retrieveCart()

  // A KET AGAT EGYUTT KEZELJUK, mert a vevo szamara ugyanaz: nincs mit fizetni.
  if (!cart || (cart.items?.length ?? 0) === 0) {
    redirect(`/${countryCode}/cart`)
  }

  const customer = await retrieveCustomer()
  /*
    VEGYES KOSÁR STRIPE-PAL (Balázs 2026-10-01): a kártyamező ilyenkor
    halasztott, a közös fizetés a leadáskor készül. A burok ehhez tudja meg,
    hogy a kosár vegyes-e, és kínálja-e a háttér a Stripe-ot.
  */
  const lehetosegek = await getCartPaymentOptions(cart.id)
  const stripeKinalva = !!lehetosegek?.allowed_payment_providers.some((mod) =>
    isStripeLike(mod.id),
  )
  const vegyesStripe = !!lehetosegek?.split && stripeKinalva

  /*
    A FIZETESI LEPES A FIGMA SZERINTI OLDAL (209:3 / 209:133). A burok az
    egesz oldalt fogja, mert a cselekvo gomb az osszesitoben all, es a Stripe
    mezojevel egy kornyezetben kell eljen. A tobbi lepes valtozatlan.
  */
  if (step === "payment") {
    return (
      <PaymentWrapper
        cart={cart}
        vegyesStripe={vegyesStripe}
        mindigHalasztott={stripeKinalva}
      >
        <FizetesiOldal cart={cart} />
      </PaymentWrapper>
    )
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <PaymentWrapper cart={cart} vegyesStripe={vegyesStripe}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
