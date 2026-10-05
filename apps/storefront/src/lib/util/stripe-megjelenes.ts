import type { Appearance, CssFontSource } from "@stripe/stripe-js"

/**
 * A STRIPE KARTYAMEZO MEGJELENESE A FIGMA FOUNDATIONS TOKENEKBOL (Balazs,
 * 2026-10-05: a Stripe legyen olyan allapotban, hogy ne kelljen tobbet
 * foglalkozni vele, a dizajnt is beleertve).
 *
 * A Stripe mezoje iframe-ben fut: a lap CSS-valtozoit (`--acr-*`) nem latja,
 * ezert itt konkret ertekek allnak. A FORRAS AZ `acropora-tokens.css`: a
 * `stripe-megjelenes.spec.ts` minden itteni szint es a modok lekepezeset is
 * ahhoz meri, tehat egy atirt token vagy egy elcsuszott mod ott pirosodik, nem
 * a vevo szeme elott.
 *
 * KET MOD, mint a lap tobbi resze (`acropora-mod.ts`): Commerce vilagos, Reef
 * sotet. A penztar ma Commerce; a Reef-ag akkor el, ha a penztar egyszer sotet
 * felulet ala kerul.
 */
export type StripeVilag = "commerce" | "reef"

/** A Foundations szin-primitivjei, amiket a mezo hasznal (`--acr-color-*`). */
export const STRIPE_SZINEK = {
  abyss: "#060d17",
  deep: "#0a1726",
  navy: "#0f2338",
  "ocean-soft": "#dce7ef",
  ink: "#0d1a28",
  slate: "#4a5866",
  line: "#e3e1dc",
  heritage: "#d5782f",
  white: "#ffffff",
} as const

type Szin = keyof typeof STRIPE_SZINEK

/**
 * A MOD-TOKENEK A KET MODBAN (`--acr-mode-*`), primitiv-nevvel. A `mezo` nem
 * mod-token: a Foundations mod-kartyai nem adjak, a fejlec kereso mezojenek
 * hattere ugyanigy all (`--fejlec-mezo-hatter`: Commerce feher, Reef `deep`).
 */
export const STRIPE_MODOK: Record<
  StripeVilag,
  {
    heading: Szin
    text: Szin
    border: Szin
    "action-bg": Szin
    mezo: Szin
  }
> = {
  commerce: {
    heading: "ink",
    text: "slate",
    border: "line",
    "action-bg": "navy",
    mezo: "white",
  },
  reef: {
    heading: "white",
    text: "ocean-soft",
    border: "navy",
    "action-bg": "heritage",
    mezo: "deep",
  },
}

/** `--acr-radius-control`: a beviteli mezok lekerekitese. */
export const STRIPE_LEKEREKITES = "2px"

/**
 * A Hanken Grotesk az iframe-be: a lap a `next/font`-tal tolti, de annak a
 * fajlnevei buildenkent valtoznak, tehat a Stripe nem erne el oket. A betu a
 * Google Fonts stiluslapjarol jon, ugyanazokkal a vastagsagokkal.
 */
export const STRIPE_BETUK: CssFontSource[] = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&display=swap",
  },
]

export function stripeMegjelenes(vilag: StripeVilag): Appearance {
  const mod = STRIPE_MODOK[vilag]
  const szin = (nev: Szin) => STRIPE_SZINEK[nev]

  return {
    theme: vilag === "reef" ? "night" : "stripe",
    variables: {
      fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
      colorPrimary: szin(mod["action-bg"]),
      colorBackground: szin(mod.mezo),
      colorText: szin(mod.heading),
      colorTextSecondary: szin(mod.text),
      colorTextPlaceholder: szin(mod.text),
      borderRadius: STRIPE_LEKEREKITES,
    },
    rules: {
      ".Input": { border: `1px solid ${szin(mod.border)}`, boxShadow: "none" },
      ".Input:focus": {
        border: `1px solid ${szin(mod["action-bg"])}`,
        boxShadow: "none",
      },
      ".Tab": { border: `1px solid ${szin(mod.border)}`, boxShadow: "none" },
      ".Tab--selected": { border: `1px solid ${szin(mod["action-bg"])}` },
    },
  }
}

/**
 * A MEZO BEALLITASAI A KET ELEMENTS-HEZ (a munkamenetes es a halasztott). A
 * nyelv magyar; a betu nem valtozhat az elso megjelenes utan (a Stripe ezt nem
 * engedi), a megjelenes igen.
 */
export const stripeElementsBeallitas = (vilag: StripeVilag) => ({
  appearance: stripeMegjelenes(vilag),
  fonts: STRIPE_BETUK,
  locale: "hu" as const,
})

/**
 * A PAYMENT ELEMENT SAJAT BEALLITASA: Apple Pay es Google Pay, ha a vevo
 * eszkoze tudja; a Link SOHA (Balazs, 2026-10-05). A Link a Stripe fiok
 * fizetesi mod beallitasaiban is ki van kapcsolva; ez a masodik zar, hogy egy
 * fiok-oldali valtozas ne hozza vissza szo nelkul.
 */
export const STRIPE_FIZETESI_MEZO = {
  layout: "accordion" as const,
  wallets: { applePay: "auto", googlePay: "auto", link: "never" } as const,
  /*
    AZ ORSZAGOT NEM KERDEZZUK UJRA (a keretekben nincs ilyen mezo): a kosar
    szamlazasi cimebol megy at a megerositesnel (`szamlazasiAdatok`). A Stripe
    a "never" mezot csak akkor fogadja el, ha a megerosites hozza az erteket.
  */
  fields: { billingDetails: { address: { country: "never" } } } as const,
}

/** Sotet feluleten all-e a penztar: ugyanaz a ket jelolo, amit a CSS figyel. */
export const stripeVilagDokumentumbol = (
  dokumentum: Pick<Document, "querySelector">,
): StripeVilag =>
  dokumentum.querySelector('[data-vilag="sotet"], [data-acr-mod="reef"]')
    ? "reef"
    : "commerce"
