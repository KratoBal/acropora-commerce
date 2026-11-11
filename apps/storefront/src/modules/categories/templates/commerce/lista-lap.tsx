import type { HttpTypes } from "@medusajs/types"
import type { ReactNode } from "react"

import type { Translate } from "@lib/i18n/dictionary"
import { szuroLinkRel } from "@lib/seo/szuro-link"
import { LAP_MERET } from "@lib/util/lap-meret"
import type { MarkaSor } from "@lib/util/marka-szuro"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import EloAllatKartya from "./elo-allat-kartya"
import MarkaLista from "./marka-lista"
import CommerceRendezes from "./rendezes"
import CommerceTermekKartya from "./termek-kartya"

export { LAP_MERET }

export type ListaMorzsaElem = {
  id: string
  nev: string
  /** Missing on the last element: the page the visitor is on. */
  href?: string
}

export type ListaSavElem = {
  id: string
  nev: string
  href: string
  aktiv: boolean
}

export type ListaKategoriaSor = {
  id: string
  nev: string
  href: string
  szam: number | null
}

export type ListaLapProps = {
  t: Translate
  morzsa: ListaMorzsaElem[]
  cim: string
  leiras?: string | null
  /** Keep the line breaks of the intro text (a curated selection's own text). */
  leirasSortoressel?: boolean
  /**
   * The page's world: the live-animal title face, the pickup note under the
   * intro and the two-column live-animal grid. A list that mixes both worlds
   * (all products) passes false and chooses the card per product.
   */
  eloAllat: boolean
  /** The quick chips; "all" first when `osszes`, the active chip filled. */
  sav: { osszes: boolean; elemek: ListaSavElem[] }
  count: number
  page: number
  /**
   * The sort the select shows; null leaves the select out (a list in a fixed
   * order, such as a curated selection, has nothing to sort).
   */
  rendezes: SortOptions | null
  /** Any filter or sort in the address: the "clear" link shows. */
  szuroAktiv: boolean
  /**
   * The filter panel renders OPEN on a phone: only what the PANEL holds (a brand, a husbandry group) counts. The sort and
   * the option filter are NOT here: the sort sits in the quick-category strip, outside the panel, and a sort-only address
   * must not push the brands and the husbandry groups above the products on a 390 px screen (barracuda on commerce #740).
   * `szuroAktiv` (any filter or sort: the clear link) stays the clear link's.
   */
  szuroNyitva: boolean
  torlesHref: string
  /** The search form's target: the shop's search page. */
  keresoAction: string
  /** The sub-category list of the filter column (hidden on a phone). */
  kategoriak: ListaKategoriaSor[]
  markaLista: MarkaSor[]
  markak: string[]
  markaLink: (id: string) => string
  /** The live-animal category's husbandry filter groups, after the brands (V2.2 S5). */
  tartasiSzakasz?: ReactNode
  /** A sentence over the grid about the filter (unchecked animals, a filter not applied). */
  szuroMegjegyzes?: ReactNode
  products: HttpTypes.StoreProduct[]
  /** The card per product: the live-animal one or the technical one. */
  eloAllatKartya: (product: HttpTypes.StoreProduct) => boolean
  uresSzoveg: string
  /**
   * The filter column (search, categories, brands). A list with nothing to
   * filter by (one brand's products) passes false: the column goes and the
   * grid takes the full width.
   */
  szuro?: boolean
  /** The address of the next page; empty when this is the last. */
  kovetkezoHref: string | null
  testId?: string
}

/**
 * THE LIST PAGE (P2, 117:30; shared since 2026-11-03).
 *
 * The category page's frame without its data: crumbs, intro, the quick chips
 * with the sort, the filter column and the result grid with the "load more"
 * link. The category page (`kategoria-lap.tsx`) and the all-products list
 * fetch their own data and hand it over; nothing here reads the shop. The
 * order and the classes are the category page's, moved without a change.
 */
