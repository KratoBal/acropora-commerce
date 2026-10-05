/**
 * A „RENDELÉS FIZETÉSE” OLDAL (a lejaro zarolas terve, 2.2): a fizetesi
 * linkrol nyilik, bejelentkezes nelkul. A hatter valasza
 * (`GET /store/order-payment/:token`) ezt az alakot adja.
 */
export type LinkAllapot = "open" | "paid" | "expired" | "superseded"

export type LinkRendeles = {
  display_id: number | string
  items: { title: string; quantity: number; total: number }[]
  shipping: { name: string; amount: number }[]
  total: number
}

export type LinkOsszegzes = {
  state: LinkAllapot
  amount: number
  currency_code: string
  expires_at: string
  paid_at: string | null
  orders: LinkRendeles[]
}

/** Amit a nem fizetheto link mond: a vevo teendojevel. */
export const LINK_ALLAPOT_SZOVEG: Record<
  Exclude<LinkAllapot, "open">,
  { cim: string; szoveg: string }
> = {
  paid: {
    cim: "Köszönjük, a fizetésed megérkezett",
    szoveg: "A rendelésed feldolgozását folytatjuk.",
  },
  expired: {
    cim: "Ez a fizetési link lejárt",
    szoveg: "Írj nekünk a webshop@acropora.hu címre, és segítünk.",
  },
  superseded: {
    cim: "Ez a fizetési link már nem érvényes",
    szoveg:
      "A rendelésedhez újabb fizetési link készült. Ha nem találod, írj nekünk a webshop@acropora.hu címre.",
  },
}

export const LINK_FIZETES_MOST_NEM_SIKERULT =
  "A fizetés most nem sikerült. Próbáld meg újra néhány perc múlva."

/**
 * A HATTER 4xx VALASZA MAGYAR, ES A VEVONEK SZOL (pl. „Ez a fizetési link
 * lejárt”), ezert azt adjuk tovabb; minden mas a kapcsolat hibaja. A
 * szerver-muveletbol ERTEKKEL terunk vissza, nem dobunk (#371).
 */
export const linkHibaUzenet = (
  allapot: number | undefined,
  uzenet: string | undefined,
): string =>
  allapot !== undefined && allapot >= 400 && allapot < 500 && uzenet?.trim()
    ? uzenet.trim()
    : LINK_FIZETES_MOST_NEM_SIKERULT

/** A 3-D Secure utan ide ter vissza a Stripe; a lap ebbol tudja, hogy be kell fejeznie. */
export const linkVisszateresiCim = (
  origin: string,
  countryCode: string,
  token: string,
) => `${origin}/${countryCode}/rendeles-fizetese/${token}`

/** A Stripe visszateresi parameterei: sikeres-e a banki hitelesites. */
export const stripeVisszateresSikeres = (
  parameterek: URLSearchParams,
): boolean | null => {
  const allapot = parameterek.get("redirect_status")
  if (!parameterek.get("payment_intent") || !allapot) return null
  return allapot === "succeeded"
}
