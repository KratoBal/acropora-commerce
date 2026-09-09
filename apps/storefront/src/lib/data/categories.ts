import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { gyokerekKetSzintel, megjelenitendoNevek } from "@lib/util/kategoria-fa"
import { getCacheOptions } from "./cookies"
import { listProducts } from "./products"
import { leszarmazottAzonositok } from "@lib/util/kategoria-leszarmazottak"

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
 * MIERT SZABAD ELHAGYNI: a LISTA-lekerdezes hivoi kozul egy sem olvassa a
 * `products` mezot.
 *
 * PONTOSITAS (2026-09-07): ez a mondat eredetileg MINDEN hivora allt, es
 * tullott. A `getCategoryByHandle` hivoja OLVASSA -- a `CategoryTemplate` a
 * hosszat hasznalja a betoltesi helyorzok szamahoz. Ott a mezo azert marad ki,
 * mert a hivonak MAR VAN tartaleka (8), nem azert, mert senki nem nezi.
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
    const { product_categories } = await fetchCategoryPage({
      ...query,
      limit: kert,
    })
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
  categoryId: string,
): Promise<string[]> => {
  const mind = await listCategories({ fields: "id,parent_category_id" })

  /**
   * A BEJARAS TISZTA FUGGVENYBEN AL, ES EZ NEM STILUS-KERDES.
   *
   * Ugyanez a szelessegi bejaras KETSZER allt a repoban: itt, es a #256-ban
   * (`leszarmazottAzonositok`). A ketto betuere ugyanazt csinalta, es a
   * kulonbseguk NEM az volt, hogy melyik a szebb:
   *
   *   ez a fuggveny   HASZNALATBAN volt, es NEM VOLT rá teszt -- mert I/O-t
   *                   vegez (`await listCategories`), tehat mockolas nelkul
   *                   nem merheto
   *   a tiszta alak   MERVE volt (ciklus-vedelemmel egyutt, kalibralva), es
   *                   SENKI nem hivta
   *
   * Vagyis a lefedettseg es a hasznalat KET KULON fuggvenyen allt. A duplikatum
   * megszuntetesenek helyes iranya ezert nem a torles, hanem ez: az I/O marad
   * itt, a dontes atkerul a mert fuggvenybe. Onnantol az eles ut is a
   * `kategoria-leszarmazottak.spec.ts` allitasai ala esik.
   */
  return leszarmazottAzonositok(mind, categoryId)
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
          /**
           * A `*products` ITT IS KIMARAD -- ES EZ A MASODIK UT UGYANABBOL A HIBABOL.
           *
           * A #85 a LISTA-lekerdezesbol vette ki (az volt a 144 megabajtos ut).
           * Ez a fuggveny EGY handle-re szol, tehat kisebb -- de a gyoker
           * kategorian merve NEM kicsi:
           *
           *   fields "*category_children, *products"   4 157 493 bajt  (3,96 MB)
           *   fields "*category_children"                  11 275 bajt
           *
           * A Next.js gyorsitotar hatara 2 MB, tehat a regi alak a GYOKER
           * kategoria lapjan gyorsitotarazhatatlan volt: minden keres ujra
           * lehuzta a kozel negy megabajtot. Az uj alak belefer.
           *
           * ES A HIVO OLVASSA A MEZOT -- ezert nem vaktaban vettem ki:
           * `CategoryTemplate` a `category.products?.length ?? 8` alakban
           * hasznalja, a BETOLTESI HELYORZOK darabszamahoz. Egyetlen szam, es
           * MAR VAN tartaleka. A valodi termeklistat a `PaginatedProducts`
           * kerdezi le kulon, categoryId alapjan -- az valtozatlan.
           *
           * AMI EZZEL VALTOZIK A KEPERNYON: a helyorzok szama mostantol
           * mindenutt 8. Ez a betoltes alatt latszik, es semmi mas.
           */
          fields:
            "*category_children,*parent_category,*parent_category.parent_category,*parent_category.parent_category.parent_category,*parent_category.parent_category.parent_category.parent_category,*parent_category.parent_category.parent_category.parent_category.parent_category",
          handle,
        },
        next,
        cache: "force-cache",
      },
    )
    .then(({ product_categories }) => product_categories[0])
}

