import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageGallery from "./index"
import { KEP_ARANY, TovabbiKepek } from "./kep-meret"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const kep = (i: number) => ({ id: `k${i}`, url: `https://pelda/k${i}.jpg` })

/**
 * A KEP-BLOKK KET IRANYA.
 *
 * Balazs kerese ket dolog egyszerre: a nagy kep legyen KISEBB, es a TOBBI kep
 * kerüljon ala, kicsiben. A ketto kulon romolhat el, ezert kulon allitas meri
 * oket -- es a "tobbi kep" iranyahoz kell egy egy-kepes eset is, kulonben az
 * allitas nem tudna, mit jelent az, hogy nincs sor.
 */
describe("a nagy kép kisebb, a többi alatta", () => {
  it("három képnél egy nagy áll, és kettő a sorban", () => {
    render(<ImageGallery images={[kep(1), kep(2), kep(3)] as never} />)

    expect(screen.getAllByTestId("tovabbi-kep")).toHaveLength(2)
  })

  /**
   * EGYETLEN KEPNEL NINCS SOR, es ez nem elmeleti eset: a teszt bolton merve
   * szaz termekbol HATVANEGYNEK pontosan egy kepe van. Egy ures, de meglevo
   * sav a termekek tobbsegen foglalna helyet.
   */
  it("egyetlen képnél nincs sor", () => {
    render(<ImageGallery images={[kep(1)] as never} />)

    expect(screen.queryByTestId("tovabbi-kepek")).toBeNull()
  })

  it("üres listára a sor semmit nem rajzol", () => {
    render(<TovabbiKepek kepek={[]} />)

    expect(screen.queryByTestId("tovabbi-kepek")).toBeNull()
  })

  /**
   * A NAGY KEP ARANYA A TERVLAPROL JON, ES A SZELESSEGE NINCS KORLATOZVA.
   *
   * A tervlapon a foto KITOLTI a bal oszlopot, es 16:10 all rajta kiirva. Az
   * elso valtozatom egy 452 pixeles maximumot tett ra -- azt ez az allitas
   * fogja meg, ha valaha visszakerulne.
   *
   * jsdom nem szamol elrendezest, tehat a MODOT merjuk (arany plusz teljes
   * szelesseg), nem a kirajzolt pixelt.
   */
  it("a nagy kép 16:10, és nincs szélesség-korlátja", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[data-testid="nagy-kep"]',
    ) as HTMLElement | null

    expect(doboz).toBeTruthy()
    expect(doboz!.style.aspectRatio.replace(/\s/g, "")).toBe(
      KEP_ARANY.replace(/\s/g, ""),
    )
    expect(doboz!.style.maxWidth).toBe("")
    expect(doboz!.style.width).toBe("")
    expect(doboz!.className).toContain("w-full")
  })

  /**
   * A SOR A TERVLAP SZERINT HAT OSZLOPOS ASZTALON, ES HAROM TELEFONON.
   *
   * A hat a tervlapon all (hat csempe egy sorban). A harom az en dontesem: hat
   * csempe egy 375 pixeles telefonon egyenkent 55 pixel lenne, es azon a
   * kepbol nem latszik semmi. A sor tehat nem gorget es nem zsugorodik
   * olvashatatlanra, hanem kevesebb oszlopot hasznal.
   */
  it("a sor hat oszlopos asztalon, három telefonon", () => {
    render(<ImageGallery images={[kep(1), kep(2)] as never} />)

    const sor = screen.getByTestId("tovabbi-kepek")

    expect(sor.className).toContain("lg:grid-cols-6")
    expect(sor.className).toContain("grid-cols-3")
  })
})
