/**
 * A KIRAKAT SAJAT CIME: ELLENORIZVE, MIELOTT BARMI A FEJEBE EGETI
 * (commerce-audit-p0, S1, P0; audit 01-seo).
 *
 * === A HIBA, AMIT EZ ZARJA KI ===
 *
 * A canonical, az `og:url` es a JSON-LD hosztja a `NEXT_PUBLIC_BASE_URL`-bol jon
 * (`lib/util/env.ts`), ami EPITESKOR egy konstansba kerul. Ha az eles kepet a
 * valtozo nelkul epitik, az alapertek `https://localhost:8000`; ha a teszt
 * cimmel, minden lap a teszt kirakatra mutat. A robots.txt es a sitemap ezzel
 * szemben FUTASIDOBEN, a Host fejlecbol dont, tehat a ket dontes szet tud
 * csuszni: a bolt kinyitja magat a keresonek, kozben minden lapja egy masik
 * cimet vall canonicalnak, es a Google nem az eles lapokat indexeli. Hetekig
 * tart, mire rendbe jon.
 *
 * === MIT ZAR KI, ES MIT NEM ===
 *
 * KIZAR (production uzemben, epiteskor ES inditaskor, mert a `next start` is
 * betolti a `next.config.js`-t): hianyzo vagy ures ertek; ami nem ertelmezheto
 * cim; ami nem `https`; a `localhost`, a hurok-cimek es a ketsegtelenul nem
 * publikus vegzodesek (`.localhost`, `.local`, `.test`, `.invalid`,
 * `.example`); ami utvonalat, lekerdezest, azonositot vagy hitelesitest hordoz
 * (a cim a bolt GYOKERE).
 *
 * NEM TUDJA: megmondani, hogy a cim az ELES cime-e. A teszt kirakat is helyes
 * `https` cimmel epul (`shop-staging.acropora.hu`), es azt ez nem tilthatja.
 * Hogy egy telepitesben a canonical hosztja egyezik-e a kiszolgalo hosszal, az
 * csak a TELEPITETT oldalon merheto: lasd a PR leirasat (egy `curl`), es az
 * atallas ellenorzo listajat.
 *
 * FEJLESZTESBEN (`next dev`, NODE_ENV=development) nem fut: ott az alapertek
 * (`https://localhost:8000`) a helyes.
 */

const NEM_PUBLIKUS_VEGZODES = /\.(localhost|local|test|invalid|example)$/i

/** A hibaszoveg, vagy `null`, ha a cim rendben van. */
function baseUrlHiba(nyers) {
  const ertek = (nyers ?? "").trim()
  if (!ertek)
    return "nincs beállítva: enélkül minden canonical cím a https://localhost:8000-re mutatna"

  let cim
  try {
    cim = new URL(ertek)
  } catch {
    return "nem értelmezhető címként: teljes cím kell, https-sel (például https://shop.acropora.hu)"
  }

  if (cim.protocol !== "https:")
    return "nem https: a bolt canonical címe https"

  const hoszt = cim.hostname.toLowerCase()
  if (
    hoszt === "localhost" ||
    hoszt === "[::1]" ||
    /^127\./.test(hoszt) ||
    /^0\.0\.0\.0$/.test(hoszt) ||
    NEM_PUBLIKUS_VEGZODES.test(hoszt)
  )
    return `a hoszt (${hoszt}) nem publikus cím: minden canonical hozzá kötődne`

  if (cim.username || cim.password)
    return "hitelesítést tartalmaz: a cím a bolt gyökere, bejelentkezési adat nélkül"

  if ((cim.pathname !== "/" && cim.pathname !== "") || cim.search || cim.hash)
    return "útvonalat vagy lekérdezést tartalmaz: a cím a bolt gyökere (például https://shop.acropora.hu)"

  return null
}

module.exports = { baseUrlHiba }
