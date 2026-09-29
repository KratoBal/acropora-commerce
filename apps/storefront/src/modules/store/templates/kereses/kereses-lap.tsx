import { listProducts, listProductsWithSort } from "@lib/data/products"
import { keresesTalalatok } from "@lib/data/termek-kereses"
import {
  gyokerSorok,
  keresesCim,
  szurtAzonositok,
  talalatMarkai,
  type TalalatTermek,
} from "@lib/util/kereses-talalatok"
import { keresesSzuro } from "@lib/util/kereses-szuro"
import { markaValtas } from "@lib/util/marka-szuro"
import { TERMEKLISTA_MEZOK } from "@lib/util/termeklista-mezok"
import MarkaLista from "@modules/categories/templates/commerce/marka-lista"
import CommerceRendezes from "@modules/categories/templates/commerce/rendezes"
import CommerceTermekKartya from "@modules/categories/templates/commerce/termek-kartya"

import NincsTalalatLap from "./nincs-talalat-lap"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * A KERESESI TALALATOK LAPJA (P2, 4a), a handoff CANONICAL "Search /
 * Results / Desktop" kerete szerint: 152:88.
 *
 * Csak akkor all, ha van keresoszo; kereses nelkul a "Minden termék" lap
 * valtozatlan. Ami a keretbol adat vagy funkcio hijan kimaradt (helyesiras-
 * javaslat, "Legjobb találat", Típus-, Készlet- es Ár-szuro), a
 * `docs/P2-SEARCH.md` sorolja fel.
 */
export const TALALAT_LAP = 18
const META_LAP = 100

/** A talalatok besorolasa (gyoker, marka), legfeljebb ket lap. */
async function talalatAdatok(
  ids: string[],
  countryCode: string,
): Promise<TalalatTermek[]> {
  if (ids.length === 0) return []
  const lapok = Math.ceil(ids.length / META_LAP)
  const valaszok = await Promise.all(
    Array.from({ length: lapok }, (_, i) =>
      listProducts({
        pageParam: 1,
        queryParams: {
          id: ids.slice(i * META_LAP, (i + 1) * META_LAP),
          limit: META_LAP,
          fields: "id,collection.id,collection.title,*categories",
        },
        countryCode,
      }).catch(() => null),
    ),
  )
  return valaszok.flatMap(
    (v) => (v?.response.products ?? []) as unknown as TalalatTermek[],
  )
}

