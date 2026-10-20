import { Metadata } from "next"

import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import { getBaseURL } from "@lib/util/env"
import KezdolapFejlec from "@modules/kezdolap/fejlec"
import { KL_TOKENEK } from "@modules/kezdolap/kl-tokenek"
import { kezdolapAdat } from "@modules/kezdolap/tartalom"
import { KosarAllapotProvider } from "@modules/layout/components/kosar-allapot"
import KosarSziget from "@modules/layout/components/kosar-allapot/kosar-sziget"
import Footer from "@modules/layout/templates/footer"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * A KEZDOLAP SAJAT ELRENDEZESE (Balazs, 2026-10-20): a Claude Design terv
 * fejlecet es lenyilo menujet kapja, a tobbi lap (`(main)`) a regi fejlecet.
 *
 * Ugyanaz a vaz, mint a `(main)/layout.tsx`: a kosar-allapot a kliensoldalon
 * jon (az elrendezes nem olvas sutit, az oldal gyorsitotarazhato), a lablec kozos.
 * A fejlec szovegei ugyanabbol a szerkesztheto rekordbol jonnek, mint a lap
 * savjai (a lekeres gyorsitotarazott, a lappal kozos cimkevel).
 */
export default async function KezdolapElrendezes(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const adat = kezdolapAdat(await kezdolapTartalom())

  return (
    <KosarAllapotProvider>
      <div style={KL_TOKENEK}>
        <KezdolapFejlec s={adat} countryCode={countryCode} />
        <KosarSziget />
        {props.children}
      </div>
      <Footer />
    </KosarAllapotProvider>
  )
}
