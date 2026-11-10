import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import MuszakiLap from "./index"
import { TartasiBlokk } from "./tartasi-blokk"

afterEach(cleanup)

/*
  A TARTASI BLOKK (V2.2 S4, kartya d2fc06e7). MI PIROSIT: adat nelkul ures blokk vagy kitalalt ertek; egy hianyzo teny ures
  cellakent; a 3. es 4. fokozat fix mondata hianyzik, vagy az 1-2. fokozatnal megjelenik; a "Kinek nem ajanljuk" kitalalt
  szoveget kap; az elo allat figyelmeztetes elmarad; a blokk muszaki termeken is megjelenik, vagy elo allaton nem.
*/
const MISSING = "Ellenőrzés alatt. Érdeklődj a boltban vásárlás előtt."
const meta = (o: unknown) => ({ husbandry: JSON.stringify(o) })

describe("a tartási blokk", () => {
  it("adat nélkül: a cím, az ellenőrzés alatt mondat és az élő állat figyelmeztetés, semmi kitalált", () => {
    render(<TartasiBlokk metadata={{}} />)
    expect(screen.getByRole("heading", { name: "Tartási adatok" })).toBeTruthy()
    expect(screen.getByTestId("tartas-hianyzik").textContent).toBe(MISSING)
    expect(screen.getByTestId("tartas-elo-allat").textContent).toMatch(
      /csak bolti átvétellel/,
    )
    expect(screen.queryByTestId("tartas-osszefoglalo")).toBeNull()
  })

  it("a kitöltött tények a helyükön, a hiányzók az ellenőrzés alatt mondattal; a 3. fokozat fix mondata", () => {
    render(
      <TartasiBlokk
        metadata={meta({
          v: 1,
          kind: "fish",
          difficulty: "HALADO",
          min_liter: 300,
          feeding: ["HUSEVO", "MINDENEVO"],
          light: "KOZEPES",
          flow: "EROS",
        })}
      />,
    )
    expect(screen.getByTestId("tartas-nehezseg").textContent).toContain(
      "Haladóknak",
    )
    expect(screen.getByTestId("tartas-medence").textContent).toContain("300 l")
    expect(screen.getByTestId("tartas-etetes").textContent).toContain(
      "húsevő, mindenevő",
    )
    expect(screen.getByTestId("tartas-feny-aramlas").textContent).toContain(
      "közepes / erős",
    )
    expect(screen.getByTestId("tartas-korallos").textContent).toContain(MISSING)
    expect(screen.getByTestId("tartas-megjegyzes").textContent).toMatch(
      /érett, stabil medencébe javasoljuk/,
    )
    expect(screen.getByTestId("tartas-kinek").textContent).toContain(
      `Kinek nem ajánljuk: ${MISSING}`,
    )
    expect(screen.getByTestId("tartas-vasarlas-elott").textContent).toContain(
      "(300 l)",
    )
  })

  it("az 1. és 2. fokozatnál nincs fix mondat; a 4.-nél van", () => {
    render(
      <TartasiBlokk
        metadata={meta({ v: 1, kind: "coral", difficulty: "KOZEPES" })}
      />,
    )
    expect(screen.queryByTestId("tartas-megjegyzes")).toBeNull()
    cleanup()
    render(
      <TartasiBlokk
        metadata={meta({ v: 1, kind: "coral", difficulty: "SZAKERTO" })}
      />,
    )
    expect(screen.getByTestId("tartas-megjegyzes").textContent).toMatch(
      /csak tapasztalt tartóknak/,
    )
  })

  it("korallnál az elhelyezés, halnál a társas viselkedés áll a részletekben", () => {
    render(
      <TartasiBlokk
        metadata={meta({ v: 1, kind: "coral", placement_zone: "FELSO" })}
      />,
    )
    expect(screen.getByTestId("tartas-zona").textContent).toContain(
      "felső zóna",
    )
    expect(screen.queryByTestId("tartas-tarsas")).toBeNull()
    cleanup()
    render(
      <TartasiBlokk
        metadata={meta({ v: 1, kind: "fish", social: "CSOPORTBAN" })}
      />,
    )
    expect(screen.getByTestId("tartas-tarsas").textContent).toContain(
      "csoportban tartható",
    )
    expect(screen.queryByTestId("tartas-zona")).toBeNull()
  })
})

describe("a műszaki lap", () => {
  const termek = (gyoker: string, metadata: Record<string, unknown> = {}) =>
    ({
      id: "prod_1",
      title: "X",
      categories: [{ name: gyoker, mpath: "c1" }],
      variants: [],
      metadata,
    }) as never

  it("élő állaton a blokk a lapon áll, adat nélkül is", () => {
    render(<MuszakiLap product={termek("Halak")} />)
    expect(screen.getByTestId("tartasi-blokk")).toBeTruthy()
  })

  it("műszaki terméken nincs tartási blokk", () => {
    render(<MuszakiLap product={termek("Termékek")} />)
    expect(screen.queryByTestId("tartasi-blokk")).toBeNull()
  })
})
