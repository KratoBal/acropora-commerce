import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import Boltunk from "./components/boltunk"
import HeroCsuszka from "./components/hero-csuszka"
import KezdoEsHalado from "./components/kezdo-es-halado"
import Markak from "./components/markak"
import MitKeresel from "./components/mit-keresel"
import Szolgaltatasok from "./components/szolgaltatasok"
import Velemenyek from "./components/velemenyek"
import { szovegek } from "./szovegek"
import { ALAP_DIAK } from "./tartalom"

/**
 * A KEZDOLAP NEM FUT KI SZELES KEPERNYON (Balazs, 2026-10-20: "tul szeles").
 *
 * A jsdom nem szamol elrendezest, ezert a SZERKEZETET meri: minden sav
 * tartalma a `kl-konteiner` elemben all (max 1440 pixel, oldalmargo), es a sav
 * sajat `section` eleme NEM kap vizszintes kitoltest (az a teljes szelessegu
 * hatter dolga, nem a tartalome). A ket panel (Kezdoknek / Tapasztaltaknak)
 * teljes szelessegu hatterrel a kozepso 1440 pixelhez igazodo kitoltest kap
 * a kulso szeleken.
 *
 * MI PIROSIT: egy sav tartalma kikerul a konteneren kivul; egy `section` kap
 * `px-16`-ot (a tartalom megint kifutna); a konteneren a max-width eltunik.
 */
const S = szovegek(null)
const SAVOK: [string, () => JSX.Element][] = [
  [
    "hero-csuszka",
    () => (
      <HeroCsuszka diak={[...ALAP_DIAK]} tenyek={[{ cim: "a", szoveg: "b" }]} />
    ),
  ],
  ["mit-keresel", () => <MitKeresel s={S} />],
  ["szolgaltatasok", () => <Szolgaltatasok s={S} />],
  ["markak", () => <Markak s={S} />],
  ["velemenyek", () => <Velemenyek s={S} />],
  ["boltunk", () => <Boltunk s={S} />],
]

describe("a kezdőlap szélessége", () => {
  afterEach(cleanup)

  it.each(SAVOK)("%s tartalma a 1440 pixeles konténerben áll", (_nev, sav) => {
    const { container } = render(sav())
    const konteners = container.querySelectorAll('[data-testid="kl-konteiner"]')
    expect(konteners.length).toBeGreaterThan(0)
    for (const k of konteners) {
      expect(k.className).toContain("max-w-[1440px]")
      expect(k.className).toContain("mx-auto")
    }
    const szekcio = container.querySelector("section")
    expect(szekcio?.className ?? "").not.toMatch(
      /(^|\s)(small:)?px-(4|6|16)(\s|$)/,
    )
  })

  it("a két panel háttere teljes szélességű, a belső kitöltés a 1440-es kerethez igazodik", () => {
    render(<KezdoEsHalado s={S} />)
    const sav = screen.getByTestId("kezdo-es-halado")
    const panelek = [...sav.children] as HTMLElement[]
    expect(panelek).toHaveLength(2)
    expect(panelek[0]?.className).toContain("calc((100vw_-_1440px)/2_+_4rem)")
    expect(panelek[1]?.className).toContain("calc((100vw_-_1440px)/2_+_4rem)")
  })
})
