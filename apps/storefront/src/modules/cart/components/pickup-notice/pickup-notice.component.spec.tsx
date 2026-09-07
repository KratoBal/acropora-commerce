import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import PickupNotice from "./index"

afterEach(cleanup)

describe("az átvételi sáv kirajzolása", () => {
  /**
   * AZ ISMERT POZITIV KONTROLL ELOL: enelkul a "nem jelenik meg" allitas egy
   * olyan dobozon is zold lenne, ami SOHA nem jelenik meg.
   */
  it("megnevezi mindegyik tételt, ami miatt bolti átvétel van", () => {
    render(<PickupNotice lines={["Acropora tenuis", "Zoanthus keverék"]} />)

    const lista = screen.getByTestId("pickup-notice-lines")
    expect(lista.querySelectorAll("li")).toHaveLength(2)
    expect(lista).toHaveTextContent("Acropora tenuis")
    expect(lista).toHaveTextContent("Zoanthus keverék")
  })

  it("a bolt címe és nyitvatartása ott áll", () => {
    render(<PickupNotice lines={["Acropora tenuis"]} />)

    expect(screen.getByTestId("pickup-notice")).toHaveTextContent(
      "1106 Budapest, Pesti Gábor utca 35",
    )
    expect(screen.getByTestId("pickup-notice")).toHaveTextContent(
      "Kedd–Péntek 10–18",
    )
  })

  /**
   * ES HA NINCS BOLTI ATVETEL, A SAV NEM ALL OTT. Ez NEM az "ures doboz"
   * szabaly ala esik: nem egy hianyzo adat helye, hanem egy allapot, ami nem
   * all fenn.
   *
   * A LATHATOSAGOT MOSTANTOL A `visible` DONTI EL, NEM A LISTA HOSSZA, es ez
   * nem atnevezes. A ket kerdes SZETVALT, amikor a sav a valodi jelre kerult:
   * a hatteroldal mondja meg, hogy a kosar bolti atveteles-e, a sorok
   * megnevezese ettol FUGGETLENUL sikerulhet vagy nem. Amig a lista hossza
   * dontott, egy meg nem nevezheto korlatozas ELTUNT volna.
   */
  it("bolti átvétel nélkül nem jelenik meg", () => {
    const { container } = render(<PickupNotice visible={false} lines={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  /**
   * A HATARESET, AMI MIATT A KET KERDES SZETVALT.
   *
   * Ha a hatteroldal PICKUP_ONLY-t mond, de a kivalto sort nem talaljuk a
   * kosarban (mas a sor azonositoja, vagy kozben torlodott), a korlatozas
   * ATTOL MEG VALOS. A sav all, a felsorolas elmarad -- egy ures felsorolas
   * ugy nezne ki, mintha elfelejtettuk volna kitolteni.
   *
   * Az ELHALLGATAS lenne a dragabb hiba: azt a vevo a fizetesnel tudna meg.
   */
  it("megnevezés nélkül is áll, ha a korlátozás valós", () => {
    render(<PickupNotice lines={[]} />)

    expect(screen.getByTestId("pickup-notice")).toHaveTextContent(
      "Ezt a rendelést a boltban adjuk át.",
    )
    expect(screen.queryByTestId("pickup-notice-lines")).toBeNull()
  })
})
