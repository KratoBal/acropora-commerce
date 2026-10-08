import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageGallery from "./index"
import { KepBlokk } from "./kep-blokk"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const kep = (i: number) => ({ id: `k${i}`, url: `https://pelda/k${i}.jpg` })

/**
 * A SAJAT ALT ELJUT A KEPIG, MINDKET KEP-UTON (SEO P0 PR 9).
 *
 * MI PIROSIT: ha a galeria vagy a kep-blokk nem adja tovabb az `altok`-at, ha
 * nem a nagy kep URL-jevel keres, vagy ha sajat alt nelkul nem a termek neve
 * marad.
 */
describe("a kép saját alt-ja a lapon", () => {
  const altok = { "https://pelda/k1.jpg": "Pumpa elölről" }

  it("a galéria nagy képe a saját altot viseli", () => {
    const { container } = render(
      <ImageGallery
        images={[kep(1), kep(2)] as never}
        nev="Pumpa"
        altok={altok}
      />,
    )
    const nagy = container.querySelector('[data-testid="nagy-kep"] img')
    expect(nagy?.getAttribute("alt")).toBe("Pumpa elölről")
  })

  it("saját alt nélkül a galéria a termék nevét adja", () => {
    const { container } = render(
      <ImageGallery images={[kep(2)] as never} nev="Pumpa" altok={altok} />,
    )
    const nagy = container.querySelector('[data-testid="nagy-kep"] img')
    expect(nagy?.getAttribute("alt")).toBe("Pumpa")
  })

  it("a kép-blokk nagy képe a saját altot viseli, nélküle a nevet", () => {
    const { container, rerender } = render(
      <KepBlokk kepek={[kep(1)]} alt="Pumpa" altok={altok} />,
    )
    expect(
      container.querySelector('[data-testid="vaz-foto"]')?.getAttribute("alt"),
    ).toBe("Pumpa elölről")

    rerender(<KepBlokk kepek={[kep(2)]} alt="Pumpa" altok={altok} />)
    expect(
      container.querySelector('[data-testid="vaz-foto"]')?.getAttribute("alt"),
    ).toBe("Pumpa")
  })
})
