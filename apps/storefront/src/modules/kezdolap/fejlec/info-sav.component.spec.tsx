import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { Szovegek } from "@modules/kezdolap/szovegek"

import { InfoSav } from "./info-sav"

afterEach(cleanup)

/*
  A FEJLEC INFO-SAVJA (kartya 409ba396; acrobot 57149 es barracuda 57155: a nyitvatartas es a telefon a CEG-bol jon, nem az OS
  rekordjabol). MI PIROSIT: ha a 3. vagy a 4. sort egy rekordbeli ertek felulirhatja (a fejlec es a lablec megint elterne); ha egy
  kifejezetten uresre mentett marketing-sor ures helyet vagy ures elemet hagy; ha mind a negy ures, de a sotet sav ott marad; ha a
  csak szokozbol allo szoveg szovegnek szamit; ha a "MINTA ADAT" jelzo egy rejtett (ures) minta-sor miatt jelenne meg, vagy egy
  megjeleno minta-sor mellol hianyozna.
*/
const sav = (
  rekord: Record<string, string>,
  szotar: { bar3: string; bar4: string } = {
    bar3: "Nyitva: Kedd-Péntek 10-18",
    bar4: "Tanácsadás: +36-20/267-6801",
  },
  minta: readonly string[] = [],
): Szovegek =>
  ({
    szoveg: (kulcs: string) => rekord[kulcs] ?? "",
    minta: (kulcs: string) => minta.includes(kulcs),
    t: (kulcs: string) =>
      kulcs === "headerText.bar3"
        ? szotar.bar3
        : kulcs === "headerText.bar4"
          ? szotar.bar4
          : "",
  }) as unknown as Szovegek

const REKORD = { "fejlec.sav.1": "Egy", "fejlec.sav.2": "Kettő" }

describe("a fejléc info-sávja", () => {
  it("két marketing-sor a rekordból, a nyitvatartás és a telefon a szótárból (CEG), a negyedik kiemelve", () => {
    render(<InfoSav s={sav(REKORD)} />)
    const savElem = screen.getByTestId("kl-info-sav")
    expect(savElem.textContent).toBe(
      "EgyKettőNyitva: Kedd-Péntek 10-18Tanácsadás: +36-20/267-6801",
    )
    expect(savElem.querySelectorAll("span")).toHaveLength(4)
    expect(screen.getByText("Tanácsadás: +36-20/267-6801").className).toContain(
      "font-semibold",
    )
    expect(screen.queryByTestId("minta-jelzo")).toBeNull()
  })

  it("a 3. és a 4. sort a rekord NEM írja felül (a CEG az egyetlen forrás)", () => {
    render(
      <InfoSav
        s={sav({
          ...REKORD,
          "fejlec.sav.3": "Nyitva ma 10-19",
          "fejlec.sav.4": "Tanácsadás: +36 1 234 5678",
        })}
      />,
    )
    const szoveg = screen.getByTestId("kl-info-sav").textContent ?? ""
    expect(szoveg).toContain("Nyitva: Kedd-Péntek 10-18")
    expect(szoveg).toContain("+36-20/267-6801")
    expect(szoveg).not.toContain("10-19")
    expect(szoveg).not.toContain("234 5678")
  })

  it("a kiürített marketing-sor nem rajzol semmit (nincs üres elem), a többi marad", () => {
    render(<InfoSav s={sav({ "fejlec.sav.1": "Egy", "fejlec.sav.2": "  " })} />)
    const savElem = screen.getByTestId("kl-info-sav")
    expect(savElem.textContent).toBe(
      "EgyNyitva: Kedd-Péntek 10-18Tanácsadás: +36-20/267-6801",
    )
    expect(savElem.querySelectorAll("span")).toHaveLength(3)
  })

  it("mindkét marketing-sor kiürítve: csak a nyitvatartás és a telefon áll, üres elem nélkül", () => {
    render(<InfoSav s={sav({ "fejlec.sav.1": "", "fejlec.sav.2": "" })} />)
    const savElem = screen.getByTestId("kl-info-sav")
    expect(savElem.querySelectorAll("span")).toHaveLength(2)
  })

  it("ha mind a négy üres (vagy csak szóköz), a sáv sincs", () => {
    render(
      <InfoSav
        s={sav(
          { "fejlec.sav.1": "", "fejlec.sav.2": " " },
          { bar3: "", bar4: "\n" },
        )}
      />,
    )
    expect(screen.queryByTestId("kl-info-sav")).toBeNull()
  })

  it("a minta-jelző csak megjelenő, rekordból olvasott minta-sor mellett áll", () => {
    const rejtett = render(
      <InfoSav
        s={sav({ ...REKORD, "fejlec.sav.2": "" }, undefined, ["fejlec.sav.2"])}
      />,
    )
    expect(screen.queryByTestId("minta-jelzo")).toBeNull()
    rejtett.unmount()
    render(<InfoSav s={sav(REKORD, undefined, ["fejlec.sav.1"])} />)
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
