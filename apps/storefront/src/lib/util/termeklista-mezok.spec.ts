import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  KATALOGUS_KOR_MEZOK,
  RENDEZO_KOR_MEZOK,
  TERMEKLISTA_MEZOK,
  VASARLAS_KERET_MEZOK,
} from "./termeklista-mezok"

/*
  WHAT TURNS THIS RED (V0.2, slice 3; changed 2026-11-19, Omnibus 2/A.). The buying frame or the list fields losing the variant
  metadata (the Omnibus line and the cards' struck-through price and percentage would silently never show: an unrequested
  field looks like an empty one); the buying frame dropping a base field (`fields` OVERRIDES, it does not add); the variant
  metadata leaking into the lean rounds that read the WHOLE catalogue (the sort round, the catalogue round); the template not
  passing the constant.
*/
describe("a vásárlási keret mezői", () => {
  it("kéri a változat metaadatát, plusszal (hozzáadja, nem felülírja)", () => {
    expect(VASARLAS_KERET_MEZOK).toContain("+variants.metadata")
  })

  it("az alapmezők mind megvannak benne", () => {
    for (const mezo of TERMEKLISTA_MEZOK.split(",").filter(Boolean))
      expect(VASARLAS_KERET_MEZOK).toContain(mezo)
    expect(TERMEKLISTA_MEZOK.split(",").filter(Boolean)).toHaveLength(7)
  })

  it("a listák mezői is kérik a változat metaadatát: a kártya athúzása ebből igazolható", () => {
    expect(TERMEKLISTA_MEZOK).toContain("+variants.metadata")
  })

  it("a teljes halmazt lehívó körök mezői NEM kapják meg", () => {
    expect(RENDEZO_KOR_MEZOK).not.toContain("metadata")
    expect(KATALOGUS_KOR_MEZOK).not.toContain("metadata")
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
