import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Breadcrumbs } from "./category-breadcrumbs"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

/**
 * A BOLT NEVADASA: A SZULO NEVE A GYEREK NEVEBEN IS OTT ALL.
 *
 * `SPS - WYSIWYG`, `WYSIWYG - Korallok` -- a menu 92 gyermek-nevebol 92 igy
 * all (merve 2026-09-09). A rovid alakot a MEGJELENITES szamolja, az adat a
 * teljeset hordozza.
 */
const kategoria = (
  nev: string,
  handle: string,
  szulo?: Record<string, unknown>,
) =>
  ({
    id: handle,
    name: nev,
    handle,
    parent_category: szulo,
  }) as never

const KORALLOK = kategoria("Korallok", "korallok")
const WYSIWYG = kategoria("WYSIWYG - Korallok", "wysiwyg", KORALLOK)
const SPS = kategoria("SPS - WYSIWYG", "sps", WYSIWYG)

/**
 * A MEGJELENITENDO NEVEK TERKEPE, KEZZEL -- ES SZANDEKOSAN NEM A SZABALYBOL.
 *
 * A roviditesi szabalyt (`megjelenitendoNevek`) a sajat specje meri. ITT az a
 * kerdes, hogy a morzsamenu HASZNALJA-E a kapott terkepet. Ha a terkepet is a
 * szabaly allitana elo, a ket allitas ugyanazt a kodot jarna be.
 */
const TERKEP = new Map<string, string>([
  ["korallok", "Korallok"],
  ["wysiwyg", "WYSIWYG"],
  ["sps", "SPS"],
])

describe("a kategória-lap morzsamenüje", () => {
  const nevek = () =>
    Array.from(screen.getByLabelText("Morzsamenü").querySelectorAll("li")).map(
      (e) => (e.textContent ?? "").replace("/", "").trim(),
    )

  /**
   * A ROVID NEV A TELJES LANCON SZAMOLODIK.
   *
   * Nem elemenkent: a masodik szint rovid neve a SZULO ROVID nevetol fugg. Egy
   * `rovidNev(nev, szulo.name)` hivas ott mar rosszat adna, mert a szulo
   * nevében is benne all a nagyszulo.
   */
  it("mindhárom szint a kapott rövid nevét mutatja", () => {
    render(<Breadcrumbs category={SPS} nevek={TERKEP} />)

    expect(nevek()).toEqual(["Korallok", "WYSIWYG", "SPS"])
  })

  /**
   * UTKOZO NEVNEL A TELJES ALAK MARAD, ES EZT A MORZSAMENU NEM MAGA DONTI EL.
   *
   * A terkep ilyenkor a TELJES nevet adja vissza. Enelkul a fenti allitas
   * akkor is zold lenne, ha a komponens TOVABBRA IS helyben vagna.
   */
  it("ütköző névnél a teljes alakot mutatja", () => {
    render(
      <Breadcrumbs
        category={SPS}
        nevek={
          new Map([
            ["korallok", "Korallok"],
            ["wysiwyg", "WYSIWYG"],
            ["sps", "SPS - WYSIWYG"],
          ])
        }
      />,
    )

    expect(nevek()).toEqual(["Korallok", "WYSIWYG", "SPS - WYSIWYG"])
  })

  /**
   * TERKEP NELKUL A TELJES NEV ALL, NEM A ROVID. A hianyzo adatra a rovid
   * alakra visszaesni azt jelentene, hogy a feltetel nelkuli vagas csendben
   * visszajon.
   */
  it("térkép nélkül a teljes neveket mutatja", () => {
    render(<Breadcrumbs category={SPS} />)

    expect(nevek()).toEqual(["Korallok", "WYSIWYG - Korallok", "SPS - WYSIWYG"])
  })

  /**
   * ES A TAGADAS: a szulo-utotag SEHOL nem jelenik meg.
   *
   * A meglet-allitas onmagaban atengedne egy olyan valtozatot, ami a rovid
   * nevet ES a teljeset is kiirja (peldaul cimkeként) -- ott mind a harom nev
   * "megvolna".
   */
  it("a szülő utótagja sehol nem áll ott", () => {
    render(<Breadcrumbs category={SPS} nevek={TERKEP} />)

    const szoveg = screen.getByLabelText("Morzsamenü").textContent ?? ""

    expect(szoveg).not.toContain("SPS - WYSIWYG")
    expect(szoveg).not.toContain("WYSIWYG - Korallok")
  })

  /**
   * A GYOKER VALTOZATLAN: nincs szuloje, tehat nincs mit levagni. Ez a
   * nulla-joslat kontroll -- ha a levagas valaha "okosabb" lenne a kelletenel,
   * itt latszana eloszor.
   */
  it("a gyökér neve változatlan", () => {
    render(<Breadcrumbs category={KORALLOK} nevek={TERKEP} />)

    expect(nevek()).toEqual(["Korallok"])
  })
})
