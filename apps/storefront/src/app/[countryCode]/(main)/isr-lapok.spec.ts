import { readdirSync, readFileSync, statSync } from "fs"
import { join, relative } from "path"

import { describe, expect, it } from "vitest"

/*
  A PUBLIKUS LAPOK GYORSITOTARAZHATOK (FE-7, Balazs 2026-10-07 07:44 UTC).

  MERVE 2026-10-07 egy Next 15.5.24-es probaepitesen (a kirakat sajat
  csomagjaival): egy dinamikus szegmens alatti lap `generateStaticParams`
  NELKUL `private, no-cache, no-store` valaszt ad, akkor is, ha semmi
  dinamikusat nem olvas es `revalidate`-et allit. Ures listat visszaado
  `generateStaticParams`-szal ugyanaz a lap `x-nextjs-cache: MISS`, majd `HIT`,
  `s-maxage=300`. Itt minden lap a `[countryCode]` alatt all, tehat ez minden
  lapra vonatkozik.

  A FORRAS SZOVEGERE MERUNK, mert a lapot behuzni nem lehet (szerver-modulok).
  Ez gyengebb allitas a viselkedesnel: azt meri, hogy a beallitas OTT VAN, nem
  azt, hogy a valasz gyorsitotarazott -- azt a stage meres mondja meg.

  MI PIROSIT: egy uj publikus lap beallitas nelkul; egy lap, ami a listak
  egyikeben sem all (tehat senki nem dontott rola).
*/

/** A latogato sajat allapota: szandekosan dinamikus. */
const SZANDEKOSAN_DINAMIKUS = [
  "account/",
  "cart/page.tsx",
  "order/",
  "rendeles-fizetese/",
  "verify-account/",
  // a szurt lista (rendezes, szurok, kereses): korlatlan kombinacio, a 3. resz
  // szandekosan dinamikusan hagyja (`belso-utvonalak.js`)
  "%5Fszurt/",
]

const gyoker = __dirname

const lapok = (mappa: string): string[] =>
  readdirSync(mappa).flatMap((nev) => {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) return lapok(ut)
    return nev === "page.tsx" ? [ut] : []
  })

const kod = (ut: string) =>
  readFileSync(ut, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")

const relativ = (ut: string) => relative(gyoker, ut).split("\\").join("/")

describe("a publikus lapok ISR-beállítása", () => {
  const mind = lapok(gyoker).map(relativ)
  const publikus = mind.filter(
    (ut) => !SZANDEKOSAN_DINAMIKUS.some((e) => ut.startsWith(e)),
  )

  it("a bejárás megtalálja a lapokat (pozitív kontroll)", () => {
    expect(publikus).toEqual(
      expect.arrayContaining([
        "page.tsx",
        "jogi/[dokumentum]/page.tsx",
        "hamarosan/[tema]/page.tsx",
        "termek/[handle]/page.tsx",
        "categories/[...category]/page.tsx",
        "%5Fp/[lap]/store/page.tsx",
        "%5Fv/[valtozat]/termek/[handle]/page.tsx",
      ]),
    )
  })

  it.each(publikus)(
    "%s: generateStaticParams és revalidate, searchParams nélkül",
    (ut) => {
      const forras = kod(join(gyoker, ut))
      expect(forras).toMatch(
        /export\s+async\s+function\s+generateStaticParams\s*\(/,
      )
      expect(forras).toMatch(/export\s+const\s+revalidate\s*=\s*\d+/)
      expect(forras).not.toMatch(/searchParams/)
    },
  )

  /*
    A `searchParams`-ot olvaso lap KIMONDOTTAN dinamikus: kulonben egy ures
    `generateStaticParams`-u epitesen ISR-ut lesz belole, es futaskor
    `DYNAMIC_SERVER_USAGE` 500-at ad (merve 2026-10-07, gyujtemeny-lap).
  */
  it("minden searchParams-olvasó lap force-dynamic", () => {
    const hianyzik = mind.filter((ut) => {
      const forras = kod(join(gyoker, ut))
      return (
        /searchParams/.test(forras) &&
        !/export\s+const\s+dynamic\s*=\s*"force-dynamic"/.test(forras)
      )
    })
    expect(hianyzik).toEqual([])
  })
})
