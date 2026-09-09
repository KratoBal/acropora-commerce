"use client"

import { useEffect, useState } from "react"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A FEJLEC KATEGORIA-SAVJA: LENYILO, ES GORGETESRE ELTUNIK.
 *
 * Balazs kerese (2026-09-09 09:51): "a fejlecben a menusoron nyiljanak a
 * kategoriak es ne egybol ugorjon a termekek fokategoriara, pl. a lap alsobb
 * reszen tunjon el a kategoria fa".
 *
 * KET KULON VISELKEDES, ES A MASODIK KONNYEN ELSIKLIK:
 *   a menupont NYIT, nem navigal
 *   a sav ELTUNIK, ahogy a latogato lejjebb gorget
 *
 * === AMI SZANDEKOSAN NEM VALTOZIK: A TARTALOM ===
 *
 * A menu a mai forrasbol epul (a nem URES gyokerek). Hogy melyik NEGY elem
 * alljon ott, az kulon kerdes, ami Balazsnal van -- a terv ket jovahagyott
 * lapja ket kulonbozo negyest mutat. Amikor a valasz megjon, egy LISTACSERE
 * marad, nem ujraepites: ez a komponens a kapott halmazt rajzolja ki.
 *
 * === A GYOKER MAGA IS HIVATKOZAS MARAD ===
 *
 * A keres az volt, hogy ne UGORJON egybol a fokategoriara. A lenyilo tetejen
 * ezert ott all a gyoker sajat hivatkozasa is, kulon soron -- aki a teljes
 * kategoriat akarja, eleri, csak nem veletlenul.
 */
/**
 * A NEGY MENUPONT, BALAZS SZAVAVAL ES AZ O SORRENDJEBEN (2026-09-09 09:54):
 * "MIndenhol: Termékek, Halak, Korallok, Gerinctelenek".
 *
 * === MIERT ROGZITETT LISTA, ES NEM SZAMOLT SORREND ===
 *
 * A sorrend NEM vezetheto le semmilyen adatbol: meret szerint sem jon ki
 * (Korallok 8 termek, Gerinctelenek 27, tehat a Korallok ELOREBB all a
 * kisebbik ellenere), es a bolt `rank` mezoje is mast ad
 * (Termekek, Gerinctelenek, Halak, Korallok).
 *
 * Egy szamolt sorrend tehat CSENDBEN mast adna, mint amit kertek. Ezert all
 * itt nev szerint, rogzitve -- es ezert nem "javitja ki" senki veletlenul.
 *
 * === ES AMIT EZ NEM MOND MEG ===
 *
 * Ha egy nev nem szerepel a bolt gyokerei kozott, az a menupont egyszeruen
 * kimarad. Nem talalunk ki helyette masikat: egy hianyzo kategoria adat-kerdes,
 * nem elrendezesi.
 */
export const MENU_SORREND = [
  "Termékek",
  "Halak",
  "Korallok",
  "Gerinctelenek",
] as const

export const menuSorrendben = (
  kategoriak: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] =>
  MENU_SORREND.map((nev) => kategoriak.find((k) => k.name === nev)).filter(
    (k): k is HttpTypes.StoreProductCategory => Boolean(k),
  )

export const FejlecMenu = ({
  kategoriak,
}: {
  kategoriak: HttpTypes.StoreProductCategory[]
}) => {
  const [nyitott, setNyitott] = useState<string | null>(null)
  const [latszik, setLatszik] = useState(true)

  useEffect(() => {
    /**
     * A KUSZOB 120 PIXEL, ES EZ NEM MERT ERTEK, HANEM VALASZTOTT.
     *
     * A terv nem mond semmit arrol, HOL tunjon el a sav -- a keres annyi, hogy
     * "a lap alsobb reszen". A 120 nagyjabol egy fejlec-magassagnyi gorgetes,
     * tehat a sav addig marad, amig a latogato a lap TETEJEN van.
     *
     * Ha valaha mert ertek jon ra, ez az egy szam cserelodik.
     */
    const KUSZOB = 120
    const figyel = () => {
      const y = window.scrollY
      setLatszik(y < KUSZOB)
      if (y >= KUSZOB) setNyitott(null)
    }
    figyel()
    window.addEventListener("scroll", figyel, { passive: true })
    return () => window.removeEventListener("scroll", figyel)
  }, [])

  const sorrendben = menuSorrendben(kategoriak)

  if (sorrendben.length === 0) return null

  return (
    <div
      className={`hidden items-center gap-[22px] lg:flex ${
        latszik ? "" : "lg:hidden"
      }`}
      data-testid="fejlec-menu"
      data-latszik={latszik ? "igen" : "nem"}
    >
      {sorrendben.map((k) => {
        const gyerekek = k.category_children ?? []
        const nyitva = nyitott === k.id

        return (
          <div
            key={k.id}
            className="relative"
            onMouseLeave={() => setNyitott(null)}
          >
            <button
              type="button"
              aria-expanded={nyitva}
              aria-haspopup={gyerekek.length > 0}
              onClick={() => setNyitott(nyitva ? null : k.id)}
              onMouseEnter={() => setNyitott(k.id)}
              className="whitespace-nowrap text-[14px] font-medium"
              data-testid="fejlec-menu-tetel"
            >
              {k.name}
            </button>

            {nyitva && gyerekek.length > 0 && (
              <div
                className="absolute left-0 top-full z-50 mt-2 flex min-w-[220px] flex-col gap-2 border p-4"
                style={{
                  borderColor: "var(--terv-keret)",
                  background: "var(--terv-hatter)",
                }}
                data-testid="fejlec-menu-lenyilo"
              >
                <LocalizedClientLink
                  href={`/categories/${k.handle}`}
                  className="text-[13.5px] font-semibold hover:text-terv-kiemel-tinta"
                  data-testid="fejlec-menu-gyoker-link"
                >
                  {k.name}
                </LocalizedClientLink>
                {gyerekek.map((gy) => (
                  <LocalizedClientLink
                    key={gy.id}
                    href={`/categories/${gy.handle}`}
                    className="whitespace-nowrap text-[13.5px] hover:text-terv-kiemel-tinta"
                    style={{ color: "var(--terv-szoveg-halvany)" }}
                    data-testid="fejlec-menu-gyerek"
                  >
                    {gy.name}
                  </LocalizedClientLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
