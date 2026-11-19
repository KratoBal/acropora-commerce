import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { Szovegek } from "@modules/kezdolap/szovegek"

import { InfoSav } from "./info-sav"

afterEach(cleanup)

/*
  A FEJLEC INFO-SAVJA (kartya 409ba396). MI PIROSIT: ha egy kifejezetten uresre mentett sor ures helyet vagy ures elemet hagy;
  ha mind a negy ures, de a sotet sav ott marad; ha a csak szokozbol allo szoveg szovegnek szamit; ha a "MINTA ADAT" jelzo egy
  rejtett (ures) minta-sor miatt jelenne meg, vagy egy megjeleno minta-sor mellol hianyozna.
*/
const sav = (
  szovegek: Record<string, string>,
  minta: readonly string[] = [],
): Szovegek =>
  ({
    szoveg: (kulcs: string) => szovegek[kulcs] ?? "",
    minta: (kulcs: string) => minta.includes(kulcs),
  }) as unknown as Szovegek

const MIND = {
  "fejlec.sav.1": "Egy",
  "fejlec.sav.2": "Kettő",
  "fejlec.sav.3": "Három",
  "fejlec.sav.4": "Négy",
}

describe("a fejléc info-sávja", () => {
  it("négy szöveggel mind a négy sor áll, a jobb oldalon a negyedik kiemelve", () => {
    render(<InfoSav s={sav(MIND)} />)
    const savElem = screen.getByTestId("kl-info-sav")
    expect(savElem.textContent).toBe("EgyKettőHáromNégy")
    expect(savElem.querySelectorAll("span")).toHaveLength(4)
    expect(screen.getByText("Négy").className).toContain("font-semibold")
    expect(screen.queryByTestId("minta-jelzo")).toBeNull()
  })

  it("a kiürített sor nem rajzol semmit (nincs üres elem), a többi marad", () => {
    render(
      <InfoSav
        s={sav({ ...MIND, "fejlec.sav.2": "", "fejlec.sav.3": "   " })}
      />,
    )
    const savElem = screen.getByTestId("kl-info-sav")
    expect(savElem.textContent).toBe("EgyNégy")
    expect(savElem.querySelectorAll("span")).toHaveLength(2)
  })

  it("ha mind a négy üres (vagy csak szóköz), a sáv sincs", () => {
    render(
      <InfoSav
        s={sav({
          "fejlec.sav.1": "",
          "fejlec.sav.2": " ",
          "fejlec.sav.3": "",
          "fejlec.sav.4": "\n",
        })}
      />,
    )
    expect(screen.queryByTestId("kl-info-sav")).toBeNull()
  })

  it("a minta-jelző csak megjelenő minta-sor mellett áll", () => {
    const rejtett = render(
      <InfoSav s={sav({ ...MIND, "fejlec.sav.2": "" }, ["fejlec.sav.2"])} />,
    )
    expect(screen.queryByTestId("minta-jelzo")).toBeNull()
    rejtett.unmount()
    render(<InfoSav s={sav(MIND, ["fejlec.sav.3"])} />)
    expect(screen.getByTestId("minta-jelzo")).toBeTruthy()
  })

  it("a fejléc ezt a komponenst rajzolja (nem egy saját, ismét feltétel nélküli sávot)", () => {
    const forras = readFileSync(
      join(process.cwd(), "src/modules/kezdolap/fejlec/index.tsx"),
      "utf-8",
    )
    expect(forras).toContain("<InfoSav s={s} />")
    expect(forras).not.toContain("kl-info-sav")
  })
})
