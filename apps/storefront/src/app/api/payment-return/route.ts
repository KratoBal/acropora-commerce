import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag, setCartId } from "@lib/data/cookies"
import { stripeVisszarendezesHivas } from "@lib/data/stripe-visszarendezes"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const cartId = searchParams.get("cart_id")
  const countryCode = searchParams.get("country_code")
  const paymentIntent = searchParams.get("payment_intent")
  const paymentIntentClientSecret = searchParams.get(
    "payment_intent_client_secret",
  )
  const redirectStatus = searchParams.get("redirect_status")

  // Without a country code the middleware resolves the customer's region and
  // prefixes it. The country code comes from the query, so it is checked: two
  // lower-case letters or nothing. With a relative Location (below) a value
  // such as "//evil.example" would otherwise become a protocol-relative URL.
  const prefix =
    countryCode && /^[a-z]{2}$/.test(countryCode) ? `/${countryCode}` : ""

  // RELATIVE Location, on purpose (card a9813f18): behind the reverse proxy
  // `req.nextUrl.origin` is the container's own address (`https://localhost:8000`
  // on the test storefront), so an absolute redirect sent the customer there.
  // A relative Location stays on whatever host the customer came from, with no
  // host to guess and no host header to trust, the same as the middleware's
  // redirects. NextResponse.redirect needs an absolute URL, hence the plain
  // response; 307 is its default status.
  const redirectTo = (path: string) =>
    new NextResponse(null, { status: 307, headers: { Location: path } })
  const rejected = () => redirectTo(`${prefix}/cart?error=payment_failed`)

  if (!cartId || !paymentIntent || !paymentIntentClientSecret) {
    return rejected()
  }

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "payment_collection.payment_sessions.data" },
      headers: { ...(await getAuthHeaders()) },
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  const paymentSession = cart?.payment_collection?.payment_sessions?.find(
    (session) => session.data?.id === paymentIntent,
  )

  if (
    !paymentSession ||
    paymentSession.data?.client_secret !== paymentIntentClientSecret
  ) {
    return rejected()
  }

  await setCartId(cartId)

  // The customer backed out or the bank declined. Stripe puts the PaymentIntent
  // back into `requires_payment_method`, so the Payment Element can mount
  // against it again — return to the payment step and let them retry.
  if (redirectStatus === "failed") {
    /*
      A VEGYES KOSÁR KÖZÖS STRIPE-FIZETÉSE NEM JÖTT LÉTRE (Balázs 2026-10-01):
      a háttér visszarendezi a kosarat, és elengedi a zárolást. Egy nem bontott
      kosárnál a hívás nem mozdít semmit.
    */
    await stripeVisszarendezesHivas(cartId)
    // route handler: az `updateTag` itt hibat dobna (csak szerver-akcioban el); az azonnali lejarat a Next 15 egyargumentumu `revalidateTag`-jenek viselkedese
    revalidateTag(await getCacheTag("carts"), { expire: 0 })
    const params = new URLSearchParams({ step: "payment" })

    // Forward Stripe's own return parameters so the checkout step can tell how
    // the off-site authorization ended.
    for (const key of [
      "payment_intent",
      "payment_intent_client_secret",
      "redirect_status",
    ]) {
      const value = searchParams.get(key)

      if (value) {
        params.set(key, value)
      }
    }

    return redirectTo(`${prefix}/checkout?${params}`)
  }

  /*
    A BANK JOVAHAGYTA: A LEADAS A FIZETESI LEPESBEN JON, AZ "ELLENŐRZÉS…"
    ALLAPOTBAN (a keretek 477:619 / 477:1217). Eddig itt, a vevo szamara
    lathatatlanul futott le, es a vevo egy ures toltes utan kerult a
    visszaigazolo lapra vagy a kosarba. A kosar es a munkamenet ellenorzese
    fent megtortent; a leadast (`placeOrder`) a fizetesi lepes inditja, es
    sikernel ugyanugy a visszaigazolo lapra visz.
  */
  return redirectTo(
    `${prefix}/checkout?${new URLSearchParams({
      step: "payment",
      ellenorzes: "1",
    })}`,
  )
}
