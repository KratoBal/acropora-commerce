import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import Boltunk from "./components/boltunk"
import KezdoEsHalado from "./components/kezdo-es-halado"
import Markak from "./components/markak"
import MitKeresel from "./components/mit-keresel"
import Szolgaltatasok from "./components/szolgaltatasok"
import Velemenyek from "./components/velemenyek"
import { szovegek } from "./szovegek"

/**
 * A KEZDOLAP SAVJAI A KATALOGUSBOL EPULNEK.
 *
 * MI PIROSIT: ha egy sav a kezdoertekekkel nem jelenik meg; ha egy gomb vagy
 * sor felirat VAGY cel nelkul is kirajzolodik; ha egy veszelyes link vagy kep
 * cim (`javascript:`) a lapra jut; ha az OS szovege HTML-kent ertelmezodik; ha
 * a kitalalt tenyek jelolo nelkul allnak (a kezdoertekeknel), vagy a jelolo
 * megmarad, miutan az OS sajat erteket adott (barracuda #552, acrobot 33366);
 * ha a tobb soros cim vagy nyitvatartas egy sorba olvad.
 */
const SAVOK: [string, (s: ReturnType<typeof szovegek>) => ReactElement][] = [
  ["mit-keresel", (s) => <MitKeresel s={s} />],
  ["kezdo-es-halado", (s) => <KezdoEsHalado s={s} />],
  ["szolgaltatasok", (s) => <Szolgaltatasok s={s} />],
  ["markak", (s) => <Markak s={s} />],
  ["velemenyek", (s) => <Velemenyek s={s} />],
  ["boltunk", (s) => <Boltunk s={s} />],
]

describe("a kezdőlap sávjai", () => {
  afterEach(cleanup)

  it.each(SAVOK)("%s a kezdőértékekkel megjelenik", (testid, sav) => {
    render(sav(szovegek(null)))
    expect(screen.getByTestId(testid).textContent?.length).toBeGreaterThan(40)
  })

  it("a kitalált tények jelölve vannak a kezdőértékeknél, a szöveges sávok nem", () => {
    const k = szovegek(null)
    for (const [testid, sav] of SAVOK) {
      cleanup()
      render(sav(k))
      const jelolt = [
        "markak",
        "velemenyek",
        "boltunk",
        "kezdo-es-halado",
      ].includes(testid)
      expect(screen.queryAllByTestId("minta-jelzo").length > 0, testid).toBe(
        jelolt,
      )
    }
    // az OS saját értékénél a jelölő eltűnik
    cleanup()
    render(
      <Velemenyek
        s={szovegek(
          Object.fromEntries([
            ["velemenyek.pont", "5 / 5"],
            ["velemenyek.szoveg", "a mi értékelésünk"],
            ...[1, 2, 3].flatMap((n) => [
              [`velemenyek.${n}.idezet`, "Idézet"],
              [`velemenyek.${n}.nev`, "Név"],
              [`velemenyek.${n}.megjegyzes`, "megjegyzés"],
            ]),
          ]),
        )}
      />,
    )
    expect(screen.queryByTestId("minta-jelzo")).toBeNull()
  })

  it("egy hivatkozás csak felirattal ÉS céllal jelenik meg", () => {
    render(
      <MitKeresel
        s={szovegek({
          "mit.1.l1.felirat": "Cél nélkül",
          "mit.1.l1.link": "",
          "mit.1.l2.felirat": "",
          "mit.1.l2.link": "/store",
          "mit.1.l3.felirat": "Rendben",
          "mit.1.l3.link": "/store",
        })}
      />,
    )
    expect(screen.queryByText("Cél nélkül")).toBeNull()
    expect(screen.getByText("Rendben")).toBeTruthy()
  })

  it("a veszélyes link és kép nem jut a lapra", () => {
    render(
      <MitKeresel
        s={szovegek({
          "mit.1.l1.felirat": "Rossz",
          "mit.1.l1.link": "javascript:alert(1)",
          "mit.1.kep": "javascript:alert(1)",
          "mit.2.kep": "https://shop.example/static/a.jpg",
        })}
      />,
    )
    expect(screen.queryByText("Rossz")).toBeNull()
    expect(document.querySelector("[href^='javascript']")).toBeNull()
    expect(screen.queryByTestId("mit-kep-1")).toBeNull()
    expect(screen.getByTestId("mit-kep-1-hely")).toBeTruthy()
    expect(screen.getByTestId("mit-kep-2").getAttribute("src")).toBe(
      "https://shop.example/static/a.jpg",
    )
  })

  it("a külső cél új lapon, noopener-rel nyílik", () => {
    render(
      <Boltunk
        s={szovegek({ "bolt.gomb.link": "https://maps.example/acropora" })}
      />,
    )
    const a = screen.getByText("Útvonaltervezés").closest("a")
    expect(a?.getAttribute("target")).toBe("_blank")
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer")
  })

  it("az OS szövege sima szöveg, a sortörés megmarad", () => {
    render(
      <Boltunk
        s={szovegek({
          "bolt.cim": "<img src=x onerror=alert(1)>",
          "bolt.cim_ertek": "Első sor\nMásodik sor",
        })}
      />,
    )
    expect(document.querySelector("img[src='x']")).toBeNull()
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy()
    const ertek = screen.getByText(/Első sor/)
    expect(ertek.className).toContain("whitespace-pre-line")
    expect(ertek.textContent).toBe("Első sor\nMásodik sor")
  })

  it("üres felirat elrejti a sort és a gombot", () => {
    render(
      <KezdoEsHalado
        s={szovegek({
          "halado.2.cim": "",
          "halado.gomb.felirat": "",
          "kezdo.gomb1.link": "",
          "kezdo.gomb2.link": "/store",
        })}
      />,
    )
    expect(screen.queryByText("Laboratóriumi vízmérés")).toBeNull()
    expect(screen.queryByText("Friss érkezések")).toBeNull()
    expect(screen.queryByText("Kezdő útmutató")).toBeNull()
    expect(screen.getByText("Időpont tanácsadásra").closest("a")).toBeTruthy()
  })
})
