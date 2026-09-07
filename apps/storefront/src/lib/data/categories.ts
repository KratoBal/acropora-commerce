import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

/**
 * A LEKERDEZES EGY LAPJA. A Medusa alapertelmezett `limit` erteke szaz, es a
 * starter ezt orokolte -- mi viszont 219 kategoriat tartunk (merve 2026-09-07 a
 * teszt bolton), tehat egy egy-lapos lekerdezes a fa NAGYOBBIK felet nem latja.
 */
const CATEGORY_PAGE_SIZE = 100

const fetchCategoryPage = async (query: Record<string, unknown>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client.fetch<{
    product_categories: HttpTypes.StoreProductCategory[]
    count: number
  }>("/store/product-categories", {
    query: {
      fields:
        "*category_children, *products, *parent_category, *parent_category.parent_category",
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
