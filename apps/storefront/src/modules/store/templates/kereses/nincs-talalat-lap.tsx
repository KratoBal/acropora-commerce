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
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[18px] px-4 pb-16 pt-8 small:px-[56px] small:pt-[34px]">
        {/* FEJ (253:73-253:77): felulcim, cim, a mezo a kerdessel. */}
        <div className="flex flex-col gap-[18px]">
          <p className="text-[10.5px] font-semibold uppercase leading-[14px] tracking-[1.2px] text-acr-heritage">
            Keresés
          </p>
          <h1
            className="text-[30px] font-semibold leading-[40px] text-acr-ink small:text-[38px] small:leading-[50px]"
            data-testid="store-page-title"
          >
            Nincs találat
          </h1>
        </div>
        <form
          action={`/${countryCode}/store`}
          method="get"
          className="flex h-[54px] items-center gap-[10px] border border-acr-line bg-acr-white px-[14px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:[outline-color:var(--acr-color-heritage)]"
        >
          <span
            className="text-[18px] leading-[23px] text-acr-heritage"
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
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] leading-[20px] text-acr-ink outline-none"
          />
        </form>

        {/*
          URES ALLAPOT (253:78): cim, tanacs, tipp-szavak, segitseg. A kerdest
          a mezo mutatja, a tanacs nem ismetli. A tanacs mondata MERVE igaz: a
          vegpont a nevet, a leirast es a cikkszamot nezi, es 2026-09-29-en
          "Triton" 76, "Amphiprion" 13, egy cikkszam 1 talalatot adott.
        */}
        <section
          className="flex flex-col items-center gap-3 border border-acr-line bg-acr-white px-4 py-7 text-center small:px-7"
          data-testid="kereses-nincs-talalat"
          aria-labelledby="kereses-nincs-talalat-cim"
        >
          <h2
            id="kereses-nincs-talalat-cim"
            className="text-[22px] font-semibold leading-[30px] text-acr-ink small:text-[26px] small:leading-[34px]"
          >
            Nem találtunk ilyet
          </h2>
          <p className="max-w-[574px] text-[14px] leading-[18px] text-acr-slate">
            Próbáld rövidebb kifejezéssel, márkanévvel, cikkszámmal, magyar vagy
            tudományos névvel.
          </p>
          <ul
            className="flex flex-wrap justify-center gap-[10px]"
            aria-label="Keresési tippek"
            data-testid="kereses-tippek"
          >
            {KERESES_TIPPEK.map((szo) => (
              <li key={szo}>
                <a
                  href={keresesCim({ q: szo })}
                  className="flex h-[30px] items-center bg-acr-mist px-[10px] text-[12.5px] font-medium leading-[16px] text-acr-ink"
                >
                  {szo}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={`/${countryCode}/hamarosan/szakerto`}
            className="flex h-[44px] w-full max-w-[280px] items-center justify-center border border-acr-heritage text-[13.5px] font-semibold leading-[18px] text-acr-ink"
            data-testid="kereses-segitseg"
          >
            Segítség a kereséshez
          </a>
        </section>

        {/*
          KATEGORIAK (253:94): a keret "Népszerű kategóriák" cime nepszeruseget
          allitana, arra nincs adat. A kartyak a fejlec menujenek azon pontjai,
          amelyeknek van oldala, a menu sorrendjeben.
        */}
        {kartyak.length > 0 ? (
          <section
            className="flex flex-col gap-[18px] pt-[18px]"
            aria-labelledby="kereses-kategoriak-cim"
          >
            <h2
              id="kereses-kategoriak-cim"
              className="text-[22px] font-semibold leading-[29px] text-acr-ink"
            >
              Kategóriák
            </h2>
            <ul
              className="grid grid-cols-1 gap-3 xsmall:grid-cols-2 medium:grid-cols-4"
              data-testid="kereses-kategoriak"
            >
              {kartyak.map((kartya, i) => (
                <li key={kartya.id}>
                  <a
                    href={`/${countryCode}/categories/${kartya.handle}`}
                    className="flex h-[110px] flex-col gap-[5px] border border-acr-line bg-acr-white p-4 hover:border-acr-slate"
                  >
                    <span className="text-[15px] font-semibold leading-[20px] text-acr-ink">
                      {kartya.felirat}
                    </span>
                    {szamok[i] !== undefined ? (
                      <span className="text-[12.5px] leading-[16px] text-acr-slate">
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
