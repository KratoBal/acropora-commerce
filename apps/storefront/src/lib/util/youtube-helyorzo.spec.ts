import { describe, expect, it } from "vitest"

import {
  betoltoIframeCim,
  helyorzoHtml,
  helyorzokraCsereli,
  youtubeAzonosito,
} from "./youtube-helyorzo"

/**
 * A YOUTUBE-HELYORZO TISZTA SZABALYAI (kartya dc8cabd2). MI PIROSIT: egy hasonlo vagy idegen hoszt, http cim, nem /embed/ ut
 * vagy nem 11 jeles azonosito mégis azonositot ad; a helyorzo kulso hivast (kep, szkript, keret) tartalmaz; a betoltes nem
 * a nocookie cimre mutat; a csere olyan jelolest is helyorzove ir, ami nem a tisztito sajat, allo jelolese.
 */
describe("youtubeAzonosito", () => {
  it("a youtube.com es a nocookie /embed/<11 jel> alakja azonositot ad, a protokoll-relativ cim is", () => {
    for (const src of [
      "https://www.youtube.com/embed/xDhs3jEA6oA",
      "https://youtube.com/embed/xDhs3jEA6oA?si=abc&t=5",
      "//www.youtube.com/embed/xDhs3jEA6oA",
      "https://www.youtube-nocookie.com/embed/xDhs3jEA6oA/",
    ])
      expect(youtubeAzonosito(src), src).toBe("xDhs3jEA6oA")
  })

  it("minden mas null: idegen vagy hasonlo hoszt, http, nem /embed/ ut, rossz hosszu vagy karakteru azonosito, hianyzo cim", () => {
    for (const src of [
      "https://www.youtube.com.evil.example/embed/xDhs3jEA6oA",
      "https://evilyoutube.com/embed/xDhs3jEA6oA",
      "https://vimeo.com/embed/xDhs3jEA6oA",
      "http://www.youtube.com/embed/xDhs3jEA6oA",
      "https://www.youtube.com/watch?v=xDhs3jEA6oA",
      "https://www.youtube.com/embed/",
      "https://www.youtube.com/embed/rovid",
      "https://www.youtube.com/embed/xDhs3jEA6oAxx",
      "https://www.youtube.com/embed/xDhs3jEA6o!",
      "https://www.youtube.com/embed/xDhs3jEA6oA/extra",
      "javascript:alert(1)",
      "nem cim",
      "",
    ])
      expect(youtubeAzonosito(src), src).toBeNull()
    expect(youtubeAzonosito(undefined)).toBeNull()
  })
})

describe("a helyorzo", () => {
  it("nem hiv kulso cimet: nincs kep, szkript, keret vagy tarolt kapcsolat; a gomb es a link azonositoval jelolt", () => {
    const html = helyorzoHtml("xDhs3jEA6oA")
    expect(html).not.toMatch(/<(img|script|iframe|video|source|link)\b/i)
    expect(html).not.toContain("ytimg")
    expect(html).not.toMatch(/src=/i)
    expect(html).toContain('data-yt-embed="xDhs3jEA6oA"')
    expect(html).toContain('data-yt-betolt="xDhs3jEA6oA"')
    // a link vevoi navigacio (nem beagyazas), kiszallitva a hivatkozo nelkul
    expect(html).toContain('href="https://www.youtube.com/watch?v=xDhs3jEA6oA"')
    expect(html).toContain("noopener noreferrer nofollow")
  })

  it("a betoltes a nocookie cimre mutat, kattintasra indulo lejatszassal", () => {
    expect(betoltoIframeCim("xDhs3jEA6oA")).toBe(
      "https://www.youtube-nocookie.com/embed/xDhs3jEA6oA?autoplay=1&rel=0",
    )
  })

  it("a csere csak a tisztito sajat, allo jeloleset irja at: mas div vagy hosszabb azonosito marad", () => {
    expect(
      helyorzokraCsereli('<div data-yt-embed="xDhs3jEA6oA"></div>'),
    ).toContain("Videó betöltése")
    for (const nem of [
      '<div data-yt-embed="rovid"></div>',
      '<div data-yt-embed="xDhs3jEA6oAxx"></div>',
      '<div data-yt-embed="xDhs3jEA6oA">tartalom</div>',
      '<div class="x" data-yt-embed="xDhs3jEA6oA"></div>',
    ])
      expect(helyorzokraCsereli(nem), nem).toBe(nem)
  })
})
