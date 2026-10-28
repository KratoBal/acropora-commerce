import { readFileSync } from "node:fs"
import { join } from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageGallery from "./index"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

const kep = (i: number) => ({ id: `k${i}`, url: `https://pelda/k${i}.jpg` })

/**
 * A KEP ALATTI MONDAT NEM ALLHAT A KEPERNYO SZELEN (kezdolap-stilus, 2026-10-28).
 *
 * Az egyedi darab termeklapjan (sotet vilag) a foto mobilon a lap szelen szelig
 * er, es a "A fotó pontosan ezt a példányt mutatja" mondat ezt orokolte: a
 * szoveg a 390 px-es kepernyo bal szelen allt, 16 pixeles margo nelkul, mikozben
 * minden mas a lapon bent van. MI PIROSIT: ha a galeria nem viszi tovabb a hivo
 * osztalyat a mondatra; ha a hivo nem adja a margot a teljes szelessegu slotban;
 * ha a margo asztalin is megmaradna (ott a mondat a kerettel egy vonalban all).
 */
describe("az egyedi darab mondata a teljes szélességű fotó alatt", () => {
  it("a hívó osztálya a mondatra kerül", () => {
    render(
      <ImageGallery
        images={[kep(1)] as never}
        uniquePiece
        igeretOsztaly="max-lg:px-4"
      />,
    )
    const mondat = screen.getByTestId("unique-piece-promise")
    expect(mondat.className).toContain("max-lg:px-4")
    expect(mondat.className).toContain("mt-1")
  })

  it("osztály nélkül a mondat a régi: nincs rajta margo-osztály", () => {
    render(<ImageGallery images={[kep(1)] as never} uniquePiece />)
    expect(screen.getByTestId("unique-piece-promise").className).not.toMatch(
      /px-/,
    )
  })

  it("minden teljes szélességű `fotoResz` slotot kitöltő galéria adja a mobil margót, asztalin nem", () => {
    const sablon = readFileSync(
      join(__dirname, "..", "..", "templates", "index.tsx"),
      "utf-8",
    )
    const hivasok = sablon
      .split("fotoResz={")
      .slice(1)
      .map((resz) => resz.slice(0, resz.indexOf("undefined")))
    // a sablon két helyen tölti a slotot (a két vázváltozat)
    expect(hivasok).toHaveLength(2)
    for (const hivas of hivasok) {
      expect(hivas).toContain('igeretOsztaly="max-lg:px-4"')
      // a `max-lg:` ele: asztalin (lg és fölötte) nincs margó
      expect(hivas).not.toMatch(/igeretOsztaly="px-/)
    }
  })

  it("a világos lap saját fotó-blokkja alatti mondat ugyanígy kap mobil margót", () => {
    const tartalom = readFileSync(
      join(__dirname, "..", "lap-vaz", "valodi-tartalom.tsx"),
      "utf-8",
    )
    expect(tartalom).toContain(
      '<UniquePiecePromise className="mt-1 max-lg:px-4" />',
    )
  })
})
