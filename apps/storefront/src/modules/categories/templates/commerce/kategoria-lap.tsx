import { HttpTypes } from "@medusajs/types"

import { listCategories } from "@lib/data/categories"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { listProducts, listProductsWithSort } from "@lib/data/products"
import {
  MarkaSor,
  markaSorok,
  markaValtas,
  szuroCim,
} from "@lib/util/marka-szuro"
import { TERMEKLISTA_MEZOK } from "@lib/util/termeklista-mezok"
import {
  AZONOSITO_HATAR,
  tartasiSorok,
  tartasiSzuroAktiv,
  URES_TARTASI_SZURO,
  type TartasiSzuro,
} from "@lib/util/tartasi-szuro"
import { szuroLinkRel } from "@lib/seo/szuro-link"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import type { CategoryPageKind } from "../category-page-data"
import ListaLap, { LAP_MERET } from "./lista-lap"
import TartasiSzuroSzakasz from "./tartasi-szuro-szakasz"

/**
 * A COMMERCE KATEGORIALAP (P2, 2026-09-29), a handoff (262:3) CANONICAL
 * "Equipment category" kerete szerint: 117:30.
 *
 * A muszaki kategoriak mellett (2026-11-01 ota) az elo allat agat is ez
 * rajzolja (korall, hal, gerinctelen): ugyanaz a vaz, a `kind` csak ket dolgot
 * valt: a kartyat (`EloAllatKartya`) es az atvetel sort a bevezeto alatt. A
 * regi elo allat sablon (terv- tokenek, 12-es lapozo) megszunt. A fejlec (P1b)
 * a lapon kivul all, ehhez a lap nem nyul.
 *
 * A keret sorrendje: morzsamenu (117:42), bevezeto (117:44), gyors-kategoria
 * sav a rendezessel (117:55), szuro-oszlop es talalati racs (117:74). Ami a
 * keretbol adat vagy funkcio hijan kimaradt, a `docs/P2-CATEGORY.md` sorolja
 * fel, az okaval.
 */
export { LAP_MERET }

type Props = {
  category: HttpTypes.StoreProductCategory
  nevek?: Map<string, string>
  sortBy?: SortOptions
  page: number
  countryCode: string
  optionValueIds?: OptionValueIds
  /** A kivalasztott markak (gyujtemeny-azonositok), a cim `marka` parameterei. */
  markak?: string[]
  /** Az elo allat lap tartasi szuroje (V2.2 S5); a muszaki lap nem olvassa. */
  tartas?: TartasiSzuro
  /** Muszaki (alap) vagy elo allat: a kartyat es az atvetel sort donti el. */
  kind?: CategoryPageKind
}

/** Egy lap a marka-szamlalashoz, es a vedelem felso hatara (3000 termek). */
const MARKA_LAP = 100
const MARKA_MAX_LAP = 30

/**
 * A KATEGORIA MARKAI, DARABSZAMMAL (117:108). Kategoria nelkul: a bolt mind.
 *
 * A Medusa nem ad facet-szamot, tehat a kategoria MINDEN termekenek a
 * gyujtemenyet le kell kerni, szuk mezolistaval. Merve 2026-09-29, a
 * Termékek agon (1278 termek, 13 lap): egymas utan 1,98 mp a kontenerbol;
 * itt a lapok parhuzamosan mennek, es a lista-lekeres gyorsitotaraban
 * maradnak. Egy sikertelen lekeres nem torheti el a lapot: akkor nincs
 * Márka szakasz.
 */
export async function kategoriaMarkai(
  categoryId: string | undefined,
  countryCode: string,
): Promise<MarkaSor[]> {
  const lap = (pageParam: number) =>
    listProducts({
      pageParam,
      queryParams: {
        ...(categoryId ? { category_id: [categoryId] } : {}),
        limit: MARKA_LAP,
        fields: "id,collection.id,collection.title",
      },
      countryCode,
    })
  try {
    const elso = await lap(1)
    const lapok = Math.min(
      Math.ceil(elso.response.count / MARKA_LAP),
      MARKA_MAX_LAP,
    )
    const tobbi = await Promise.all(
      Array.from({ length: Math.max(lapok - 1, 0) }, (_, i) => lap(i + 2)),
    )
    return markaSorok([
      ...elso.response.products,
      ...tobbi.flatMap(({ response }) => response.products),
    ])
  } catch {
    return []
  }
}

/**
 * AZ ALKATEGORIAK DARABSZAMA, gyerekenkent egy szamlalo lekeressel.
 *
 * A bolt a termeket az OSEI kategoriaiba is besorolja (a Medusa a termek
 * kategoriai kozt az osoket is visszaadja), tehat egy gyerek kozvetlen
 * szama a teljes aga. Egy sikertelen szamlalas nem torheti el a lapot: akkor
 * a sor szam nelkul all.
 */
