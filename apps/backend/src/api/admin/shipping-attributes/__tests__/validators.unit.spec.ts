import { AdminShippingAttributeFlags, AdminUpsertShippingAttribute } from "../validators"

// V2.6: the OS writes the kind with the other shipping attributes
describe("the shipping attribute body", () => {
  // MI PIROSÍT: ha a mező nem volna a sémában (a szigorú séma 400-zal utasítaná el az OS írását)
  it("accepts each livestock kind, null (clears it) and no kind at all", () => {
    for (const livestock_kind of ["FISH", "INVERTEBRATE", "CORAL", null]) {
      expect(AdminShippingAttributeFlags.safeParse({ livestock_kind }).success).toBe(true)
    }
    expect(AdminShippingAttributeFlags.safeParse({ pickup_only: true }).success).toBe(true)
    expect(AdminUpsertShippingAttribute.safeParse({ product_id: "prod_1", livestock_kind: "CORAL" }).success).toBe(true)
  })

  // MI PIROSÍT: ha a séma szabad szöveget engedne (egy elírt fajta a levélben szakasz nélkül maradna)
  it("refuses anything that is not one of the three kinds", () => {
    for (const livestock_kind of ["coral", "SHRIMP", "", 3]) {
      expect(AdminShippingAttributeFlags.safeParse({ livestock_kind }).success).toBe(false)
    }
  })
})

// card c603774e: the OS marks the pickup_only it derived, and the reviewed adoption can claim an older value
describe("the pickup_only mark in the body", () => {
  // MI PIROSIT: ha a jelolo vagy az atvetel mezo nem volna a semaban (a szigoru sema 400-zal utasitana el az OS irasat)
  it("accepts the mark and the adoption flag, on the list route body and on the per-product body", () => {
    const body = { pickup_only: true, pickup_only_derived: true, adopt_pickup_only_derived: true }
    expect(AdminShippingAttributeFlags.safeParse(body).success).toBe(true)
    expect(AdminUpsertShippingAttribute.safeParse({ product_id: "prod_1", ...body }).success).toBe(true)
  })

  // MI PIROSIT: ha a jelolo szabad szoveget engedne (egy "false" szoveg igaznak szamitana)
  it("refuses a mark that is not a boolean", () => {
    for (const value of ["true", 1, null]) {
      expect(AdminShippingAttributeFlags.safeParse({ pickup_only_derived: value }).success).toBe(false)
      expect(AdminShippingAttributeFlags.safeParse({ adopt_pickup_only_derived: value }).success).toBe(false)
    }
  })
})
