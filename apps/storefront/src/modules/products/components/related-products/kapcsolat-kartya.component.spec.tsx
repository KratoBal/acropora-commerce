import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

import KapcsolatKartya from "./kapcsolat-kartya"

afterEach(cleanup)

const termek = (extra: Record<string, unknown> = {}) =>
  ({
    id: "p1",
    handle: "fuggeszto-szett",
    title: "Függesztő szett 60 cm",
    thumbnail: "https://pelda/kep.jpg",
    variants: [
      {
        id: "v1",
        calculated_price: {
          calculated_amount: 34900,
          original_amount: 34900,
          currency_code: "huf",
          calculated_price: { price_list_type: "default" },
        },
      },
    ],
    ...extra,
  }) as never

/**
 * A KAPCSOLODO TERMEK KARTYAJA (193:186). MI PIROSIT: ha nem a termeklapra
 * visz; ha a kep nem a keret 32:30-as doboza; ha az ar nem a halvany sor;
 * ha kep nelkul kitalalt kepet mutat.
 */
describe("a kapcsolódó termék 1b kártyája", () => {
  it("a terméklapra visz, névvel és halvány árral", () => {
    render(<KapcsolatKartya product={termek()} />)
    const kartya = screen.getByTestId("kapcsolat-kartya")
    expect(kartya.getAttribute("href")).toBe("/hu/products/fuggeszto-szett")
    expect(kartya.textContent).toContain("Függesztő szett 60 cm")
    expect(screen.getByTestId("kapcsolat-kartya-ar").className).toContain(
      "text-acr-slate",
    )
    expect(
      screen.getByTestId("kapcsolat-kartya-kep").parentElement?.className,
    ).toContain("aspect-[32/30]")
  })

  it("kép nélkül üres a kép helye, nem kitalált kép", () => {
    render(
      <KapcsolatKartya product={termek({ thumbnail: null, images: [] })} />,
    )
    expect(screen.queryByTestId("kapcsolat-kartya-kep")).toBeNull()
  })
})