export default function ListaLap({
  t,
  morzsa,
  cim,
  leiras,
  leirasSortoressel = false,
  eloAllat,
  sav,
  count,
  page,
  rendezes,
  szuroAktiv,
  szuroNyitva,
  torlesHref,
  keresoAction,
  kategoriak,
  markaLista,
  markak,
  markaLink,
  tartasiSzakasz,
  szuroMegjegyzes,
  products,
  eloAllatKartya,
  uresSzoveg,
  szuro = true,
  kovetkezoHref,
  testId = "commerce-kategoria-lap",
}: ListaLapProps) {
  const markaNev = new Map(markaLista.map((sor) => [sor.id, sor.nev]))
  const eddig = Math.min(page * LAP_MERET, count)
  const elso = count === 0 ? 0 : (page - 1) * LAP_MERET + 1

  return (
    <div className="bg-acr-shell font-acr-sans" data-testid={testId}>
      {/* MORZSAMENU (117:42): nagybetus, 14 px, a szovegszinben. */}
      <nav
        aria-label={t("category.breadcrumbLabel")}
        className="mx-auto flex min-h-[58px] max-w-[1440px] items-center px-4 small:px-[80px]"
      >
        <ol className="flex flex-wrap items-center gap-x-2 text-[14px] uppercase leading-[22px] text-acr-slate">
          {morzsa.map((elem) =>
            elem.href ? (
              <li key={elem.id} className="flex items-center gap-2">
                <LocalizedClientLink
                  href={elem.href}
                  className="hover:text-acr-ink"
                >
                  {elem.nev}
                </LocalizedClientLink>
                <span aria-hidden="true">/</span>
              </li>
            ) : (
              <li key={elem.id} aria-current="page">
                {elem.nev}
              </li>
            ),
          )}
        </ol>
      </nav>

      {/* BEVEZETO (117:44). A felulcim, a leiras es a "Rendszerem beállítása"
          seged adat es funkcio hijan nem jelenik meg; a leiras, ha egyszer
          lesz, igen. */}
      <header className="mx-auto max-w-[1440px] px-4 pb-10 pt-8 small:px-[56px] small:pb-[44px] small:pt-[52px]">
        <h1
          className={
            "text-[40px] leading-[44px] text-acr-ink small:text-[58px] small:leading-[62px] " +
            (eloAllat
              ? "font-kiemelt font-normal tracking-[-0.01em]"
              : "font-light tracking-[-1px]")
          }
          data-testid="category-page-title"
        >
          {cim}
        </h1>
        {leiras ? (
          <p
            className={
              "mt-[18px] max-w-[960px] text-[18px] leading-[30px] text-acr-slate" +
              (leirasSortoressel ? " whitespace-pre-line" : "")
            }
          >
            {leiras}
          </p>
        ) : null}
        {eloAllat ? (
          /* AZ ATVETEL SOR: elo allatot csak szemelyesen adunk at. A regi
              sablon jobb oldali dobozabol lett, a bevezeto alatt all. */
          <aside
            className="mt-6 max-w-[560px] border border-acr-line bg-acr-white px-5 py-4"
            data-testid="category-helper-livestock"
          >
            <p className="text-[10px] font-medium uppercase leading-[12px] tracking-[1.8px] text-acr-slate">
              {t("category.pickupEyebrow")}
            </p>
            <h2 className="mt-2 text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-acr-ink">
              {t("category.pickupTitle")}
            </h2>
            <p className="mt-1 text-[14px] leading-[22px] text-acr-slate">
              {t("category.pickupText")}
            </p>
          </aside>
        ) : null}
      </header>

      {/* GYORS-KATEGORIAK ES RENDEZES (117:55), a `mist` savon. */}
      <div className="bg-acr-mist">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-[18px] small:flex-row small:items-center small:justify-between small:px-[56px]">
          {sav.osszes || sav.elemek.length > 0 ? (
            <ul
              className="flex min-w-0 gap-2 overflow-x-auto"
              aria-label={t("category.subcategories")}
              data-testid="gyors-kategoriak"
            >
              {sav.osszes ? (
                <li className="shrink-0">
                  <span
                    className="flex h-[42px] items-center bg-acr-navy px-6 text-[14px] font-medium text-acr-white"
                    aria-current="page"
                  >
                    {t("category.all")}
                  </span>
                </li>
              ) : null}
              {sav.elemek.map((elem) => (
                <li key={elem.id} className="shrink-0">
                  {elem.aktiv ? (
                    <span
                      className="flex h-[42px] items-center bg-acr-navy px-6 text-[14px] font-medium text-acr-white"
                      aria-current="page"
                    >
                      {elem.nev}
                    </span>
                  ) : (
                    <LocalizedClientLink
                      href={elem.href}
                      className="flex h-[44px] items-center border border-acr-line bg-acr-white px-6 text-[14px] font-medium text-acr-ink hover:border-acr-slate"
                    >
                      {elem.nev}
                    </LocalizedClientLink>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div />
          )}
          <div className="flex shrink-0 items-center gap-[10px]">
            <span
              className="text-[14px] leading-[22px] text-acr-slate"
              data-testid="kategoria-termekszam"
            >
              {t(
                count === 1
                  ? "category.productCountOne"
                  : "category.productCount",
                { count },
              )}
            </span>
            {rendezes ? <CommerceRendezes sortBy={rendezes} /> : null}
          </div>
        </div>
      </div>

      {/* SZUROK ES TALALATOK (117:74). */}
      <div
        className={
          "mx-auto max-w-[1440px] px-4 pb-16 pt-8 small:px-[56px] " +
          (szuro ? "grid gap-7 small:grid-cols-[250px_minmax(0,1fr)]" : "")
        }
      >
        {szuro ? (
          <aside
            className="relative flex flex-col gap-[18px] self-start border border-acr-line bg-acr-white p-[18px]"
            aria-label={t("category.filter")}
            data-testid="kategoria-szurok"
          >
            {/*
              A SZURO TELEFONON OSSZECSUKHATO (V2.2 S5 melle; acrobot 46596, a mobil nezet). A `small` (1024) alatt a szuro
              doboz csak a fejlecet es a "Szurok" gombot mutatja; a tartalom (kereso, markak, tartasi csoportok) a gomb
              mogott all, kulonben a harom tartasi csoport es a markak a termekek ele tolnak egy 390 szeles kepernyon.
              JS NELKUL MUKODIK (a lap ISR): a gomb egy jelolonegyzet cimkeje, a tartalom `peer-checked`. Az `small:`-tol
              a jelolo es a gomb nem letezik, a tartalom mindig latszik, mint eddig. Ha a PANELBAN
              valasztott ertek aktiv (`szuroNyitva`: marka, tartasi csoport), a panel NYITVA rajzolodik, hogy a kivalasztott
              ertekek a betoltes utan is lathatoak legyenek (a szuro linkjei oldalt toltenek ujra). A rendezes NEM nyitja:
              az a gyors-kategoria savban all, a panelen kivul (barracuda, #740).
            */}
            <input
              id="kategoria-szurok-nyit"
              type="checkbox"
              defaultChecked={szuroNyitva}
              aria-controls="kategoria-szurok-tartalom"
              className="peer sr-only small:hidden"
              data-testid="szurok-kapcsolo"
            />
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] leading-[34px] tracking-[-0.2px] text-acr-ink">
                {t("category.filter")}
              </h2>
              {szuroAktiv ? (
                <LocalizedClientLink
                  href={torlesHref}
                  className="text-[14px] text-acr-ocean"
                >
                  {t("category.clearFilter")}
                </LocalizedClientLink>
              ) : null}
            </div>
            <label
              htmlFor="kategoria-szurok-nyit"
              className="flex h-[42px] cursor-pointer items-center justify-between border border-acr-line px-4 text-[14px] font-medium text-acr-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-acr-ocean peer-checked:[&_svg]:rotate-180 small:hidden"
              data-testid="szurok-gomb"
            >
              {t("category.filterToggle")}
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 4.5 6 8.5 10 4.5" />
              </svg>
            </label>
            <div
              id="kategoria-szurok-tartalom"
              className="hidden flex-col gap-[18px] peer-checked:flex small:flex"
              data-testid="szurok-tartalom"
            >
              {/* A szuro kereso (117:79) a bolt keresojere kuld: a kategorian
              beluli kereses a kereses PR-javal jon. */}
              <form
                action={keresoAction}
                method="get"
                className="border border-acr-line bg-acr-mist p-3"
              >
                <label className="sr-only" htmlFor="kategoria-kereso">
                  {t("category.searchLabel")}
                </label>
                <input
                  id="kategoria-kereso"
                  type="search"
                  name="q"
                  placeholder={t("category.searchPlaceholder")}
                  className="w-full bg-transparent text-[14px] leading-[22px] text-acr-ink outline-none placeholder:text-acr-slate"
                />
              </form>
              {kategoriak.length > 0 ? (
                /*
              MOBILON (a `small` alatt) A KATEGORIA SZAKASZ REJTVE: ugyanez a
              navigacio a gyors-kategoria savban vizszintesen gorgetheto, es a
              21 soros lista a termekek ele tolna (mervel 390-en). Figma mobil
              kerete ehhez a laphoz nincs; ez a mi reszponziv szabalyunk.
            */
                <section className="hidden flex-col gap-2 border-t border-acr-line pt-[13px] small:flex">
                  <h3 className="text-[16px] font-medium leading-[26px] text-acr-ink">
                    {t("category.categoryHeading")}
                  </h3>
                  <ul
                    className="flex flex-col gap-2"
                    data-testid="szuro-kategoriak"
                  >
                    {kategoriak.map((sor) => (
                      <li key={sor.id}>
                        <LocalizedClientLink
                          href={sor.href}
                          className="flex items-center justify-between gap-2 text-[14px] leading-[22px] text-acr-slate hover:text-acr-ink"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-[15px] w-[15px] shrink-0 border border-acr-slate bg-acr-mist"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">{sor.nev}</span>
                          </span>
                          {sor.szam !== null ? (
                            <span className="shrink-0">{sor.szam}</span>
                          ) : null}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {markaLista.length > 0 ? (
                <section
                  className="flex flex-col gap-2 border-t border-acr-line pt-[13px]"
                  data-testid="szuro-markak"
                >
                  <h3 className="text-[16px] font-medium leading-[26px] text-acr-ink">
                    {t("category.brandHeading")}
                  </h3>
                  <MarkaLista
                    sorok={markaLista}
                    aktiv={markak}
                    link={markaLink}
                    t={t}
                  />
                </section>
              ) : null}
              {tartasiSzakasz}
            </div>
          </aside>
        ) : null}

        <section aria-label={t("category.products")} id="category-products">
          {/* AKTIV SZUROK (117:197): a kivalasztott markak, egy-egy
              kattintassal levehetok. */}
          {markak.length > 0 ? (
            <div
              className="mb-[26px] flex flex-wrap items-center gap-2"
              data-testid="aktiv-szurok"
            >
              <span className="text-[14px] leading-[22px] text-acr-slate">
                {t("category.activeFilters")}
              </span>
              {markak.map((id) => (
                <a
                  key={id}
                  href={markaLink(id)}
                  rel={szuroLinkRel(markaLink(id))}
                  className="flex h-[42px] items-center bg-acr-navy px-6 text-[14px] font-medium text-acr-white"
                  aria-label={t("category.removeBrandFilter", {
                    name: markaNev.get(id) ?? t("category.brandFallback"),
                  })}
                >
                  {markaNev.get(id) ?? t("category.unknownBrand")} ×
                </a>
              ))}
            </div>
          ) : null}
          {szuroMegjegyzes ? (
            <p
              className="mb-[26px] text-[14px] leading-[22px] text-acr-slate"
              data-testid="szuro-megjegyzes"
            >
              {szuroMegjegyzes}
            </p>
          ) : null}
          {products.length === 0 ? (
            <p
              className="text-[14px] text-acr-slate"
              data-testid="category-products-empty"
            >
              {uresSzoveg}
            </p>
          ) : (
            <ul
              className={
                eloAllat
                  ? "grid grid-cols-2 gap-x-3 gap-y-5 small:gap-x-5 small:gap-y-[26px] medium:grid-cols-3"
                  : "grid gap-x-5 gap-y-[26px] xsmall:grid-cols-2 medium:grid-cols-3"
              }
              data-testid="category-products-list"
            >
              {products.map((product, i) => (
                <li key={product.id}>
                  {eloAllatKartya(product) ? (
                    <EloAllatKartya
                      product={product}
                      elso={i === 0}
                      t={t}
                      tomor={eloAllat}
                    />
                  ) : (
                    <CommerceTermekKartya
                      product={product}
                      elso={i === 0}
                      t={t}
                    />
                  )}
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
                {t(count === 1 ? "category.positionOne" : "category.position", {
                  from: page === 1 ? eddig : `${elso}–${eddig}`,
                  count,
                })}
              </p>
              {kovetkezoHref ? (
                <a
                  href={kovetkezoHref}
                  rel={szuroLinkRel(kovetkezoHref)}
                  className="flex h-[54px] w-full max-w-[320px] items-center justify-center border border-acr-line bg-acr-white px-8 text-[15px] font-medium text-acr-ink"
                  data-testid="category-more-products"
                >
                  {t("category.loadMore")}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
