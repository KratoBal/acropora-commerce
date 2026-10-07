import { Metadata } from "next"
import { notFound } from "next/navigation"

import { jogiDokumentum } from "@lib/util/fogyasztobarat"
import JogiDokumentumTartalom from "@modules/jogi/jogi-dokumentum-tartalom"

/**
 * A FOGYASZTOBARAT JOGI DOKUMENTUMAI A KIRAKATBAN (`/jogi/<slug>`). A lista egy
 * helyen all (`JOGI_DOKUMENTUMOK`); ismeretlen slug 404.
 */
type Props = { params: Promise<{ countryCode: string; dokumentum: string }> }

/*
 * ISR (FE-7, Balazs 2026-10-07): a lap igeny szerint keszul es gyorsitotarba
 * kerul. A `generateStaticParams` nelkul a Next 15 a dinamikus szegmenst
 * (`[countryCode]`) minden keresre ujra renderelne, `private, no-store`
 * valasszal, akkor is, ha a lap semmi dinamikusat nem olvas (merve
 * 2026-10-07 egy 15.5.24-es probaepitesen). Az ures lista: nincs elore
 * epites, az elso keres epit. A `revalidate` a tartalek, ha egy urites elmarad.
 */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { dokumentum } = await props.params
  const doc = jogiDokumentum(dokumentum)
  return { title: doc ? doc.cim : "Nem található" }
}

export default async function JogiDokumentumOldal(props: Props) {
  const { dokumentum } = await props.params
  const doc = jogiDokumentum(dokumentum)
  if (!doc) notFound()
  return (
    <div className="content-container py-12">
      <h1 className="text-3xl-semi mb-8">{doc.cim}</h1>
      <JogiDokumentumTartalom kulcs={doc.kulcs} maiBoltCim={doc.maiBoltCim} />
    </div>
  )
}
