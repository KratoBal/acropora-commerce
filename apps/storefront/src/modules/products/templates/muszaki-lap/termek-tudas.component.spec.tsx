import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { TermekTudas } from "@lib/data/product-knowledge"
import MuszakiLap from "./index"
import { hasznalatiUtmutato, TermekTudasBlokk, vanTudas } from "./termek-tudas"

afterEach(cleanup)

/*
  A TUDAS-BLOKK (KZ Amino szelet, PD-014). Ami pirosit: egy CONFLICTING_SOURCES
  mezo ERTEKKEL jelenik meg, vagy egyaltalan nem jelenik meg; egy MISSING vagy
  UNVERIFIED ertek a vevo ele kerul; a gyarto allitasa a sajat cimkeje nelkul
  all; vagy egy tudas nelkuli termek lapja megvaltozik. A HASZNALATI UTMUTATO (V3.3): a jovahagyott `usage` szoveg nem
  jelenik meg a sajat cimeje alatt, a lepesek sortorese elveszik, vagy az utmutato a leiras-fulbe keveredik.
*/
const teny = (field: string, value: string | null, status = "VERIFIED") => ({
  field,
  value,
  unit: null,
  status,
  source_type: status === "CONFLICTING_SOURCES" ? null : "MANUFACTURER_PAGE",
  revision: 1,
})

const KZ: TermekTudas = {
  product_id: "prod_1",
  facts: [
    teny("packSize", "100 ml"),
    teny("dosing", null, "CONFLICTING_SOURCES"),
    teny("application", "korallok aminosav-pótlása", "SUGGESTED"),
    teny("packageContents", "1 db 100 ml-es flakon"),
    teny("manufacturerClaims", "Erősíti a színeket."),
    teny("manufacturerInfo", "Korallen-Zucht\nNémetország"),
    teny("ean", "4260507580214"),
  ],
  copy: [
    { block: "lead", body: "Első bekezdés.\n\nMásodik bekezdés.", revision: 1 },
    { block: "body", body: "A leírásban áll.", revision: 1 },
  ],
}

describe("a termék-tudás blokk", () => {
  // V3.1: WHAT TURNS THIS RED: a calculator on a SUGGESTED dose; the canonical dose left raw on the row
  it("az adagolas sora olvashato; a kalkulator csak az ellenorzott adag mellett all", () => {
    const tudas = (status: string): TermekTudas => ({
      ...KZ,
      facts: [teny("dosing", "5 ml/100 L/day", status)],
    })
    const { unmount } = render(<TermekTudasBlokk tudas={tudas("VERIFIED")} />)
    expect(screen.getByTestId("tudas-kulcs-dosing").textContent).toContain(
      "5 ml / 100 liter, naponta",
    )
    expect(screen.getByTestId("adagolo-kalkulator")).toBeInTheDocument()
    unmount()
    render(<TermekTudasBlokk tudas={tudas("SUGGESTED")} />)
    expect(screen.getByTestId("tudas-dosing").textContent).toContain(
      "5 ml / 100 liter, naponta",
    )
    expect(screen.queryByTestId("adagolo-kalkulator")).toBeNull()
  })

  /*
    THE STREAMED SWAP (acrobot 50250): the page shows the technical sheet as the Suspense fallback first, and the real one
    replaces it; what was typed into the fallback's field is lost. WHAT TURNS THIS RED: the fallback's field typeable, or the
    real page's field disabled (the default must stay typeable).
  */
  it("a Suspense tartalekaban a kalkulator mezoje letiltott, a valodi lapon gepelheto", () => {
    const tudas: TermekTudas = {
      ...KZ,
      facts: [teny("dosing", "5 ml/100 L/day", "VERIFIED")],
    }
    const { unmount } = render(<TermekTudasBlokk tudas={tudas} tartalek />)
    expect(screen.getByTestId("adagolo-liter")).toBeDisabled()
    unmount()
    render(<TermekTudasBlokk tudas={tudas} />)
    expect(screen.getByTestId("adagolo-liter")).toBeEnabled()
  })

  // barracuda, #682 b: a projection sends one fact per field, and a conflict is that fact's status, so the
  // calculator never reads a dose the page shows as disputed
  it("az ütköző adagolás mellett nincs kalkulátor", () => {
    render(<TermekTudasBlokk tudas={KZ} />)
    expect(screen.getByTestId("tudas-dosing").textContent).toContain(
      "A források eltérnek",
    )
    expect(screen.queryByTestId("adagolo-kalkulator")).toBeNull()
  })

  it("az ütköző mező látszik, 'A források eltérnek' felirattal, érték nélkül", () => {
    render(<TermekTudasBlokk tudas={KZ} />)
    const kulcs = screen.getByTestId("tudas-kulcs-dosing")
    const szakasz = screen.getByTestId("tudas-dosing")
    for (const hely of [kulcs, szakasz]) {
      expect(hely.textContent).toContain("A források eltérnek")
      expect(hely.textContent).not.toMatch(/csepp|drop|\d/)
    }
  })

  it("az elfogadott érték látszik, a gyártó állítása a saját címkéje alatt", () => {
    render(<TermekTudasBlokk tudas={KZ} />)
    expect(screen.getByTestId("tudas-kulcs-packSize").textContent).toContain(
      "100 ml",
    )
    expect(screen.getByTestId("tudas-kulcs-application").textContent).toContain(
      "aminosav",
    )
    expect(screen.getByTestId("tudas-manufacturerClaims").textContent).toBe(
      "A gyártó szerintErősíti a színeket.",
    )
    expect(screen.getByTestId("tudas-manufacturerInfo").textContent).toContain(
      "Korallen-Zucht",
    )
    // a jóváhagyott szöveg a leírás-fülben áll, nem itt (acrobot 26138)
    expect(screen.queryByText(/bekezdés/)).toBeNull()
  })

  it("MISSING, UNVERIFIED és a lehetséges hibás érték nem kerül a vevő elé", () => {
    for (const status of ["MISSING", "UNVERIFIED", "POSSIBLE_WRONG_VALUE"]) {
      const { container } = render(
        <TermekTudasBlokk
          tudas={{
            ...KZ,
            facts: [teny("packSize", "100 ml", status)],
            copy: [],
          }}
        />,
      )
      expect(container.firstChild).toBeNull()
      cleanup()
    }
  })

  it("üres tudásnál semmit nem rajzol, és a lap nem kap blokkot", () => {
    const ures = { product_id: "prod_1", facts: [], copy: [] }
    expect(vanTudas(ures)).toBe(false)
    expect(vanTudas(null)).toBe(false)
    expect(vanTudas(KZ)).toBe(true)
    // csak szöveg, tény nélkül: a blokknak nincs mit mutatnia
    expect(vanTudas({ ...KZ, facts: [] })).toBe(false)
    expect(
      render(<TermekTudasBlokk tudas={ures} />).container.firstChild,
    ).toBeNull()
  })
})

