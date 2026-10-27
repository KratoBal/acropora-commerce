/**
 * A KIRAKAT BIZTONSAGI FEJLECEI (commerce-audit-p0, B1, P0; audit
 * 04-biztonsag). Merve 2026-10-27 a teszt kirakaton: a HTML-valaszokban egyetlen
 * biztonsagi fejlec sem volt (CSP, HSTS, frame-ancestors, nosniff,
 * Referrer-Policy, Permissions-Policy), a fejlec-vizsgalok F-et adtak volna.
 *
 * MIERT `next.config` ES NEM MIDDLEWARE: ezek allo ertekek, es a `next.config`
 * `headers()`-e minden valaszra rakja, az ISR-gyorsitotarbol kiszolgaltakra
 * is. A kivetel az ELONEZETI utvonal (lasd lent), amelynek fejlecet a
 * middleware allitja futasidoben (`lib/util/kezdolap-elonezet.ts`).
 *
 * === AMIT EZ A FAJL NEM TESZ ===
 *
 * - A CSP TELJES SZABALYA csak JELENTO uzemmodban megy
 *   (`Content-Security-Policy-Report-Only`): a Next beagyazott szkriptjei miatt
 *   `'unsafe-inline'` kell, a harmadik felek (Fogyasztobarat, Stripe, Foxpost,
 *   GLS, YouTube) tenyleges forrasait pedig csak egy valodi bongeszo mutatja
 *   meg. A jelentes ma a bongeszo konzoljaban latszik, gyujto vegpont nincs;
 *   az ervenyesito CSP a gyujtes UTAN kovetkezik. Az audit is ezt kerte
 *   („CSP eloszor Report-Only modban”).
 * - Az ERVENYESITETT CSP egyetlen iranyelvet hordoz: `frame-ancestors 'self'`
 *   (a bolt ne teheto idegen oldal keretebe). Az `X-Frame-Options` NINCS: a
 *   `frame-ancestors` felulirja, es az XFO az OS-iframe-es elonezetet is
 *   megtorne.
 * - `preload` NINCS a HSTS-en: az csak az eles domain vegleges beallitasa utan
 *   kerheto, es egy ev alatt nem vonhato vissza.
 * - A `X-Powered-By` levetele a `next.config`-ban (`poweredByHeader: false`).
 *
 * === AZ ELONEZETI UTVONAL KIMARAD A `frame-ancestors 'self'` ALOL ===
 *
 * A kezdolap elo elonezete (`/{orszagkod}/kezdolap-elonezet`) az OS iframe-ben
 * nyilik, es a sajat `frame-ancestors <OS cime>` fejlecet a middleware adja.
 * Ha ide is `'self'` kerulne, az OS-ben ures keret latszana. A kizaras egy
 * negativ elojovetes a `source`-ban; a mintat a spec a middleware sajat
 * `elonezetiUt` fuggvenyevel veti ossze.
 *
 * === A PERMISSIONS-POLICY NEM TILTHAT MINDENT ===
 *
 * A Foxpost atveteli pont keresoje iframe, es `allow="geolocation"`-t kér
 * (`foxpost-kereso/index.tsx`). A felso szintu `geolocation=()` ezt is
 * letiltana, a „kozeli pont” gomb csendben megszunne. Ezert a fold-helymeghatarozas
 * a sajat eredetnek ES a Foxpost keresonek marad; a kamera es a mikrofon tilos.
 * A `payment` iranyelvhez nem nyulunk: az alapertelmezes a Stripe keretek
 * `allow` attributumaval mukodik.
 */

/** A Foxpost atveteli pont kereso eredete (`foxpost-kereso/index.tsx`). */
const FOXPOST = "https://cdn.foxpost.hu"

/**
 * A kezdolap-elonezet eleresi utja, az orszagkoddal (`/hu/kezdolap-elonezet`).
 * A `source` ELOJOVETELE ezt zarja ki; a minta es a middleware egyezeset a
 * spec merie.
 */
const ELONEZET_KIVETEL = "(?![a-z]{2}/kezdolap-elonezet/?$)"

/** Egy cimbol az origin; egyebkent `null` (nem lesz belole forras a CSP-ben). */
function origin(cim) {
  try {
    return new URL(cim ?? "").origin
  } catch {
    return null
  }
}

/** A teljes szabaly, CSAK jelento modban. */
function jelentoCsp(env) {
  const hatter = origin(env.NEXT_PUBLIC_MEDUSA_BACKEND_URL)
  const sajat = hatter ? [hatter] : []
  const irany = (nev, ...forrasok) => [nev, ...forrasok].join(" ")
  return [
    irany("default-src", "'self'"),
    irany(
      "script-src",
      "'self'",
      "'unsafe-inline'",
      "https://js.stripe.com",
      "https://admin.fogyasztobarat.hu",
    ),
    irany(
      "style-src",
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
    ),
    irany("font-src", "'self'", "data:", "https://fonts.gstatic.com"),
    irany(
      "img-src",
      "'self'",
      "data:",
      "blob:",
      ...sajat,
      FOXPOST,
      "https://*.stripe.com",
    ),
    irany(
      "connect-src",
      "'self'",
      ...sajat,
      "https://api.stripe.com",
      "https://admin.fogyasztobarat.hu",
    ),
    irany(
      "frame-src",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://www.youtube.com",
      FOXPOST,
      "https://map.gls-hungary.com",
    ),
    irany("object-src", "'none'"),
    irany("base-uri", "'self'"),
    irany("form-action", "'self'"),
    irany("frame-ancestors", "'self'"),
  ].join("; ")
}

/** Az `headers()` visszateresi erteke. */
function biztonsagiFejlecek(env = process.env) {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: `camera=(), microphone=(), geolocation=(self "${FOXPOST}")`,
        },
      ],
    },
    {
      source: `/(${ELONEZET_KIVETEL}.*)`,
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        {
          key: "Content-Security-Policy-Report-Only",
          value: jelentoCsp(env),
        },
      ],
    },
  ]
}

module.exports = { biztonsagiFejlecek, ELONEZET_KIVETEL }
