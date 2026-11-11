import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const rogzites = vi.fn(async (_: unknown) => "nincs-belepve")
// SAJAT PROMISE, nem a mocke: a vitest a mock visszaadott promise-ara figyelot tesz
// (settledResults), es attol egy kezeletlen elutasitas kezeltnek latszana
vi.mock("@lib/data/suti-hozzajarulas", () => ({
  sutiDontesRogzitese: async (d: unknown) => await rogzites(d),
}))
let utvonal = "/hu"
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => utvonal,
}))

import {
  olvasDontes,
  SUTI_HOZZAJARULAS_VERZIO,
  SUTI_NEV,
  sutiSor,
} from "@lib/util/suti-hozzajarulas"

import { SutiBeallitasGomb } from "./suti-beallitas-gomb"
import SutiAblak from "./suti-ablak"

/**
 * A SUTI-ABLAK (d5515c7d). MI PIROSIT: ha dontes nelkul nem jelenik meg, vagy
 * ervenyes dontesnel megis; ha a "Csak a szuksegesek" barmit engedelyez; ha a
 * Beallitasok alapbol bekapcsolt kategoriat mutat; ha a mentes nem a sutibe
 * megy, vagy nem frissiti a Consent Mode jeleit; ha a lablec gombja nem nyitja
 * ujra (visszavonas); ha a szerveres rogzites hibaja megakasztja a mentest;
 * ha az OS-elonezetben is megjelenik.
 */
const torolSuti = () => {
  document.cookie = `${SUTI_NEV}=; Path=/; Max-Age=0`
}
const gtag = vi.fn()

beforeEach(() => {
  torolSuti()
  utvonal = "/hu"
  gtag.mockReset()
  rogzites.mockClear()
  ;(window as { gtag?: unknown }).gtag = gtag
})
afterEach(() => {
  cleanup()
  torolSuti()
})

describe("az elso latogatas", () => {
  it("dontes nelkul megjelenik, harom gombbal es a ket tajekoztato linkjevel", () => {
    render(<SutiAblak />)
    expect(screen.getByTestId("suti-ablak").getAttribute("data-nezet")).toBe(
      "savos",
    )
    expect(screen.getByTestId("suti-mindet")).toBeTruthy()
    expect(screen.getByTestId("suti-szukseges")).toBeTruthy()
    expect(screen.getByTestId("suti-beallitasok-gomb")).toBeTruthy()
    expect(
      screen.getByTestId("suti-adatkezeles-link").getAttribute("href"),
    ).toBe("/hu/jogi/adatkezeles")
    expect(
      screen.getByTestId("suti-tajekoztato-link").getAttribute("href"),
    ).toBe("/hu/jogi/suti")
  })

  it("a Csak a szuksegesek mindent tilt, a sutibe ir, frissiti a jeleket, es bezar", () => {
    render(<SutiAblak />)
    fireEvent.click(screen.getByTestId("suti-szukseges"))
    expect(olvasDontes(document.cookie)).toMatchObject({
      statisztika: false,
      marketing: false,
    })
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    })
    expect(screen.queryByTestId("suti-ablak")).toBeNull()
    expect(rogzites).toHaveBeenCalledWith({
      statisztika: false,
      marketing: false,
    })
  })

  it("a Mindet elfogadom mindkettot engedi", () => {
    render(<SutiAblak />)
    fireEvent.click(screen.getByTestId("suti-mindet"))
    expect(olvasDontes(document.cookie)).toMatchObject({
      statisztika: true,
      marketing: true,
    })
    expect(gtag).toHaveBeenCalledWith(
      "consent",
      "update",
      expect.objectContaining({
        ad_storage: "granted",
        analytics_storage: "granted",
      }),
    )
  })

  it("a Beallitasokban a ket kategoria alapbol ki, es csak a kivalasztott megy", () => {
    render(<SutiAblak />)
    fireEvent.click(screen.getByTestId("suti-beallitasok-gomb"))
    const stat = screen.getByTestId("suti-statisztika") as HTMLInputElement
    const mark = screen.getByTestId("suti-marketing") as HTMLInputElement
    expect(stat.checked).toBe(false)
    expect(mark.checked).toBe(false)
    fireEvent.click(stat)
    fireEvent.click(screen.getByTestId("suti-mentes"))
    expect(olvasDontes(document.cookie)).toMatchObject({
      statisztika: true,
      marketing: false,
    })
  })

  it("a szerveres rogzites hibaja nem akasztja meg a helyi mentest, es nem marad kezeletlen", async () => {
    const kezeletlen: unknown[] = []
    const figyelo = (ok: unknown) => void kezeletlen.push(ok)
    process.on("unhandledRejection", figyelo)
    try {
      rogzites.mockRejectedValueOnce(new Error("halozat"))
      render(<SutiAblak />)
      fireEvent.click(screen.getByTestId("suti-mindet"))
      expect(olvasDontes(document.cookie)).toMatchObject({ statisztika: true })
      expect(screen.queryByTestId("suti-ablak")).toBeNull()
      await new Promise((r) => setTimeout(r, 0))
      expect(kezeletlen).toEqual([])
    } finally {
      process.off("unhandledRejection", figyelo)
    }
  })
})

describe("a meglevo dontes", () => {
  it("ervenyes dontesnel nem jelenik meg", () => {
    document.cookie = sutiSor(
      {
        verzio: SUTI_HOZZAJARULAS_VERZIO,
        idopont: "2026-11-11T00:00:00.000Z",
        statisztika: true,
        marketing: true,
      },
      false,
    )
    render(<SutiAblak />)
    expect(screen.queryByTestId("suti-ablak")).toBeNull()
  })

  it("regi verzioju dontesnel ujra kerdez", () => {
    document.cookie = sutiSor(
      {
        verzio: "2020-01-01",
        idopont: "2020-01-01T00:00:00.000Z",
        statisztika: true,
        marketing: true,
      },
      false,
    )
    render(<SutiAblak />)
    expect(screen.getByTestId("suti-ablak")).toBeTruthy()
  })

  it("a lablec gombja a beallitasokkal nyitja ujra, es ott visszavonhato", () => {
    document.cookie = sutiSor(
      {
        verzio: SUTI_HOZZAJARULAS_VERZIO,
        idopont: "2026-11-11T00:00:00.000Z",
        statisztika: true,
        marketing: true,
      },
      false,
    )
    render(
      <>
        <SutiAblak />
        <SutiBeallitasGomb felirat="Sütibeállítások" />
      </>,
    )
    expect(screen.queryByTestId("suti-ablak")).toBeNull()
    act(() => {
      fireEvent.click(screen.getByTestId("footer-suti-beallitasok"))
    })
    expect(screen.getByTestId("suti-ablak").getAttribute("data-nezet")).toBe(
      "beallitasok",
    )
    // az elozo dontes latszik, es egy kattintassal visszavonhato
    expect(
      (screen.getByTestId("suti-marketing") as HTMLInputElement).checked,
    ).toBe(true)
    fireEvent.click(screen.getByTestId("suti-szukseges"))
    expect(olvasDontes(document.cookie)).toMatchObject({
      statisztika: false,
      marketing: false,
    })
    expect(gtag).toHaveBeenLastCalledWith(
      "consent",
      "update",
      expect.objectContaining({
        ad_storage: "denied",
        analytics_storage: "denied",
      }),
    )
  })
})

describe("az OS-elonezet", () => {
  it("a kezdolap-elonezetben nem jelenik meg", () => {
    utvonal = "/hu/kezdolap-elonezet"
    render(<SutiAblak />)
    expect(screen.queryByTestId("suti-ablak")).toBeNull()
  })
})
