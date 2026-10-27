import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const preload = vi.hoisted(() => vi.fn())
vi.mock("react-dom", async (eredeti) => ({
  ...(await eredeti<typeof import("react-dom")>()),
  preload,
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

import { KepBlokk } from "./kep-blokk"

afterEach(() => {
  cleanup()
  preload.mockClear()
})

const kep = (i: number) => ({
  id: `k${i}`,
  url: `https://pelda.test/k${i}.jpg`,
})

/**
 * A NEM ELO ALLATOS TERMEKLAP FO KEPE ELOTOLTODIK (audit T4). MI PIROSIT: ha a
 * fo kep nem kap `<link rel="preload" as="image">`-et (a `getImageProps` +
 * sima `<img>` ezt nem teszi meg, csak a `fetchpriority`-t az elemen); ha az
 * elotoltes nem a Next optimalizalojan at kert, srcset-es kepre szol (a
 * bongeszo MASIK fajlt toltene le, mint amit kirajzol); ha egy kattintassal
 * kivalasztott MASODIK kep is elotoltest kapna (sávszélesség egy nem LCP
 * kepre); ha ures kepkeszletnel hivas lenne.
 */
describe("a fő kép előtöltése", () => {
  it("az első képre előtöltést kér, magas prioritással, ugyanazzal a srcset-tel és mérettel, mint a kirajzolt kép", () => {
    render(<KepBlokk kepek={[kep(1), kep(2)]} alt="Termék" />)
    expect(preload).toHaveBeenCalledTimes(1)
    const [href, opciok] = preload.mock.calls[0] as [
      string,
      Record<string, string>,
    ]
    const nagy = screen.getByTestId("vaz-foto") as HTMLImageElement
    expect(href).toBe(nagy.getAttribute("src"))
    expect(opciok.as).toBe("image")
    expect(opciok.fetchPriority).toBe("high")
    expect(opciok.imageSrcSet).toBe(nagy.getAttribute("srcset"))
    expect(opciok.imageSizes).toBe(nagy.getAttribute("sizes"))
    // a Next optimalizalojan at, nem a nyers fajlra
    expect(href).toContain("/_next/image")
  })

  it("a kattintással kiválasztott második kép nem kap előtöltést", () => {
    render(<KepBlokk kepek={[kep(1), kep(2)]} alt="Termék" />)
    preload.mockClear()
    fireEvent.click(screen.getAllByTestId("tovabbi-kep")[1]!)
    expect(preload).not.toHaveBeenCalled()
  })

  it("kép nélkül nincs hívás", () => {
    render(<KepBlokk kepek={[]} alt="Termék" />)
    expect(preload).not.toHaveBeenCalled()
  })
})
