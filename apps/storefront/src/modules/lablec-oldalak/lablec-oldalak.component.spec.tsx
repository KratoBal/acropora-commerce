import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { FizetesLap } from "./fizetes-lap"
import KepesTajekoztatoBeagyazas, {
  KEPES_TAJEKOZTATO_SZKRIPT,
} from "./kepes-tajekoztato-beagyazas"
import { KepesTajekoztatoLap } from "./kepes-tajekoztato-lap"
import { LABLEC_MINTA_SZOVEGEK, lablecMinta } from "./minta-allapot"
import { FIZETESI_MODOK, SZALLITASI_MODOK } from "./regi-bolt-szovegek"
import { SzallitasLap } from "./szallitas-lap"

afterEach(cleanup)

/**
 * A LABLEC HARMADIK HARMADA SAJAT OLDALRA KERULT (commerce-audit-p1). MI
 * PIROSIT: ha a Szallitas oldal elveszti egy mod savjat vagy koltseget; ha a
 * Foxpost-leiras linkje (a regi oldal "itt" linkje) elesik; ha a Fizetes oldalrol
 * kiesik egy mod, vagy a SimplePay-sor visszakerul; ha az oldalak a regi bolt
 * hosztjara mutatnak; ha a Kepes tajekoztato beagyazasa mas attributumokkal ul a
 * lapra, mint a regi oldalon (`id`, `data-id`, `data-type`), vagy kikapcsolva
 * mégis hivast tesz a Fogyasztobarat fele.
 */
