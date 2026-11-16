"use server"

import { sdk } from "@lib/config"
import {
  KATALOGUS_KOR_MEZOK,
  RENDEZO_KOR_MEZOK,
  TERMEKLISTA_MEZOK,
} from "@lib/util/termeklista-mezok"
import { korlattalFuttat } from "@lib/util/korlattal-futtat"
import { katalogusKorEgyseru } from "@lib/util/katalogus-kor-egyseru"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { cache } from "react"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getPublicCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

/**
 * PUBLIKUS LEKERES, HITELESITES NELKUL (FE-7). A katalogus ar ma nem
 * latogatofuggo: vevocsoport- vagy arlista-ar NINCS a kodban. Ha valaha
 * partner- vagy B2B-ar jon, az NEM jelenhet meg ezen a lekeresen at, mert a
 * lap gyorsitotarazott es mindenkinek ugyanaz: annak az arnak kliensoldalon,
 * a vevo sajat lekeresevel kell jonnie.
 *
 * FIGYELEM A HIVOKNAK: a `fields` erteket a `...queryParams` UTAN teritjuk szet,
 * tehat egy hivo altal megadott `fields` NEM bovul, hanem FELULIR. Aki egyetlen
 * relaciot akar hozzavenni, csendben elveszi az osszes tobbit -- ez mar
 * megtortent, es a jelveny tunt el tole. A termeklap keszen kapott ertekkel hiv:
 * `src/lib/data/termeklap-fields.ts`, ahol a meres es az indoklas all.
 */
