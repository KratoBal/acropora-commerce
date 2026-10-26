import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import AruhazKeret from "@modules/layout/templates/aruhaz-keret"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * AZ ORSZAGKOD A FEJLECNEK KELL, ES KET DOLOGHOZ (2026-09-08):
 * a kereso urlapja a `/{orszagkod}/store` cimre kuld, es a menu a REGIO
 * azonositojaval kerdezi le, melyik gyokerben van egyaltalan termek.
 *
 * Az elrendezes eddig nem kerte el, mert nem volt ra szuksege. A Next.js
 * atadja, csak deklaralni kell.
 *
 * AZ ELRENDEZES NEM OLVAS SUTIT (FE-7, Balazs 2026-10-07). Eddig itt jott a
 * vevo es a kosar (`retrieveCustomer`, `retrieveCart`), es egy suti olvasasa a
 * Next.js-ben minden alatta levo lapot dinamikussa tesz: a teszt kirakaton
 * mind a tiz laptipus `private, no-store` valaszt adott. A kosar es a vevo
 * most kliensoldalon jon (`KosarAllapotProvider`), a lap gyorsitotarazhato.
 *
 * A FEJLEC ES A LABLEC A KEZDOLAPEVAL KOZOS KERETBOL JON (2026-10-26, Balazs):
 * lasd `aruhaz-keret`.
 */
export default async function PageLayout(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return <AruhazKeret countryCode={countryCode}>{props.children}</AruhazKeret>
}
