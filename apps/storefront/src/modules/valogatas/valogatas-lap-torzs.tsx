import { notFound } from "next/navigation"

import { listCategories } from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import {
  valogatasHandleAlapjan,
  valogatasTermekAzonositok,
} from "@lib/data/valogatas"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { decodeHandleParam } from "@lib/util/decode-handle-param"
import { LAP_MERET } from "@lib/util/lap-meret"
import { termeklistaMezok } from "@lib/util/termeklista-mezok"
import { valogatasErvenyes, valogatasLapja } from "@lib/util/valogatas"
import { kovetkezoLap } from "@modules/categories/templates/commerce/kategoria-lap"
import ListaLap from "@modules/categories/templates/commerce/lista-lap"
import { vilagaTermeknek } from "@modules/products/components/lap-vaz/vilag-valto"

/**
 * A VÁLOGATÁS LAPJÁNAK TÖRZSE (t10), az alap-, a lapozott és a szűrt út közös
 * része. A termékek a commerce azonosító-listájából jönnek, laponként 18-cal
 * (mint a többi lista), az eredeti sorrendben (a legújabb elöl).
 *
 * A közös lista-lapon áll (2026-11-03): morzsa, cím, a válogatás saját
 * bevezetője, a darabszám, termékenként választott kártya és a "További
 * termékek betöltése" hivatkozás. Nincs rendezés és nincs szűrő-oszlop: a
 * sorrend a válogatásé, és nincs mi szerint szűrni.
 */
export async function valogatasLapTorzs(
  params: { handle: string; countryCode: string },
  keres: Record<string, string | string[] | undefined>,
) {
  const handle = decodeHandleParam(params.handle)
  const valogatas = await valogatasHandleAlapjan(handle)
  if (!valogatas || !valogatasErvenyes(valogatas.filter)) notFound()

  const azonositok = (await valogatasTermekAzonositok(handle)) ?? []
  const lapSzam = typeof keres.page === "string" ? Number(keres.page) : 1
  const lap = valogatasLapja(azonositok, lapSzam, LAP_MERET)
  if (!lap.letezik) notFound()

  const region = await getRegion(params.countryCode)
  if (!region) notFound()

  const [termekek, katalogus] = await Promise.all([
    lap.azonositok.length
      ? listProducts({
          countryCode: params.countryCode,
          queryParams: {
            id: lap.azonositok,
            limit: lap.azonositok.length,
            fields: termeklistaMezok,
          },
        }).then(({ response }) => {
          const szerint = new Map(response.products.map((p) => [p.id, p]))
          return lap.azonositok.flatMap((id) => szerint.get(id) ?? [])
        })
      : [],
    listCategories({ fields: "id,name,handle,parent_category_id" }),
  ])
  const t = translator(localeOf(params.countryCode))

  return (
    <ListaLap
      t={t}
      morzsa={[{ id: valogatas.handle, nev: valogatas.title }]}
      cim={valogatas.title}
      leiras={valogatas.intro}
      leirasSortoressel
      eloAllat={false}
      sav={{ osszes: false, elemek: [] }}
      count={azonositok.length}
      page={lapSzam}
      rendezes={null}
      szuroAktiv={false}
      torlesHref=""
      keresoAction=""
      kategoriak={[]}
      markaLista={[]}
      markak={[]}
      markaLink={() => ""}
      products={termekek}
      eloAllatKartya={(termek) =>
        vilagaTermeknek(termek, katalogus ?? []) === "sotet"
      }
      uresSzoveg={t("category.emptySelection")}
      szuro={false}
      kovetkezoHref={lapSzam < lap.lapok ? kovetkezoLap(lapSzam) : null}
    />
  )
}
