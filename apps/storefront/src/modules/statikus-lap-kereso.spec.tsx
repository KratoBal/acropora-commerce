import { readdirSync, readFileSync, statSync } from "fs"
import { join, relative } from "path"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock("next/navigation", () => ({
  usePathname: () => "/hu/categories/a",
  useRouter: () => router,
}))

import CommerceRendezes from "./categories/templates/commerce/rendezes"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.history.replaceState(null, "", "/")
})

/*
  STATIKUS LAPON NINCS `useSearchParams` RENDERKOR (FE-7 3. resz).

  Merve 2026-10-07 egy Next 15.5.24-es probaepitesen: egy ISR lapon a
  `useSearchParams`-ot hivo kliens-komponens Suspense nelkul az epitest allitja
  meg, Suspense-szel a kiszolgalt HTML-ben a FALLBACK all a helyen. A lapozo
  linkjei, a rendezes es a vasarlodoboz igy kiesnenek a HTML-bol.

  A forras szovegere merunk (megjegyzes nelkul). MI PIROSIT: egy publikus
  lapon megjeleno komponens ujra `useSearchParams`-ot hiv.
*/
const MODULOK = __dirname

/** Dinamikus lapok (penztar, fiok), es a lapozo, ami a #519 utan kerul at. */
const KIVETELEK = [
  "checkout/",
  "account/",
  "store/components/pagination/index.tsx",
]

const fajlok = (mappa: string): string[] =>
  readdirSync(mappa).flatMap((nev) => {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) return fajlok(ut)
    return /\.tsx?$/.test(nev) && !/\.spec\./.test(nev) ? [ut] : []
  })

const kod = (ut: string) =>
  readFileSync(ut, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")

describe("a publikus lapok komponensei", () => {
  it("renderkor nem hívnak useSearchParams-t", () => {
    const hivok = fajlok(MODULOK)
      .map((ut) => relative(MODULOK, ut).split("\\").join("/"))
      .filter((ut) => !KIVETELEK.some((k) => ut.startsWith(k)))
      .filter((ut) => /useSearchParams\s*\(/.test(kod(join(MODULOK, ut))))

    expect(hivok).toEqual([])
  })

  it("a bejárás látja a fájlokat (pozitív kontroll)", () => {
    const mind = fajlok(MODULOK).map((ut) => relative(MODULOK, ut))
    expect(mind).toContain(
      join("store", "components", "pagination", "index.tsx"),
    )
  })
})

describe("a rendezés a címet a böngészőből olvassa", () => {
  it("megtartja a többi szűrőt, és az első lapra ugrik", () => {
    window.history.replaceState(null, "", "/hu/categories/a?marka=boyu&page=3")
    render(<CommerceRendezes sortBy="created_at" />)

    fireEvent.change(screen.getByTestId("commerce-rendezes"), {
      target: { value: "price_asc" },
    })

    expect(router.push).toHaveBeenCalledWith(
      "/hu/categories/a?marka=boyu&sortBy=price_asc",
      { scroll: false },
    )
  })
})
