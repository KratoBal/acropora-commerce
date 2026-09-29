import { HttpTypes } from "@medusajs/types"

import { listProducts, listProductsWithSort } from "@lib/data/products"
import { TERMEKLISTA_MEZOK } from "@lib/util/termeklista-mezok"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import CommerceRendezes from "./rendezes"
import CommerceTermekKartya from "./termek-kartya"

/**
 * A COMMERCE KATEGORIALAP (P2, 2026-09-29), a handoff (262:3) CANONICAL
 * "Equipment category" kerete szerint: 117:30.
 *
 * Csak a Commerce (muszaki) kategoriakat rajzolja; a korall, hal es
 * gerinctelen lap a P3, az a regi sablonon marad. A fejlec (P1b) a lapon
 * kivul all, ehhez a lap nem nyul.
 *
 * A keret sorrendje: morzsamenu (117:42), bevezeto (117:44), gyors-kategoria
 * sav a rendezessel (117:55), szuro-oszlop es talalati racs (117:74). Ami a
 * keretbol adat vagy funkcio hijan kimaradt, a `docs/P2-CATEGORY.md` sorolja
 * fel, az okaval.
 */
export const LAP_MERET = 18

type Props = {
  category: HttpTypes.StoreProductCategory
  nevek?: Map<string, string>
  sortBy?: SortOptions
  page: number
  countryCode: string
  optionValueIds?: OptionValueIds
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

/** A kovetkezo lap cime: a rendezes es az opcio-szurok megmaradnak. */
export function kovetkezoLap(
  page: number,
  sortBy?: SortOptions,
  optionValueIds?: OptionValueIds,
): string {
  const params = new URLSearchParams()
  if (sortBy) params.set("sortBy", sortBy)
  for (const id of optionValueIds ?? []) params.append("optionValueIds", id)
  params.set("page", String(page + 1))
  return `?${params.toString()}`
}

export default async function CommerceKategoriaLap({
  category,
  nevek,
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: Props) {
  const nev = (elem: { id?: string | null; name?: string | null }) =>
    (elem.id ? nevek?.get(elem.id) : undefined) ?? (elem.name ?? "").trim()

  const gyerekek = category.category_children ?? []
  const felmenok: HttpTypes.StoreProductCategory[] = []
  for (let most = category.parent_category; most; most = most.parent_category) {
    felmenok.unshift(most)
  }

  const [
    {
      response: { products, count },
    },
    szamok,
  ] = await Promise.all([
    listProductsWithSort({
      page,
      queryParams: {
        category_id: [category.id],
        limit: LAP_MERET,
        fields: `${TERMEKLISTA_MEZOK}*collection`,
      },
      sortBy,
      countryCode,
      optionValueIds,
    }),
    alkategoriaSzamok(gyerekek, countryCode),
  ])

  /*
    AZ URES ALKATEGORIA NEM KERUL SE A SAVBA, SE A SZUROBE: ures lapra vinne
    (a stage-en ilyen a "biOrb" es a "Használt termékek OUTLET áron", 0-0
    termekkel). Ahol a szamlalas nem sikerult, a gyerek marad, szam nelkul.
  */
  const lathatoGyerekek = gyerekek
    .map((gyerek, index) => ({ gyerek, szam: szamok[index] }))
    .filter(({ szam }) => szam !== 0)

  const eddig = Math.min(page * LAP_MERET, count)
  const elso = count === 0 ? 0 : (page - 1) * LAP_MERET + 1
  const tovabbi = count > page * LAP_MERET
  const rendezes = sortBy ?? "created_at"

  return (
    <div
      className="bg-acr-shell font-acr-sans"
      data-testid="commerce-kategoria-lap"
    >
      {/* MORZSAMENU (117:42): nagybetus, 14 px, a szovegszinben. */}
      <nav
        aria-label="Morzsamenü"
        className="mx-auto flex min-h-[58px] max-w-[1440px] items-center px-4 small:px-[80px]"
      >
        <ol className="flex flex-wrap items-center gap-x-2 text-[14px] uppercase leading-[22px] text-acr-slate">
          {felmenok.map((felmeno) => (
            <li key={felmeno.id} className="flex items-center gap-2">
              <LocalizedClientLink
                href={`/categories/${felmeno.handle}`}
                className="hover:text-acr-ink"
              >
                {nev(felmeno)}
              </LocalizedClientLink>
              <span aria-hidden="true">/</span>
            </li>
          ))}
          <li aria-current="page">{nev(category)}</li>
        </ol>
      </nav>

      {/* BEVEZETO (117:44). A felulcim, a leiras es a "Rendszerem beállítása"
          seged adat es funkcio hijan nem jelenik meg; a leiras, ha egyszer
          lesz, igen. */}
      <header className="mx-auto max-w-[1440px] px-4 pb-10 pt-8 small:px-[56px] small:pb-[44px] small:pt-[52px]">
        <h1
          className="text-[40px] font-light leading-[44px] tracking-[-1px] text-acr-ink small:text-[58px] small:leading-[62px]"
          data-testid="category-page-title"
        >
          {nev(category)}
        </h1>
        {category.description ? (
          <p className="mt-[18px] max-w-[960px] text-[18px] leading-[30px] text-acr-slate">
            {category.description}
          </p>
        ) : null}
      </header>

      {/* GYORS-KATEGORIAK ES RENDEZES (117:55), a `mist` savon. */}
      <div className="bg-acr-mist">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-[18px] small:flex-row small:items-center small:justify-between small:px-[56px]">
          <ul
            className="flex min-w-0 gap-2 overflow-x-auto"
            aria-label="Alkategóriák"
            data-testid="gyors-kategoriak"
          >
            <li className="shrink-0">
              <span
                className="flex h-[42px] items-center bg-acr-navy px-6 text-[14px] font-medium text-acr-white"
                aria-current="page"
              >
                Összes
              </span>
            </li>
            {lathatoGyerekek.map(({ gyerek }) => (
              <li key={gyerek.id} className="shrink-0">
                <LocalizedClientLink
                  href={`/categories/${gyerek.handle}`}
                  className="flex h-[44px] items-center border border-acr-line bg-acr-white px-6 text-[14px] font-medium text-acr-ink hover:border-acr-slate"
                >
                  {nev(gyerek)}
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-[10px]">
            <span
              className="text-[14px] leading-[22px] text-acr-slate"
              data-testid="kategoria-termekszam"
            >
              {count} termék
            </span>
            <CommerceRendezes sortBy={rendezes} />
          </div>
        </div>
      </div>

      {/* SZUROK ES TALALATOK (117:74). */}
      <div className="mx-auto grid max-w-[1440px] gap-7 px-4 pb-16 pt-8 small:grid-cols-[250px_minmax(0,1fr)] small:px-[56px]">
        <aside
          className="flex flex-col gap-[18px] self-start border border-acr-line bg-acr-white p-[18px]"
          aria-label="Szűrés"
          data-testid="kategoria-szurok"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] leading-[34px] tracking-[-0.2px] text-acr-ink">
              Szűrés
            </h2>
            {sortBy || (optionValueIds?.length ?? 0) > 0 ? (
              <LocalizedClientLink
                href={`/categories/${category.handle}`}
                className="text-[14px] text-acr-ocean"
              >
                Törlés
              </LocalizedClientLink>
            ) : null}
          </div>
          {/* A szuro kereso (117:79) a bolt keresojere kuld: a kategorian
              beluli kereses a kereses PR-javal jon. */}
          <form
            action={`/${countryCode}/store`}
            method="get"
            className="border border-acr-line bg-acr-mist p-3"
          >
            <label className="sr-only" htmlFor="kategoria-kereso">
              Keresés termék vagy márka alapján
            </label>
            <input
              id="kategoria-kereso"
              type="search"
              name="q"
              placeholder="Keresés termék vagy márka alapján…"
              className="w-full bg-transparent text-[14px] leading-[22px] text-acr-ink outline-none placeholder:text-acr-slate"
            />
          </form>
          {lathatoGyerekek.length > 0 ? (
            /*
              MOBILON (a `small` alatt) A KATEGORIA SZAKASZ REJTVE: ugyanez a
              navigacio a gyors-kategoria savban vizszintesen gorgetheto, es a
              21 soros lista a termekek ele tolna (mervel 390-en). Figma mobil
              kerete ehhez a laphoz nincs; ez a mi reszponziv szabalyunk.
            */
            <section className="hidden flex-col gap-2 border-t border-acr-line pt-[13px] small:flex">
              <h3 className="text-[16px] font-medium leading-[26px] text-acr-ink">
                Kategória
              </h3>
              <ul
                className="flex flex-col gap-2"
                data-testid="szuro-kategoriak"
              >
                {lathatoGyerekek.map(({ gyerek, szam }) => (
                  <li key={gyerek.id}>
                    <LocalizedClientLink
                      href={`/categories/${gyerek.handle}`}
                      className="flex items-center justify-between gap-2 text-[14px] leading-[22px] text-acr-slate hover:text-acr-ink"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-[15px] w-[15px] shrink-0 border border-acr-slate bg-acr-mist"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">{nev(gyerek)}</span>
                      </span>
                      {szam !== null ? (
                        <span className="shrink-0">{szam}</span>
                      ) : null}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        <section aria-label="Termékek" id="category-products">
          {products.length === 0 ? (
            <p
              className="text-[14px] text-acr-slate"
              data-testid="category-products-empty"
            >
              Ebben a kategóriában még nincs megjeleníthető termék.
            </p>
          ) : (
            <ul
              className="grid gap-x-5 gap-y-[26px] xsmall:grid-cols-2 medium:grid-cols-3"
              data-testid="category-products-list"
            >
              {products.map((product) => (
                <li key={product.id}>
                  <CommerceTermekKartya product={product} />
                </li>
              ))}
            </ul>
          )}

          {/* TOVABBI TERMEKEK (117:359). A gomb a kovetkezo lapra visz; a
              szam azt mondja, hanyadik termekeknel tartunk, nem azt, hogy
              mind itt all. */}
          {count > 0 ? (
            <div className="mt-[26px] flex flex-col items-center gap-[10px]">
              <p
                className="text-[14px] leading-[22px] text-acr-slate"
                data-testid="kategoria-hol-tartunk"
              >
                {page === 1 ? eddig : `${elso}–${eddig}`} / {count} termék
              </p>
              {tovabbi ? (
                <a
                  href={kovetkezoLap(page, sortBy, optionValueIds)}
                  className="flex h-[54px] w-full max-w-[320px] items-center justify-center border border-acr-line bg-acr-white px-8 text-[15px] font-medium text-acr-ink"
                  data-testid="category-more-products"
                >
                  További termékek betöltése
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