describe("a használati útmutató (V3.3)", () => {
  const UTMUTATO = {
    block: "usage",
    body: "Mire való: aminosav-pótlás.\n\n1. Rázd fel.\n2. Mérd ki a medence szerint.\n\n\nHa kétséges, kevesebbel kezdj.",
    revision: 1,
  }

  it("a jóváhagyott szöveg bekezdésekre bomlik, a lépések sortörése megmarad", () => {
    expect(hasznalatiUtmutato({ ...KZ, copy: [UTMUTATO] })).toEqual([
      "Mire való: aminosav-pótlás.",
      "1. Rázd fel.\n2. Mérd ki a medence szerint.",
      "Ha kétséges, kevesebbel kezdj.",
    ])
    expect(hasznalatiUtmutato(KZ)).toEqual([])
    expect(hasznalatiUtmutato(null)).toEqual([])
  })

  it("a saját címe alatt áll a tudás-blokkban, és egyedül is elég a blokkhoz", () => {
    const csakUtmutato = { product_id: "prod_1", facts: [], copy: [UTMUTATO] }
    expect(vanTudas(csakUtmutato)).toBe(true)
    render(<TermekTudasBlokk tudas={csakUtmutato} />)
    const szakasz = screen.getByTestId("tudas-hasznalati-utmutato")
    expect(szakasz.querySelector("h2")?.textContent).toBe("Használati útmutató")
    expect(szakasz.querySelectorAll("p")).toHaveLength(3)
    expect(szakasz.textContent).toContain("1. Rázd fel.\n2. Mérd ki")
  })

  it("angol lapon angol cím", () => {
    render(
      <TermekTudasBlokk
        tudas={{ product_id: "prod_1", facts: [], copy: [UTMUTATO] }}
        locale="en"
      />,
    )
    expect(screen.getByRole("heading", { name: "Usage guide" })).toBeTruthy()
  })

  it("az útmutató nem kerül a leírás-fülbe", () => {
    render(
      <MuszakiLap
        product={
          {
            id: "prod_1",
            title: "KZ Amino",
            categories: [{ name: "Termékek", mpath: "c1" }],
            variants: [],
          } as never
        }
        tudas={{ ...KZ, copy: [...KZ.copy, UTMUTATO] }}
      />,
    )
    expect(screen.getByRole("tabpanel").textContent).not.toContain("Rázd fel")
    expect(screen.getByTestId("tudas-hasznalati-utmutato")).toBeTruthy()
  })
})

