import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import HeroCsuszka from "./components/hero-csuszka"
import KezdoEsHalado from "./components/kezdo-es-halado"
import { szovegek } from "./szovegek"
import { ALAP_DIAK } from "./tartalom"

/*
  A FORMAZOTT SZOVEGEK A SAVOKBAN. MI PIROSIT: ha a tisztitott HTML nem elem
  lesz (a felkover, a lista, a link); ha tisztitatlan ertekbol HTML jut a lapra
  (a szkript elem sosem kerulhet a DOM-ba); ha a sima kezdoertek mas lesz; ha a
  hero-dia szovege nem kovetjuk a jelolot.
*/
const HTML =
  '<p>Egy <strong>félkövér</strong> és <a href="/store">link</a></p><ul><li>pont</li></ul>'
afterEach(cleanup)

describe("a kezdőknek sáv formázott szövege", () => {
  it("tisztított rekordból elem: félkövér, link, lista", () => {
    const s = szovegek(
      { "kezdo.szoveg": HTML, "kezdo.1.szoveg": "<p><em>Dőlt</em></p>" },
      true,
    )
    const { container } = render(<KezdoEsHalado s={s} />)
    expect(container.querySelector("strong")?.textContent).toBe("félkövér")
    expect(container.querySelector('a[href="/store"]')).not.toBeNull()
    expect(container.querySelector("ul li")?.textContent).toBe("pont")
    expect(container.querySelector("em")?.textContent).toBe("Dőlt")
  })

  it("tisztítási jelölő nélkül nincs elem, nincs szkript, csak a szöveg", () => {
    const s = szovegek(
      { "kezdo.szoveg": HTML + "<script>alert(1)</script>" },
      false,
    )
    const { container } = render(<KezdoEsHalado s={s} />)
    expect(container.querySelector("script")).toBeNull()
    expect(container.querySelector("strong")).toBeNull()
    expect(container.textContent).toContain("Egy félkövér és link")
  })

  it("a sima kezdőérték változatlanul szöveg", () => {
    const { container } = render(<KezdoEsHalado s={szovegek(null)} />)
    expect(container.textContent).toContain("Végigmegyünk veled az egészen")
  })
})

describe("a hero-dia formázott szövege", () => {
  const diak = [{ ...ALAP_DIAK[0]!, text: "<p>Dia <strong>erős</strong></p>" }]
  const tenyek = [{ cim: "a", szoveg: "b" }]

  it("tisztított rekordnál elem", () => {
    const { container } = render(
      <HeroCsuszka diak={diak} tenyek={tenyek} tisztitott />,
    )
    expect(container.querySelector("strong")?.textContent).toBe("erős")
  })

  it("jelölő nélkül szöveg", () => {
    const { container } = render(<HeroCsuszka diak={diak} tenyek={tenyek} />)
    expect(container.querySelector("strong")).toBeNull()
    expect(container.textContent).toContain("Dia erős")
  })
})
