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

  /*
    barracuda, #729: korallnal a "mennyi hely" cella az elhelyezes (a spec 1. pontja, az OS missingHusbandryFields), es a
    kompatibilitas sorai minden fajtanal allnak. MI PIROSIT: egy teljesen ellenorzott korallon barhol "Ellenőrzés alatt" (a
    liter-cella vagy a literre kerdezo "Vasarlas elott" sor), vagy a csalanozo viselkedes nem latszik.
  */
  const teljesKorall = {
    v: 1,
    kind: "coral",
    verified_on: "2026-11-10",
    difficulty: "KOZEPES",
    maturity_months: 6,
    placement_zone: "KOZEPSO",
    reef_safe: "FELTETELES",
    reef_safe_reason: "szomszédait égeti",
    social: "TOBB_PELDANY_TARTHATO",
    aggression: ["CSALANOZ"],
    coral_eater: false,
    invertebrate_eater: false,
    feeding: ["FOTOSZINTETIZALO"],
    feeding_frequency: "hetente kétszer",
    live_food: false,
    light: "EROS",
    flow: "KOZEPES",
    max_size: { value: 30, dimension: "TELJES_KITERJEDES" },
    sourcing: "TENYESZTETT",
    not_for: "most indított medencébe",
  }

  it("egy teljesen ellenőrzött korallon sehol nincs ellenőrzés alatt, az elhelyezés fent áll, és a csalánozás látszik", () => {
    render(<TartasiBlokk metadata={meta(teljesKorall)} />)
    const blokk = screen.getByTestId("tartasi-blokk").textContent ?? ""
    expect(blokk).not.toContain("Ellenőrzés alatt")
    expect(screen.getByTestId("tartas-elhelyezes").textContent).toContain(
      "Elhelyezés",
    )
    expect(screen.getByTestId("tartas-elhelyezes").textContent).toContain(
      "középső zóna",
    )
    expect(screen.queryByTestId("tartas-medence")).toBeNull()
    expect(screen.getByTestId("tartas-viselkedes").textContent).toContain(
      "csalánoz",
    )
    expect(screen.getByTestId("tartas-tarsas").textContent).toContain(
      "több példány együtt tartható",
    )
    expect(screen.getByTestId("tartas-vasarlas-elott").textContent).toContain(
      "érett, stabil medencéd? (6 hónap)",
    )
  })

  it("az ellenőrzött 0 hónapos érettség nem ellenőrzés alatt: érett medencét nem igényel", () => {
    render(
      <TartasiBlokk metadata={meta({ ...teljesKorall, maturity_months: 0 })} />,
    )
    expect(screen.getByTestId("tartasi-blokk").textContent).not.toContain(
      "Ellenőrzés alatt",
    )
    expect(screen.getByTestId("tartas-vasarlas-elott").textContent).toContain(
      "Érett medencét nem igényel.",
    )
    // a részletek sora ugyanazt a mondatot mondja, nem "0 hónap"-ot (barracuda, #729)
    const sor = screen.getByTestId("tartas-erettseg").textContent
    expect(sor).toContain("Érett medencét nem igényel.")
    expect(sor).not.toContain("0 hónap")
  })

  it("gerinctelennél a liter, ha van (a zóna a részletekbe kerül); ha csak zónája van, az elhelyezés", () => {
    render(
      <TartasiBlokk
        metadata={meta({
          v: 1,
          kind: "invertebrate",
          min_liter: 100,
          placement_zone: "ALSO",
        })}
      />,
    )
    expect(screen.getByTestId("tartas-medence").textContent).toContain("100 l")
    expect(screen.getByTestId("tartas-zona").textContent).toContain("alsó zóna")
    cleanup()
    render(
      <TartasiBlokk
        metadata={meta({
          v: 1,
          kind: "invertebrate",
          placement_zone: "ALSO",
          maturity_months: 3,
        })}
      />,
    )
    expect(screen.getByTestId("tartas-elhelyezes").textContent).toContain(
      "alsó zóna",
    )
    expect(screen.queryByTestId("tartas-medence")).toBeNull()
    expect(
      screen.getByTestId("tartas-vasarlas-elott").textContent,
    ).not.toContain("literes")
  })

  it("halnál a liter áll fent, a társas viselkedés a részletekben, zóna-sor nincs", () => {
    render(
      <TartasiBlokk
        metadata={meta({ v: 1, kind: "fish", social: "CSOPORTBAN" })}
      />,
    )
    expect(screen.getByTestId("tartas-medence").textContent).toContain(MISSING)
    expect(screen.getByTestId("tartas-tarsas").textContent).toContain(
      "csoportban tartható",
    )
    expect(screen.queryByTestId("tartas-zona")).toBeNull()
    expect(screen.queryByTestId("tartas-elhelyezes")).toBeNull()
  })
})

