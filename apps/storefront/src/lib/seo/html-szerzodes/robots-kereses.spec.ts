import { resolveRobots } from "next/dist/build/webpack/loaders/metadata/resolve-route-data"
import { describe, expect, it, vi } from "vitest"

import { robotsEngedi } from "./robots-txt"

/**
 * A NOINDEX-ELT KERESO- ES FACET-URL-T A robots.txt NE TILTSA (Balazs 4. pontja,
 * 2026-10-07). Egy tiltott URL-t a kereso le sem tolti, tehat a noindexet sem
 * latja.
 *
 * A VALODI `app/robots.ts`-t futtatja, az ELES hoszt fejlecevel, es a Next sajat
 * szovegge alakitojaval (`resolveRobots`), tehat a kiszolgalt robots.txt-t meri,
 * nem egy masolatat. Ha a FE-4 utvonal-szabalyai egyszer a keresest vagy a facet
 * parametereit is tiltanak, ez pirosit.
 *
 * MI PIROSIT: ha az eles robots.txt a `/hu/store?q=`-t, egy `marka` vagy
 * `optionValueIds` facetet, vagy a rendezett listat tiltja.
 */
const fejlecek = vi.hoisted(() => ({ host: "shop.acropora.hu" }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: fejlecek.host }),
}))

import robots from "../../../app/robots"

const KERESO_ES_FACET = [
  "/hu/store?q=hanna",
  "/hu/store?q=hanna&page=2",
  "/hu/categories/termékek?marka=pcol_01M2KA5H1VY6PKFS2SJ91N9PYV",
  "/hu/categories/termékek?optionValueIds=optval_1",
  "/hu/categories/termékek?sortBy=price_asc",
]

describe("az éles robots.txt nem tiltja a noindex-elt URL-eket", () => {
  it("keresés és facet bejárható", async () => {
    fejlecek.host = "shop.acropora.hu"
    const txt = resolveRobots(await robots())
    for (const ut of KERESO_ES_FACET)
      expect(robotsEngedi(txt, ut), `${ut}\n${txt}`).toBe(true)
  })

  it("a mérés kontrollja: a teszt hoszton ugyanez a mérő tilt", async () => {
    fejlecek.host = "shop-staging.acropora.hu"
    const txt = resolveRobots(await robots())
    for (const ut of KERESO_ES_FACET) expect(robotsEngedi(txt, ut)).toBe(false)
  })
})