async function alkategoriaSzamok(
  gyerekek: HttpTypes.StoreProductCategory[],
  countryCode: string,
): Promise<(number | null)[]> {
  return Promise.all(
    gyerekek.map((gyerek) =>
      listProducts({
        queryParams: { category_id: [gyerek.id], limit: 1, fields: "id" },
        countryCode,
      })
        .then(({ response }) => response.count)
        .catch(() => null),
    ),
  )
}

/** A kovetkezo lap cime: a rendezes, az opcio-szurok es a markak megmaradnak. */
export function kovetkezoLap(
  page: number,
  sortBy?: SortOptions,
  optionValueIds?: OptionValueIds,
  markak?: string[],
  tartas?: TartasiSzuro,
): string {
  return szuroCim({ sortBy, optionValueIds, markak, tartas, page: page + 1 })
}

/**
 * A LEVEL-KATEGORIA TESTVEREI (P2, a 162:117 szerint).
 *
 * A vilagitas kerete a gyors savban a TESTVER-kategoriakat mutatja, az
 * aktualisat kiemelve. Nalunk egy gyerek nelkuli kategorian a sav kulonben
 * csak az "Összes"-t mutatna, zsakutcakent. Gyerekes kategorianal, gyoker
 * kategorianal, vagy ha a lekeres elbukik: nincs testver.
 */
async function testverek(
  category: HttpTypes.StoreProductCategory,
): Promise<HttpTypes.StoreProductCategory[]> {
  const szulo = category.parent_category
  if (!szulo || (category.category_children?.length ?? 0) > 0) return []
  return listCategories({
    parent_category_id: szulo.id,
    fields: "id,name,handle",
  }).catch(() => [])
}

export type SavElem = {
  kategoria: HttpTypes.StoreProductCategory
  szam: number | null
  aktiv: boolean
}

/**
 * A GYORS SAV ELEMEI. Gyerekes kategorian a gyerekek (elottuk az "Összes"),
 * level-kategorian a testverek. Az ures kategoria kimarad, kiveve az
 * aktualisat: arrol a latogato epp most jott.
 */
export function savElemek(
  category: HttpTypes.StoreProductCategory,
  gyerekek: HttpTypes.StoreProductCategory[],
  testverLista: HttpTypes.StoreProductCategory[],
  szamok: (number | null)[],
): { mod: "gyerekek" | "testverek"; elemek: SavElem[] } {
  const mod =
    gyerekek.length > 0 || testverLista.length === 0 ? "gyerekek" : "testverek"
  const lista = mod === "gyerekek" ? gyerekek : testverLista
  return {
    mod,
    elemek: lista
      .map((kategoria, index) => ({
        kategoria,
        szam: szamok[index] ?? null,
        aktiv: kategoria.id === category.id,
      }))
      .filter(({ szam, aktiv }) => aktiv || szam !== 0),
  }
}

