import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

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
    <html lang="hu" data-mode="light">
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
