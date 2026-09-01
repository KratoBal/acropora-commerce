import {
  PAYMENT_ROLES,
  SHIPPING_ROLE_PAYMENTS,
  allowedPaymentRolesFor,
  isPaymentRoleAllowedFor,
} from "../payment-eligibility"
import { SHIPPING_OPTION_ROLES } from "../shipping-eligibility"
import {
  buildShippingOptionRoleMap,
  resolveShippingOptionRoleBindings,
} from "../shipping-option-roles"
import {
  resolveSelectedPaymentRole,
  resolveShippingRoles,
} from "../resolve-cart-payment-context"
import { buildProviderRoleMap } from "../payment-providers"

describe("payment eligibility by selected shipping option", () => {
  it("pickup allows online card and pay at store", () => {
    expect(allowedPaymentRolesFor(["PICKUP"])).toEqual([
      "ONLINE_CARD",
      "PAY_AT_STORE",
    ])
  })

  it("pickup rejects cash on delivery", () => {
    expect(isPaymentRoleAllowedFor("COD", ["PICKUP"])).toBe(false)
  })

  it("normal GLS allows online card and cash on delivery", () => {
    expect(allowedPaymentRolesFor(["GLS_NORMAL"])).toEqual([
      "ONLINE_CARD",
      "COD",
    ])
  })

  it("heavy GLS allows online card and cash on delivery", () => {
    // Balázs, 2026-09-01: "Legyen utánvét". Before that this row read card
    // only, and nothing recorded whether that was deliberate.
    expect(allowedPaymentRolesFor(["GLS_HEAVY"])).toEqual([
      "ONLINE_CARD",
      "COD",
    ])
    expect(isPaymentRoleAllowedFor("COD", ["GLS_HEAVY"])).toBe(true)
    expect(isPaymentRoleAllowedFor("PAY_AT_STORE", ["GLS_HEAVY"])).toBe(false)
  })

  it("still refuses cash on delivery on store pickup", () => {
    // The counterpart of the change above, and the reason it is a separate
    // assertion: switching the heavy row on everywhere would satisfy the test
    // before this one and break the shop. There is no delivery to collect on.
    expect(isPaymentRoleAllowedFor("COD", ["PICKUP"])).toBe(false)
    expect(allowedPaymentRolesFor(["PICKUP"])).toEqual([
      "ONLINE_CARD",
      "PAY_AT_STORE",
    ])
  })

  it("Foxpost allows online card and cash on delivery", () => {
    expect(allowedPaymentRolesFor(["FOXPOST"])).toEqual(["ONLINE_CARD", "COD"])
  })

  it("pay at store is offered for pickup and for nothing else", () => {
    for (const role of SHIPPING_OPTION_ROLES) {
      expect(isPaymentRoleAllowedFor("PAY_AT_STORE", [role])).toBe(
        role === "PICKUP"
      )
    }
  })

  it("online card is offered for every shipping option", () => {
    for (const role of SHIPPING_OPTION_ROLES) {
      expect(isPaymentRoleAllowedFor("ONLINE_CARD", [role])).toBe(true)
    }
  })

  it("offers nothing when no shipping method is selected yet", () => {
    expect(allowedPaymentRolesFor([])).toEqual([])
  })

  it("takes the intersection across several selected shipping methods", () => {
    // Not the union: store pickup must not become payable on delivery just
    // because another selected method allows it.
    //
    // The example is pickup rather than heavy GLS on purpose. Heavy GLS used
    // to be the one that forbade cash on delivery, and it stopped being so on
    // 2026-09-01 - which would have quietly turned this into a test where
    // intersection and union give the same answer, and it would have gone on
    // passing while proving nothing.
    expect(allowedPaymentRolesFor(["PICKUP", "GLS_NORMAL"])).toEqual([
      "ONLINE_CARD",
    ])
    expect(allowedPaymentRolesFor(["GLS_NORMAL", "GLS_HEAVY"])).toEqual([
      "ONLINE_CARD",
      "COD",
    ])
  })

  it("every shipping role can be paid somehow", () => {
    for (const role of SHIPPING_OPTION_ROLES) {
      expect(SHIPPING_ROLE_PAYMENTS[role].length).toBeGreaterThan(0)
    }
  })

  describe("invalidation when shipping changes", () => {
    it("normal GLS to store pickup invalidates cash on delivery", () => {
      expect(isPaymentRoleAllowedFor("COD", ["GLS_NORMAL"])).toBe(true)
      expect(isPaymentRoleAllowedFor("COD", ["PICKUP"])).toBe(false)
    })

    it("normal GLS to heavy GLS no longer invalidates it", () => {
      // Kept as an assertion rather than deleted: this transition used to
      // remove the fee from a cart, and the hook that does the removing is
      // still there. If the heavy row is ever narrowed again, this says so.
      expect(isPaymentRoleAllowedFor("COD", ["GLS_HEAVY"])).toBe(true)
    })

    it("Foxpost to pickup invalidates cash on delivery", () => {
      expect(isPaymentRoleAllowedFor("COD", ["FOXPOST"])).toBe(true)
      expect(isPaymentRoleAllowedFor("COD", ["PICKUP"])).toBe(false)
    })
  })
})