/*
  AZ OPCIONALIS TENYEK ES A VESZELY (V2.2 S4b, barracuda 46247, murena 46232). MI PIROSIT: a csipes vagy mereg nem a blokk
  tetejen all (a nehezseg utan, vagy egyaltalan nem); a figyelmeztetes nelkuli veszely elrejtodik; egy hianyzo opcionalis
  teny "Ellenőrzés alatt" sort kap; egy ismert teny nem latszik; a hamis csipes-ertek veszelydobozt kap.
*/
describe("az opcionális tartási tények", () => {
  it("a csípés vagy méreg elsőként, a kezelési figyelmeztetéssel, a nehézség előtt", () => {
    render(
      <TartasiBlokk
        metadata={meta({
          v: 1,
          kind: "coral",
          difficulty: "KOZEPES",
          sting_or_venom: true,
          handling_warning: "Kesztyűben fogd meg, a csalánsejtjei égetnek.",
        })}
      />,
    )
    const veszely = screen.getByTestId("tartas-veszely")
    expect(veszely.textContent).toContain("Csíp vagy mérgező")
    expect(veszely.textContent).toContain(
      "Kesztyűben fogd meg, a csalánsejtjei égetnek.",
    )
    const nehezseg = screen.getByTestId("tartas-nehezseg")
    // a dokumentum-sorrendben a veszely a nehezseg ELOTT all
    expect(
      veszely.compareDocumentPosition(nehezseg) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.queryByTestId("tartas-csipes")).toBeNull()
  })

  it("figyelmeztetés nélkül is látszik a veszély, a figyelmeztetés helyén az ellenőrzés alatt mondat", () => {
    render(
      <TartasiBlokk
        metadata={meta({ v: 1, kind: "fish", sting_or_venom: true })}
      />,
    )
    expect(screen.getByTestId("tartas-veszely").textContent).toContain(
      "A kezelési figyelmeztetés ellenőrzés alatt.",
    )
  })

  it("az ismert opcionális tények sorai; a hiányzók nem kapnak sort; a hamis csípés válasz, doboz nélkül", () => {
    render(
      <TartasiBlokk
        metadata={meta({
          v: 1,
          kind: "invertebrate",
          temp_c: { min: 24, max: 26 },
          salinity_sg: { min: 1.024, max: 1.026 },
          lifespan_years: 5,
          quarantine_weeks: 0,
          breeds_in_tank: true,
          sting_or_venom: false,
        })}
      />,
    )
    expect(screen.getByTestId("tartas-homerseklet").textContent).toContain(
      "24–26 °C",
    )
    expect(screen.getByTestId("tartas-sotartalom").textContent).toContain(
      "1,024–1,026 SG",
    )
    expect(screen.getByTestId("tartas-elettartam").textContent).toContain(
      "5 év",
    )
    expect(screen.getByTestId("tartas-karanten").textContent).toContain("0 hét")
    expect(screen.getByTestId("tartas-szaporitas").textContent).toContain(
      "igen",
    )
    expect(screen.getByTestId("tartas-csipes").textContent).toContain("nem")
    expect(screen.queryByTestId("tartas-veszely")).toBeNull()
    for (const nincs of ["tartas-kh", "tartas-akklimatizacio"])
      expect(screen.queryByTestId(nincs), nincs).toBeNull()
  })

  it("opcionális tény nélkül egyetlen opcionális sor sincs", () => {
    render(<TartasiBlokk metadata={meta({ v: 1, kind: "fish" })} />)
    for (const id of [
      "tartas-homerseklet",
      "tartas-sotartalom",
      "tartas-kh",
      "tartas-elettartam",
      "tartas-karanten",
      "tartas-akklimatizacio",
      "tartas-szaporitas",
      "tartas-csipes",
      "tartas-veszely",
    ])
      expect(screen.queryByTestId(id), id).toBeNull()
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

describe("a tartási blokk fejléce", () => {
  // axe heading-order (2026-11-14): a blokk cime a termek h1-e utan all, tehat h2, nem h3
  it("a cím h2", () => {
    render(<TartasiBlokk metadata={{}} />)
    expect(
      screen.getByRole("heading", { name: "Tartási adatok", level: 2 }),
    ).toBeTruthy()
  })
})
