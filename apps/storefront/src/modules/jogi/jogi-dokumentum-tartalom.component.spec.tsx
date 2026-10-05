import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fogyasztobaratBekapcsolva } from "@lib/util/fogyasztobarat"

import FogyasztobaratWidget from "./fogyasztobarat-widget"
import JogiDokumentumTartalom from "./jogi-dokumentum-tartalom"

/*
  A DOKUMENTUM A BÖNGÉSZŐBEN (2026-10-05). Ami pirosít: a "Hibakód: 1002" (200-as
  státusszal) dokumentumként jelenik meg; egy hálózati hiba üres lapot hagy; a
  letöltött HTML tisztítás nélkül kerül a lapra; a kérés nem a Fogyasztóbarát
  forrásához megy.
*/
/*
  A `next/script` HELYETT EGY JEGYZO: a teszt SOHA nem tolthet be kulso
  szkriptet (acrobot 26244), es igy az is latszik, kért-e szkriptet a widget
  (a valodi `Script` a fejlecbe ir, nem a renderelt tartalomba).
*/
const szkriptek = vi.hoisted(() => [] as Record<string, unknown>[])
vi.mock("next/script", () => ({
  default: (props: Record<string, unknown>) => {
    szkriptek.push(props)
    return null
  },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const valasz = (szoveg: string, ok = true) =>
  vi.fn().mockResolvedValue({ ok, text: async () => szoveg })

describe("kikapcsolva (az alapállapot, acrobot 26244)", () => {
  it("SEMMILYEN hívás nem megy, és rögtön a helyettesítő szöveg látszik", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(
      <JogiDokumentumTartalom
        kulcs="aszf"
        maiBoltCim="https://shop.acropora.hu/shop_help.php?tab=terms"
      />,
    )
    expect(screen.getByTestId("jogi-eles-cimen").textContent).toContain(
      "A dokumentum az éles címen jelenik meg.",
    )
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("a widget kikapcsolva nem kér szkriptet; bekapcsolva a bolt azonosítójával", () => {
    szkriptek.length = 0
    render(<FogyasztobaratWidget />)
    expect(szkriptek).toEqual([])
    render(<FogyasztobaratWidget bekapcsolva />)
    expect(szkriptek).toEqual([
      {
        id: "fbarat",
        src: "https://admin.fogyasztobarat.hu/h-api.js",
        "data-id": "JPNFMVH0",
        strategy: "afterInteractive",
      },
    ])
  })

  it("csak a pontos `true` kapcsolja be", () => {
    expect(
      [undefined, "", "1", "TRUE ", "yes", "true", " true "].map((v) =>
        fogyasztobaratBekapcsolva(v),
      ),
    ).toEqual([false, false, false, false, false, true, true])
  })
})

describe("JogiDokumentumTartalom", () => {
  it("a tartalmat a forrásból kéri, és tisztítva teszi a lapra", async () => {
    const fetchMock = valasz(
      '<h2>ÁSZF</h2><p onclick="x()">Szöveg</p><script>alert(1)</script>',
    )
    vi.stubGlobal("fetch", fetchMock)
    render(<JogiDokumentumTartalom bekapcsolva kulcs="aszf" />)
    const tartalom = await screen.findByTestId("jogi-tartalom")
    expect(fetchMock.mock.calls[0]![0]).toBe(
      "https://admin.fogyasztobarat.hu/api.php?aszf=JPNFMVH0",
    )
    expect(tartalom.innerHTML).toBe("<h2>ÁSZF</h2><p>Szöveg</p>")
  })

  it("a teszt kirakaton (1002) az éles címre utal, és a mai bolt oldalára linkel", async () => {
    vi.stubGlobal("fetch", valasz("Hibakód: 1002"))
    render(
      <JogiDokumentumTartalom
        bekapcsolva
        kulcs="aszf"
        maiBoltCim="https://shop.acropora.hu/shop_help.php?tab=terms"
      />,
    )
    const szoveg = await screen.findByTestId("jogi-eles-cimen")
    expect(szoveg.textContent).toContain(
      "A dokumentum az éles címen jelenik meg.",
    )
    expect(
      screen.getByRole("link", { name: "megnyitom" }).getAttribute("href"),
    ).toBe("https://shop.acropora.hu/shop_help.php?tab=terms")
    expect(screen.queryByTestId("jogi-tartalom")).toBeNull()
  })

  it("mai bolti oldal nélkül link sincs", async () => {
    vi.stubGlobal("fetch", valasz("Hibakod: 1002"))
    render(<JogiDokumentumTartalom bekapcsolva kulcs="cookie" />)
    await screen.findByTestId("jogi-eles-cimen")
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("más hibakód olvasható hiba", async () => {
    vi.stubGlobal("fetch", valasz("Hibakód: 1001"))
    render(<JogiDokumentumTartalom bekapcsolva kulcs="imp" />)
    expect((await screen.findByTestId("jogi-hiba")).textContent).toContain(
      "1001",
    )
  })

  it("hálózati hibánál is mond valamit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    render(<JogiDokumentumTartalom bekapcsolva kulcs="imp" />)
    expect((await screen.findByTestId("jogi-hiba")).textContent).toContain(
      "nem tölthető be",
    )
  })
})