export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  /*
    FE-7: suti nelkul. A katalogus nem latogatofuggo (vevocsoport-ar nincs),
    tehat se a hitelesito fejlec, se a latogatonkenti cimke nem kell, es
    mindketto sutit olvasna, ami a lapot dinamikussa tenne.
  */
  const headers = {}

  const next = {
    ...(await getPublicCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields: TERMEKLISTA_MEZOK,
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      },
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/** A kozos kor lapmerete, az egyszerre futo lapok szama es a vedelmi felso hatar (30 lap, 3000 termek, mint a marka-szamlalonal). */
const KOR_LAP_MERET = 100
const KOR_PARHUZAMOS_LAP = 7
const KOR_LAPOK_FELSO_HATARA = 30

/**
 * A KATALOGUS EGY KORE A RENDEZESNEK ES A MARKA-SZAMLALONAK (task t-20261116-gyoker-ar-rendezes).
 *
 * A `cache` egy KERESEN BELUL azonos argumentumra ugyanazt az igeretet adja, tehat a rendezo kor es a marka-szamlalo egy lekerest
 * oszt meg. A visszaadott lista kozos: aki rendez, masolatot rendezzen (`sortProducts` helyben rendez). A memo NEM exportalt: egy
 * "use server" fajlbol csak async fuggveny mehet ki, azt a `katalogusKorLista` adja.
 */
const katalogusKorMemo = cache(
  async (
    kategoriaId: string,
    countryCode: string,
  ): Promise<{ products: HttpTypes.StoreProduct[]; count: number }> => {
    const lap = (pageParam: number) =>
      listProducts({
        pageParam,
        queryParams: {
          ...(kategoriaId ? { category_id: [kategoriaId] } : {}),
          limit: KOR_LAP_MERET,
          fields: KATALOGUS_KOR_MEZOK,
        },
        countryCode,
      })
    const elso = await lap(1)
    const count = elso.response.count
    const lapok = Math.min(
      Math.ceil(count / KOR_LAP_MERET),
      KOR_LAPOK_FELSO_HATARA,
    )
    const tobbi = await korlattalFuttat(
      Array.from(
        { length: Math.max(lapok - 1, 0) },
        (_, i) => () => lap(i + 2),
      ),
      KOR_PARHUZAMOS_LAP,
    )
    return {
      products: [
        ...elso.response.products,
        ...tobbi.flatMap(({ response }) => response.products),
      ],
      count,
    }
  },
)

export const katalogusKorLista = async (
  kategoriaId: string,
  countryCode: string,
): Promise<{ products: HttpTypes.StoreProduct[]; count: number }> =>
  katalogusKorMemo(kategoriaId, countryCode)

/**
 * A RENDEZETT LAP TELJES TERMEKEI (task t-20261115-ar-rendezes-szukites). A rendezo kor (`RENDEZO_KOR_MEZOK`) csak az arat
 * es az azonositot hozta le; a megjeleno lap termekei egy KULON, kis lekeresben kapjak a hivo mezoit (a `queryParams.fields`,
 * vagy a lista alapmezoi), a rendezett sorrendben. Ures lapnal nincs lekeres.
 *
 * A lekeres a hivo SZURESEIT is viszi (kategoria, opcio, ...): ugyanarra a halmazra szol, mint a rendezo kor, csak a
 * `id` szukiti. Ha egy termek kozben eltunik, a lap rovidebb, a darabszam a rendezo korbol jon.
 */
async function rendezettLapTermekei({
  rendezett,
  kezdet,
  limit,
  kozosParams,
  countryCode,
}: {
  rendezett: HttpTypes.StoreProduct[]
  kezdet: number
  limit: number
  kozosParams: ProductListQueryParams
  countryCode: string
}): Promise<HttpTypes.StoreProduct[]> {
  const lapAzonositok = rendezett.slice(kezdet, kezdet + limit).map((p) => p.id)
  if (lapAzonositok.length === 0) return []
  const {
    response: { products },
  } = await listProducts({
    pageParam: 1,
    queryParams: {
      ...kozosParams,
      id: lapAzonositok,
      limit: lapAzonositok.length,
    },
    countryCode,
  })
  const sorrend = new Map(lapAzonositok.map((id, i) => [id, i]))
  return [...products].sort(
    (a, b) => (sorrend.get(a.id) ?? 0) - (sorrend.get(b.id) ?? 0),
  )
}

/**
 * A TERMEKLISTA EGY LAPJA, RENDEZESSEL.
 *
 * === AMI ITT ALLT, ES MIT CSINALT ===
 *
 * A starter EGYETLEN, szazas korlatu lekerdezest tett, a kapott listat a
 * kliensen rendezte, es a lapozast a mar lehivott szazon belul vegezte. A
 * visszaadott darabszam a lehivott lista hossza volt, tehat legfeljebb szaz.
 *
 * Harom kovetkezmenye volt, es MIND A HAROM NEMA:
 *   - a "Termékek" lapon a katalogus toredeke volt elerheto (a 2026-09-02-i
 *     UNAS export 1893 termeke kozul 100),
 *   - a lapozo a kilencedik lap utan egyszeruen veget ert,
 *   - es az ar szerinti rendezes is csak azt a szazat rendezte.
 *
 * A kategoria-lapokon ez MA nem harapott (a legnagyobb level-kategoria 76
 * termeket tart), a "Termékek" lapon viszont igen.
 *
 * === MIERT KET AG, ES MIERT NEM EGY ===
 *
 * Merve 2026-09-07 a teszt Medusan: a Store API `order` mezoje elfogadja a
 * `created_at`, a `-created_at` es a `title` erteket, de MINDEN ar-alapu alak
 * (`variants.calculated_price`, `calculated_price`) HTTP 500-at ad. A starter
 * kommentje tehat helyes volt: arra rendezni a szerveren ma nem lehet.
 *
 * Ezert:
 *   idorendben  ->  a SZERVER rendez es lapoz, a darabszam a VALODI darabszam
 *   ar szerint  ->  minden lapot lehivunk, a kliensen rendezunk, es UGYANUGY a
 *                   valodi darabszamot adjuk vissza
 *
 * Az ar-agban a lehivas ara merve: egy szazas lap 54 ms a teszt boltban.
 * A TESZT BOLT 1492 termekenel (merve 2026-09-08) ez tizenot keres, tehat
 * masodperc-nagysagrend, es a Next gyorsitotara mogotte all. Ez tobb, mint a mai egyetlen keres -- de a mai
 * egyetlen keres ROSSZ VALASZT ad, nem gyorsat.
 *
 * === EGY CSAPDA, AMI A JAVITAS KOZBEN DERULT KI ===
 *
 * A ket rendezes IRANYA nem egyezett: a szerver-oldali `order: "created_at"`
 * NOVEKVO (a legregibb elol), a kliens-oldali rendezes viszont CSOKKENO (a
 * legujabb elol) -- es mivel a kliens rendezett utoljara, a csokkeno nyert.
 * Ha a szerver-oldali agra valtunk, `-created_at` kell, kulonben a lap
 * viselkedese CSENDBEN megfordul.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
  azonositokIdorendben = false,
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
  /**
   * Igaz, ha a `queryParams.id` lista MAR `created_at` szerint csokkeno (a kereses vegpontja ilyen sorrendben adja).
   * Hosszu azonosito-listanal, idorendi rendezesnel ez engedi, hogy a lap csak a SAJAT azonositoit kerje le.
   */
  azonositokIdorendben?: boolean
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean)),
  )

  const kozosParams = {
    ...queryParams,
    ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
  }

  const oldal = Math.max(page, 1)

  // HOSSZU AZONOSITO-LISTA (a kereses talalatai): lasd `listProductsAzonositokkal`.
  const azonositok = Array.isArray(kozosParams.id) ? kozosParams.id : null
  if (azonositok && azonositok.length > AZONOSITO_CSOMAG) {
    return listProductsAzonositokkal({
      azonositok,
      kozosParams,
      oldal,
      limit,
      sortBy,
      countryCode,
      azonositokIdorendben,
    })
  }

  // IDORENDI RENDEZES: a szerver rendez es lapoz.
  if (sortBy === "created_at") {
    const {
      response: { products, count },
    } = await listProducts({
      pageParam: oldal,
      // `-created_at`, nem `created_at`: lasd a fejlec "egy csapda" szakaszat.
      queryParams: { ...kozosParams, limit, order: "-created_at" },
      countryCode,
    })

    return {
      response: { products, count },
      nextPage: count > oldal * limit ? oldal + 1 : null,
      queryParams,
    }
  }

  // AR SZERINTI RENDEZES: a szerver nem tudja, tehat MINDEN lapot lehivunk.
  //
  // A felso hatar nem a katalogus merete, hanem vedelem egy vegtelen ciklus
  // ellen, ha a `count` valaha hazudna. Huszonot lap szazasaval 2500 termek.
  //
  // A KATALOGUS MERETE MELLE DATUM ES POPULACIO KELL, kulonben nem
  // osszevetheto (nautilus szabalya, 2026-09-08). Ez a ciklus a MEDUSA boltot
  // jarja be, tehat az a populacio szamit:
  //
  //     a teszt Medusa bolt      1492 termek   (merve 2026-09-08)
  //     a 2026-09-02-i UNAS export 1893        <- MAS populacio, nem ez
  //
  // Itt korabban "a mai katalogus 1893" allt, datum es populacio nelkul. Az a
  // szam a MASIK rendszere, es a "mai" szo egy nappal kesobb mar nem igaz.
  //
  // AMI ERVENYTELENITI EZT A HATART: ha a Medusa bolt 2500 termek fole no. Nem
  // hibazna, csak CSENDBEN levagna a listat -- ezert all itt szam, nem erzes.
  const LAPOK_FELSO_HATARA = 25
  const LAP_MERET = 100
  const mind: HttpTypes.StoreProduct[] = []
  let osszesen = 0

  /*
    EGY KOR A RENDEZESNEK ES A MARKA-SZAMLALONAK IS (task t-20261116-gyoker-ar-rendezes). A gyoker es a kategoria lista a
    rendezo kort ES a marka-szamlalot EGYSZERRE futtatja (`Promise.all`), es mindketto a teljes halmazt olvassa: a Medusa a
    ketszeres, egyidejű kereset nem birja (modellezve 2026-11-16 a teszt Medusan: kulon 1,6 s es 1,1 s, egyutt 2,8-3,0 s, ez a
    kirakat hideg 3,0 s-a; egy kozos kor 1,4-1,5 s). Ha a halmaz az EGYSZERU kategoria/gyoker halmaz (nincs marka-, opcio-
    vagy azonosito-szuro), a kort a `katalogusKor` adja, kerelemenkent egyszer, es a marka-szamlalo ugyanazt kapja.
  */
  if (katalogusKorEgyseru(kozosParams)) {
    const kor = await katalogusKorLista(
      kozosParams.category_id?.[0] ?? "",
      countryCode,
    )
    const rendezett = sortProducts([...kor.products], sortBy)
    const kezdet = (oldal - 1) * limit
    return {
      response: {
        products: await rendezettLapTermekei({
          rendezett,
          kezdet,
          limit,
          kozosParams,
          countryCode,
        }),
        count: kor.count,
      },
      nextPage: kor.count > oldal * limit ? oldal + 1 : null,
      queryParams,
    }
  }

  for (let lap = 1; lap <= LAPOK_FELSO_HATARA; lap++) {
    const {
      response: { products, count },
    } = await listProducts({
      pageParam: lap,
      // csak a rendezeshez kello mezok: a teljes lap kulon lekeresbol jon (`rendezettLapTermekei`)
      queryParams: {
        ...kozosParams,
        limit: LAP_MERET,
        fields: RENDEZO_KOR_MEZOK,
      },
      countryCode,
    })
    osszesen = count
    mind.push(...products)
    if (mind.length >= count || products.length === 0) break
  }

  const rendezett = sortProducts(mind, sortBy)
  const kezdet = (oldal - 1) * limit

  return {
    response: {
      products: await rendezettLapTermekei({
        rendezett,
        kezdet,
        limit,
        kozosParams,
        countryCode,
      }),
      // A VALODI darabszam, nem a lehivott liste hossza: ebbol szamol a lapozo.
      count: osszesen,
    },
    nextPage: osszesen > oldal * limit ? oldal + 1 : null,
    queryParams,
  }
}