export default async function CommerceKategoriaLap({
  category,
  nevek,
  sortBy,
  page,
  countryCode,
  optionValueIds,
  markak = [],
  tartas,
  kind = "technical",
}: Props) {
  // the page's language is its path segment's (`hu`, `en-hu`)
  const t = translator(localeOf(countryCode))
  const nev = (elem: { id?: string | null; name?: string | null }) =>
    (elem.id ? nevek?.get(elem.id) : undefined) ?? (elem.name ?? "").trim()

  const gyerekek = category.category_children ?? []
  const felmenok: HttpTypes.StoreProductCategory[] = []
  for (let most = category.parent_category; most; most = most.parent_category) {
    felmenok.unshift(most)
  }

  /*
    A TARTASI SZURO (V2.2 S5), CSAK ELO ALLAT AGON. A bolt a kategoria termekeibol szamolja a talalatokat
    (`/store/husbandry-filter`), a lista ezeket kapja `id` szurokent, a tobbi szuro (marka, opcio, rendezes) mellett.
    Ami nem all, az kimondva all: a bolt nem valaszol vagy a kategoria tul nagy (`complete: false`) -> nincs tartasi
    szakasz, es egy aktiv szuro helyett egy mondat; tul sok talalat -> a szuro nem hat, es ezt egy mondat mondja.
    Az "ellenorzes alatt" allat a szurt listaban NEM szerepel (nem tudjuk, illik-e), de a szamuk ott all a lista
    felett, egy linkkel a szuro nelkuli listara (murena, 46095: nem eshet ki csendben).
  */
  const tartasValasz =
    kind === "livestock"
      ? // KESLELTETETT IMPORT: a lap segedfuggvenyeit (`kovetkezoLap`, `kategoriaMarkai`) a valogatas, a gyujtemeny
        // es a bolt listaja is importalja, es azok tesztjei ezt a szerver-modult nem ismerik; csak az elo allat ag hivja
        await (
          await import("@lib/data/tartasi-szuro")
        ).tartasiSzuroValasz(category.id, tartas ?? URES_TARTASI_SZURO)
      : null
  const tartasHasznalhato = Boolean(tartasValasz?.complete)
  const tartasKert = kind === "livestock" && tartasiSzuroAktiv(tartas)
  const tartasTalalat =
    tartasKert && tartasHasznalhato ? (tartasValasz?.product_ids ?? []) : null
  const tulSok = (tartasTalalat?.length ?? 0) > AZONOSITO_HATAR
  const tartasIdk = tartasTalalat && !tulSok ? tartasTalalat : null

  const [
    {
      response: { products, count },
    },
    { lista: testverLista, szamok },
    markaLista,
  ] = await Promise.all([
    // ures talalat-listanal nincs lekeres: egy ures `id` szuro a Medusan nem szur, hanem mindent hozna
    tartasIdk?.length === 0
      ? { response: { products: [], count: 0 } }
      : listProductsWithSort({
          page,
          queryParams: {
            category_id: [category.id],
            limit: LAP_MERET,
            fields: `${TERMEKLISTA_MEZOK}*collection`,
            ...(markak.length > 0 ? { collection_id: markak } : {}),
            ...(tartasIdk ? { id: tartasIdk } : {}),
          },
          sortBy,
          countryCode,
          optionValueIds,
        }),
    testverek(category).then(async (lista) => ({
      lista,
      szamok: await alkategoriaSzamok(
        gyerekek.length > 0 ? gyerekek : lista,
        countryCode,
      ),
    })),
    kategoriaMarkai(category.id, countryCode),
  ])
  const markaLink = (id: string) =>
    szuroCim({
      sortBy,
      optionValueIds,
      markak: markaValtas(markak, id),
      tartas,
    })
  const tartasLink = (uj: TartasiSzuro) =>
    szuroCim({ sortBy, optionValueIds, markak, tartas: uj })
  const tartasNelkul = szuroCim({ sortBy, optionValueIds, markak })
  const tartasMegjegyzes = !tartasKert ? null : !tartasHasznalhato ? (
    t("category.husbandryUnavailable")
  ) : tulSok ? (
    t("category.husbandryTooMany")
  ) : tartasValasz && tartasValasz.unchecked > 0 ? (
    <>
      {tartasValasz.unchecked === 1
        ? t("category.husbandryUncheckedOne")
        : t("category.husbandryUnchecked", {
            count: tartasValasz.unchecked,
          })}{" "}
      <a
        href={tartasNelkul}
        rel={szuroLinkRel(tartasNelkul)}
        className="text-acr-ocean"
        data-testid="szuro-tartas-mind"
      >
        {t("category.husbandryShowAll")}
      </a>
    </>
  ) : null

  /*
    AZ URES ALKATEGORIA NEM KERUL SE A SAVBA, SE A SZUROBE: ures lapra vinne
    (a stage-en ilyen a "biOrb" es a "Használt termékek OUTLET áron", 0-0
    termekkel). Ahol a szamlalas nem sikerult, a gyerek marad, szam nelkul.
  */
  const sav = savElemek(category, gyerekek, testverLista, szamok)
  const lathatoGyerekek =
    sav.mod === "gyerekek"
      ? sav.elemek.map(({ kategoria, szam }) => ({ gyerek: kategoria, szam }))
      : []

  const tovabbi = count > page * LAP_MERET

  return (
    <ListaLap
      t={t}
      morzsa={[
        ...felmenok.map((felmeno) => ({
          id: felmeno.id,
          nev: nev(felmeno),
          href: `/categories/${felmeno.handle}`,
        })),
        { id: category.id, nev: nev(category) },
      ]}
      cim={nev(category)}
      leiras={category.description}
      eloAllat={kind === "livestock"}
      kezdolapStilus
      sav={{
        osszes: sav.mod === "gyerekek",
        elemek: sav.elemek.map(({ kategoria, aktiv }) => ({
          id: kategoria.id,
          nev: nev(kategoria),
          href: `/categories/${kategoria.handle}`,
          aktiv,
        })),
      }}
      count={count}
      page={page}
      rendezes={sortBy ?? "created_at"}
      szuroAktiv={
        Boolean(sortBy) ||
        (optionValueIds?.length ?? 0) > 0 ||
        markak.length > 0 ||
        tartasKert
      }
      szuroNyitva={markak.length > 0 || tartasKert}
      torlesHref={`/categories/${category.handle}`}
      keresoAction={`/${countryCode}/store`}
      kategoriak={lathatoGyerekek.map(({ gyerek, szam }) => ({
        id: gyerek.id,
        nev: nev(gyerek),
        href: `/categories/${gyerek.handle}`,
        szam,
      }))}
      markaLista={markaLista}
      markak={markak}
      markaLink={markaLink}
      tartasiSzakasz={
        tartasValasz && tartasHasznalhato ? (
          <TartasiSzuroSzakasz
            sorok={tartasiSorok(tartasValasz, tartas ?? URES_TARTASI_SZURO)}
            link={(sor) => tartasLink(sor.szuro)}
            t={t}
          />
        ) : null
      }
      szuroMegjegyzes={tartasMegjegyzes}
      products={products}
      eloAllatKartya={() => kind === "livestock"}
      uresSzoveg={t("category.empty")}
      kovetkezoHref={
        tovabbi
          ? kovetkezoLap(page, sortBy, optionValueIds, markak, tartas)
          : null
      }
    />
  )
}
