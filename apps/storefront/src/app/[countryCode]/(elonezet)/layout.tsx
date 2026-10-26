import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import { KosarAllapotProvider } from "@modules/layout/components/kosar-allapot"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * A KEZDOLAP ELO ELONEZETENEK ELRENDEZESE: csak a kosar-allapot (a fejlec
 * kosar-gombja kerdezi). A fejlecet es a lablecet maga az elonezeti oldal
 * rajzolja, mert a lablec a KAPOTT (mentetlen) rekordbol all, nem a mentettbol.
 */
export default function ElonezetElrendezes(props: {
  children: React.ReactNode
}) {
  return <KosarAllapotProvider>{props.children}</KosarAllapotProvider>
}
