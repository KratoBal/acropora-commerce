/**
 * A YOUTUBE-BEAGYAZASOK HELYORZOVEL, KATTINTASRA TOLTODNEK (kartya dc8cabd2, acrobot 2026-11-19 02:19; Balazs dontese
 * 2026-11-18 21:30 UTC: a harmadik fel hozzajarulas nelkul nem toltodhet be).
 *
 * MIERT. A termekleirasokban 24 (a teszt Medusan merve; a kod 27-et emlit) `<iframe src="youtube.com/embed/...">` all, es a
 * kirakat ezt valtozatlanul rendereli. MERVE 2026-11-19, a lap megnyitasakor, a hozzajarulas ELOTT (a banner latszik): 19 hivas
 * a www.youtube.com fele, a googleads.g.doubleclick.net es a static.doubleclick.net fele, es OT suti (YSC, VISITOR_INFO1_LIVE,
 * VISITOR_PRIVACY_METADATA, __Secure-YNID, __Secure-ROLLOUT_TOKEN). A banner igerete ("marketing sutit csak a hozzajarulasoddal
 * teszunk") ezeken a lapokon nem volt igaz.
 *
 * MIT TESZ MOST. A leiras-tisztito az iframe-et HELYORZOVA irja (a videó azonositoja megmarad, a `si=` es minden mas
 * lekerdezes eldobodik), a helyorzo egyetlen kulso hivast sem tesz (nincs bélyegkep sem), a vevo kattintasara a
 * `YoutubeBetolto` kliens komponens a `youtube-nocookie.com` videot tolti be. A kattintas MAGA a beleegyezes ehhez a
 * tartalomhoz: nem a Marketing hozzajarulashoz kotjuk (anelkul a vevo a videot egyaltalan nem latna, acrobot dontese), es
 * semmit nem jegyzunk meg (nincs suti, nincs tarolas): a kovetkezo lapon ujra a helyorzo all.
 */

/** Egy YouTube videó azonosítója: pontosan 11 jel. */
export const YOUTUBE_AZONOSITO_MINTA = /^[A-Za-z0-9_-]{11}$/

const YOUTUBE_HOSZTOK = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
])

/**
 * A beagyazas azonositoja az iframe `src`-jebol, vagy `null`. A forras vedett: a leiras exportja protokoll-relativ cimet
 * is ir (`//www.youtube.com/embed/...`); csak a fenti hosztok, csak az `/embed/<azonosito>` ut, https vagy protokoll-relativ.
 */
export function youtubeAzonosito(src: string | undefined): string | null {
  if (!src) return null
  let url: URL
  try {
    url = new URL(src.startsWith("//") ? `https:${src}` : src)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || !YOUTUBE_HOSZTOK.has(url.hostname))
    return null
  const resz = /^\/embed\/([^/]+)\/?$/.exec(url.pathname)
  const azonosito = resz?.[1] ?? null
  return azonosito && YOUTUBE_AZONOSITO_MINTA.test(azonosito) ? azonosito : null
}

/** Ezt a videot toltjuk be kattintasra: a `nocookie` domain, kattintasra indulo lejatszas. */
export function betoltoIframeCim(azonosito: string): string {
  return `https://www.youtube-nocookie.com/embed/${azonosito}?autoplay=1&rel=0`
}

/** A helyorzo szovege. A szoveg kimondja, mit jelent a betoltes. */
export const HELYORZO_SZOVEG =
  "Ez a videó a YouTube-ról töltődik be. A betöltéssel a YouTube sütiket helyezhet el és adatokat gyűjthet rólad."
export const HELYORZO_GOMB = "Videó betöltése"
export const HELYORZO_LINK = "Megnyitás a YouTube-on"

/**
 * A HELYORZO HTML-JE. Csak a KORABBAN ELLENORZOTT azonositobol epul (`YOUTUBE_AZONOSITO_MINTA`), mas ertek nem kerul bele: a
 * tisztitas UTAN illesztjuk be, ezert a sajat, allando jelolesunk. A gomb nelkuli kornyezetben (nincs JS) a link viszi a
 * vevot a YouTube-ra: a link kattintasa vevoi navigacio, nem beagyazas.
 */
export function helyorzoHtml(azonosito: string): string {
  return (
    `<div class="yt-helyorzo my-4 flex aspect-video w-full max-w-[720px] flex-col items-center justify-center gap-3 border p-4 text-center" ` +
    `style="border-color:var(--terv-keret);background:var(--terv-hatter)" data-yt-embed="${azonosito}">` +
    `<p class="txt-small max-w-[480px]">${HELYORZO_SZOVEG}</p>` +
    `<button type="button" data-yt-betolt="${azonosito}" class="h-11 px-5 txt-small-plus uppercase tracking-wide border" ` +
    `style="background:var(--terv-kiemel);color:var(--terv-kiemel-szoveg);border-color:var(--terv-kiemel)">${HELYORZO_GOMB}</button>` +
    `<a class="txt-small underline" href="https://www.youtube.com/watch?v=${azonosito}" target="_blank" rel="noopener noreferrer nofollow">${HELYORZO_LINK}</a>` +
    `</div>`
  )
}

/**
 * A tisztitas kozbulso jelolese: egy `data-yt-embed` attributumu, TARTALOM NELKULI div. A tisztito ezt allitja elo az
 * iframe helyett, ezt cserelik ki a vegen a helyorzo teljes jelolesere.
 */
export const KOZBULSO_MINTA =
  /<div data-yt-embed="([A-Za-z0-9_-]{11})"><\/div>/g

export function helyorzokraCsereli(html: string): string {
  return html.replace(KOZBULSO_MINTA, (_, azonosito: string) =>
    helyorzoHtml(azonosito),
  )
}
