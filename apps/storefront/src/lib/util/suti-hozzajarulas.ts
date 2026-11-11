/**
 * A SUTI-HOZZAJARULAS (kartya d5515c7d, teszt kirakat).
 *
 * Harom kategoria: SZUKSEGES (mindig be, nem kapcsolhato), STATISZTIKA es
 * MARKETING (alapbol ki). A dontes egy elso feles sutiben all (verzio,
 * idopont, a ket kategoria); bejelentkezett vevonel a szerverre is megy
 * (`POST /store/customers/me/suti-hozzajarulas`, a szerver orajaval).
 *
 * MIERT SUTI ES NEM localStorage: egy kesobbi szerveroldali meroeszkoz is
 * olvashatja, es a verzio-csere ugyanugy ervenyteleniti. A szerver NEM ezzel
 * dont az ablakrol: a lapok ISR-ek, a kirakat a sutit kliensen olvassa (lasd
 * `lib/i18n/locale.ts`, miert nem fugghet a lap sutitol).
 *
 * GOOGLE CONSENT MODE V2: a `<head>` elejen egy beagyazott szkript
 * (`consentAlapSzkript`) minden jelet `denied`-ra allit, MIELOTT barmi mas
 * futna, es ha van tarolt dontes, rogton frissit. Meroeszkoz (GA4, Ads,
 * Pixel) NINCS bekotve (Balazs dont a fiokokrol); a `dataLayer` all keszen.
 */

/** A suti neve. */
export const SUTI_NEV = "acropora_suti"

/**
 * AZ ABLAK VERZIOJA. Ha a szoveg vagy a kategoriak erdemben valtoznak, ezt kell
 * atirni: a regi verzioju dontes ervenytelen, az ablak ujra megjelenik.
 */
export const SUTI_HOZZAJARULAS_VERZIO = "2026-11-11"

/** A dontes elettartama: 180 nap, utana az ablak ujra kerdez. */
export const SUTI_ELETTARTAM_MP = 180 * 24 * 60 * 60

/** A lablec gombja ezzel az esemennyel nyitja ujra az ablakot. */
export const SUTI_BEALLITAS_ESEMENY = "acropora:suti-beallitasok"

export type SutiDontes = {
  verzio: string
  /** ISO idopont, a vevo bongeszojebol. */
  idopont: string
  statisztika: boolean
  marketing: boolean
}

type Jel = "granted" | "denied"

export type ConsentJelek = {
  ad_storage: Jel
  ad_user_data: Jel
  ad_personalization: Jel
  analytics_storage: Jel
}

const jel = (be: boolean): Jel => (be ? "granted" : "denied")

/** A Consent Mode v2 jelei egy dontesbol; dontes nelkul minden `denied`. */
export function consentJelek(
  dontes: Pick<SutiDontes, "statisztika" | "marketing"> | null,
): ConsentJelek {
  const marketing = jel(!!dontes?.marketing)
  return {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: jel(!!dontes?.statisztika),
  }
}

/** A suti erteke: rovid kulcsok, kodolt JSON. */
export function sutiErtek(dontes: SutiDontes): string {
  return encodeURIComponent(
    JSON.stringify({
      v: dontes.verzio,
      t: dontes.idopont,
      s: dontes.statisztika ? 1 : 0,
      m: dontes.marketing ? 1 : 0,
    }),
  )
}

/**
 * A `document.cookie` szovegebol a dontes. `null`, ha nincs, ha serult, vagy
 * ha mas verziora szol: ilyenkor az ablak ujra kerdez.
 */
export function olvasDontes(
  sutik: string,
  verzio: string = SUTI_HOZZAJARULAS_VERZIO,
): SutiDontes | null {
  const sor = sutik
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${SUTI_NEV}=`))
  if (!sor) return null
  try {
    const d = JSON.parse(decodeURIComponent(sor.slice(SUTI_NEV.length + 1)))
    if (
      !d ||
      d.v !== verzio ||
      typeof d.t !== "string" ||
      (d.s !== 0 && d.s !== 1) ||
      (d.m !== 0 && d.m !== 1)
    )
      return null
    return {
      verzio: d.v,
      idopont: d.t,
      statisztika: d.s === 1,
      marketing: d.m === 1,
    }
  } catch {
    return null
  }
}

/** A `document.cookie`-ba irhato teljes sor. */
export function sutiSor(dontes: SutiDontes, https: boolean): string {
  return [
    `${SUTI_NEV}=${sutiErtek(dontes)}`,
    "Path=/",
    `Max-Age=${SUTI_ELETTARTAM_MP}`,
    "SameSite=Lax",
    ...(https ? ["Secure"] : []),
  ].join("; ")
}

/**
 * A `<head>` elejere kerulo beagyazott szkript. ONALLO: a fenti olvasast
 * megismetli, mert a modul itt meg nem fut. Hogy a ketto ugyanazt adja, a spec
 * a szkriptet lefuttatja, es a `consentJelek` eredmenyevel veti ossze.
 */
export function consentAlapSzkript(
  verzio: string = SUTI_HOZZAJARULAS_VERZIO,
): string {
  const alap = JSON.stringify({
    ...consentJelek(null),
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  })
  return [
    "window.dataLayer=window.dataLayer||[];",
    "function gtag(){window.dataLayer.push(arguments);}",
    "window.gtag=window.gtag||gtag;",
    `gtag("consent","default",${alap});`,
    "try{",
    `var n=${JSON.stringify(SUTI_NEV + "=")};`,
    'var r=document.cookie.split(";").map(function(s){return s.trim();}).filter(function(s){return s.indexOf(n)===0;})[0];',
    "if(r){",
    "var d=JSON.parse(decodeURIComponent(r.slice(n.length)));",
    `if(d&&d.v===${JSON.stringify(verzio)}&&typeof d.t==="string"&&(d.s===0||d.s===1)&&(d.m===0||d.m===1)){`,
    'var m=d.m===1?"granted":"denied";',
    'gtag("consent","update",{ad_storage:m,ad_user_data:m,ad_personalization:m,analytics_storage:d.s===1?"granted":"denied"});',
    "}}",
    "}catch(e){}",
  ].join("")
}