describe("resolving roles from a cart", () => {
  const roleMap = buildShippingOptionRoleMap({} as NodeJS.ProcessEnv)
  const bindings = resolveShippingOptionRoleBindings({} as NodeJS.ProcessEnv)
  const idFor = (role: string) => bindings.find((b) => b.role === role)!.id

  it("maps selected shipping options to roles by id", () => {
    expect(
      resolveShippingRoles(
        { shipping_methods: [{ shipping_option_id: idFor("FOXPOST") }] },
        roleMap
      )
    ).toEqual(["FOXPOST"])
  })

  it("yields no role for an option outside the Acropora set", () => {
    // The Medusa starter's demo options are deliberately not in the table.
    expect(
      resolveShippingRoles(
        { shipping_methods: [{ shipping_option_id: "so_demo_standard" }] },
        roleMap
      )
    ).toEqual([])
  })

  it("fails closed: an unknown option offers no payment method", () => {
    const roles = resolveShippingRoles(
      { shipping_methods: [{ shipping_option_id: "so_demo_standard" }] },
      roleMap
    )
    expect(allowedPaymentRolesFor(roles)).toEqual([])
  })

  it("survives null entries and missing ids", () => {
    expect(
      resolveShippingRoles(
        { shipping_methods: [null, { shipping_option_id: null }, undefined as any] },
        roleMap
      )
    ).toEqual([])
    expect(resolveShippingRoles({}, roleMap)).toEqual([])
  })

  it("honours an environment override of an option id", () => {
    const overridden = buildShippingOptionRoleMap({
      ACROPORA_SO_FOXPOST: "so_other_env",
    } as unknown as NodeJS.ProcessEnv)

    expect(
      resolveShippingRoles(
        { shipping_methods: [{ shipping_option_id: "so_other_env" }] },
        overridden
      )
    ).toEqual(["FOXPOST"])
  })
})

describe("resolving the selected payment role", () => {
  const providerRoles = buildProviderRoleMap({
    ACROPORA_PP_ONLINE_CARD: "pp_card",
    ACROPORA_PP_COD: "pp_cod",
  } as unknown as NodeJS.ProcessEnv)

  it("is null when no provider is mapped at all", () => {
    const empty = buildProviderRoleMap({} as NodeJS.ProcessEnv)
    expect(empty.size).toBe(0)
    expect(
      resolveSelectedPaymentRole(
        { payment_collection: { payment_sessions: [{ provider_id: "pp_cod" }] } },
        empty
      )
    ).toBeNull()
  })

  it("resolves a mapped provider to its role", () => {
    expect(
      resolveSelectedPaymentRole(
        { payment_collection: { payment_sessions: [{ provider_id: "pp_cod" }] } },
        providerRoles
      )
    ).toBe("COD")
  })

  it("never guesses an unmapped provider", () => {
    expect(
      resolveSelectedPaymentRole(
        {
          payment_collection: {
            payment_sessions: [{ provider_id: "pp_unknown" }],
          },
        },
        providerRoles
      )
    ).toBeNull()
  })

  it("refuses to choose when the selection is ambiguous", () => {
    expect(
      resolveSelectedPaymentRole(
        {
          payment_collection: {
            payment_sessions: [
              { provider_id: "pp_cod" },
              { provider_id: "pp_card" },
            ],
          },
        },
        providerRoles
      )
    ).toBeNull()
  })

  it("survives a cart with no payment collection", () => {
    expect(resolveSelectedPaymentRole({}, providerRoles)).toBeNull()
  })
})

describe("the payment role set", () => {
  it("has exactly the three roles the business uses", () => {
    expect([...PAYMENT_ROLES]).toEqual(["ONLINE_CARD", "COD", "PAY_AT_STORE"])
  })
})
