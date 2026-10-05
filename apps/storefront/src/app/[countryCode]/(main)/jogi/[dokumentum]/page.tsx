import { Metadata } from "next"
import { notFound } from "next/navigation"

import { jogiDokumentum } from "@lib/util/fogyasztobarat"
import JogiDokumentumTartalom from "@modules/jogi/jogi-dokumentum-tartalom"

/**
 * A FOGYASZTOBARAT JOGI DOKUMENTUMAI A KIRAKATBAN (`/jogi/<slug>`). A lista egy
 * helyen all (`JOGI_DOKUMENTUMOK`); ismeretlen slug 404.
 */
type Props = { params: Promise<{ countryCode: string; dokumentum: string }> }

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
