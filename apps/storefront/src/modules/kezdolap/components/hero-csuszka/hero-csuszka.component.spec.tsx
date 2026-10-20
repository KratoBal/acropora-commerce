import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu",
}))

import type { HeroDia } from "@modules/kezdolap/tartalom"
import HeroCsuszka from "./index"

const dia = (n: number, felul: Partial<HeroDia> = {}): HeroDia => ({
  eyebrow: `Felirat ${n}`,
  title: `Cím ${n}`,
  text: `Szöveg ${n}`,
  cta: `Gomb ${n}`,
  cta_href: "/store",
  cta2: `Másik ${n}`,
  cta2_href: null,
  caption: `Kép ${n}`,
  caption2: `Kép alatt ${n}`,
  image_url: null,
  image_alt: `Alt ${n}`,
  ...felul,
})
const TENYEK = [{ cim: "Tény", szoveg: "szöveg" }]

const mozgasCsokkentes = (be: boolean) => {
  const figyelok: ((e: { matches: boolean }) => void)[] = []
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: be,
    addEventListener: (_: string, f: (e: { matches: boolean }) => void) => figyelok.push(f),
    removeEventListener: vi.fn(),
  })) as never
  return figyelok
}

/**
 * A HERO-CSUSZKA, A TERV SZERINT: automatikusan lep, es megall.
 *
 * MI PIROSIT: ha nem lep hat masodpercenkent; ha egy kattintas/erintes utan
 * tovabb lep; ha mozgas-csokkentesnel (az elejen VAGY menet kozben) lep; ha
 * egyetlen diaval is "lep"; ha egy gomb link nelkul is megjelenik; ha az OS
 * szovege HTML-kent ertelmezodik; ha a lapozo nem korbeer.
 */
describe("a hero-csúszka", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mozgasCsokkentes(false)
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  const cim = () => screen.getByRole("heading", { level: 1 }).textContent
  const telik = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

  it("hat másodpercenként lép, és körbeér", () => {
    render(<HeroCsuszka diak={[dia(1), dia(2)]} tenyek={TENYEK} />)
    expect(cim()).toBe("Cím 1")
    telik(5900)
    expect(cim()).toBe("Cím 1")
    telik(200)
    expect(cim()).toBe("Cím 2")
    telik(6000)
    expect(cim()).toBe("Cím 1")
  })

  it("az első kattintásra megáll, és nem indul újra", () => {
    render(<HeroCsuszka diak={[dia(1), dia(2), dia(3)]} tenyek={TENYEK} />)
    fireEvent.pointerDown(screen.getByTestId("hero-csuszka"))
    expect(screen.getByTestId("hero-csuszka").dataset.automata).toBe("all")
    telik(6100)
    expect(cim()).toBe("Cím 1")
    fireEvent.click(screen.getByLabelText("Következő dia"))
    expect(cim()).toBe("Cím 2")
    telik(6100)
    expect(cim()).toBe("Cím 2")
  })

  it("egy billentyű a csúszkán is megállítja", () => {
    render(<HeroCsuszka diak={[dia(1), dia(2)]} tenyek={TENYEK} />)
    fireEvent.keyDown(screen.getByTestId("hero-csuszka"), { key: "Tab" })
    telik(6100)
    expect(cim()).toBe("Cím 1")
  })

  it("mozgás-csökkentésnél az elejétől nem lép", () => {
    mozgasCsokkentes(true)
    render(<HeroCsuszka diak={[dia(1), dia(2)]} tenyek={TENYEK} />)
    telik(6100)
    expect(cim()).toBe("Cím 1")
  })

  it("mozgás-csökkentés menet közbeni bekapcsolására megáll", () => {
    const figyelok = mozgasCsokkentes(false)
    render(<HeroCsuszka diak={[dia(1), dia(2)]} tenyek={TENYEK} />)
    act(() => figyelok.forEach((f) => f({ matches: true })))
    telik(6100)
    expect(cim()).toBe("Cím 1")
  })

  it("egy diánál nincs lapozó és nincs léptetés; nulla diánál nincs csúszka", () => {
    const { container, rerender } = render(<HeroCsuszka diak={[dia(1)]} tenyek={TENYEK} />)
    expect(screen.queryByLabelText("Következő dia")).toBeNull()
    telik(6100)
    expect(cim()).toBe("Cím 1")
    rerender(<HeroCsuszka diak={[]} tenyek={TENYEK} />)
    expect(container.firstChild).toBeNull()
  })

  it("a gomb csak akkor jelenik meg, ha van felirata ÉS célja", () => {
    render(
      <HeroCsuszka
        diak={[dia(1, { cta2: "Cél nélkül", cta2_href: null }), dia(2, { cta: "" })]}
        tenyek={TENYEK}
      />,
    )
    expect(screen.getByText("Gomb 1")).toBeTruthy()
    expect(screen.queryByText("Cél nélkül")).toBeNull()
    fireEvent.click(screen.getByLabelText("Következő dia"))
    expect(screen.queryByText("Gomb 2")).toBeNull()
  })

  it("az OS szövege sima szöveg, nem HTML", () => {
    render(
      <HeroCsuszka
        diak={[dia(1, { title: "<img src=x onerror=alert(1)>" })]}
        tenyek={TENYEK}
      />,
    )
    expect(cim()).toBe("<img src=x onerror=alert(1)>")
    expect(document.querySelector("img[src='x']")).toBeNull()
  })

  it("a kép van, vagy az alt szövegű hely áll helyette", () => {
    render(
      <HeroCsuszka
        diak={[dia(1, { image_url: "https://shop.example/static/a.jpg" }), dia(2)]}
        tenyek={TENYEK}
      />,
    )
    expect(screen.getByTestId("hero-kep").getAttribute("src")).toBe(
      "https://shop.example/static/a.jpg",
    )
    fireEvent.click(screen.getByLabelText("Következő dia"))
    expect(screen.getByTestId("hero-kep-hely").textContent).toBe("Alt 2")
  })
})

/**
 * A KEZDOLAP NEM RENDEREL HTML-T AZ OS SZOVEGEBOL (barracuda, #551).
 *
 * A fenti DOM-teszt egyetlen komponenst fog meg. Ez az allitas a FAJLOKAT nezi,
 * es a `modules/kezdolap` teljes fajat bejarja, tehat egy kesobbi sav is
 * beleesik: egy `dangerouslySetInnerHTML` a kezdolapon ezt a vegpontot
 * XSS-uttva tenne.
 */
describe("a kezdőlap forrása", () => {
  const bejar = (mappa: string): string[] =>
    readdirSync(mappa, { withFileTypes: true }).flatMap((b) =>
      b.isDirectory()
        ? bejar(join(mappa, b.name))
        : /\.(ts|tsx)$/.test(b.name) && !b.name.includes(".spec.")
          ? [join(mappa, b.name)]
          : [],
    )

  it("sehol nem állít be HTML-t (a megjegyzés említése nem számít, a használat igen)", () => {
    const fajlok = bejar(join(__dirname, "..", ".."))
    expect(fajlok.length).toBeGreaterThan(5)
    for (const ut of fajlok)
      expect(readFileSync(ut, "utf-8"), ut).not.toMatch(
        /dangerouslySetInnerHTML\s*=|__html\s*:|\.innerHTML\s*=/,
      )
  })
})
