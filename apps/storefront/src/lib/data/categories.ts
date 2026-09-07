import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

/**
 * A LEKERDEZES EGY LAPJA. A Medusa alapertelmezett `limit` erteke szaz, es a
 * starter ezt orokolte -- mi viszont 219 kategoriat tartunk (merve 2026-09-07 a
 * teszt bolton), tehat egy egy-lapos lekerdezes a fa NAGYOBBIK felet nem latja.
 */
const CATEGORY_PAGE_SIZE = 100

/**
 * A MEZOK, ES AMI KIMARADT BELOLUK: A `*products`.
 *
 * MERVE 2026-09-07, a teljes katalogus atkoltozese utan. A lekerdezes addig
 * `*products`-ot is kert, es az ADDIG mukodott, amig 19 termek allt a boltban.
 * 1492 termeknel ugyanaz a hivas ezt adta (a futo kirakat sajat naploja):
 *
 *   .../store/product-categories?fields=*category_children, *products, ...
 *   &limit=100&offset=0    -> 98 649 197 bajt
 *   &limit=100&offset=100  -> 45 005 935 bajt
 *
 * Vagyis EGY oldalbetoltes kozel 144 megabajtot huzott, es a Next.js EGYIKET
 * SEM tudta gyorsitotarazni (a hatara 2 megabajt), tehat minden keres ujra
 * lehuzta az egeszet. A gyokerlap ettol 10 masodpercen tul valaszolt, az
 * eletjel-ellenorzes idotullepesre futott, es a bolt a kifele 503-at adott.
 *
 * MIERT SZABAD ELHAGYNI: a hivok kozul EGY SEM olvassa a `products` mezot.
 * Vegigmerve mind a negy hivast:
 *
 *   footer/index.tsx           csak `parent_category` es `category_children`
 *   categories/[...]/page.tsx  csak `handle` (generateStaticParams)
 *   products/[handle]/page.tsx sajat, szukebb mezolistat ad at
 *   categories.ts:94           sajat, szukebb mezolistat ad at
 *
 * AMI EBBOL A KOVETKEZO OLVASONAK SZOL: ha valaha kell a kategoriahoz tartozo
 * termeklista, azt NE ide vedd vissza, hanem az a hivo kerje kulon, szurve.
 * Ez a mezo minden hivora hat, es a merete a katalogus meretevel no.
 */
const CATEGORY_FIELDS =
  "*category_children, *parent_category, *parent_category.parent_category"

const fetchCategoryPage = async (query: Record<string, unknown>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client.fetch<{
    product_categories: HttpTypes.StoreProductCategory[]
    count: number
  }>("/store/product-categories", {
    query: {
      fields: CATEGORY_FIELDS,
      ...query,
    },
    next,
    cache: "force-cache",
  })
}

/**
 * MINDEN KATEGORIA, LAPOZASSAL.
 *
 * A starterben ez egyetlen, szazas korlatu hivas volt. MI TORTENT TOLE, MERVE a
 * futo kirakaton: a lablec -- az EGYETLEN hely, ahol a fa megjelenik -- a
 * 219 kategoriabol 24-et mutatott, mert az elso szazban PONTOSAN EGY gyoker
 * volt benne ("Termékek"), a masik ot (Halak, Korallok, Gerinctelenek,
 * Édesvízi akvarisztika, Shop 'n the Shop) ki sem kerult. A bolt elo allat
 * oldala igy teljesen lathatatlan volt, es nem hibauzenettel, hanem ugy, hogy
 * nincs ott.
 *
 * A `count` mezobol tudjuk, mikor allunk meg -- nem a visszakapott lista
 * hosszabol, mert az az UTOLSO lapon rovidebb, es abbol nem kovetkezik, hogy
 * nincs tovabb. A felso hatar (`MAX_PAGES`) nem a fa merete, hanem vedelem egy
 * vegtelen ciklus ellen, ha a `count` valaha hazudna.
 */
export const listCategories = async (query?: Record<string, unknown>) => {
  const MAX_PAGES = 50
  const kert = query?.limit

  // Ha a hivo KIFEJEZETTEN keri a korlatot, azt tiszteletben tartjuk: van hivo,
  // aki csak nehany kategoriat akar (peldaul egy elonezet).
  if (typeof kert === "number") {
    const { product_categories } = await fetchCategoryPage({ ...query, limit: kert })
    return product_categories
  }

  const mind: HttpTypes.StoreProductCategory[] = []
  for (let lap = 0; lap < MAX_PAGES; lap++) {
    const { product_categories, count } = await fetchCategoryPage({
      ...query,
      limit: CATEGORY_PAGE_SIZE,
      offset: lap * CATEGORY_PAGE_SIZE,
    })
    mind.push(...product_categories)
    if (mind.length >= count || product_categories.length === 0) break
  }
  return mind
}

/**
 * EGY KATEGORIA ES AZ OSSZES LESZARMAZOTTJA, AZONOSITO SZERINT.
 *
 * MIERT KELL: a Medusa `category_id` szurese PONTOS EGYEZES. Merve 2026-09-07 a
 * teszt bolton, ismert pozitiv kontrollal:
 *
 *   category_id = "Haleledelek - Eledelek"  (kozvetlenul 0, alatta 1) -> 0 termek
 *   KONTROLL: category_id = "Termékek"      (kozvetlenul 9)           -> 9 termek
 *
 * A kontroll mutatja, hogy a szures mukodik, tehat a nulla lelet.
 *
 * ES A KOVETKEZMENYE NEM NEHANY URES LAP. A valodi katalogusra szamolva (a
 * 2026-09-02-i teljes export, 1893 termek, 43 szulo-kategoria): het szulo-lap
 * teljesen URES lenne, mikozben alattuk 168 termek all; a 43-bol 39 KEVESEBBET
 * mutatna, mint ami alatta van; es a "Termékek" gyokerre kattintva a vevo 34
 * termeket latna 1653 helyett.
 *
 * A fank OT szintu, tehat a kozvetlen gyerekek nem elegek -- a teljes reszfat
 * kell bejarni.
 */
export const listCategoryIdsWithDescendants = async (
  categoryId: string
): Promise<string[]> => {
  const mind = await listCategories({ fields: "id,parent_category_id" })

  const gyerekek = new Map<string, string[]>()
  for (const c of mind) {
    const szulo = (c as { parent_category_id?: string | null }).parent_category_id
    if (!szulo) continue
    if (!gyerekek.has(szulo)) gyerekek.set(szulo, [])
    gyerekek.get(szulo)!.push(c.id)
  }

  // Szelessegi bejaras, LATOTT halmazzal: a `parent_category_id` nem zarja ki a
  // kort, es egy kor vegtelen ciklust adna.
  const eredmeny: string[] = []
  const latott = new Set<string>()
  const sor = [categoryId]
  while (sor.length) {
    const id = sor.shift()!
    if (latott.has(id)) continue
    latott.add(id)
    eredmeny.push(id)
    sor.push(...(gyerekek.get(id) ?? []))
  }
  return eredmeny
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
