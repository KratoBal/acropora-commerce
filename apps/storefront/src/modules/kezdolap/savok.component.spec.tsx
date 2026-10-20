import { cleanup, render, screen } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
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
import { KL_TOKENEK } from "./kl-tokenek"
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

/**
 * A SZIN-KONTRASZT A CI AKADALYMENTESSEGI ELLENORZESENEK MERCEJE (axe, AA 4,5:1).
 * A jsdom nem szamol kontrasztot, ezert a tokenekbol szamolunk: a narancs
 * hattere NEM kap feher szoveget (3,2:1), a narancs SZOVEG a sotetebb tinta.
 */
describe("a kezdőlap színpárjai", () => {
  const fenyero = (hex: string) => {
    const csat = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * csat[0] + 0.7152 * csat[1] + 0.0722 * csat[2]
  }
  const kontraszt = (a: string, b: string) => {
    const [x, y] = [fenyero(a), fenyero(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  const T = KL_TOKENEK as Record<string, string>

  it("a szöveg-színek legalább 4,5:1 a hátterükön", () => {
    const parok: [string, string][] = [
      ["--kl-halvany", "--kl-lap"],
      ["--kl-kek", "--kl-lap"],
      ["--kl-narancs-tinta", "--kl-lap"],
      ["--kl-navy", "--kl-narancs"],
      ["--kl-halvany", "--kl-lap-halvany"],
    ]
    for (const [elol, hatter] of parok)
      expect(
        kontraszt(T[elol], T[hatter]),
        `${elol} / ${hatter}`,
      ).toBeGreaterThanOrEqual(4.5)
  })

  it("a narancs háttérre nem kerül fehér szöveg (3,2:1)", () => {
    expect(kontraszt(T["--kl-feher"], T["--kl-narancs"])).toBeLessThan(4.5)
    const forras = readFileSync(
      join(__dirname, "components", "boltunk", "index.tsx"),
      "utf-8",
    )
    expect(forras).not.toMatch(/var\(--kl-narancs\)[^}]*var\(--kl-feher\)/)
  })
})
