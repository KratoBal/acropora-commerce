import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import LapVaz, { MUSZAKI_LAP_SZAKASZAI } from "./index"
import { legmelyebbKategoria, vazTartalom } from "./valodi-tartalom"

afterEach(cleanup)

/**
 * A FIXTURA A STAGE VALODI ALAKJAT KOVETI, nem kitalalt mezoket: a metaadat négy
 * kulcsa, a hat kategoria mpath-tal, egy valtozat "Kivitel" opcioval.
 */
const TERMEK = {
  id: "prod_1",
  title: "Amtra TDS/EC digitális TDS mérő",
  handle: "amtra-tds-ec-digitalis-tds-mero",
  thumbnail: "https://pelda.hu/kep.jpg",
  images: [{ id: "img_1", url: "https://pelda.hu/kep.jpg" }],
  description: "<p>Az <strong>Amtra</strong> mérő</p>",
  metadata: {
    unas_unit: "db",
    unas_product_url: "https://regi.hu/termek",
    unas_short_description: "rövid",
    unas_minimum_order_quantity: "1",
  },
  categories: [
    { id: "c1", name: "Termékek", mpath: "c1" },
    { id: "c2", name: "Tesztek, mérés, vezérlés", mpath: "c1.c2" },
    { id: "c3", name: "TDS mérők", mpath: "c1.c2.c3" },
  ],
  variants: [{ id: "v1", sku: "8023222196186", options: [] }],
  options: [{ id: "o1", title: "Kivitel", values: [{ id: "ov1", value: "Alap" }] }],
} as never

describe("a váz valódi tartalma", () => {
  it("a legmélyebb kategóriát választja, nem a gyökeret", () => {
    expect(legmelyebbKategoria(TERMEK)).toBe("TDS mérők")
  })

  it("a névvel, a besorolással és a cikkszámmal tölti a címsort", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(screen.getByTestId("vaz-termek-nev").textContent).toContain("Amtra")
    expect(screen.getByTestId("vaz-cikkszam").textContent).toBe("8023222196186")
    expect(screen.getByText("TDS mérők")).toBeTruthy()
  })

  it("a leírást tisztítva, jelölőként mutatja", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    const leiras = screen.getByTestId("vaz-leiras")
    expect(leiras.querySelector("strong")).toBeTruthy()
    expect(leiras.textContent).not.toContain("<strong>")
  })

  /**
   * A LÉNYEG: AMINEK NINCS FORRÁSA, AZ ÜRESEN MARAD. Ez nem hiányosság, hanem a
   * kikötés -- kitalált adat nem kerül a lapra.
   *
   * A műszaki paraméterek strukturáltan sehol nem állnak (a leírásba ágyazott
   * táblázatokban élnek), a csomagajánlatnak, a tartozékoknak és a hasonló
   * termékeknek nincs forrásuk, a méretezés-segéd pedig számítás, nem adat.
   */
  it("forrás nélküli dobozok üresen maradnak", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    for (const kulcs of [
      "meretezes-seged",
      "muszaki-adatok",
      "csomagajanlat",
      "kiegeszitok",
      "hasonlo",
    ]) {
      const doboz = document.querySelector(`[data-vaz-szakasz="${kulcs}"]`)
      expect(doboz?.getAttribute("data-vaz-ures")).toBe("igen")
    }
  })

  /**
   * ÉS A MÁSIK IRÁNY: ami MEGVAN, az NEM maradhat üresen. E nélkül egy elrontott
   * leképezés (rossz kulcsnév, elgépelt mező) csendben visszaadna egy teljesen
   * üres vázat, és a "minden doboz a helyén" állítás igaz maradna rá.
   */
  it("a meglévő adat dobozai NEM üresek", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    for (const kulcs of ["cimsor", "foto", "fulek", "elerhetoseg"]) {
      const doboz = document.querySelector(`[data-vaz-szakasz="${kulcs}"]`)
      expect(doboz?.getAttribute("data-vaz-ures")).toBe("nem")
    }
  })

  /**
   * KÉP NÉLKÜLI TERMÉK: a fotó doboza üres marad, és a többi változatlan. A
   * katalógusban van kép nélküli termék, tehát ez nem elméleti eset.
   */
  it("kép nélküli terméknél a fotó doboza üres", () => {
    const kepNelkul = { ...(TERMEK as object), thumbnail: null, images: [] } as never
    render(<LapVaz tartalom={vazTartalom(kepNelkul)} />)

    const foto = document.querySelector('[data-vaz-szakasz="foto"]')
    expect(foto?.getAttribute("data-vaz-ures")).toBe("igen")

    const cimsor = document.querySelector('[data-vaz-szakasz="cimsor"]')
    expect(cimsor?.getAttribute("data-vaz-ures")).toBe("nem")
  })

  it("a tizennégy doboz akkor is mind ott áll, ha csak a fele kap tartalmat", () => {
    render(<LapVaz tartalom={vazTartalom(TERMEK)} />)

    expect(document.querySelectorAll("[data-vaz-szakasz]")).toHaveLength(
      MUSZAKI_LAP_SZAKASZAI.length
    )
  })
})
