import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { AdagoloKalkulator } from "./adagolo-kalkulator"

afterEach(cleanup)

/*
  AZ ADAGOLO-KALKULATOR (V3.1, kartya 7fdbb15d). MI PIROSIT: a kiirt adag a gyartoi arany folott van; 1 csepp
  alatt szam jelenik meg; a nagy lefele-elteresnel a pontos ertek hianyzik; egy hibas liter eredmenyt ad; a
  gyarto sora vagy a figyelmeztetes hianyzik; egy nem kanonikus erteken doboz jelenik meg.
*/
const beir = (ertek: string) =>
  fireEvent.change(screen.getByTestId("adagolo-liter"), {
    target: { value: ertek },
  })

describe("az adagolo-kalkulator", () => {
  it("a medence literebol az alkalmankenti adagot adja, a gyarto soraval es a figyelmeztetessel", () => {
    render(<AdagoloKalkulator ertek="5 ml/100 L/day" />)
    expect(screen.getByTestId("adagolo-gyarto").textContent).toBe(
      "A gyártó szerint: 5 ml / 100 liter, naponta",
    )
    expect(
      screen.getByText(/A gyártó útmutatója az irányadó/),
    ).toBeInTheDocument()
    beir("250")
    expect(screen.getByTestId("adagolo-adag").textContent).toBe(
      "250 literes medencébe alkalmanként 12,5 ml kell, naponta egyszer.",
    )
    expect(screen.queryByTestId("adagolo-pontos")).toBeNull()
  })

  it("1 csepp alatt nincs szam: a pontos ertek es a gyartoi utmutato", () => {
    render(<AdagoloKalkulator ertek="1 drop/100 L, 1-2/week" />)
    beir("60")
    expect(screen.queryByTestId("adagolo-adag")).toBeNull()
    expect(screen.getByTestId("adagolo-tul-kicsi").textContent).toContain(
      "a pontos adag 0,6 csepp",
    )
  })

  // barracuda, #682 a: 99,6 L-nel a pontos adag 0,996 csepp; kerekitve "1 csepp" allna a "tul keves" mondatban
  it("a tul kicsi adag pontos erteke is lefele kerekit, nem lesz belole 1 csepp", () => {
    render(<AdagoloKalkulator ertek="1 drop/100 L/day" />)
    beir("99,6")
    expect(screen.getByTestId("adagolo-tul-kicsi").textContent).toContain(
      "a pontos adag 0,99 csepp",
    )
  })

  it("lefele kerekit, es 20 szazalek folott a pontos erteket is kiirja", () => {
    render(<AdagoloKalkulator ertek="1 drop/100 L/day" />)
    beir("150")
    expect(screen.getByTestId("adagolo-adag").textContent).toContain(
      "alkalmanként 1 csepp kell",
    )
    expect(screen.getByTestId("adagolo-pontos").textContent).toBe(
      "Lefelé kerekítettünk: a pontos adag 1,5 csepp.",
    )
  })

  it("a hibas liter nem ad eredmenyt, a hibat a sajat neven nevezi", () => {
    render(<AdagoloKalkulator ertek="5 ml/100 L/day" />)
    beir("abc")
    expect(screen.getByTestId("adagolo-hiba").textContent).toBe(
      "Számot írj be, például 250.",
    )
    expect(screen.queryByTestId("adagolo-eredmeny")).toBeNull()
    beir("0")
    expect(screen.getByTestId("adagolo-hiba").textContent).toBe(
      "A térfogat legyen nagyobb nullánál.",
    )
  })

  it("angolul az angol szovegek", () => {
    render(<AdagoloKalkulator ertek="2 drop/50 L, 3/week" locale="en" />)
    beir("200")
    expect(screen.getByTestId("adagolo-adag").textContent).toBe(
      "For a 200-litre tank: 8 drops per dose, 3 times a week.",
    )
    expect(screen.getByTestId("adagolo-gyarto").textContent).toBe(
      "According to the manufacturer: 2 drops / 50 litres, 3 times weekly",
    )
  })

  it("nem kanonikus erteken nincs doboz", () => {
    render(<AdagoloKalkulator ertek="1-2 drop/100 L/day" />)
    expect(screen.queryByTestId("adagolo-kalkulator")).toBeNull()
  })
})
