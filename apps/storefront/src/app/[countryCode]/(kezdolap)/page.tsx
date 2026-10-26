import { Metadata } from "next"
import {
  indexelhetoRobots,
  kezdolapLeiras,
  openGraph,
} from "@lib/seo/oldal-metaadat"
import { STORE_NAME } from "@lib/store"

import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import { KezdolapSavok } from "@modules/kezdolap/savok"
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
 * A KEZDOLAP, A CLAUDE DESIGN TERV SZERINT (2026-10-20, Balazs).
 *
 * Minden sav szovege, cime, gombja, kepe es hivatkozasa SZERKESZTHETO: az
 * Acropora OS irja (`GET /store/homepage-content`), a terv szovege csak
 * kezdoertek (`modules/kezdolap/szovegek.ts`). A kitalalt szovegek es adatok
 * (ertekeles, velemenyek, cim, nyitvatartas) a probahoz a terv szerint allnak,
 * es az OS-bol atirhatok.
 *
 * === A SAVOK SORRENDJE A TERVROL JON ===
 *
 *   hero-csuszka        diak max. 5, automata leptetes
 *   mit keresel ma      negy terulet
 *   kezdoknek /
 *   tapasztaltaknak     ket panel
 *   egyedi korallok     az OS-ben jelolt termekek (handle-ek a rekordban)
 *   szolgaltatasok
 *   markak
 *   velemenyek
 *   a boltunk
 *   lablec              a kozos lablec
 *
 * A regi savok (kategoria-sav, akcios sor, Reef Club, magazin es video) es a
 * `minta-adat.ts` kikerultek: a terv egyiket sem tartalmazza. A `MintaJelzo`
 * cimke marad: a KITALALT TENYEK (ertekeles, velemenyek, cim, nyitvatartas,
 * marka-kapcsolat, a diak kepalairasa) addig viselik, amig az OS nem ir hozajuk
 * sajat erteket (acrobot 33366, barracuda #552). A szoveges cimek, alcimek es
 * gombok jeloles nelkul allnak.
 */
export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const tartalom = await kezdolapTartalom()

  return <KezdolapSavok tartalom={tartalom} countryCode={countryCode} />
}
