import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let utvonal = "/hu"
vi.mock("next/navigation", () => ({
  usePathname: () => utvonal,
}))

import {
  SUTI_DONTES_ESEMENY,
  SUTI_HOZZAJARULAS_VERZIO,
  SUTI_NEV,
  sutiSor,
} from "@lib/util/suti-hozzajarulas"

import Merokodok from "./merokodok"

/**
 * A MEROKODOK KOMPONENSE (kartya dc8cabd2). MI PIROSIT: azonosito vagy dontes nelkul barmi betoltodik (script, gtag-hivas, fbq);
 * a Statisztika a Marketing eszkozet tolti vagy forditva; a lap megnyitasa a dontes elott hiv; a hozzajarulas megadasa nem
 * indit; a VISSZAVONAS nem torli a sutiket (a Statisztikaé a Marketingeket sem), nem allitja le az esemenyeket, vagy a pixelnek
 * nem mond revoke-ot; a rendeles/fiok lapjarol esemeny megy, vagy a mero script az igazi cimet (token) latja; egy lap
 * ketszer kap oldalmegtekintest; a lapvaltas nem kap.
 */
const JO = {
  ga4: "G-ABCDE12345",
  ads: "AW-123456789",
  meta: "1234567890123456",
}

const gtag = vi.fn()
const fbq = vi.fn()
const scriptek: string[] = []
let scriptSpy: ReturnType<typeof vi.spyOn>

const dontes = (statisztika: boolean, marketing: boolean) => {
  document.cookie = sutiSor(
    {
      verzio: SUTI_HOZZAJARULAS_VERZIO,
      idopont: "2026-11-19T00:00:00.000Z",
      statisztika,
      marketing,
    },
    false,
  )
}
const valtozas = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent(SUTI_DONTES_ESEMENY))
  })
