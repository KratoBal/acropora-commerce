import { LIVESTOCK_KINDS, distinctLivestockKinds, isLivestockKind } from "../livestock-kind"

// V2.6: the kind of live animal comes from the OS, and an unknown value is dropped, never guessed
describe("the livestock kind", () => {
  it("knows exactly the three kinds the OS derives from the three root categories", () => {
    expect([...LIVESTOCK_KINDS]).toEqual(["FISH", "INVERTEBRATE", "CORAL"])
  })

  // MI PIROSÍT: ha a szűrő kisbetűt, üres szöveget vagy nem-szöveget is elfogadna
  it("accepts only the exact upper case names", () => {
    expect(isLivestockKind("CORAL")).toBe(true)
    for (const bad of ["coral", "Coral", "", "SHRIMP", null, undefined, 3, {}]) {
      expect(isLivestockKind(bad)).toBe(false)
    }
  })

  // MI PIROSÍT: ha a sorrend a bejövő sor sorrendjét követné (két rendelés, két különböző levél-sorrend),
  // ha egy ismétlődő fajta kétszer szerepelne, vagy ha egy ismeretlen érték átjutna
  it("lists each kind once, in the fixed kind order, and drops what it does not know", () => {
    expect(distinctLivestockKinds(["CORAL", "FISH", "CORAL", null, "SHRIMP", undefined, "fish"])).toEqual([
      "FISH",
      "CORAL",
    ])
    expect(distinctLivestockKinds([])).toEqual([])
    expect(distinctLivestockKinds([null, "x"])).toEqual([])
  })
})
