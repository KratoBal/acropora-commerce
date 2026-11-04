import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { TERMEKLISTA_MEZOK, VASARLAS_KERET_MEZOK } from "./termeklista-mezok"

/*
  WHAT TURNS THIS RED (V0.2, slice 3). The buying frame losing the variant metadata (the Omnibus line
  would silently never show: an unrequested field looks like an empty one); the buying frame dropping a
  base field (`fields` OVERRIDES, it does not add); the variant metadata creeping into the list fields
  (every list card of a 1492-product response would carry it); the template not passing the constant.
*/
describe("a vásárlási keret mezői", () => {
  it("kéri a változat metaadatát, plusszal (hozzáadja, nem felülírja)", () => {
    expect(VASARLAS_KERET_MEZOK).toContain("+variants.metadata")
  })

  it("az alapmezők mind megvannak benne", () => {
    for (const mezo of TERMEKLISTA_MEZOK.split(",").filter(Boolean))
      expect(VASARLAS_KERET_MEZOK).toContain(mezo)
    expect(TERMEKLISTA_MEZOK.split(",").filter(Boolean)).toHaveLength(6)
  })

  it("a listák mezői NEM kapják meg a változat metaadatát", () => {
    expect(TERMEKLISTA_MEZOK).not.toContain("variants.metadata")
  })

  it("a keret sablon ezt a konstanst adja át", () => {
    const forras = readFileSync(
      join(
        process.cwd(),
        "src/modules/products/templates/vasarlas-keret/index.tsx",
      ),
      "utf-8",
    )
    expect(forras).toContain("<VasarlasProvider")
    expect(forras).toContain("fields: VASARLAS_KERET_MEZOK")
  })
})