const torolMindent = () => {
  for (const sor of document.cookie.split(";")) {
    const nev = sor.split("=")[0]!.trim()
    if (nev) document.cookie = `${nev}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  torolMindent()
  utvonal = "/hu"
  gtag.mockReset()
  fbq.mockReset()
  scriptek.length = 0
  ;(window as { gtag?: unknown }).gtag = gtag
  delete (window as { fbq?: unknown }).fbq
  delete (window as { _fbq?: unknown })._fbq
  // a script-beillesztes megfigyelve: egyetlen valodi kulso kerest sem inditunk
  scriptSpy = vi.spyOn(document.head, "appendChild").mockImplementation(((
    elem: Node,
  ) => {
    scriptek.push((elem as HTMLScriptElement).src)
    return elem
  }) as never)
})
afterEach(() => {
  cleanup()
  scriptSpy.mockRestore()
  torolMindent()
  delete (window as { fbq?: unknown }).fbq
})

const esemenyek = (nev: string) => gtag.mock.calls.filter((h) => h[0] === nev)

describe("amig nincs azonosito vagy dontes: semmi", () => {
  it("azonosito nelkul a legteljesebb dontes mellett sem tolt, es nem hivja a gtag-ot", () => {
    dontes(true, true)
    render(<Merokodok ga4={null} ads={null} meta={null} />)
    expect(scriptek).toEqual([])
    expect(gtag).not.toHaveBeenCalled()
  })

  it("dontes nelkul (nincs suti, vagy nem a mai verzio) azonositokkal sem tolt", () => {
    render(<Merokodok {...JO} />)
    expect(scriptek).toEqual([])
    expect(gtag).not.toHaveBeenCalled()
    document.cookie = `${SUTI_NEV}=${encodeURIComponent(JSON.stringify({ v: "regi", t: "x", s: 1, m: 1 }))}; Path=/`
    cleanup()
    render(<Merokodok {...JO} />)
    expect(scriptek).toEqual([])
    expect(gtag).not.toHaveBeenCalled()
  })

  it("a ketto 'nem' valasz sem tolt", () => {
    dontes(false, false)
    render(<Merokodok {...JO} />)
    expect(scriptek).toEqual([])
    expect(gtag).not.toHaveBeenCalled()
  })
})

describe("a kategoriak kulon engednek", () => {
  it("csak Statisztika: a GA4 tolt es konfiguralodik, az Ads es a pixel nem", () => {
    dontes(true, false)
    render(<Merokodok {...JO} />)
    expect(scriptek).toEqual([
      "https://www.googletagmanager.com/gtag/js?id=G-ABCDE12345",
    ])
    expect(esemenyek("config").map((h) => h[1])).toEqual(["G-ABCDE12345"])
    expect(esemenyek("config")[0]![2]).toEqual({ send_page_view: false })
    expect((window as { fbq?: unknown }).fbq).toBeUndefined()
    expect(esemenyek("event")[0]![2].send_to).toEqual(["G-ABCDE12345"])
  })

  it("csak Marketing: az Ads es a pixel tolt, a GA4 nem; a pixel automatikus esemenyei kikapcsolva", () => {
    dontes(false, true)
    ;(window as { fbq?: unknown }).fbq = fbq
    render(<Merokodok {...JO} />)
    expect(scriptek).toEqual([
      "https://www.googletagmanager.com/gtag/js?id=AW-123456789",
      "https://connect.facebook.net/en_US/fbevents.js",
    ])
    expect(esemenyek("config").map((h) => h[1])).toEqual(["AW-123456789"])
    expect(fbq.mock.calls).toEqual([
      ["consent", "grant"],
      ["set", "autoConfig", false, "1234567890123456"],
      ["init", "1234567890123456"],
      ["track", "PageView"],
    ])
  })
})

describe("a hozzajarulas valtozasa", () => {
  it("megadas utan toltodik (a lap megnyitasakor nem), es egyszer", () => {
    render(<Merokodok {...JO} />)
    expect(scriptek).toEqual([])
    dontes(true, false)
    valtozas()
    expect(scriptek).toHaveLength(1)
    valtozas()
    expect(scriptek).toHaveLength(1)
    expect(esemenyek("config")).toHaveLength(1)
  })

  it("visszavonas: a kategoria sutijei torlodnek (a masiké nem), a pixel revoke-ot kap, es nincs tobb esemeny", () => {
    dontes(true, true)
    ;(window as { fbq?: unknown }).fbq = fbq
    render(<Merokodok {...JO} />)
    document.cookie = "_ga=GA1.2.3; Path=/"
    document.cookie = "_gid=x; Path=/"
    document.cookie = "_fbp=fb.1; Path=/"
    document.cookie = "_gcl_au=1; Path=/"
    document.cookie = "_medusa_cart_id=cart; Path=/"
    gtag.mockClear()
    fbq.mockClear()

    // a Marketing vissza, a Statisztika marad
    dontes(true, false)
    valtozas()
    expect(document.cookie).not.toContain("_fbp")
    expect(document.cookie).not.toContain("_gcl_au")
    expect(document.cookie).toContain("_ga=")
    expect(document.cookie).toContain("_medusa_cart_id")
    expect(fbq).toHaveBeenCalledWith("consent", "revoke")

    // a Statisztika is vissza
    dontes(false, false)
    valtozas()
    expect(document.cookie).not.toContain("_ga=")
    expect(document.cookie).not.toContain("_gid")
    expect(document.cookie).toContain("_medusa_cart_id")
    expect(document.cookie).toContain(SUTI_NEV)

    // lapvaltas a visszavonas utan: nincs esemeny
    gtag.mockClear()
    fbq.mockClear()
    utvonal = "/hu/store"
    cleanup()
    render(<Merokodok {...JO} />)
    expect(esemenyek("event")).toEqual([])
    expect(fbq).not.toHaveBeenCalledWith("track", "PageView")
  })

  it("a visszavonas a nem betoltott lapon is torli a korabbi lapról maradt sutiket", () => {
    document.cookie = "_ga=GA1.2.3; Path=/"
    document.cookie = "_fbp=fb.1; Path=/"
    render(<Merokodok {...JO} />)
    dontes(false, false)
    valtozas()
    expect(document.cookie).not.toContain("_ga=")
    expect(document.cookie).not.toContain("_fbp")
  })

  it("megadas, visszavonas, ujra megadas: a pixel consent-je ujra enged, az init nem ismetlodik", () => {
    ;(window as { fbq?: unknown }).fbq = fbq
    render(<Merokodok {...JO} />)
    dontes(false, true)
    valtozas()
    dontes(false, false)
    valtozas()
    dontes(false, true)
    valtozas()
    const hivasok = fbq.mock.calls.map((h) => h.slice(0, 2).join(":"))
    expect(hivasok.filter((h) => h === "init:1234567890123456")).toHaveLength(1)
    expect(hivasok.filter((h) => h === "consent:grant")).toHaveLength(2)
    expect(hivasok.filter((h) => h === "consent:revoke")).toHaveLength(1)
  })
})

describe("az oldalmegtekintes", () => {
  it("lapvaltasonkent egyszer, ujrarajzolasra nem ismetlodik", () => {
    dontes(true, false)
    const { rerender } = render(<Merokodok {...JO} />)
    expect(esemenyek("event")).toHaveLength(1)
    rerender(<Merokodok {...JO} />)
    expect(esemenyek("event")).toHaveLength(1)
    utvonal = "/hu/store"
    rerender(<Merokodok {...JO} />)
    expect(esemenyek("event")).toHaveLength(2)
    expect(esemenyek("event")[1]![2].page_path).toBe("/hu/store")
  })

  it("a rendeles lapjarol nincs esemeny, es a mero script cime altalanos: a token nem jut el hozza", () => {
    dontes(true, true)
    ;(window as { fbq?: unknown }).fbq = fbq
    utvonal = "/hu/rendeles-fizetese/titkos-token-123"
    render(<Merokodok {...JO} />)
    expect(esemenyek("event")).toEqual([])
    expect(fbq).not.toHaveBeenCalledWith("track", "PageView")
    const beallitas = esemenyek("set")
      .map((h) => JSON.stringify(h[1]))
      .join(" ")
    expect(beallitas).toContain("/hu/rendeles")
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("titkos-token-123")
  })

  it("eszkozonkent egyszer: a kesobb megadott Marketing a mar latott lapot is megkapja, a GA4 nem kap duplat", () => {
    dontes(true, false)
    ;(window as { fbq?: unknown }).fbq = fbq
    render(<Merokodok {...JO} />)
    expect(esemenyek("event")).toHaveLength(1)
    expect(esemenyek("event")[0]![2].send_to).toEqual(["G-ABCDE12345"])
    dontes(true, true)
    valtozas()
    const kuldesek = esemenyek("event").map((h) => h[2].send_to)
    expect(kuldesek).toEqual([["G-ABCDE12345"], ["AW-123456789"]])
    expect(fbq.mock.calls.filter((h) => h[1] === "PageView")).toHaveLength(1)
    // ujabb valtozas ugyanazon a lapon: semmi uj, a pixel sem kap duplat
    valtozas()
    expect(esemenyek("event")).toHaveLength(2)
    expect(fbq.mock.calls.filter((h) => h[1] === "PageView")).toHaveLength(1)
  })

  it("visszavonas es ujra megadas ugyanazon a lapon: az oldalmegtekintes ujra kimegy (az eszkoz kozben nem latta)", () => {
    dontes(true, false)
    render(<Merokodok {...JO} />)
    dontes(false, false)
    valtozas()
    dontes(true, false)
    valtozas()
    expect(esemenyek("event")).toHaveLength(2)
  })

  it("a rendeles lapjan a mero script nem kapja az igazi cimet, es az esemeny sem viszi", () => {
    // a bongeszo cime az igazi (benne a token): a komponens ezt SEM adhatja at
    window.history.pushState({}, "", "/hu/rendeles-fizetese/titkos-token-123")
    dontes(true, false)
    utvonal = "/hu/rendeles-fizetese/titkos-token-123"
    render(<Merokodok {...JO} />)
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("titkos-token-123")
    expect(JSON.stringify(gtag.mock.calls)).toContain("/hu/rendeles")
    window.history.pushState({}, "", "/")
  })

  it("egy kozonseges lapon a mero script cime az eredet + a latszo utvonal", () => {
    dontes(true, false)
    utvonal = "/hu/store?q=a"
    render(<Merokodok {...JO} />)
    const beallitas = esemenyek("set")[0]![1] as {
      page_location: string
      page_path: string
    }
    expect(beallitas.page_path).toBe("/hu/store")
    expect(beallitas.page_location).toBe(`${window.location.origin}/hu/store`)
  })

  it("a lekerdezes nem megy ki a merofelnek (a bongeszo cimeben benne van, az esemeny es a beallitas nem viszi)", () => {
    window.history.pushState({}, "", "/hu/store?q=titok&token=abc")
    dontes(true, false)
    utvonal = "/hu/store?q=titok&token=abc"
    render(<Merokodok {...JO} />)
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("titok")
    const esemeny = esemenyek("event")[0]![2] as {
      page_location: string
      page_path: string
    }
    expect(esemeny.page_path).toBe("/hu/store")
    expect(esemeny.page_location).toBe(`${window.location.origin}/hu/store`)
    window.history.pushState({}, "", "/")
  })
})