/**
 * Egy lekerdezesbe ennyi `id` megy (egy azonosito nagyjabol harminc karakter a cimben, szaz tehat nagyjabol harom
 * kilobajt, a szokasos nyolc kilobajtos korlat alatt).
 */
const AZONOSITO_CSOMAG = 100

/**
 * Egyszerre legfeljebb ennyi csomag-lekeres fut (barracuda #778 review, 2026-11-15): az ar szerinti ag egy OLDALNYITAS
 * alatt a talalatszam/100 lekerest indit (a 3000-es hataron 30-at), es a kereso nyilvanos: minden UJ keresoszo es regio
 * egy friss legyezot jelentene. A gyorsitotar a MASODIK ugyanilyen kerest viszi el, az elsot nem.
 */
const PARHUZAMOS_CSOMAG = 4

/**
 * HOSSZU `id` LISTA, RENDEZESSEL ES LAPOZASSAL, A TELJES HALMAZON (kartya 30b376de).
 *
 * === MIERT KELL KULON AG ===
 *
 * Az `id` szuro a lekerdezes CIMEBE megy, es 200 azonositonal tobb mar nem fer el egy lekerdezesben. A kereses
 * azert vagta le a talalatokat 200-nal (a regebbiek kiestek, az ar szerinti rendezes csak a 200 legujabbat
 * rendezte). Itt a lista csomagokra oszlik, es a lap a TELJES halmazbol szamol.
 *
 * Ket ut, mert a ket rendezes mas koltsegu:
 *   - idorendben, ha a lista mar idorendben van (`azonositokIdorendben`): a lap csak a SAJAT azonositoit kerdezi
 *     le (legfeljebb `limit` darab, egyetlen kis lekerdezes), es a lista sorrendjeben adja vissza. A darabszam az
 *     azonositok szama.
 *   - minden mas (ar szerint, vagy ismeretlen sorrend): minden csomagot lehiv, a kliensen rendez, es szeletel.
 *     Egy csomag szaz termek, a lekeres a Next gyorsitotarabol jon.
 */
