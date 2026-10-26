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

  it("sütit nem olvas", async () => {
    await AruhazKeret({ children: null, countryCode: "hu" })
    expect(suti.olvasasok).toBe(0)
    expect(regiFejlec.hivas).toBe(0)
  })
})
