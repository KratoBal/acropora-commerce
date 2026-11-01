// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

/*
  A KIRAKAT KERETE (2026-10-26, Balazs: minden aloldalon a kezdolap fejlece es
  lablece). MI PIROSIT: ha a keret a regi fejlecet (`templates/nav`) hozza
  vissza; ha a fejlec nem a szerkesztheto kezdolap-tartalmat kapja; ha a lablec
  vagy a gyerek tartalom kimarad; ha a keret sutit olvas (az osszes lap
  dinamikus lenne, FE-7).
*/
const suti = vi.hoisted(() => ({ olvasasok: 0 }))
vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => {
    suti.olvasasok++
    return { get: () => undefined }
  },
  headers: async () => {
    suti.olvasasok++
    return new Headers()
  },
}))

const adat = vi.hoisted(() => ({ tartalom: vi.fn(async () => null) }))
vi.mock("@lib/data/kezdolap-tartalom", () => ({
  kezdolapTartalom: adat.tartalom,
}))
vi.mock("@modules/kezdolap/fejlec", () => ({ default: () => null }))
vi.mock("@modules/layout/templates/footer", () => ({ default: () => null }))
vi.mock("@modules/layout/components/kosar-allapot", () => ({
  KosarAllapotProvider: () => null,
}))
vi.mock("@modules/layout/components/kosar-allapot/kosar-sziget", () => ({
  default: () => null,
}))
const regiFejlec = vi.hoisted(() => ({ hivas: 0 }))
vi.mock("@modules/layout/templates/nav", () => ({
  default: () => {
    regiFejlec.hivas++
    return null
  },
}))

import KezdolapFejlec from "@modules/kezdolap/fejlec"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import AruhazKeret from "."

type Elem = {
  type: unknown
  props: { children?: unknown } & Record<string, unknown>
}

function bejar(elem: unknown, ki: Elem[] = []): Elem[] {
  if (Array.isArray(elem)) {
    for (const gyerek of elem) bejar(gyerek, ki)
    return ki
  }
  if (elem && typeof elem === "object" && "type" in elem) {
    const e = elem as Elem
    ki.push(e)
    bejar(e.props.children, ki)
  }
  return ki
}

describe("a kirakat kerete", () => {
  it("a kezdőlap fejlécét és a közös láblécet adja, a régi fejléc nélkül, a gyerekkel", async () => {
    const fa = bejar(
      await AruhazKeret({ children: "tartalom", countryCode: "hu" }),
    )
    const fejlec = fa.find((e) => e.type === KezdolapFejlec)
    expect(fejlec?.props.countryCode).toBe("hu")
    expect(fa.some((e) => e.type === Footer)).toBe(true)
    expect(fa.some((e) => e.type === Nav)).toBe(false)
    expect(JSON.stringify(fa.map((e) => e.props.children))).toContain(
      "tartalom",
    )
    expect(adat.tartalom).toHaveBeenCalledTimes(1)
  })

  /*
    A NYELV AZ ELSO UTVONAL-SZEGMENSBOL JON, ES A KERET VISZI A FEJLECNEK ES A
    LABLECNEK. MI PIROSIT: ha a keret nem adja tovabb a szegmenst a lablecnek
    (az angol lap magyar lablecet kap), vagy a fejlec szovegeit nem a lap
    nyelvén kerdezi le.
  */
  it("az angol szegmens angol fejléc-szövegeket és a szegmenst a láblécnek adja, a magyar magyart", async () => {
    for (const [szegmens, savSzoveg] of [
      ["en-hu", "Open today 10:00–19:00"],
      ["hu", "Nyitva ma 10–19 óráig"],
    ] as const) {
      const fa = bejar(
        await AruhazKeret({ children: "x", countryCode: szegmens }),
      )
      const fejlec = fa.find((e) => e.type === KezdolapFejlec)
      const s = fejlec?.props.s as { szoveg: (kulcs: string) => string }
      expect(s.szoveg("fejlec.sav.3")).toBe(savSzoveg)
      expect(fa.find((e) => e.type === Footer)?.props.countryCode).toBe(
        szegmens,
      )
    }
  })

  it("sütit nem olvas", async () => {
    await AruhazKeret({ children: null, countryCode: "hu" })
    expect(suti.olvasasok).toBe(0)
    expect(regiFejlec.hivas).toBe(0)
  })
})
