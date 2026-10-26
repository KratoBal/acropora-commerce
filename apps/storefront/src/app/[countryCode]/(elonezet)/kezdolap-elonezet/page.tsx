import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listCollections } from "@lib/data/collections"
import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import { elonezetBekapcsolva, osOrigin } from "@lib/util/kezdolap-elonezet"
import KezdolapFejlec from "@modules/kezdolap/fejlec"
import { kezdolapAdat } from "@modules/kezdolap/tartalom"
import { tisztitottTartalom } from "@modules/kezdolap/tisztitas"
import { lablecAdat } from "@modules/layout/templates/footer/lablec-adat"
import ElonezetKliens from "./elonezet-kliens"

/*
  NINCS GYORSITOTAR: az elonezet a futasidejui kornyezettol (bekapcsolas, OS
  cime) fugg, es a fejleceit a middleware teszi ra. A `noindex` itt is all, a
  middleware `X-Robots-Tag`-je mellett.
*/
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Kezdőlap előnézet",
  robots: { index: false, follow: false },
}

/**
 * A KEZDOLAP ELO ELONEZETE (protokoll v1, nautilus 2026-10-26): a TESZT kirakat
 * valodi kezdolapja, az OS iframe-ben nyitja, a mentetlen tartalmat uzenetben
 * kapja. Bekapcsolas nelkul 404 (a middleware is zarja; ez a masodik zar).
 *
 * A KEZDETI ALLAPOT a MENTETT rekord (a fejlec is abbol all), amig az OS az
 * elso `content` uzenetet el nem kuldi. A fejlec szerveroldalon renderelt
 * csomopontkent megy at: a menu a valodi kategoriakbol all, azt a kliens nem
 * tudja ujraepiteni. A fejlec SZOVEGEI ezert a mentett rekordbol jonnek; a
 * savok es a lablec elo.
 */
export default async function KezdolapElonezet(props: {
  params: Promise<{ countryCode: string }>
}) {
  if (!elonezetBekapcsolva(process.env)) notFound()
  const { countryCode } = await props.params
  const tartalom = tisztitottTartalom(await kezdolapTartalom())
  const { collections } = await listCollections({ fields: "id,handle,title" })

  return (
    <ElonezetKliens
      osOrigin={osOrigin(process.env)}
      countryCode={countryCode}
      kezdoRekord={tartalom}
      kezdoLablec={lablecAdat(tartalom)}
      kollekciok={(collections ?? []).map((c) => ({
        id: c.id,
        handle: c.handle,
        title: c.title,
      }))}
      fejlec={
        <KezdolapFejlec s={kezdolapAdat(tartalom)} countryCode={countryCode} />
      }
    />
  )
}
