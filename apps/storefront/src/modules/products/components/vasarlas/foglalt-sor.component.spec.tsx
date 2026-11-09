import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { translator } from "@lib/i18n/dictionary"

import { MennyisegDoboz } from "./dobozok"
import { VasarlasProvider } from "./allapot"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/termek/darab",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))
const foglalas = vi.hoisted(() => ({ termekFoglalas: vi.fn() }))
vi.mock("@lib/data/kosar-foglalas", () => foglalas)

afterEach(() => {
  cleanup()
  foglalas.termekFoglalas.mockReset()
})

const termek = (egyedi: boolean) =>
  ({
    id: "prod_1",
    title: "Acropora abrolhosensis",
    handle: "acropora-abrolhosensis",
    metadata: egyedi ? { unique_piece: true } : {},
    options: [],
    variants: [
      { id: "var_1", title: "Alap", options: [], manage_inventory: false },
    ],
  }) as never

const lap = (egyedi: boolean) =>
  render(
    <VasarlasProvider product={termek(egyedi)}>
      <MennyisegDoboz />
    </VasarlasProvider>,
  )

/**
 * A TERMEKLAP "VALAKI KOSARABAN VAN" SORA (V2.3 S2b). MI PIROSIT: a masik kosarban allo darabnal
 * nincs sor, vagy a gomb kattinthato marad; szabad darabnal megjelenik a sor, vagy a gomb tiltott;
 * a nem egyedi termek is kerdez.
 */
describe("a más kosarában álló egyedi darab a terméklapon", () => {
  it("kiírja a sort a várható perccel, és a gomb tiltott", async () => {
    foglalas.termekFoglalas.mockResolvedValue({
      until: new Date(Date.now() + 12 * 60_000).toISOString(),
    })
    lap(true)
    const sor = await screen.findByTestId("foglalt-sor")
    expect(sor.getAttribute("role")).toBe("status")
    expect(sor.textContent).toMatch(
      /^Most valaki kosarában van\. 1[23] perc múlva/,
    )
    expect(foglalas.termekFoglalas).toHaveBeenCalledWith("var_1")
    expect(
      screen.getByTestId("add-product-button").hasAttribute("disabled"),
    ).toBe(true)
  })

  it("szabad darabnál nincs sor, a gomb a mai", async () => {
    foglalas.termekFoglalas.mockResolvedValue(null)
    lap(true)
    await vi.waitFor(() => expect(foglalas.termekFoglalas).toHaveBeenCalled())
    expect(screen.queryByTestId("foglalt-sor")).toBeNull()
    expect(
      screen.getByTestId("add-product-button").hasAttribute("disabled"),
    ).toBe(false)
  })

  it("nem egyedi terméknél nem is kérdez", async () => {
    lap(false)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(foglalas.termekFoglalas).not.toHaveBeenCalled()
    expect(translator("hu")("product.holdHeldByOther", { perc: 3 })).toMatch(
      /3 perc/,
    )
  })
})

/**
 * A LEJARAT IS ESEMENY (barracuda, #706 review, 1.). MI PIROSIT: a foglalas vege utan a sor ott marad,
 * a gomb tiltva, vagy a lap nem kerdez ujra; a "N perc mulva" nem fogy, amig a lapon varnak.
 */
describe("a foglalás lejárta a terméklapon", () => {
  afterEach(() => vi.useRealTimers())

  const egyKor = () =>
    act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

  it("a vége után a sor eltűnik, a gomb felszabadul, és a lap újra kérdez", async () => {
    vi.useFakeTimers()
    foglalas.termekFoglalas
      .mockResolvedValueOnce({
        until: new Date(Date.now() + 3 * 60_000).toISOString(),
      })
      .mockResolvedValue(null)
    lap(true)
    await egyKor()
    expect(screen.getByTestId("foglalt-sor").textContent).toMatch(/ 3 perc /)
    expect(
      screen.getByTestId("add-product-button").hasAttribute("disabled"),
    ).toBe(true)

    // percenkent fogy, amig a lapon varnak
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByTestId("foglalt-sor").textContent).toMatch(/ 2 perc /)

    await act(async () => {
      vi.advanceTimersByTime(2 * 60_000 + 1_000)
    })
    await egyKor()
    expect(screen.queryByTestId("foglalt-sor")).toBeNull()
    expect(
      screen.getByTestId("add-product-button").hasAttribute("disabled"),
    ).toBe(false)
    expect(foglalas.termekFoglalas).toHaveBeenCalledTimes(2)
  })

  it("ha a vevő órája előre jár, nem kérdez másodpercenként: legalább 15 mp-et vár", async () => {
    vi.useFakeTimers()
    // a bolt szerint még áll, a vevő órája szerint a vége már elmúlt
    foglalas.termekFoglalas.mockResolvedValue({
      until: new Date(Date.now() - 60_000).toISOString(),
    })
    lap(true)
    await egyKor()
    expect(foglalas.termekFoglalas).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(14_000)
    })
    await egyKor()
    expect(foglalas.termekFoglalas).toHaveBeenCalledTimes(1)
    await act(async () => {
      vi.advanceTimersByTime(1_100)
    })
    await egyKor()
    expect(foglalas.termekFoglalas).toHaveBeenCalledTimes(2)
  })
})
