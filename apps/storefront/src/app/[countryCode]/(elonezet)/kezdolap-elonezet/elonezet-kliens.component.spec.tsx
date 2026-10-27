import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { jelolo, akcio, termekek } = vi.hoisted(() => ({
  jelolo: (nev: string) => ({ default: () => <i data-sav={nev} /> }),
  akcio: vi.fn(),
  termekek: vi.fn(async () => []),
}))
vi.mock("@modules/kezdolap/components/hero-csuszka", () => jelolo("hero"))
vi.mock("@modules/kezdolap/components/mit-keresel", () => jelolo("mit-keresel"))
vi.mock("@modules/kezdolap/components/kezdo-es-halado", () =>
  jelolo("kezdo-es-halado"),
)
vi.mock("@modules/kezdolap/components/szolgaltatasok", () =>
  jelolo("szolgaltatasok"),
)
vi.mock("@modules/kezdolap/components/markak", () => jelolo("markak"))
vi.mock("@modules/kezdolap/components/velemenyek", () => jelolo("velemenyek"))
vi.mock("@modules/kezdolap/components/boltunk", () => jelolo("boltunk"))
vi.mock("@modules/kezdolap/components/egyedi-korallok", () => ({
  default: () => null,
  EgyediKorallokSav: () => <i data-sav="egyedi-korallok" />,
  termekekHandleSzerint: termekek,
}))
vi.mock("@modules/layout/templates/footer/lablec-keret", () => ({
  LablecKeret: ({ lablec }: { lablec: { alsoSor: string | null } }) => (
    <footer data-testid="lablec">{lablec.alsoSor}</footer>
  ),
}))
vi.mock("./akciok", () => ({ elonezetiAdat: akcio }))

import fixtura from "@lib/util/__fixtures__/homepage-content-record.fixture.json"
import { BLOKK_KULCSOK } from "@modules/kezdolap/blokkok"
import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"
import type { LablecAdat } from "@modules/layout/templates/footer/lablec-adat"
import ElonezetKliens from "./elonezet-kliens"

/*
  A KEZDOLAP ELO ELONEZETE, A KLIENS. MI PIROSIT: ha idegen origin uzenetet
  elfogad; ha a `postMessage` cime `*` vagy hianyzik az OS cime es mégis kuld;
  ha ismeretlen tipus vagy version != 1 hatassal van; ha a serult rekordot
  (reszben) kirajzolja ahelyett, hogy `error`-t kuldene; ha a fixtura
  blokk-sorrendje, lathatosaga es lablece nem jelenik meg; ha a kattintas nem a
  blokk kulcsat jelzi, vagy egy link elnavigalja az elonezetet; ha a kijeloles
  nem a kapott blokkot korvonalazza.
*/
const OS = "https://os-teszt.acropora.hu"
const lablec = (alsoSor: string | null): LablecAdat => ({
  bemutatkozo: null,
  oszlopok: [],
  kozossegi: [],
  alsoSor,
})
const KEZDO: KezdolapTartalom = { texts: {}, slides: null }

let szulo: { postMessage: ReturnType<typeof vi.fn> }

function megjelenit(osOrigin: string | null = OS) {
  return render(
    <ElonezetKliens
      osOrigin={osOrigin}
      countryCode="hu"
      kezdoRekord={KEZDO}
      kezdoLablec={lablec("MENTETT")}
      fejlec={<header data-testid="fejlec" />}
    />,
  )
}

function uzenet(data: unknown, origin: string = OS) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data, origin }))
  })
}

const sorrend = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLElement>("[data-homepage-block]")).map(
    (e) => e.dataset.homepageBlock,
  )

beforeEach(() => {
  szulo = { postMessage: vi.fn() }
  Object.defineProperty(window, "parent", { value: szulo, configurable: true })
  // a szerver valasza: a tisztitott rekord (a kliens csak ezt rajzolja) es a lablec
  akcio.mockReset().mockImplementation(async (rekord: KezdolapTartalom) => ({
    ok: true,
    adat: lablec("ELO LABLEC"),
    rekord: { ...rekord, tisztitott: true },
  }))
  termekek.mockClear()
})
afterEach(() => {
  cleanup()
  Object.defineProperty(window, "parent", { value: window, configurable: true })
})

