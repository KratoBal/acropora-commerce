import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { JetBrains_Mono, Space_Grotesk } from "next/font/google"
import "styles/globals.css"

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
      className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
