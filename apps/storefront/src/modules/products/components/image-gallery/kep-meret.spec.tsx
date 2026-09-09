import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageGallery from "./index"
import { NAGY_KEP_MAX, TovabbiKepek } from "./kep-meret"

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
   * A KORLAT MAXIMUM, NEM ROGZITETT SZELESSEG -- ES EZ A MOBIL VISELKEDES.
   *
   * `w-full` plusz `maxWidth`: a toresrpont alatt a kep TELJES szelessegu
   * marad (egy 375 pixeles telefonon 375), mert a korlat csak akkor lep
   * eletbe, ha van hova. Ha valaki rogzitett szelessegre cserelne, a kep a
   * telefonon is 452 pixel maradna, es ez az allitas fogja meg.
   *
   * jsdom nem szamol elrendezest, tehat a MODOT merjuk (maximum kontra
   * rogzitett), nem a kirajzolt pixelt.
   */
  it("a nagy kép maximumot kap, és teljes szélességű marad alatta", () => {
    const { container } = render(<ImageGallery images={[kep(1)] as never} />)

    const doboz = container.querySelector(
      '[class*="aspect-"]',
    ) as HTMLElement | null

    expect(doboz).toBeTruthy()
    expect(doboz!.style.maxWidth).toBe(`${NAGY_KEP_MAX}px`)
    expect(doboz!.style.width).toBe("")
    expect(doboz!.className).toContain("w-full")
  })
})
