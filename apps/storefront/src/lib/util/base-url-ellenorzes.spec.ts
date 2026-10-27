// @vitest-environment node
import { createRequire } from "node:module"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

/*
  A KIRAKAT SAJAT CIME (commerce-audit-p0, S1, P0). MI PIROSIT: ha production
  uzemben hianyzo, localhost-os, http-s vagy utvonalas cim atmenne; ha egy
  helyes cim (az eles es a teszt kirakate is) elbukna; ha az ellenorzes
  fejlesztesben is megallitana; ha a `next.config.js` betoltese nem hivna meg.

  AMIT NEM MER: hogy a cim az ELES cime-e (a teszt kirakat is helyes https
  cimmel epul), es hogy a telepitett oldal canonical hosztja egyezik-e a
  kiszolgalo hosszal. Az csak a telepitett oldalon merheto.
*/
const GYOKER = join(__dirname, "..", "..", "..")
const betolt = createRequire(join(GYOKER, "package.json"))
const { baseUrlHiba } = betolt("./base-url-ellenorzes") as {
  baseUrlHiba: (nyers: string | undefined) => string | null
}

afterEach(() => vi.unstubAllEnvs())

describe("baseUrlHiba", () => {
  it.each([
    "https://shop.acropora.hu",
    "https://shop.acropora.hu/",
    "https://shop-staging.acropora.hu",
    "  https://shop.acropora.hu  ",
  ])("elfogadja: %s", (cim) => {
    expect(baseUrlHiba(cim)).toBeNull()
  })

  it.each([
    [undefined, /nincs beállítva/],
    ["", /nincs beállítva/],
    ["   ", /nincs beállítva/],
    ["shop.acropora.hu", /nem értelmezhető/],
    ["http://shop.acropora.hu", /nem https/],
    ["https://localhost:8000", /nem publikus/],
    ["https://127.0.0.1", /nem publikus/],
    ["https://0.0.0.0", /nem publikus/],
    ["https://shop.test", /nem publikus/],
    ["https://shop.local", /nem publikus/],
    ["https://shop.example", /nem publikus/],
    ["https://u:p@shop.acropora.hu", /hitelesítést/],
    ["https://shop.acropora.hu/hu", /útvonalat/],
    ["https://shop.acropora.hu/?a=1", /útvonalat/],
    ["https://shop.acropora.hu/#x", /útvonalat/],
  ])("elutasítja: %s", (cim, minta) => {
    expect(baseUrlHiba(cim)).toMatch(minta)
  })

  it("az üzenet nem írja ki a megadott címet hitelesítéssel együtt", () => {
    expect(
      baseUrlHiba("https://felhasznalo:titok@shop.acropora.hu"),
    ).not.toContain("titok")
  })
})

describe("a next.config betöltése", () => {
  const ALAP = {
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: "https://commerce-stage.example.test",
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_helyi_proba_nem_valodi",
  }

  const betoltes = (env: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries({ ...ALAP, ...env }))
      vi.stubEnv(k, v as string)
    const kilep = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit")
    }) as never)
    vi.spyOn(console, "error").mockImplementation(() => {})
    const ut = betolt.resolve("./next.config.js")
    delete betolt.cache[ut]
    delete betolt.cache[betolt.resolve("./check-env-variables")]
    try {
      betolt(ut)
      return { kilepett: false, kilep }
    } catch (hiba) {
      if (!(hiba instanceof Error) || hiba.message !== "process.exit")
        throw hiba
      return { kilepett: true, kilep }
    } finally {
      vi.restoreAllMocks()
    }
  }

  it("production módban a hiányzó cím leállítja (ismert pozitív kontroll)", () => {
    expect(
      betoltes({ NODE_ENV: "production", NEXT_PUBLIC_BASE_URL: "" }).kilepett,
    ).toBe(true)
  })

  it("production módban a localhost-os és a http-s cím is leállítja", () => {
    for (const cim of ["https://localhost:8000", "http://shop.acropora.hu"])
      expect(
        betoltes({ NODE_ENV: "production", NEXT_PUBLIC_BASE_URL: cim })
          .kilepett,
        cim,
      ).toBe(true)
  })

  it("production módban a helyes cím átmegy (teszt és éles kirakat is)", () => {
    for (const cim of [
      "https://shop-staging.acropora.hu",
      "https://shop.acropora.hu",
    ])
      expect(
        betoltes({ NODE_ENV: "production", NEXT_PUBLIC_BASE_URL: cim })
          .kilepett,
        cim,
      ).toBe(false)
  })

  it("fejlesztésben és tesztben nem áll meg, cím nélkül sem", () => {
    for (const mod of ["development", "test"])
      expect(
        betoltes({ NODE_ENV: mod, NEXT_PUBLIC_BASE_URL: "" }).kilepett,
        mod,
      ).toBe(false)
  })
})
