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
