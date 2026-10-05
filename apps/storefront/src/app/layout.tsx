import { getBaseURL } from "@lib/util/env"
import FogyasztobaratWidget from "@modules/jogi/fogyasztobarat-widget"
import { Metadata } from "next"
import {
  Hanken_Grotesk,
  JetBrains_Mono,
  Newsreader,
  Space_Grotesk,
} from "next/font/google"
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
 * A `next/font` a BUILD IDEJEN tolti le es a sajat kiszolgalonkrol adja tovabb,
 * tehat a vevo bongeszoje nem keresi meg a Google-t. Ennek az ara egy uj
 * BUILD-IDEJU fugges egy kulso szolgaltatastol -- ugyanaz a fajta, mint a Store
 * API hivasa a kategoria-oldalaknal, es ugyanugy meg tud allitani egy epitest.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--terv-betu-fo",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--terv-betu-mono",
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
const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  style: ["italic", "normal"],
  variable: "--terv-betu-kiemelt",
})

/**
 * A FIGMA FOUNDATIONS BETUJE (P1b, 2026-09-29): a fejlec minden lapon ebbol all,
 * ezert itt, globalisan toltodik be. A `--acr-font-hanken` valtozot a
 * `--acr-font-sans` token olvassa; mas stilus nem hivatkozik ra, tehat a tobbi
 * lap betukeszlete nem valtozik.
 */
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
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
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} ${newsreader.variable} ${hankenGrotesk.variable}`}
    >
      <body>
        <main className="relative">{props.children}</main>
        {/* a Fogyasztobarat widgetje minden oldalon (Balazs kerese, 2026-10-05) */}
        <FogyasztobaratWidget />
      </body>
    </html>
  )
}