/**
 * A GYOKER-KATEGORIAK, AMIKBEN VAN TERMEK -- A FEJLEC MENUJEHEZ.
 *
 * MIERT NEM ELEG A GYOKEREK LISTAJA (acrobot merese, 2026-09-08): a hat
 * gyokerbol NEGY hordoz termeket a teljes reszfajaban.
 *
 *     Termekek              1337
 *     Halak                  125
 *     Gerinctelenek           28
 *     Korallok                 8
 *     Shop 'n the Shop         0
 *     Edesvizi akvarisztika    0
 *
 * ES A SZURO NEM KOZMETIKAI. Egy ures kategoria a menuben a vevot egy ures
 * lapra viszi, es az rosszabb, mint ha ott sem lenne: a menu azt igeri, hogy
 * van mit nezni.
 *
 * A SZAM A TELJES RESZFARA ERTENDO, nem a kozvetlenul rakotott termekekre.
 *
 * === ITT KORABBAN EGY ROSSZ INDOK ALLT (javitva 2026-09-08 este) ===
 *
 * Az allt itt, hogy a kozvetlen szamlalas a "Termekek" gyokeret "1337 helyett
 * 9-nek latna, es kiesne a legfontosabb tetel". Visszamerve MIND A KET fele
 * hibas:
 *
 *   a kozvetlen szam nem 9, hanem 1279 (merve a teszt bolton, a gyokerhez
 *     KOZVETLENUL rendelt termekek szama)
 *   es 9 is atmenne a "nulla felett" szuron, tehat nem esne ki semmi
 *
 * A MAI ADATON a ket szamolas UGYANAZT a negy gyokeret valasztja ki:
 *
 *     gyoker                  kozvetlen   reszfa
 *     Termekek                     1279     1337
 *     Halak                         125      125
 *     Gerinctelenek                  27       28
 *     Korallok                        8        8
 *     Shop 'n the Shop                0        0
 *     Edesvizi akvarisztika           0        0
 *
 * === AMIERT A RESZFA MEGIS A HELYES SZABALY ===
 *
 * Nem azert, mert ma kulonbseget tesz -- ma nem tesz. Hanem mert egy olyan
 * gyoker, aminek MINDEN termeke alkategoriaban ul, kozvetlen szamlalassal
 * nullat adna, es CSENDBEN kiesne a menubol. Ez ma nem all fenn, de a szabaly
 * ELORE vedi ki, es nem kerul semmibe: ugyanaz az egy lekerdezes.
 *
 * (Egy meresi buktato hozza, hogy ne kelljen ujra felfedezni: a reszfa szamat
 * NEM szabad a kozvetlen szamok OSSZEADASAVAL kiszamolni. Egy termek tobb
 * szinten is be van sorolva, tehat az osszeg duplan szamol -- nalam igy
 * "Termekek" 4473-at adott 1337 helyett. A helyes szam az API `count` mezoje
 * a teljes reszfara kerdezve, es a lenti kod epp azt teszi.)
 *
 * === A LEKERDEZESEK SZAMA SZANDEKOSAN ALACSONY ===
 *
 * A fejlec MINDEN lapon fut. Ezert a kategoria-fat EGYSZER kerjuk le, a
 * leszarmazottakat abbol az egy valaszbol szamoljuk (nem gyokerenkent ujra),
 * es gyokerenkent egyetlen `limit: 1` termek-lekerdezes megy ki, parhuzamosan.
 * A `count` mezo a teljes talalatszamot adja, tehat egy termeket sem kell
 * lehozni ahhoz, hogy tudjuk, van-e.
 */
