import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { TermekTudas } from "@lib/data/product-knowledge"
import MuszakiLap from "./index"
import { TermekTudasBlokk, vanTudas } from "./termek-tudas"

afterEach(cleanup)

/*
  A TUDAS-BLOKK (KZ Amino szelet, PD-014). Ami pirosit: egy CONFLICTING_SOURCES
  mezo ERTEKKEL jelenik meg, vagy egyaltalan nem jelenik meg; egy MISSING vagy
  UNVERIFIED ertek a vevo ele kerul; a gyarto allitasa a sajat cimkeje nelkul
  all; vagy egy tudas nelkuli termek lapja megvaltozik.
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

describe("a műszaki lap", () => {
  const termek = {
    id: "prod_1",
    title: "KZ Amino",
    categories: [{ name: "Termékek", mpath: "c1" }],
    variants: [],
  } as never

  it("tudással a blokk a lapon áll", () => {
    render(<MuszakiLap product={termek} tudas={KZ} />)
    expect(screen.getByTestId("termek-tudas")).toBeTruthy()
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
