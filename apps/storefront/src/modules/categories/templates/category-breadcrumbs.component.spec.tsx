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
  it("mindhárom szint a rövid nevét mutatja", () => {
    render(<Breadcrumbs category={SPS} />)

    expect(nevek()).toEqual(["Korallok", "WYSIWYG", "SPS"])
  })

  /**
   * ES A TAGADAS: a szulo-utotag SEHOL nem jelenik meg.
   *
   * A meglet-allitas onmagaban atengedne egy olyan valtozatot, ami a rovid
   * nevet ES a teljeset is kiirja (peldaul cimkeként) -- ott mind a harom nev
   * "megvolna".
   */
  it("a szülő utótagja sehol nem áll ott", () => {
    render(<Breadcrumbs category={SPS} />)

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
    render(<Breadcrumbs category={KORALLOK} />)

    expect(nevek()).toEqual(["Korallok"])
  })
})
