import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  TERMEKLAP_FIELDS,
  TERMEKLAP_MEZO_KATEGORIAK,
  TERMEKLAP_MEZO_METAADAT,
} from "./termeklap-fields"

/**
 * A MEZOLISTA KET RESZE, KULON-KULON. Egyben allitva egyetlen elirasrol nem
 * derulne ki, MELYIK kepesseg veszett el vele -- pedig a ket resz ket kulon
 * dolgot tart eletben.
 */
describe("a termeklap mezoi", () => {
  it("kéri a kategóriákat, mert abból dől el a sötét-világos váltó", () => {
    expect(TERMEKLAP_FIELDS).toContain(TERMEKLAP_MEZO_KATEGORIAK)
  })

  it("kéri a metaadatot, mert abban áll az egyedi példány jelzője", () => {
    expect(TERMEKLAP_FIELDS).toContain(TERMEKLAP_MEZO_METAADAT)
  })

  /**
   * ES A KATEGORIA-RESZ CSILLAGGAL ALL, NEM PLUSSZAL. Merve: a `+categories`
   * alak URES listat ad vissza, es akkor minden termek a muszaki vazat kapja.
   * A ket alak egyetlen karakterben ter el, es a hibas EGYIK teszten sem
   * bukna el a sztringen kivul.
   */
  it("a kategóriákat csillaggal kéri, nem plusszal", () => {
    expect(TERMEKLAP_FIELDS).not.toContain("+categories")
  })
})

/**
 * ES HOGY A LAP TENYLEG EZT HASZNALJA.
 *
 * A lap szerver-komponens, jsdomban nem renderelheto, ezert a forrasat olvassuk
 * -- ugyanaz a hatar, mint a vaz tobbi allitasanal. Amit mer: MIT AD AT a lap,
 * nem azt, mi jon vissza a bolttol.
 *
 * MIERT KELL KULON: a konstans onmagaban helyes lehet ugy is, hogy a lap egy
 * BEIRT sztringet ad at mellette. Pontosan ez volt a hibas allapot: a lapon egy
 * `"*categories"` literal allt, es semmi nem tudott rola.
 */
describe("a termeklap a közös mezőlistát adja át", () => {
  const forras = readFileSync(
    join(
      process.cwd(),
      "src/app/[countryCode]/(main)/products/[handle]/page.tsx",
    ),
    "utf-8",
  )

  /** ISMERT POZITIV KONTROLL: tenyleg a termeklapot olvastuk be. */
  it("a lap forrása olvasható, és ez tényleg a terméklap", () => {
    expect(forras).toContain("<ProductTemplate")
    expect(forras).toContain("listProducts")
  })

  it("a közös konstanst adja át, nem beírt szöveget", () => {
    expect(forras).toContain("fields: TERMEKLAP_FIELDS")
    expect(forras).not.toContain('fields: "*categories"')
  })
})
