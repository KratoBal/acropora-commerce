import { SHIPPING_CLASSES } from "../compute-shipping-class"
import {
  ROLE_ELIGIBILITY,
  SHIPPING_OPTION_ROLES,
  allowedRolesFor,
  ruleForRole,
} from "../shipping-eligibility"

describe("shipping option eligibility", () => {
  it("NORMAL: pickup, normal GLS and Foxpost", () => {
    expect(allowedRolesFor("NORMAL")).toEqual([
      "PICKUP",
      "GLS_NORMAL",
      "FOXPOST",
    ])
  })

  it("NO_FOXPOST: pickup and normal GLS, no Foxpost", () => {
    expect(allowedRolesFor("NO_FOXPOST")).toEqual(["PICKUP", "GLS_NORMAL"])
  })

  it("HEAVY: pickup and heavy GLS only", () => {
    expect(allowedRolesFor("HEAVY")).toEqual(["PICKUP", "GLS_HEAVY"])
  })

  it("PICKUP_ONLY: pickup only", () => {
    expect(allowedRolesFor("PICKUP_ONLY")).toEqual(["PICKUP"])
  })

  it("never offers heavy shipping to a non-heavy cart", () => {
    for (const shippingClass of SHIPPING_CLASSES) {
      if (shippingClass === "HEAVY") {
        continue
      }
      expect(allowedRolesFor(shippingClass)).not.toContain("GLS_HEAVY")
    }
  })

  it("never offers normal GLS or Foxpost to a heavy cart", () => {
    expect(allowedRolesFor("HEAVY")).not.toContain("GLS_NORMAL")
    expect(allowedRolesFor("HEAVY")).not.toContain("FOXPOST")
  })

  it("always leaves store pickup available", () => {
    for (const shippingClass of SHIPPING_CLASSES) {
      expect(allowedRolesFor(shippingClass)).toContain("PICKUP")
    }
  })

  describe("rule shape", () => {
    it("puts the several accepted values on the RULE side, with the in operator", () => {
      for (const role of SHIPPING_OPTION_ROLES) {
        const rule = ruleForRole(role)

        expect(rule.attribute).toBe("shipping_class")
        expect(rule.operator).toBe("in")
        // The array must be the rule value. Medusa stringifies the CONTEXT
        // value before comparing, so an array-valued context would silently
        // collapse into a comma-joined string.
        expect(Array.isArray(rule.value)).toBe(true)
        expect(rule.value).toEqual(ROLE_ELIGIBILITY[role])
      }
    })

    it("never produces an empty or falsy rule value", () => {
      // validateRule in @medusajs/fulfillment throws on a falsy value.
      for (const role of SHIPPING_OPTION_ROLES) {
        const rule = ruleForRole(role)
        expect(rule.value.length).toBeGreaterThan(0)
        expect(rule.value.every((v) => typeof v === "string" && v.length > 0)).toBe(true)
      }
    })

    it("returns a fresh array so a caller cannot mutate the table", () => {
      const rule = ruleForRole("FOXPOST")
      rule.value.push("HEAVY")
      expect(ROLE_ELIGIBILITY.FOXPOST).toEqual(["NORMAL"])
    })
  })
})