export const listNonEmptyRootCategories = async (
  regionId: string,
): Promise<{
  gyokerek: HttpTypes.StoreProductCategory[]
  /**
   * A MEGJELENITENDO NEVEK, AZONOSITO SZERINT -- ES NEM UJ LEKERDEZES.
   *
   * A roviditest a menu eddig helyben vegezte (`rovidNev(nev, gyokerNeve)`),
   * feltetel nelkul. Az egyedisegrol viszont csak a TELJES lista tud dontenni,
   * es az itt mar a kezunkben van: ugyanaz a `mind`, amibol a gyokereket
   * szurjuk. A menu igy nem kap uj hivast, csak egy kesz terkepet.
   */
  nevek: Map<string, string>
}> => {
  const mind = await listCategories({
    fields: "id,name,handle,parent_category_id,rank",
  })

  /*
    A RESZFA-BEJARAS A MERT FUGGVENYBOL JON, NEM EGY HELYI MASOLATBOL.

    ITT KORABBAN EGY HARMADIK PELDANY ALLT ugyanabbol a szelessegi bejarasbol:
    sajat latott-halmazzal, gyoker beleertve, ciklus-vedelemmel -- beture az,
    amit a `leszarmazottAzonositok` csinal, csak teszt nelkul.

    A #260 KETTOT nevezett meg (a hasznalt, de nem mert adatretegbelit es a
    mert, de nem hasznalt tisztat), es a masodikra allitotta at az elo utat.
    HAROM volt, es ez a harmadik ugyanabban a fajlban ult, huszonot sorral
    lejjebb. A PR torzsebe utolag beirtam a helyesbitest; ez a valtozas az, ami
    tenylegesen lezarja.

    A HELYI PELDANNYAL EGYUTT A `gyerekek` TERKEP IS ELTUNIK: azt kizarolag a
    bejaras hasznalta, a tiszta fuggveny pedig magat epiti fel a kapott
    listabol. Ugyanaz a lekerdezes, ugyanaz az eredmeny, eggyel kevesebb hely,
    ahol elromolhat.
  */

  /*
    A GYEREKEKET IS ATADJUK, ES EZ NEM UJ LEKERDEZES.

    A fenti `listCategories` MAR lehozza mind a 219 kategoriat -- eddig csak a
    gyokereket tartottuk meg belole, a tobbit eldobtuk. A fejlec lenyilo
    menujehez viszont kellenek a kozvetlen gyerekek, es azok itt MAR a kezunkben
    vannak. Egy kulon hivas ugyanazt hozna le megegyszer, MINDEN lapbetolteskor.

    A mezot a Medusa sajat `category_children` nevere tesszuk, mert a hivok
    (lablec, fejlec) amugy is azt olvassak -- igy nem keletkezik masodik
    fogalom ugyanarra.
  */
  /*
    KET SZINT MEGY AT, NEM EGY -- ES EZ SEM UJ LEKERDEZES.

    A fejlec panelje a mai UNAS bolt mega-menujenek alakjat koveti: a
    CSOPORT-FEJLEC egy kozvetlen gyerek, alatta pedig annak a sajat gyerekei
    allnak. Ehhez harom szint kell (gyoker, gyerek, unoka), es mind a harom
    ITT VAN mar a `mind` tombben.

    A FA ALAKJA MERVE (2026-09-09, a kitelepitett kategoria-lapokrol, mert a
    Medusa kulcs nem jut ki a bongeszobe):

        gyoker          gyerek   unoka
        Termekek            23      86
        Halak               15       0
        Gerinctelenek        7       0
        Korallok             1       1

    A meres a lap sajat linkjeit szamolta, es MINDEN kategoria-lapon all egy
    allando SZULO-hivatkozas -- azt le kellett vonni. A kontroll a mai bolt
    kepernyokepe volt: az "Eledelek" ott is pontosan harom elemet mutat
    (Haleledelek, Fagyasztott eledelek, Koralltapok), a "Futes/Hutes" pedig
    fejlecet elem nelkul. Mindketto egyezik.

    AMI EBBOL KOVETKEZIK AZ ELRENDEZESRE: a csoportos alak CSAK a Termekek
    alatt ertelmes. A masik harom gyokernek nincs unokaja, tehat ott a panel
    csupa fejlec es nulla elem lenne. A komponens ezert az ADATBOL dont, nem
    a gyoker NEVEBOL: egy beegetett "ha Termekek" a katalogus elso
    atrendezesenel csendben rossz lapot adna.
  */
  const gyokerek = gyokerekKetSzintel(mind)

  const vane = await Promise.all(
    gyokerek.map(async (gy) => {
      const {
        response: { count },
      } = await listProducts({
        regionId,
        queryParams: {
          limit: 1,
          category_id: leszarmazottAzonositok(mind, gy.id),
        },
      })
      return count > 0
    }),
  )

  /*
    A SORREND A BOLT SAJAT `rank` MEZOJEBOL JON, NEM EGY BEEGETETT LISTABOL.

    Merve a teszt bolton (2026-09-08): a hat gyoker rangja 0-tol 5-ig fut, es
    pontosan azt a sorrendet adja, amit a lablec-spec atmenetikent felsorolt:

        0 Termékek   1 Gerinctelenek   2 Halak   3 Korallok
        4 Shop 'n the Shop            5 Édesvízi akvarisztika

    Vagyis a sorrendhez nem kell kulon dontes: a boltos mar beallitotta, es a
    ket kizart gyoker amugy is a vegen all. Ha a boltban atrendezik, a menu es
    a lablec vele mozdul.

    A `?? 0` azert kell, mert a mezo elvben hianyozhat; olyankor a nev szerinti
    masodlagos rendezes ad kiszamithato sorrendet a veletlen helyett.
  */
  return {
    gyokerek: gyokerek
      .filter((_, i) => vane[i])
      .sort((a, b) => {
        const ra = (a as { rank?: number | null }).rank ?? 0
        const rb = (b as { rank?: number | null }).rank ?? 0
        return ra !== rb ? ra - rb : a.name.localeCompare(b.name, "hu")
      }),
    /*
      A TERKEP A TELJES LISTABOL KESZUL, NEM A MEGSZURT GYOKEREKBOL. Az
      egyedisegnek a KATALOGUS az alapja: ha csak a menuben latszo neveket
      neznenk, egy nev "egyedinek" latszana attol, hogy a mellette allo
      utkozo tarsa nem fer be a menube.
    */
    nevek: megjelenitendoNevek(mind),
  }
}
