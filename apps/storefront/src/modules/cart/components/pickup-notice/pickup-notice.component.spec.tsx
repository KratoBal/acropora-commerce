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
    render(
      <PickupNotice
        countryCode="hu"
        lines={["Acropora tenuis", "Zoanthus keverék"]}
      />,
    )

    const lista = screen.getByTestId("pickup-notice-lines")
    expect(lista.querySelectorAll("li")).toHaveLength(2)
    expect(lista).toHaveTextContent("Acropora tenuis")
    expect(lista).toHaveTextContent("Zoanthus keverék")
  })

  it("a bolt címe és nyitvatartása ott áll", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

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
    const { container } = render(
      <PickupNotice countryCode="hu" visible={false} lines={[]} />,
    )

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
    render(<PickupNotice countryCode="hu" lines={[]} />)

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
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    expect(sor()).toBeTruthy()
  })

  it("HÁROM elem áll benne, egy közös szülőben", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    expect(sor().querySelectorAll("span")).toHaveLength(3)
  })

  it("mind a három szöveg ott van", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    const szoveg = sor().textContent ?? ""
    expect(szoveg).toContain("Pesti Gábor")
    expect(szoveg).toContain("Kedd")
    expect(szoveg).toContain("munkanapig")
  })

  it("a méret 14 pixel, a kategórialap szövegméretével", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    expect(sor().className).toContain("text-[14px]")
  })

  /**
   * EGYFORMA SULY: a szin a KOZOS szulon all, es egyetlen span sem ir felul.
   * Ha barmelyik sajat szint kapna, a harom nem lenne egyenrangu -- pontosan a
   * regi allapot, csak maskepp.
   */
  it("egyetlen elem sem visel saját színt", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    expect(sor().className).toContain("text-acr-ink")
    for (const span of Array.from(sor().querySelectorAll("span"))) {
      expect(span.getAttribute("class")).toBeNull()
      expect(span.getAttribute("style")).toBeNull()
    }
  })
})

/**
 * A KET NODE, AMIT A #207-BEN MAR MEGERINTETTEM, DE NEM NEVEZTEM MEG.
 *
 * Acrobot dontese az `a546e0bc` kartyan: NINCS onallo sopresi kor a husz
 * azonosito nelkuli kosar-node-ra -- az azonosito akkor jar, amikor UGYIS
 * hozzanyulunk a komponenshez. A #207-ben hozzanyultam ehhez a komponenshez,
 * es ezt a kettot kihagytam.
 *
 * MERVE (2026-09-08): a `modules/cart` alatt 25 style-node visel terv-tokent,
 * ebbol a #207 utan 18 allt azonosito nelkul. Ez a ketto abbol valo.
 *
 * AMIT AZ AZONOSITO ONMAGABAN NEM AD: allitast. Ezert nem csak a `data-testid`
 * kerult be, hanem az a ket allitas is, ami hasznalja -- kulonben csak a
 * "fedettseg" szama nott volna, a vedelem nem.
 */
describe("a sáv címkéje és indoka tokenből színez", () => {
  /** ISMERT POZITIV KONTROLL: mind a ketto megjelenik. */
  it("a címke és az indok is megjelenik", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    expect(screen.getByTestId("pickup-notice-cimke")).toBeTruthy()
    expect(screen.getByTestId("pickup-notice-indok")).toBeTruthy()
  })

  it("a címke az óceán tokent viseli, osztályból, nem beégetett színből", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    const cimke = screen.getByTestId("pickup-notice-cimke")
    expect(cimke.className).toContain("text-acr-ocean")
    expect(cimke.getAttribute("style")).toBeNull()
  })

  it("az indok a halvány szöveg tokenjét viseli", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    const indok = screen.getByTestId("pickup-notice-indok")
    expect(indok.className).toContain("text-acr-slate")
    expect(indok.getAttribute("style")).toBeNull()
  })
})

/**
 * A BEKEZDESEK A KERESKEDELMI LAP BETUJEVEL ALLNAK, NEM SZERIFFEL.
 *
 * A kosar regi terve a magyarazo bekezdest szerifben szedte (`font-kiemelt`),
 * mobilon az orokolt betuvel. A kezdolap, a terméklap es a kategorialap a
 * szoveget sans betuvel szedi, a szerif a cimeke; a kosar a csaladhoz igazodik
 * (Balazs 2026-11-01 17:12, "vilagos", acrobot 39610-39612). A DONTES TEHAT
 * KIMONDOTT: az elozo "szerif minden nezetben" meres ezzel lecserelodott, nem
 * veletlenul tunt el.
 *
 * A ket allitas egyutt kulonboztet: az indok nem visel szerifet SEMMILYEN
 * torespontnal, es a cimke sem.
 */
describe("a bekezdések sans betűvel állnak", () => {
  it("az átvétel indoklása nem visel szerifet", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    const indok = screen.getByTestId("pickup-notice-indok")

    expect(indok.className).not.toContain("font-kiemelt")
    expect(indok.className).not.toContain("small:font-kiemelt")
  })

  it("a sáv címkéje sem kapta meg a szerifet", () => {
    render(<PickupNotice countryCode="hu" lines={["Acropora tenuis"]} />)

    expect(screen.getByTestId("pickup-notice-cimke").className).not.toContain(
      "font-kiemelt",
    )
  })
})