async function listProductsAzonositokkal({
  azonositok,
  kozosParams,
  oldal,
  limit,
  sortBy,
  countryCode,
  azonositokIdorendben,
}: {
  azonositok: string[]
  kozosParams: ProductListQueryParams
  oldal: number
  limit: number
  sortBy: SortOptions
  countryCode: string
  azonositokIdorendben: boolean
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> {
  const kezdet = (oldal - 1) * limit

  if (sortBy === "created_at" && azonositokIdorendben) {
    const lapAzonositok = azonositok.slice(kezdet, kezdet + limit)
    if (lapAzonositok.length === 0) {
      return {
        response: { products: [], count: azonositok.length },
        nextPage: null,
      }
    }
    const {
      response: { products },
    } = await listProducts({
      pageParam: 1,
      queryParams: {
        ...kozosParams,
        id: lapAzonositok,
        limit: lapAzonositok.length,
      },
      countryCode,
    })
    const sorrend = new Map(lapAzonositok.map((id, i) => [id, i]))
    return {
      response: {
        products: [...products].sort(
          (a, b) => (sorrend.get(a.id) ?? 0) - (sorrend.get(b.id) ?? 0),
        ),
        count: azonositok.length,
      },
      nextPage: azonositok.length > oldal * limit ? oldal + 1 : null,
    }
  }

  const csomagok: string[][] = []
  for (let i = 0; i < azonositok.length; i += AZONOSITO_CSOMAG) {
    csomagok.push(azonositok.slice(i, i + AZONOSITO_CSOMAG))
  }
  const valaszok = await korlattalFuttat(
    csomagok.map(
      (csomag) => () =>
        listProducts({
          pageParam: 1,
          queryParams: {
            ...kozosParams,
            id: csomag,
            limit: csomag.length,
            fields: RENDEZO_KOR_MEZOK,
          },
          countryCode,
        }),
    ),
    PARHUZAMOS_CSOMAG,
  )
  const mind = valaszok.flatMap((v) => v.response.products)
  const rendezett = sortProducts(mind, sortBy)

  return {
    response: {
      products: await rendezettLapTermekei({
        rendezett,
        kezdet,
        limit,
        kozosParams,
        countryCode,
      }),
      // a VALODI darabszam: amennyi termek a csomagokbol megerkezett
      count: mind.length,
    },
    nextPage: mind.length > oldal * limit ? oldal + 1 : null,
  }
}
