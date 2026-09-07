"use server"

import { sdk } from "@lib/config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

/**
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

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
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
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
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
 *   - a "Termékek" lapon 1893 termekbol 100 volt elerheto,
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
 * 1893 termeknel ez tizenkilenc keres, tehat masodperc-nagysagrend, es a Next
 * gyorsitotara mogotte all. Ez tobb, mint a mai egyetlen keres -- de a mai
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
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )

  const kozosParams = {
    ...queryParams,
    ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
  }

  const oldal = Math.max(page, 1)

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
  // ellen, ha a `count` valaha hazudna. Huszonot lap szazasaval 2500 termek,
  // a mai katalogus 1893.
  const LAPOK_FELSO_HATARA = 25
  const LAP_MERET = 100
  const mind: HttpTypes.StoreProduct[] = []
  let osszesen = 0

  for (let lap = 1; lap <= LAPOK_FELSO_HATARA; lap++) {
    const {
      response: { products, count },
    } = await listProducts({
      pageParam: lap,
      queryParams: { ...kozosParams, limit: LAP_MERET },
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
      products: rendezett.slice(kezdet, kezdet + limit),
      // A VALODI darabszam, nem a lehivott liste hossza: ebbol szamol a lapozo.
      count: osszesen,
    },
    nextPage: osszesen > oldal * limit ? oldal + 1 : null,
    queryParams,
  }
}
