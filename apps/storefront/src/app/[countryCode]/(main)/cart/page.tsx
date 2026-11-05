import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { retrieveCart, retrieveCartShippingClass } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { ELKELT_PARAM, elkeltKezelok } from "@lib/util/elkelt-darab"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

/**
 * A kosar oldal a kereso-parametert is olvassa (`elkelt`, V2.5), ezert kifejezetten dinamikus: a kosar amugy is sutibol dolgozik, de
 * az `isr-lapok.spec` minden `searchParams`-olvaso laptol kimondva kéri (`DYNAMIC_SERVER_USAGE` 500 ellen).
 */
export const dynamic = "force-dynamic"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return {
    title: t("cartPage.title"),
    description: t("cartPage.metaDescription"),
  }
}

export default async function Cart(props: {
  params: Promise<{ countryCode: string }>
  searchParams?: Promise<{ elkelt?: string | string[] }>
}) {
  const { countryCode } = await props.params
  const elkelt = elkeltKezelok((await props.searchParams)?.[ELKELT_PARAM])

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
      countryCode={countryCode}
      elkeltKezelok={elkelt}
    />
  )
}
