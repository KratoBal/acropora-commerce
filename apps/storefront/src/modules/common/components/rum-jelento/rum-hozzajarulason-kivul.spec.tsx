import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * A RUM A HOZZAJARULASON KIVUL MARAD, CSAK AMIG NEM IR ES NEM OLVAS SEMMIT AZ ESZKOZON, ES NEM MEGY HARMADIK FELHEZ (kartya
 * dc8cabd2, acrobot 2026-11-19 02:19). EZ A TESZT TARTJA EZT A HATART. Ha barmikor eszkoz-oldali tarolas kerul a RUM-ba (suti,
 * localStorage, sessionStorage, IndexedDB, azonosito), onnantol az a Statisztika kategoria, es ez a teszt piros lesz: a
 * megoldas nem a teszt gyengitese, hanem a RUM hozzajarulas moge helyezese.
 *
 * MI PIROSIT: a kuldes sutit, localStorage-t, sessionStorage-t vagy IndexedDB-t ir; a kuldes nem a sajat eredet `/api/rum` utjara
 * megy; a torzs a negy mezonel tobbet visz (azonosito, URL); a forras barmelyik tarolo-API-t megnevezi.
 */
const jelentesek: ((metrika: {
  name: string
  value: number
  rating?: string
}) => void)[] = []
vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (f: (typeof jelentesek)[number]) => {
    jelentesek.push(f)
  },
}))

const kuldesek: { cel: string; torzs: string }[] = []
let sutiIrasok = 0
let tarolasIrasok = 0

beforeEach(() => {
  jelentesek.length = 0
  kuldesek.length = 0
  sutiIrasok = 0
  tarolasIrasok = 0
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_RUM_ARANY", "1")
  vi.spyOn(Math, "random").mockReturnValue(0)
  // minden iras-oldali tarolo megfigyelve
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => "",
    set: () => {
      sutiIrasok += 1
    },
  })
  for (const tarolo of [window.localStorage, window.sessionStorage])
    vi.spyOn(Object.getPrototypeOf(tarolo), "setItem").mockImplementation(
      () => {
        tarolasIrasok += 1
      },
    )
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: async (cel: string, adat: Blob) => {
      kuldesek.push({ cel, torzs: await adat.text() })
      return true
    },
  })
  vi.stubGlobal(
    "fetch",
    vi.fn(async (cel: string, init?: RequestInit) => {
      kuldesek.push({ cel, torzs: String(init?.body) })
      return new Response(null, { status: 204 })
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete (document as { cookie?: unknown }).cookie
})

describe("a RUM nem ir es nem olvas az eszkozon, es csak a sajat eredetnek kuld", () => {
  it("a kuldes utan nincs suti-iras, nincs tarolas, a cel a sajat /api/rum, a torzs csak a negy mezo", async () => {
    const { default: RumJelento } = await import("./index")
    render(<RumJelento />)
    expect(jelentesek).toHaveLength(1)
    for (const nev of ["LCP", "CLS", "INP", "FCP", "TTFB"])
      jelentesek[0]!({ name: nev, value: 1234.5, rating: "good" })
    // a beacon blob-olvasasa aszinkron
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(kuldesek).toHaveLength(5)
    for (const k of kuldesek) {
      // sajat eredet, relativ ut: nincs harmadik fel
      expect(k.cel).toBe("/api/rum")
      expect(Object.keys(JSON.parse(k.torzs)).sort()).toEqual([
        "n",
        "r",
        "t",
        "v",
      ])
    }
    expect(sutiIrasok).toBe(0)
    expect(tarolasIrasok).toBe(0)
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it("a RUM forrasa egyetlen tarolo-API-t sem nevez meg (suti, localStorage, sessionStorage, IndexedDB, Cache API)", () => {
    const fajlok = [
      join(__dirname, "index.tsx"),
      join(__dirname, "../../../../lib/util/rum.ts"),
      join(__dirname, "../../../../app/api/rum/route.ts"),
    ]
    const szoveg = fajlok.map((f) => readFileSync(f, "utf8")).join("\n")
    // a megjegyzesek kimaradnak: a tiltott nevek a kodban nem allhatnak, a magyarazatban igen
    const kod = szoveg
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
    for (const tiltott of [
      /document\.cookie/,
      /cookies?\s*\(/,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bindexedDB\b/,
      /\bcaches\b\s*\./,
      /Set-Cookie/i,
    ])
      expect(kod, String(tiltott)).not.toMatch(tiltott)
  })
})