describe("a Szállítás oldal", () => {
  it("mind a hat szállítási módot mutatja a regi oldal nevevel", () => {
    render(<SzallitasLap cim="Szállítás" />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Szállítás",
    )
    const nevek = screen
      .getAllByTestId("szallitasi-mod")
      .map((li) => li.querySelector("h3")?.textContent)
    expect(nevek).toEqual([
      "Személyes átvétel az üzletünkben",
      "GLS házhozszállítás",
      "Átvétel a GLS csomagponton",
      "Nehéz áru házhozszállítása GLS futárszolgálattal",
      "Nehéz áru GLS csomagpontra szállítása",
      "Foxpost csomagautomaták",
    ])
  })

  it("a sávos módoknál a megrendelés végösszege szerinti sávokat és az ingyenes sávot mutatja", () => {
    render(<SzallitasLap cim="Szállítás" />)
    const foxpost = screen.getAllByTestId("szallitasi-mod")[5]
    const sorok = Array.from(foxpost.querySelectorAll("tbody tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((td) => td.textContent),
    )
    expect(sorok).toEqual([
      ["0 Ft", "29 999 Ft", "1 150 Ft"],
      ["30 000 Ft", "", "ingyenes"],
    ])
    const gls = screen.getAllByTestId("szallitasi-mod")[1]
    expect(
      Array.from(gls.querySelectorAll("tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) => td.textContent),
      ),
    ).toEqual([
      ["0 Ft", "49 999 Ft", "3 500 Ft"],
      ["50 000 Ft", "", "ingyenes"],
    ])
  })

  it("az egyetlen díjú módoknál a díj áll, és a leírás a regi szó szerint", () => {
    render(<SzallitasLap cim="Szállítás" />)
    const mod = screen.getAllByTestId("szallitasi-mod")
    expect(mod[0].textContent).toContain("0 Ft")
    expect(mod[3].textContent).toContain(
      "20 kg feletti termékek esetében alkalmazott szállítási mód",
    )
    expect(mod[3].textContent).toContain("4 500 Ft")
  })

  it("a Foxpost-leírás végén a regi oldal 'itt' linkje áll", () => {
    render(<SzallitasLap cim="Szállítás" />)
    const link = screen
      .getAllByTestId("szallitasi-mod")[5]
      .querySelector("a") as HTMLAnchorElement
    expect(link.textContent).toBe("itt")
    expect(link.getAttribute("href")).toBe(
      "https://www.foxpost.hu/csomagautomatak",
    )
    expect(link.getAttribute("rel")).toContain("noopener")
  })

  it("nem mutat a régi bolt hosztjára", () => {
    const { container } = render(<SzallitasLap cim="Szállítás" />)
    expect(container.innerHTML).not.toContain("shop.acropora.hu")
    expect(JSON.stringify(SZALLITASI_MODOK)).not.toContain("shop.acropora.hu")
  })
})

describe("a Fizetés oldal", () => {
  it("mind a négy fizetési módot mutatja a regi oldal nevevel", () => {
    render(<FizetesLap cim="Fizetés" />)
    expect(
      screen
        .getAllByTestId("fizetesi-mod")
        .map((li) => li.querySelector("p")?.textContent),
    ).toEqual([
      "Készpénzzel vagy bankkártyával üzletünkben",
      "Fizetés a GLS futárnál bankkártyával vagy készpénzzel (+450 Ft.)",
      "Fizetés utánvéttel a GLS Csomagponton (+450 Ft.)",
      "Fizetés a Foxpost csomagautomatánál bankkártyával (+450 Ft.)",
    ])
  })

  it("a SimplePay kikerült: Balázs döntése szerint csak Stripe (msg 1556600276499308556)", () => {
    const { container } = render(<FizetesLap cim="Fizetés" />)
    expect(container.textContent?.toLowerCase()).not.toContain("simplepay")
    expect(container.textContent).not.toContain("Vásárló tájékoztató")
    expect(container.querySelector("a")).toBeNull()
    expect(JSON.stringify(FIZETESI_MODOK).toLowerCase()).not.toContain(
      "simplepay",
    )
  })

  it("nem mutat a régi bolt hosztjára", () => {
    const { container } = render(<FizetesLap cim="Fizetés" />)
    expect(container.innerHTML).not.toContain("shop.acropora.hu")
    expect(JSON.stringify(FIZETESI_MODOK)).not.toContain("shop.acropora.hu")
  })
})

describe("a nem egyeztetett szövegek jelzője", () => {
  it("a Szállítás és a Fizetés oldal mintajelzőt visel, amíg a kapu listáján áll", () => {
    for (const [lap, kulcs] of [
      [<SzallitasLap key="s" cim="Szállítás" />, "szallitas"],
      [<FizetesLap key="f" cim="Fizetés" />, "fizetes"],
    ] as const) {
      const { unmount } = render(lap)
      const jelzo = screen.getByTestId("minta-jelzo")
      expect(jelzo.textContent).toContain("Minta adat")
      expect(jelzo.textContent).toContain(lablecMinta(kulcs)!.mit)
      unmount()
    }
  })

  it("a jelzők száma a kapu számával egyezik: nincs jelző a kapu nélkül, sem kapu jelző nélkül", () => {
    const { container } = render(
      <>
        <SzallitasLap cim="Szállítás" />
        <FizetesLap cim="Fizetés" />
      </>,
    )
    expect(
      container.querySelectorAll('[data-testid="minta-jelzo"]'),
    ).toHaveLength(LABLEC_MINTA_SZOVEGEK.length)
  })

  it("a Képes tájékoztató nem visel jelzőt: a tartalmat a Fogyasztóbarát adja", () => {
    const { container } = render(<KepesTajekoztatoLap cim="Képes" />)
    expect(container.querySelector('[data-testid="minta-jelzo"]')).toBeNull()
  })
})

describe("a Képes vásárlói tájékoztató beágyazása", () => {
  it("bekapcsolva ugyanazt a szkriptet teszi a dobozba, mint a regi oldal", () => {
    render(<KepesTajekoztatoBeagyazas bekapcsolva azonosito="TESZTID1" />)
    const doboz = screen.getByTestId("kepes-tajekoztato-doboz")
    const szkript = doboz.querySelector("script") as HTMLScriptElement
    expect(szkript).not.toBeNull()
    expect(szkript.id).toBe("fbarat-embed")
    expect(szkript.getAttribute("src")).toBe(KEPES_TAJEKOZTATO_SZKRIPT)
    expect(KEPES_TAJEKOZTATO_SZKRIPT).toBe(
      "https://admin.fogyasztobarat.hu/e-api.js",
    )
    expect(szkript.getAttribute("data-id")).toBe("TESZTID1")
    expect(szkript.getAttribute("data-type")).toBe("def")
  })

  it("kikapcsolva nem kerül szkript a lapra, a jogi lapokkal azonos szöveg áll", () => {
    const { container } = render(
      <KepesTajekoztatoBeagyazas bekapcsolva={false} />,
    )
    expect(container.querySelector("script")).toBeNull()
    expect(document.querySelector("script#fbarat-embed")).toBeNull()
    expect(screen.getByTestId("kepes-eles-cimen").textContent).toBe(
      "A tájékoztató az éles címen jelenik meg.",
    )
  })

  it("lecsatolva a szkript is eltűnik a dobozból", () => {
    const { unmount } = render(<KepesTajekoztatoBeagyazas bekapcsolva />)
    expect(document.querySelectorAll("script#fbarat-embed")).toHaveLength(1)
    unmount()
    expect(document.querySelectorAll("script#fbarat-embed")).toHaveLength(0)
  })

  it("az oldal címet és dobozt ad", () => {
    render(<KepesTajekoztatoLap cim="Képes vásárlói tájékoztató" />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Képes vásárlói tájékoztató",
    )
  })
})
