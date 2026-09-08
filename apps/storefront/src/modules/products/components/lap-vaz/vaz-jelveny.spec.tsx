import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * A `next/image` jsdom-ban nem renderelodik (a `generateImgAttrs` elhasal a
 * kepmeret-konfiguracion). A repo mas specjei ugyanezt a `vi.mock` alakot
 * hasznaljak keret-darabokra.
 *
 * AMIT EZ NEM GYENGIT, es ezert nyugodtan all itt: a jelveny es az igeret NEM
 * a kep belsejeben keletkezik, hanem a galeria SAJAT elemei, a kep MELLETT.
 * Amit ez a mock elvesz, az kizarolag a kep-attributumok szamolasa -- arrol
 * pedig nem allitok semmit.
 */
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    <img alt={String(props.alt ?? "")} src={String(props.src ?? "")} />
  ),
}))

import ImageGallery from "@modules/products/components/image-gallery"
import LapVaz from "./index"
import { vazTartalom } from "./valodi-tartalom"

afterEach(cleanup)

const KEPEK = [
  { id: "img_1", url: "https://pelda.hu/1.jpg", rank: 0 },
  { id: "img_2", url: "https://pelda.hu/2.jpg", rank: 1 },
] as never

const KORALL = {
  id: "prod_1",
  title: "Acropora tenuis",
  thumbnail: "https://pelda.hu/1.jpg",
  images: KEPEK,
  categories: [],
  variants: [],
} as never

/**
 * A JELVENY ES AZ IGERET TULELI-E A VAZRA KOLTOZEST.
 *
 * === MIERT KELL, HOLOTT MAR VAN KET ALLITAS A KORNYEKEN ===
 *
 * A #91 azt meri, hogy a sablon ATADJA a galeriat (forras-szinten), a #89 azt,
 * hogy az atadott tartalom a vaz sajat fotoja HELYETT all. Egyik sem meri azt,
 * amiert az egesz keszult: hogy a jelveny es az igeret-mondat OTT VAN a
 * megrendelt lapon.
 *
 * Nautilus kifejezetten ezt kerte (14450), es igaza volt: enelkul pontosan az a
 * regresszio allhatna elo, ami a fuleknel ma mar egyszer megtortent -- a vaz
 * megkerult egy mar beolvadt munkat, es senki nem vette eszre.
 *
 * ES MOSTANTOL ELESBEN IS SZAMIT: a koltozes-kapcsolo BE van kapcsolva, tehat
 * az elo allat lapja tenylegesen ezen az uton megy.
 */
describe("az egyedi példány jelvénye a vázon", () => {
  const vazzal = (uniquePiece: boolean) =>
    render(
      <LapVaz
        vilag="sotet"
        tartalom={vazTartalom(
          KORALL,
          undefined,
          undefined,
          <ImageGallery images={KEPEK} uniquePiece={uniquePiece} />,
        )}
      />,
    )

  it("a jelvény és az ígéret ott áll a vázon", () => {
    vazzal(true)

    expect(screen.getByTestId("unique-piece-badge")).toBeTruthy()
    expect(screen.getByTestId("unique-piece-promise")).toBeTruthy()
  })

  /**
   * ES A JELVENY A FOTO DOBOZAN BELUL All, nem valahol a lapon. Enelkul egy
   * olyan valtozat is zold maradna, ami a jelvenyt egy masik dobozba teszi.
   */
  it("a jelvény a fotó dobozában áll", () => {
    vazzal(true)

    const fotoDoboz = document.querySelector('[data-vaz-szakasz="foto"]')
    expect(
      fotoDoboz?.querySelector('[data-testid="unique-piece-badge"]'),
    ).toBeTruthy()
  })

  /**
   * ISMERT NEGATIV PAR: ha a termek NEM egyedi darab, a jelveny NINCS ott. Ez
   * bizonyitja, hogy a fenti ket allitas tenylegesen a jelzotol fugg, es nem
   * attol, hogy a galeria mindig kirajzol valamit.
   */
  it("nem egyedi darabnál nincs jelvény és nincs ígéret", () => {
    vazzal(false)

    expect(screen.queryByTestId("unique-piece-badge")).toBeNull()
    expect(screen.queryByTestId("unique-piece-promise")).toBeNull()
  })
})