describe("a műszaki lap", () => {
  const termek = {
    id: "prod_1",
    title: "KZ Amino",
    categories: [{ name: "Termékek", mpath: "c1" }],
    variants: [],
  } as never

  const leirassal = (description: string) =>
    ({ ...(termek as object), description }) as never

  it("tudással a blokk a lapon áll", () => {
    render(<MuszakiLap product={termek} tudas={KZ} />)
    expect(screen.getByTestId("termek-tudas")).toBeTruthy()
  })

  /*
    KZ Amino stage meres (acrobot, 2026-10-03 21:03-21:12 UTC): a visszaallitott
    lead a store route-on mar az eredeti volt, a lapon 3 percig a regi, mert a
    lap az orokre gyorsitotarazott termek-leirasbol rajzolt. MI PIROSIT: ha a
    leiras-ful a termek `description` mezojet mutatja, amikor a tudas hoz
    jovahagyott szoveget.
  */
  it("a jóváhagyott szöveg a tudásból kerül a leírás-fülbe, nem a termék leírásából", () => {
    render(
      <MuszakiLap
        product={leirassal("<p>Régi gyorsítótárazott lead.</p>")}
        tudas={KZ}
      />,
    )
    const ful = screen.getByRole("tabpanel")
    expect(ful.innerHTML).toBe(
      "<p>Első bekezdés.</p>\n<p>Második bekezdés.</p>\n<p>A leírásban áll.</p>",
    )
    expect(ful.textContent).not.toContain("Régi")
  })

  it("jóváhagyott szöveg nélkül a termék leírása marad", () => {
    render(
      <MuszakiLap
        product={leirassal("<p>A mai leírás.</p>")}
        tudas={{ ...KZ, copy: [] }}
      />,
    )
    expect(screen.getByRole("tabpanel").textContent).toBe("A mai leírás.")
  })

  it("tudás nélkül a lap betűre a mai", () => {
    const ma = render(<MuszakiLap product={termek} />).container.innerHTML
    cleanup()
    const ures = render(
      <MuszakiLap
        product={termek}
        tudas={{ product_id: "prod_1", facts: [], copy: [] }}
      />,
    ).container.innerHTML
    expect(ures).toBe(ma)
    expect(ma).not.toContain("termek-tudas")
  })
})

/*
  A FEJLECREND (2026-11-14, CI verify a #765 fejen): az akadalymentesseg-futas (axe) a teszt bolt egy GTIN nelkuli
  termeketen `heading-order: 1x h3`-t talalt, mert a tudas-blokk fejlecei h3-asok voltak, kozvetlenul a termek h1-e
  utan (h2 nelkul); az adagolo-kalkulator cime h4 volt, azaz a h3 ala kerulve megint ugrott volna. MI PIROSIT: ha a
  blokk elso fejlecze nem h2, vagy egy fejlec tobb szintet ugrik az elozohoz kepest (a teljes blokkban, kalkulatorral).
*/
describe("a termék-tudás blokk fejlécrendje", () => {
  const szintek = (gyoker: HTMLElement) =>
    Array.from(gyoker.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) =>
      Number(h.tagName.slice(1)),
    )

  it("az első fejléc h2, és semelyik nem ugrik két szintet (kalkulátorral és útmutatóval)", () => {
    const tudas: TermekTudas = {
      product_id: "prod_1",
      facts: [
        teny("dosing", "5 ml/100 L/day"),
        teny("application", "korallok aminosav-pótlása"),
      ],
      copy: [
        { block: "usage", body: "1. Rázd fel.\n2. Mérd ki.", revision: 1 },
      ],
    }
    render(<TermekTudasBlokk tudas={tudas} />)
    const blokk = screen.getByTestId("termek-tudas")
    // pozitív kontroll: a kalkulátor és az útmutató is ott van, különben üres fán mérnénk
    expect(screen.getByTestId("adagolo-kalkulator")).toBeInTheDocument()
    expect(screen.getByTestId("tudas-hasznalati-utmutato")).toBeInTheDocument()
    const sorrend = szintek(blokk)
    expect(sorrend.length).toBeGreaterThanOrEqual(3)
    expect(sorrend[0]).toBe(2)
    sorrend.slice(1).forEach((szint, i) => {
      expect(szint - sorrend[i]).toBeLessThanOrEqual(1)
    })
  })
})
