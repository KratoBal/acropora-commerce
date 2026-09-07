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
   * ES HA NINCS ELO TETEL, A SAV NEM ALL OTT. Ez NEM az "ures doboz" szabaly
   * ala esik: nem egy hianyzo adat helye, hanem egy allapot, ami nem all fenn.
   */
  it("élő tétel nélkül nem jelenik meg", () => {
    const { container } = render(<PickupNotice lines={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
