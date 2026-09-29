import {
  listCategoryIdsWithDescendants,
  listNonEmptyRootCategories,
} from "@lib/data/categories"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { fejlecMenuPontok } from "@lib/util/fejlec-menu-pontok"
import { keresesCim } from "@lib/util/kereses-talalatok"
import {
  KERESES_TIPPEK,
  kategoriaKartyak,
  type KategoriaKartya,
} from "@lib/util/kereses-ures"

/**
 * A "NINCS TALALAT" LAP (P2, 4b), a handoff CANONICAL "Search / No results /
 * Desktop" kerete szerint: 253:57.
 *
 * Akkor all, ha a kereso vegpont NULLA talalatot adott (a szurokkel kiurult
 * talalati lap nem ez: ott van mit visszavonni). Ami a keretbol kimaradt vagy
 * mast mond, a `docs/P2-SEARCH.md` sorolja fel.
 */

/**
 * A kartyak termekszama: a gyokereke a fejlec mar lekert szamaibol, a menu
 * alkategoria-pontjae (Vízkezelés) egy `limit: 1` lekeressel a reszfara. Ha
 * a szamolas hibazik, a kartya szam nelkul all, nem nullaval.
 */
async function kartyaSzam(
  kartya: KategoriaKartya,
  szamok: Map<string, number>,
  countryCode: string,
): Promise<number | undefined> {
  const kesz = szamok.get(kartya.id)
  if (kesz !== undefined) return kesz
  try {
    const ids = await listCategoryIdsWithDescendants(kartya.id)
    const { response } = await listProducts({
      queryParams: { category_id: ids, limit: 1, fields: "id" },
      countryCode,
    })
    return response.count
  } catch {
    return undefined
  }
}

export default async function NincsTalalatLap({
  kereses,
  countryCode,
}: {
  kereses: string
  countryCode: string
}) {
  const region = await getRegion(countryCode).catch(() => null)
  const menuAdat = region
    ? await listNonEmptyRootCategories(region.id).catch(() => null)
    : null
  const gyokerek = menuAdat?.gyokerek ?? []
  const kartyak = kategoriaKartyak(fejlecMenuPontok(gyokerek), gyokerek)
  const szamok = await Promise.all(
    kartyak.map((k) =>
      kartyaSzam(k, menuAdat?.szamok ?? new Map(), countryCode),
    ),
  )

  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="kereses-lap">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-16 pt-[18px] small:gap-[18px] small:px-[56px] small:pt-[34px]">
        {/* FEJ (253:73-253:77): felulcim, cim, a mezo a kerdessel. */}
        <div className="flex flex-col gap-[18px]">
          <p className="hidden text-[10.5px] font-semibold uppercase leading-[14px] tracking-[1.2px] text-acr-heritage small:block">
            Keresés
          </p>
          <h1
            className="text-[26px] font-semibold leading-[34px] text-acr-ink small:text-[38px] small:leading-[50px]"
            data-testid="store-page-title"
          >
            Nincs találat
          </h1>
        </div>
        <form
          action={`/${countryCode}/store`}
          method="get"
          className="flex h-[48px] items-center gap-[10px] border border-acr-line bg-acr-white px-3 small:h-[54px] small:px-[14px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:[outline-color:var(--acr-color-heritage)]"
        >
          <span
            className="text-[17px] leading-[22px] text-acr-heritage small:text-[18px] small:leading-[23px]"
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
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] leading-[18px] text-acr-ink outline-none small:text-[15px] small:leading-[20px]"
          />
        </form>

        {/*
          URES ALLAPOT (253:78): cim, tanacs, tipp-szavak, segitseg. A kerdest
          a mezo mutatja, a tanacs nem ismetli. A tanacs mondata MERVE igaz: a
          vegpont a nevet, a leirast es a cikkszamot nezi, es 2026-09-29-en
          "Triton" 76, "Amphiprion" 13, egy cikkszam 1 talalatot adott.
        */}
        <section
          className="flex flex-col items-start gap-[10px] border border-acr-line bg-acr-white p-[14px] small:items-center small:gap-3 small:px-7 small:py-7 small:text-center"
          data-testid="kereses-nincs-talalat"
          aria-labelledby="kereses-nincs-talalat-cim"
        >
          <h2
            id="kereses-nincs-talalat-cim"
            className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[26px] small:leading-[34px]"
          >
            Nem találtunk ilyet
          </h2>
          <p className="max-w-[574px] text-[12.5px] leading-[18px] text-acr-slate small:text-[14px]">
            Próbáld rövidebb kifejezéssel, márkanévvel, cikkszámmal, magyar vagy
            tudományos névvel.
          </p>
          <ul
            className="flex flex-wrap gap-[6px] small:justify-center small:gap-[10px]"
            aria-label="Keresési tippek"
            data-testid="kereses-tippek"
          >
            {KERESES_TIPPEK.map((szo) => (
              <li key={szo}>
                <a
                  href={keresesCim({ q: szo })}
                  className="flex h-[27px] items-center bg-acr-mist px-2 text-[11.5px] font-medium leading-[15px] text-acr-ink small:h-[30px] small:px-[10px] small:text-[12.5px] small:leading-[16px]"
                >
                  {szo}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={`/${countryCode}/hamarosan/szakerto`}
            className="hidden h-[44px] w-full max-w-[280px] items-center justify-center border small:flex border-acr-heritage text-[13.5px] font-semibold leading-[18px] text-acr-ink"
            data-testid="kereses-segitseg"
          >
            Segítség a kereséshez
          </a>
        </section>

        {/*
          KATEGORIAK (253:94; mobilon 254:130 lista, felulcimmel): a keret "Népszerű kategóriák" cime nepszeruseget
          allitana, arra nincs adat. A kartyak a fejlec menujenek azon pontjai,
          amelyeknek van oldala, a menu sorrendjeben.
        */}
        {kartyak.length > 0 ? (
          <section
            className="flex flex-col gap-3 small:gap-[18px] small:pt-[18px]"
            aria-labelledby="kereses-kategoriak-cim"
          >
            <h2
              id="kereses-kategoriak-cim"
              className="text-[18px] font-semibold leading-[23px] text-acr-ink small:text-[22px] small:leading-[29px]"
            >
              Kategóriák
            </h2>
            <ul
              className="grid grid-cols-1 gap-3 small:grid-cols-2 medium:grid-cols-4"
              data-testid="kereses-kategoriak"
            >
              {kartyak.map((kartya, i) => (
                <li key={kartya.id}>
                  <a
                    href={`/${countryCode}/categories/${kartya.handle}`}
                    className="flex flex-col gap-[3px] py-[9px] small:h-[110px] small:gap-[5px] small:border small:border-acr-line small:bg-acr-white small:p-4 small:hover:border-acr-slate"
                  >
                    <span className="text-[9.5px] font-semibold uppercase leading-[12px] tracking-[0.8px] text-acr-heritage small:hidden">
                      Kategória
                    </span>
                    <span className="text-[13.5px] font-semibold leading-[18px] text-acr-ink small:text-[15px] small:leading-[20px]">
                      {kartya.felirat}
                    </span>
                    {szamok[i] !== undefined ? (
                      <span className="text-[11.8px] leading-[15px] text-acr-slate small:text-[12.5px] small:leading-[16px]">
                        {szamok[i]} termék
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
