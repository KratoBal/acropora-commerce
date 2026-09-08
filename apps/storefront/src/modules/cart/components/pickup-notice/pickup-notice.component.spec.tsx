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

/**
 * A HAROM ELEM EGY SORBAN, EGYFORMA SULLYAL (acrobot dontese, msg 15411).
 *
 * === MIERT A HELY AZ ALLITAS, ES NEM A MERET ===
 *
 * A valtozas ket oldalrol ugyanaz: 13.5 pixel ES egy sor harom spannel. A
 * MERET onmagaban atmenne akkor is, ha a harom elem visszaesik ket kulon
 * bekezdesre -- es epp az volt a hiba, hogy a tartas-mondat HALKABB allt a
 * masik kettonel.
 *
 * Ezert az elso allitas a HELYRE szol: harom span, EGY kozos szuloben. Ha
 * barmelyik visszakerul sajat bekezdesbe, ez pirosodik.
 *
 * AMIT NEM MER: a festett szint. A jsdom nem oldja fel a CSS-valtozokat, tehat
 * a szinbol a token NEVE merheto.
 */
describe("a cím, a nyitvatartás és a tartás egy sorban", () => {
  const sor = () => screen.getByTestId("pickup-notice-sor")

  /** ISMERT POZITIV KONTROLL: a sav megjelenik, es a sor benne van. */
  it("a sáv megjelenik, és a sor is", () => {
    render(<PickupNotice lines={["Acropora tenuis"]} />)

    expect(sor()).toBeTruthy()
  })

  it("HÁROM elem áll benne, egy közös szülőben", () => {
    render(<PickupNotice lines={["Acropora tenuis"]} />)

    expect(sor().querySelectorAll("span")).toHaveLength(3)
  })

  it("mind a három szöveg ott van", () => {
    render(<PickupNotice lines={["Acropora tenuis"]} />)

    const szoveg = sor().textContent ?? ""
    expect(szoveg).toContain("Pesti Gábor")
    expect(szoveg).toContain("Kedd")
    expect(szoveg).toContain("munkanapig")
  })

  it("a méret a tervbeli 13,5 pixel", () => {
    render(<PickupNotice lines={["Acropora tenuis"]} />)

    expect(sor().className).toContain("text-[13.5px]")
  })

  /**
   * EGYFORMA SULY: a szin a KOZOS szulon all, es egyetlen span sem ir felul.
   * Ha barmelyik sajat szint kapna, a harom nem lenne egyenrangu -- pontosan a
   * regi allapot, csak maskepp.
   */
  it("egyetlen elem sem visel saját színt", () => {
    render(<PickupNotice lines={["Acropora tenuis"]} />)

    expect(sor().style.color).toBe("var(--terv-szoveg-halvany)")
    for (const span of Array.from(sor().querySelectorAll("span"))) {
      expect((span as HTMLElement).style.color).toBe("")
    }
  })
})