export default async function KeresesLap({
  kereses,
  countryCode,
  sortBy,
  page,
  gyoker,
  markak = [],
}: {
  kereses: string
  countryCode: string
  sortBy?: SortOptions
  page: number
  gyoker?: string
  markak?: string[]
}) {
  const talalat = await keresesTalalatok(kereses)
  // NULLA TALALAT: sajat lap (253:57), tippekkel es kategoriakkal (P2, 4b).
  if (talalat.count === 0) return NincsTalalatLap({ kereses, countryCode })
  const adatok = await talalatAdatok(talalat.ids, countryCode)
  const gyokerek = gyokerSorok(adatok)
  // A Márka lista a kivalasztott gyoker talalataibol szamol, a markatol fuggetlenul.
  const markaLista = talalatMarkai(
    gyoker
      ? adatok.filter((a) => (a.categories ?? []).some((k) => k.id === gyoker))
      : adatok,
  )
  /*
    A NULLA TALALAT KULON AG, a merett `keresesSzuro` dont: egy URES `id`
    halmazzal a lekerdezes a TELJES katalogust adhatna vissza. Ilyenkor el sem
    inditjuk. A szurt nezet ugyanigy: a szurokkel egyutt ures lista nem mehet ki.
  */
  const szuro = keresesSzuro(
    szurtAzonositok(talalat.ids, adatok, { gyoker, markak }),
  )

  const lista = !szuro.nullaTalalat
    ? await listProductsWithSort({
        page,
        queryParams: {
          id: szuro.ids,
          limit: TALALAT_LAP,
          fields: `${TERMEKLISTA_MEZOK}*collection`,
        },
        sortBy,
        countryCode,
      })
    : null
  const products = lista?.response.products ?? []
  const count = lista?.response.count ?? 0
  const eddig = Math.min(page * TALALAT_LAP, count)
  const elso = count === 0 ? 0 : (page - 1) * TALALAT_LAP + 1
  const cim = (valtozas: {
    gyoker?: string | null
    markak?: string[]
    page?: number
  }) =>
    keresesCim({
      q: kereses,
      gyoker:
        valtozas.gyoker === null ? undefined : (valtozas.gyoker ?? gyoker),
      markak: valtozas.markak ?? markak,
      sortBy,
      page: valtozas.page,
    })

  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="kereses-lap">
      {/* FEJ (152:108): felulcim, cim, a nagy kereso mezo a kerdessel. */}
      <header className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-6 pt-8 small:px-[56px] small:pt-[42px]">
        <p className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-heritage">
          Keresés
        </p>
        <h1
          className="text-[34px] font-light leading-[40px] tracking-[-1px] text-acr-ink small:text-[46px] small:leading-[62px]"
          data-testid="store-page-title"
        >
          Találatok
        </h1>
        <form
          action={`/${countryCode}/store`}
          method="get"
          className="flex h-[64px] items-center gap-3 border border-acr-slate bg-acr-shell px-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:[outline-color:var(--acr-color-heritage)]"
        >
          <span
            className="text-[28px] leading-[34px] text-acr-heritage"
            aria-hidden="true"
          >
            ⌕
          </span>
          <label className="sr-only" htmlFor="kereses-lap-mezo">
            Keresés
          </label>
          <input
            id="kereses-lap-mezo"
            type="search"
            name="q"
            defaultValue={kereses}
            className="h-full min-w-0 flex-1 bg-transparent text-[18px] leading-[30px] text-acr-ink outline-none"
          />
        </form>
        <p
          className="text-[14px] leading-[22px] text-acr-slate"
          data-testid="kereses-talalatszam"
        >
          {talalat.count} találat erre: „{kereses}”
        </p>
        {/*
          A CSONKOLAS KIMONDVA (a #379 atvetele): a vegpont legfeljebb 200
          azonositot ad, `created_at` szerint csokkenoen, es a valaszban
          jelzi, ha levagott. A szam a valaszbol jon, nem egy beirt 200-bol.
        */}
        {talalat.csonkolt ? (
          <p
            className="text-[14px] leading-[22px] text-acr-slate"
            data-testid="kereses-csonkolt"
          >
            Több mint {talalat.count} termék illik erre a keresésre, itt a{" "}
            {talalat.count} legújabb látszik. Pontosítsd a keresést, ha nem
            találod, amit keresel.
          </p>
        ) : null}
        {/* GYOKER-FULEK (152:119): "Összes" es a talalatok gyokerei. */}
        {gyokerek.length > 1 ? (
          <ul
            className="flex gap-2 overflow-x-auto pt-1"
            aria-label="Találatok kategóriánként"
            data-testid="kereses-gyokerek"
          >
            <li className="shrink-0">
              <a
                href={cim({ gyoker: null, markak: [] })}
                aria-current={gyoker ? undefined : "page"}
                className={
                  "flex h-[40px] items-center border px-3 text-[14px] leading-[22px] " +
                  (gyoker
                    ? "border-acr-line bg-acr-white text-acr-ink"
                    : "border-acr-heritage bg-acr-heritage font-medium text-acr-white")
                }
              >
                Összes
              </a>
            </li>
            {gyokerek.map((sor) => (
              <li key={sor.id} className="shrink-0">
                <a
                  href={cim({ gyoker: sor.id, markak: [] })}
                  aria-current={gyoker === sor.id ? "page" : undefined}
                  className={
                    "flex h-[40px] items-center border px-3 text-[14px] leading-[22px] " +
                    (gyoker === sor.id
                      ? "border-acr-heritage bg-acr-heritage font-medium text-acr-white"
                      : "border-acr-line bg-acr-white text-acr-ink")
                  }
                >
                  {sor.nev} · {sor.szam}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-7 px-4 pb-16 small:grid-cols-[240px_minmax(0,1fr)] small:px-[56px]">
        <aside
          className="flex flex-col gap-4 self-start border border-acr-line bg-acr-white p-4"
          aria-label="Szűrés"
          data-testid="kereses-szurok"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] leading-[34px] tracking-[-0.2px] text-acr-ink">
              Szűrés
            </h2>
            {gyoker || markak.length > 0 ? (
              <a
                href={cim({ gyoker: null, markak: [] })}
                className="text-[14px] text-acr-ocean"
              >
                Törlés
              </a>
            ) : null}
          </div>
          {markaLista.length > 0 ? (
            <section
              className="flex flex-col gap-2 border-t border-acr-line pt-[13px]"
              data-testid="kereses-markak"
            >
              <h3 className="text-[16px] font-medium leading-[26px] text-acr-ink">
                Márka
              </h3>
              <MarkaLista
                sorok={markaLista}
                aktiv={markak}
                link={(id) => cim({ markak: markaValtas(markak, id) })}
              />
            </section>
          ) : (
            <p className="text-[14px] leading-[22px] text-acr-slate">
              Ezekhez a találatokhoz nincs márkaadat.
            </p>
          )}
        </aside>

        <section aria-label="Találatok" id="kereses-talalatok">
          {/*
            A CSOPORT FEJE (152:189): a kivalasztott gyoker neve 300/28, jobbra
            a szam. A rendezes a keretben nincs, a bolt meglevo funkcioja: marad.
          */}
          <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
            <h2
              className="text-[24px] font-light leading-[32px] tracking-[-0.6px] text-acr-ink small:text-[28px] small:leading-[50px]"
              data-testid="kereses-csoport-cim"
            >
              {gyokerek.find((sor) => sor.id === gyoker)?.nev ??
                "Minden találat"}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-[14px] leading-[22px] text-acr-slate">
                {count} találat
              </span>
              {count > 1 ? (
                <CommerceRendezes sortBy={sortBy ?? "created_at"} />
              ) : null}
            </div>
          </div>
          {products.length === 0 ? (
            <p
              className="text-[14px] text-acr-slate"
              data-testid="kereses-szurt-ures"
            >
              A szűrőkkel együtt nincs találat.
            </p>
          ) : (
            <ul
              className="grid gap-x-5 gap-y-[26px] xsmall:grid-cols-2 medium:grid-cols-3"
              data-testid="products-list"
            >
              {products.map((product) => (
                <li key={product.id}>
                  <CommerceTermekKartya product={product} />
                </li>
              ))}
            </ul>
          )}
          {count > 0 ? (
            <div className="mt-[26px] flex flex-col items-center gap-[10px]">
              <p
                className="text-[14px] leading-[22px] text-acr-slate"
                data-testid="kereses-hol-tartunk"
              >
                {page === 1 ? eddig : `${elso}–${eddig}`} / {count} találat
              </p>
              {count > page * TALALAT_LAP ? (
                <a
                  href={cim({ page: page + 1 })}
                  className="flex h-[54px] w-full max-w-[320px] items-center justify-center border border-acr-line bg-acr-white px-8 text-[15px] font-medium text-acr-ink"
                  data-testid="kereses-tovabb"
                >
                  További találatok
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
