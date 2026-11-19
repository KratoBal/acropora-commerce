import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { helyorzoHtml } from "@lib/util/youtube-helyorzo"

import YoutubeBetolto from "./index"

/**
 * A YOUTUBE-HELYORZO KATTINTASRA TOLTODIK (kartya dc8cabd2). MI PIROSIT: kattintas nelkul van iframe (a lap hozzajarulas
 * nelkul a YouTube-ot hivna); a betoltott iframe nem a nocookie domain, vagy nem kattintasra indul, vagy nem a megjelolt
 * videot tolti; egy atirt (ervenytelen vagy egymasnak ellentmondo) jelolesbol is betolt; mas elemre kattintas betolt; a
 * betoltes tarol valamit (suti, localStorage); a komponens eltavolitasa utan is figyel.
 */
afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

const lap = (html: string) => {
  const doboz = document.createElement("div")
  doboz.innerHTML = html
  document.body.appendChild(doboz)
  return doboz
}

describe("YoutubeBetolto", () => {
  it("kattintas nelkul nincs iframe, kattintasra a nocookie videot tolti, autoplay-jel", () => {
    render(<YoutubeBetolto />)
    const doboz = lap(helyorzoHtml("xDhs3jEA6oA"))
    expect(doboz.querySelector("iframe")).toBeNull()
    fireEvent.click(doboz.querySelector("[data-yt-betolt]")!)
    const keret = doboz.querySelector("iframe")!
    expect(keret).not.toBeNull()
    expect(keret.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/xDhs3jEA6oA?autoplay=1&rel=0",
    )
    expect(keret.getAttribute("allow")).toContain("autoplay")
    expect(keret.getAttribute("referrerpolicy")).toBe(
      "strict-origin-when-cross-origin",
    )
    // a helyorzo tartalma kicserelodott: a gomb es a link elt eltunt
    expect(doboz.querySelector("[data-yt-betolt]")).toBeNull()
  })

  it("csak a megkattintott helyorzot tolti, a masikat nem", () => {
    render(<YoutubeBetolto />)
    const doboz = lap(helyorzoHtml("xDhs3jEA6oA") + helyorzoHtml("c1BvXRULiSM"))
    fireEvent.click(doboz.querySelectorAll("[data-yt-betolt]")[1]!)
    const keretek = doboz.querySelectorAll("iframe")
    expect(keretek).toHaveLength(1)
    expect(keretek[0]!.getAttribute("src")).toContain("c1BvXRULiSM")
    expect(doboz.querySelectorAll("[data-yt-betolt]")).toHaveLength(1)
  })

  it("atirt jelolesbol nem tolt: ervenytelen azonosito, egymasnak ellentmondo azonositok", () => {
    render(<YoutubeBetolto />)
    const doboz = lap(
      '<div data-yt-embed="rovid"><button data-yt-betolt="rovid">x</button></div>' +
        '<div data-yt-embed="xDhs3jEA6oA"><button data-yt-betolt="c1BvXRULiSM">y</button></div>' +
        '<div data-yt-embed="xDhs3jEA6oA"><button data-yt-betolt="xDhs3jEA6oA&quot; onload=&quot;x">z</button></div>',
    )
    for (const gomb of Array.from(doboz.querySelectorAll("[data-yt-betolt]")))
      fireEvent.click(gomb)
    expect(doboz.querySelector("iframe")).toBeNull()
  })

  it("mas elemre kattintas nem tolt, es a betoltes nem ir se sutit, se tarolast", () => {
    render(<YoutubeBetolto />)
    const doboz = lap(helyorzoHtml("xDhs3jEA6oA"))
    const elotte = document.cookie
    fireEvent.click(doboz.querySelector("p")!)
    fireEvent.click(document.body)
    expect(doboz.querySelector("iframe")).toBeNull()
    fireEvent.click(doboz.querySelector("[data-yt-betolt]")!)
    expect(document.cookie).toBe(elotte)
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it("eltavolitas utan nem figyel", () => {
    const { unmount } = render(<YoutubeBetolto />)
    const doboz = lap(helyorzoHtml("xDhs3jEA6oA"))
    unmount()
    fireEvent.click(doboz.querySelector("[data-yt-betolt]")!)
    expect(doboz.querySelector("iframe")).toBeNull()
  })
})
