import { Metadata } from "next"
import {
  indexelhetoRobots,
  kezdolapLeiras,
  openGraph,
} from "@lib/seo/oldal-metaadat"
import { STORE_NAME } from "@lib/store"

import AkciosSor from "@modules/kezdolap/components/akcios-sor"
import HeroCsuszka from "@modules/kezdolap/components/hero-csuszka"
import KategoriaSav from "@modules/kezdolap/components/kategoria-sav"
import MagazinEsVideo from "@modules/kezdolap/components/magazin-es-video"
import ReefClub from "@modules/kezdolap/components/reef-club"
import { getRegion } from "@lib/data/regions"
import { fooldalCanonical } from "@lib/util/lap-canonical"

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

/*
 * A STATIKUS `metadata` HELYETT `generateMetadata`, ES CSAK EZERT: a kanonikus
 * cim tartalmazza az orszagkodot, azt pedig egy statikus objektum nem lathatja.
 * Ugyanaz az indok es ugyanaz az alak, mint a store-lapon.
 *
 * A CIM VALTOZATLAN. A LEIRAS TOVABBRA IS URES, es ez dontes, nem mulasztas:
 *
 * A starter leirasa SAJAT MAGAROL szolt ("A performant frontend ecommerce
 * starter template with Next.js 15 and Medusa"). Az a mondat a keresok
 * talalati listajaban jelent volna meg a bolt fooldalarol.
 *
 * NEM TALALTAM KI HELYETTE MASIKAT: a fooldal leirasa marketing-dontes, es
 * egy kitalalt mondat ugyanugy tovabbutazna, mint a starter sajatja. Amig
 * nincs, a Next a cimbol dolgozik.
 */
export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const params = await props.params

  const canonical = fooldalCanonical(params.countryCode)
  return {
    title: STORE_NAME,
    description: kezdolapLeiras(),
    robots: indexelhetoRobots(),
    alternates: { canonical },
    openGraph: openGraph({
      cim: STORE_NAME,
      leiras: kezdolapLeiras(),
      url: canonical,
    }),
  }
}

/**
 * A KEZDOLAP.
 *
 * === MI VALTOZOTT, ES MIERT ===
 *
 * Eddig a starter ket eleme allt itt: egy ures hero a bolt nevevel, es egy
 * `FeaturedProducts` lista, ami GYUJTEMENYEKBOL epult. Merve 2026-09-14 az elo
 * lapon: a kiszolgalt kezdolap 75 kilobajt, EGY `h1` ("Acropora"), NULLA
 * termek-hivatkozas es NULLA kategoria-hivatkozas -- mert a teszt boltban
 * nulla gyujtemeny van, tehat a lista sosem kapott mit mutatni.
 *
 * A helyere Balazs 2026-09-14-i kezdolap-terve kerul, savonkent.
 *
 * === A SAVOK SORRENDJE A TERVROL JON ===
 *
 *   hero-csuszka      MINTA (kep es szoveg)
 *   kategoriasav      ELO adat
 *   akcios sor        MINTA (a boltban ma nincs kedvezmenyes ar)
 *   Reef Club         MINTA (a klub meg nem indult)
 *   magazin es video  MINTA (nincs cikkforras, nincs kivalasztott video)
 *   lablec            ELO, mar korabban megepult
 *
 * Amelyik sav minta-adatbol dolgozik, az a lapon is megmondja magarol. A
 * reszletes indoklas a `modules/kezdolap/minta-adat.ts` fejleceben all.
 *
 * === AMIERT A REGIO HIANYA NEM URES LAPOT AD ===
 *
 * A regio csak a kategoriasav termekszamaihoz kell. A starter itt `null`-t
 * adott vissza, ha a regio vagy a gyujtemeny hianyzott -- vagyis EGY hianyzo
 * adat az EGESZ kezdolapot eltuntette. A tobbi sav nem fugg a regiotol, tehat
 * azok attol meg megjelenhetnek.
 */
export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  return (
    <>
      <HeroCsuszka />
      {region ? <KategoriaSav regionId={region.id} /> : null}
      <AkciosSor />
      <ReefClub />
      <MagazinEsVideo />
    </>
  )
}