describe("az élő előnézet kliense", () => {
  it("betöltéskor ready-t küld az OS pontos címére, nem *-ra, és a mentett állapotot mutatja", () => {
    const { container, getByTestId } = megjelenit()
    expect(szulo.postMessage).toHaveBeenCalledWith(
      { type: "acropora:homepage-preview:ready", version: 1 },
      OS,
    )
    for (const hivas of szulo.postMessage.mock.calls)
      expect(hivas[1]).not.toBe("*")
    expect(sorrend(container)).toEqual([...BLOKK_KULCSOK])
    expect(getByTestId("lablec").textContent).toBe("MENTETT")
    expect(getByTestId("fejlec")).toBeTruthy()
  })

  it("a közös fixtúra sorrendje és láthatósága megjelenik, a lábléc élőben frissül", async () => {
    const { container, getByTestId } = megjelenit()
    uzenet({
      type: "acropora:homepage-preview:content",
      version: 1,
      record: fixtura,
    })
    await act(async () => {})
    expect(sorrend(container)).toEqual(
      fixtura.blocks.filter((b) => b.visible).map((b) => b.key),
    )
    expect(akcio).toHaveBeenCalledTimes(1)
    expect(getByTestId("lablec").textContent).toBe("ELO LABLEC")
  })

  it("idegen origin üzenetét nem fogadja el", async () => {
    const { container } = megjelenit()
    uzenet(
      {
        type: "acropora:homepage-preview:content",
        version: 1,
        record: fixtura,
      },
      "https://evil.example",
    )
    await act(async () => {})
    expect(sorrend(container)).toEqual([...BLOKK_KULCSOK])
    expect(akcio).not.toHaveBeenCalled()
  })

  it("ismeretlen típus és version != 1 hatástalan", async () => {
    const { container } = megjelenit()
    uzenet({
      type: "acropora:homepage-preview:masvalami",
      version: 1,
      record: fixtura,
    })
    uzenet({
      type: "acropora:homepage-preview:content",
      version: 2,
      record: fixtura,
    })
    uzenet({ type: "acropora:homepage-preview:content", record: fixtura })
    uzenet("szöveg")
    uzenet(null)
    await act(async () => {})
    expect(sorrend(container)).toEqual([...BLOKK_KULCSOK])
    expect(akcio).not.toHaveBeenCalled()
  })

  it("a sérült rekordból semmit nem rajzol át, error-t küld az OS-nek", async () => {
    const { container } = megjelenit()
    const serult = { ...fixtura, footer: { ...fixtura.footer, contact: {} } }
    uzenet({
      type: "acropora:homepage-preview:content",
      version: 1,
      record: serult,
    })
    await act(async () => {})
    expect(sorrend(container)).toEqual([...BLOKK_KULCSOK])
    expect(akcio).not.toHaveBeenCalled()
    const hiba = szulo.postMessage.mock.calls.find(
      ([m]) => m.type === "acropora:homepage-preview:error",
    )
    expect(hiba?.[0].message).toContain("footer")
    expect(hiba?.[1]).toBe(OS)
  })

  it("a kattintás a blokk kulcsát jelzi, a link nem visz el", () => {
    const { container } = megjelenit()
    const blokk = container.querySelector('[data-homepage-block="markak"]')!
    const link = document.createElement("a")
    link.href = "/store"
    blokk.appendChild(link)
    const folytatodott = fireEvent.click(link)
    expect(folytatodott).toBe(false) // preventDefault
    expect(szulo.postMessage).toHaveBeenCalledWith(
      {
        type: "acropora:homepage-preview:selected",
        block: "markak",
        version: 1,
      },
      OS,
    )
  })

  it("a select üzenet a kapott blokkot körvonalazza, ismeretlen kulcs nem, null levesz", () => {
    const { container } = megjelenit()
    uzenet({
      type: "acropora:homepage-preview:select",
      version: 1,
      block: "boltunk",
    })
    expect(container.querySelector("style")?.textContent).toContain(
      '[data-homepage-block="boltunk"]',
    )
    uzenet({
      type: "acropora:homepage-preview:select",
      version: 1,
      block: '"]{}x',
    })
    expect(container.querySelector("style")).toBeNull()
    uzenet({
      type: "acropora:homepage-preview:select",
      version: 1,
      block: "hero",
    })
    uzenet({
      type: "acropora:homepage-preview:select",
      version: 1,
      block: null,
    })
    expect(container.querySelector("style")).toBeNull()
  })

  it("OS-cím nélkül nem fogad és nem küld semmit", async () => {
    const { container } = megjelenit(null)
    uzenet({
      type: "acropora:homepage-preview:content",
      version: 1,
      record: fixtura,
    })
    await act(async () => {})
    expect(sorrend(container)).toEqual([...BLOKK_KULCSOK])
    expect(szulo.postMessage).not.toHaveBeenCalled()
  })
})
