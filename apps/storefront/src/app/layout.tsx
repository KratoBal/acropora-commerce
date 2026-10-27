import { getBaseURL } from "@lib/util/env"
import { szervezetLd, webhelyLd } from "@lib/seo/strukturalt-adat"
import JsonLd from "@modules/common/components/json-ld"
import RumJelento from "@modules/common/components/rum-jelento"
import FogyasztobaratWidget from "@modules/jogi/fogyasztobarat-widget"
import { Metadata } from "next"
import localFont from "next/font/local"
import "styles/globals.css"
// A Figma Foundations tokenek (P1a): csak `--acr-*` valtozok, meglevo stilust nem irnak felul.
import "styles/acropora-tokens.css"

/**
 * A KET BETUTIPUS A TERVBOL JON, ES MERT ARANYBAN.
 *
 * A `tokenek-termeklap.json` a megrenderelt tervlapot kerdezte meg (nem képből
 * becsülte): a Space Grotesk 655 elemen áll, a JetBrains Mono 78-on. A második
 * a technikai értékeké -- teljesítmény, méret, cikkszám --, ahol az azonos
 * karakterszélesség olvashatóbb.
 *
 * A BETUK A REPOBOL JONNEK (`app/betuk/`, acrobot 26240, 2026-10-05). A
 * `next/font/google` a build alatt toltotte le oket a Google-tol, es a stage
 * buildje ezen ketszer is elakadt (`Cannot read properties of null (reading
 * 1)`, 10-03 es 10-05). A fajlok a `google/fonts` valtozo-sulyu forrasabol
 * vagva, ugyanazzal a latin + latin-ext tartomannyal; a forras, a parancs es a
 * visszameres a `betuk/FORRAS.md`-ben all. A vevo bongeszoje tovabbra sem
 * keresi meg a Google-t, es a valtozo-nevek valtozatlanok.
 */
const spaceGrotesk = localFont({
  src: "./betuk/space-grotesk.woff2",
  weight: "300 700",
  display: "swap",
  variable: "--terv-betu-fo",
  /*
    NEM TOLTODIK ELO (commerce-audit-p1, T2, 2026-10-27). A vilagos vilagban
    (`[data-vilag="vilagos"]`, a bolt kerete) a `--terv-betu-fo-lanc` a Hankenre
    mutat (`acropora-tokens.css`), tehat a Space Groteszet csak a SOTET terméklap
    es a kosar sorai viselik. Minden lapon elotoltve versenyzett a hero H1
    betujevel (a mobil LCP-elemmel). A betu ott is betoltodik, ahol kell
    (`display: swap`): az elso festes nem varja meg.
  */
  preload: false,
})

const jetBrainsMono = localFont({
  src: "./betuk/jetbrains-mono.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--terv-betu-mono",
  // ugyanaz, mint a Space Groteszet: csak a sotet terméklap es a kosar viseli
  preload: false,
  // monospace betunek nincs illo Arial- vagy Times-tartaleka
  adjustFontFallback: false,
})

/**
 * A HARMADIK BETU, ES A LEGKISEBB TETEL: a tervben NEGY elemen all, dolt
 * alcimeken. Ez a legkonnyebben kihagyhato -- es epp ezert kell kimondani,
 * hogy miert van itt: a tipografia nelkule nem "majdnem kesz", hanem hianyos,
 * es a kovetkezo olvaso azt hinne, hogy megvan.
 *
 * A meres ugyanabbol a forrasbol jon, mint a masik ketto (a megrenderelt terv
 * szamitott stilusai), es a negyes szam a sulyat is megadja: ez a HANGSULY
 * betuje, nem a torzsszovege.
 */
const newsreader = localFont({
  src: "./betuk/newsreader.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
  variable: "--terv-betu-kiemelt",
  /*
    ELOTOLTVE (commerce-audit-p0, T1, 2026-10-27). A 10-07-i mereskor a
    `font-kiemelt` csak a kosarban allt, ezert volt `preload: false`. A 10-20-i
    kezdolap ota a hero H1 es minden savcim ezt a betut viseli, es a Lighthouse
    szerint a mobil kezdolap LCP-eleme maga a H1: 5,6 s LCP, ebbol 2160 ms a
    kirajzolas kesese, mert a szoveg a beture var (audit 02-teljesitmeny, T1).
    CSAK A NORMAL fajl (196 KB) toltodik elo; a dolt kulon hivas, alabb.
  */
  adjustFontFallback: "Times New Roman",
})

/**
 * A DOLT NEWSREADER KULON HIVAS, MERT A `preload` HIVASONKENT ALL, NEM FAJLONKENT.
 * A `next/font/local` egy `src`-tombbol MINDEN fajlt elotolt, ha a hivas elotolt,
 * a dolt (220 KB) pedig csak a velemenyek idezetein all, a kezdolap aljan. A
 * `.font-kiemelt.italic` szabaly (`globals.css`) ide kapcsolja azt az egy
 * helyet; kulon csalad, mert ket hivas ket nevet kap.
 */
const newsreaderItalic = localFont({
  src: "./betuk/newsreader-italic.woff2",
  weight: "200 800",
  style: "italic",
  display: "swap",
  variable: "--terv-betu-kiemelt-dolt",
  preload: false,
  adjustFontFallback: "Times New Roman",
})

/**
 * A FIGMA FOUNDATIONS BETUJE (P1b, 2026-09-29): a fejlec minden lapon ebbol all,
 * ezert itt, globalisan toltodik be. A `--acr-font-hanken` valtozot a
 * `--acr-font-sans` token olvassa; mas stilus nem hivatkozik ra, tehat a tobbi
 * lap betukeszlete nem valtozik.
 */
const hankenGrotesk = localFont({
  src: "./betuk/hanken-grotesk.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--acr-font-hanken",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    /*
     * EGY NYELV: a bolt magyar. A starterben itt `lang="en"` allt -- az egesz
     * dokumentum angolnak vallotta magat, ami a felolvaso-programoknak, a
     * bongeszo forditas-ajanlatanak es a keresoknek egyarant szol.
     *
     * A LATSZO SZOVEG NAGY RESZE MA MEG ANGOL (merve 2026-09-07: 39 szoveg a
     * mai hatokorben), tehat a ket dolog atmenetileg ellentmond egymasnak. A
     * helyes sorrend megis ez: a `lang` a bolt nyelvet mondja meg, nem a mai
     * forditottsagi allapotot.
     */
    <html
      lang="hu"
      data-mode="light"
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} ${newsreader.variable} ${newsreaderItalic.variable} ${hankenGrotesk.variable}`}
    >
      <body>
        {/* FE-2a: a bolt es a webhely minden lapon, az elso HTML-ben */}
        <JsonLd adat={szervezetLd(getBaseURL())} />
        <JsonLd adat={webhelyLd(getBaseURL())} />
        <main className="relative">{props.children}</main>
        {/* a Fogyasztobarat widgetje minden oldalon (Balazs kerese, 2026-10-05) */}
        <FogyasztobaratWidget />
        {/* FE-7 RUM: a Core Web Vitals a /api/rum utra, oldaltipusonkent */}
        <RumJelento />
      </body>
    </html>
  )
}
