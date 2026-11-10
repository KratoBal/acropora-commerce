import { Metadata } from "next"

import { erkezoAllatok } from "@lib/data/erkezo-allatok"
import { indexelhetoRobots, lapCim, openGraph } from "@lib/seo/oldal-metaadat"
import { erkezoAllatokCanonical } from "@lib/util/lap-canonical"
import { shopDay } from "@lib/util/livestock-arrival"
import { szoljBekapcsolva } from "@lib/util/szolj-hasonlo"
import { ErkezoAllatokLap } from "@modules/erkezo-allatok/erkezo-allatok-lap"

type Props = { params: Promise<{ countryCode: string }> }

const CIM = "Érkező állatok"
const LEIRAS =
  "Az úton lévő élő állatok: halak, gerinctelenek és korallok, a várható érkezés napjával."

/**
 * AZ ERKEZO ALLATOK OLDALA (`/hu/erkezo-allatok`, V2.6 S4c, kartya f4e4832b): a bolt listaja (amit az OS elojegyezhetokent
 * kitesz), a kotott sor a termeklapjara linkel, a kotetlen fajra feliratkozni lehet (kapcsolo mogott). ISR, mint a tobbi
 * publikus lap: a bolt vegpontja (fajonkent egy keszlet-kerdes) igy legfeljebb 300 mp-enkent fut lapenkent.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const canonical = erkezoAllatokCanonical(countryCode)
  return {
    title: lapCim(CIM),
    description: LEIRAS,
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({ cim: lapCim(CIM), leiras: LEIRAS, url: canonical }),
  }
}

export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default async function ErkezoAllatokOldal(props: Props) {
  const { countryCode } = await props.params
  const { sorok, handleOf } = await erkezoAllatok(countryCode)
  return (
    <ErkezoAllatokLap
      cim={CIM}
      sorok={sorok}
      handleOf={handleOf}
      ma={shopDay()}
      feliratkozas={szoljBekapcsolva()}
    />
  )
}
